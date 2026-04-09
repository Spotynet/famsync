"""
Google Calendar OAuth flow and sync logic.
"""
import datetime
import logging
import os
import threading

# Google returns extra scopes (openid, email, profile) alongside the requested
# calendar scope.  requests_oauthlib raises a Warning-as-exception on any scope
# change; setting this env var tells it to accept broader scopes without failing.
os.environ.setdefault('OAUTHLIB_RELAX_TOKEN_SCOPE', '1')

from django.conf import settings
from django.utils import timezone
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from .encryption import decrypt, encrypt
from .models import GoogleCalendarIntegration

logger = logging.getLogger(__name__)

SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']


# ---------------------------------------------------------------------------
# OAuth helpers
# ---------------------------------------------------------------------------

def build_flow(state=None):
    """Return a google_auth_oauthlib Flow configured from settings."""
    client_config = {
        'web': {
            'client_id': settings.GOOGLE_CALENDAR_CLIENT_ID,
            'client_secret': settings.GOOGLE_CALENDAR_CLIENT_SECRET,
            'redirect_uris': [settings.GOOGLE_CALENDAR_REDIRECT_URI],
            'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
            'token_uri': 'https://oauth2.googleapis.com/token',
        }
    }
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_CALENDAR_REDIRECT_URI,
        state=state,
    )
    return flow


def get_auth_url(user_id: int) -> str:
    """
    Build and return the Google OAuth authorization URL.
    The state param encodes the user_id so the callback can identify who's connecting.

    PKCE (code_challenge_method) is explicitly disabled: google-auth-oauthlib ≥1.1
    adds it by default, but the verifier lives on the Flow object which is discarded
    after this request. The callback creates a fresh Flow that has no verifier, causing
    Google to reject the token exchange with invalid_grant. Since this is a server-side
    confidential-client flow, PKCE is not required — disabling it is correct here.
    """
    flow = build_flow()
    # Bypass flow.authorization_url() — google_auth_oauthlib ≥1.1 injects
    # code_challenge_method='S256' via setdefault inside that method, generating
    # a PKCE verifier tied to this Flow instance.  The stateless callback creates
    # a fresh Flow with no verifier, causing invalid_grant.  Calling the underlying
    # oauth2session directly skips that injection without adding any extra param.
    auth_url, _ = flow.oauth2session.authorization_url(
        flow.client_config['auth_uri'],
        state=str(user_id),
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent',
    )
    return auth_url


def exchange_code_and_save(user, code: str, state: str) -> GoogleCalendarIntegration:
    """
    Exchange the authorization code for tokens and persist them (encrypted).
    Returns the GoogleCalendarIntegration instance.
    """
    flow = build_flow(state=state)
    flow.fetch_token(code=code)
    creds = flow.credentials

    expiry = creds.expiry
    if expiry and timezone.is_naive(expiry):
        expiry = timezone.make_aware(expiry, datetime.timezone.utc)

    integration, _ = GoogleCalendarIntegration.objects.update_or_create(
        user=user,
        defaults={
            'access_token': encrypt(creds.token),
            'refresh_token': encrypt(creds.refresh_token) if creds.refresh_token else '',
            'token_expiry': expiry,
            'is_active': True,
        },
    )
    return integration


def revoke_and_delete(user) -> None:
    """Revoke the Google token and remove the integration record."""
    import requests as http_requests
    try:
        integration = GoogleCalendarIntegration.objects.get(user=user)
        access_token = decrypt(integration.access_token)
        http_requests.post(
            'https://oauth2.googleapis.com/revoke',
            params={'token': access_token},
            headers={'content-type': 'application/x-www-form-urlencoded'},
            timeout=5,
        )
    except GoogleCalendarIntegration.DoesNotExist:
        pass
    except Exception as e:
        logger.warning('Token revocation failed (continuing with deletion): %s', e)
    finally:
        GoogleCalendarIntegration.objects.filter(user=user).delete()


# ---------------------------------------------------------------------------
# Token refresh helper
# ---------------------------------------------------------------------------

def _get_valid_credentials(integration: GoogleCalendarIntegration) -> Credentials:
    """
    Build a Credentials object and refresh it if expired.
    Saves updated tokens back to DB if refreshed.
    """
    creds = Credentials(
        token=decrypt(integration.access_token),
        refresh_token=decrypt(integration.refresh_token) if integration.refresh_token else None,
        token_uri='https://oauth2.googleapis.com/token',
        client_id=settings.GOOGLE_CALENDAR_CLIENT_ID,
        client_secret=settings.GOOGLE_CALENDAR_CLIENT_SECRET,
        scopes=SCOPES,
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(GoogleRequest())
        expiry = creds.expiry
        if expiry and timezone.is_naive(expiry):
            expiry = timezone.make_aware(expiry, datetime.timezone.utc)
        integration.access_token = encrypt(creds.token)
        integration.token_expiry = expiry
        integration.save(update_fields=['access_token', 'token_expiry'])

    return creds


# ---------------------------------------------------------------------------
# Sync logic
# ---------------------------------------------------------------------------

def _do_sync(user_id: int) -> None:
    """
    Fetch Google Calendar events and upsert them as local Events.
    Runs in a background thread — must use django.db.connection.close() at end.
    """
    from django.db import connection
    try:
        integration = GoogleCalendarIntegration.objects.get(user_id=user_id, is_active=True)
        creds = _get_valid_credentials(integration)
        service = build('calendar', 'v3', credentials=creds)

        now = timezone.now()
        time_min = (now - datetime.timedelta(days=30)).isoformat()
        time_max = (now + datetime.timedelta(days=90)).isoformat()

        result = service.events().list(
            calendarId=integration.calendar_id,
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy='startTime',
            maxResults=500,
        ).execute()

        items = result.get('items', [])

        # Resolve the user's primary family for imported events
        from families.models import FamilyMember
        from events.models import Category, Event

        membership = FamilyMember.objects.filter(user_id=user_id).select_related('family').first()
        if not membership:
            logger.warning('User %s has no family — skipping Google Calendar sync', user_id)
            return

        family = membership.family
        default_category = Category.objects.filter(family__isnull=True, label='Otro').first()

        for item in items:
            if item.get('status') == 'cancelled':
                continue

            title = item.get('summary', '(Sin título)')
            description = item.get('description', '')
            location = item.get('location', '')
            google_event_id = item['id']

            start = item.get('start', {})
            end = item.get('end', {})

            if 'date' in start:
                # All-day event
                date_str = start['date']
                all_day = True
                start_time = None
                end_time = None
            else:
                # Timed event — dateTime is ISO8601 with timezone
                dt_start = datetime.datetime.fromisoformat(start['dateTime'].replace('Z', '+00:00'))
                dt_end = datetime.datetime.fromisoformat(end['dateTime'].replace('Z', '+00:00'))
                date_str = dt_start.date().isoformat()
                all_day = False
                start_time = dt_start.time()
                end_time = dt_end.time()

            Event.objects.update_or_create(
                google_event_id=google_event_id,
                defaults={
                    'family': family,
                    'created_by': membership,
                    'category': default_category,
                    'title': title,
                    'description': description,
                    'location': location,
                    'date': date_str,
                    'all_day': all_day,
                    'start_time': start_time,
                    'end_time': end_time,
                    'priority': 'medium',
                },
            )

        integration.last_sync_at = timezone.now()
        integration.save(update_fields=['last_sync_at'])
        logger.info('Google Calendar sync complete for user %s: %d events', user_id, len(items))

    except GoogleCalendarIntegration.DoesNotExist:
        logger.warning('No active Google Calendar integration for user %s', user_id)
    except Exception as e:
        logger.exception('Google Calendar sync failed for user %s: %s', user_id, e)
    finally:
        connection.close()


def trigger_sync(user_id: int) -> None:
    """Fire-and-forget: run sync in a daemon background thread."""
    thread = threading.Thread(target=_do_sync, args=(user_id,), daemon=True)
    thread.start()
