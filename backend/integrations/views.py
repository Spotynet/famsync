"""
Google Calendar integration views:
  GET    /api/integrations/google-calendar/           — status
  POST   /api/integrations/google-calendar/connect/   — start OAuth flow
  GET    /api/integrations/google-calendar/callback/  — OAuth callback (no auth)
  POST   /api/integrations/google-calendar/sync/      — trigger manual sync
  DELETE /api/integrations/google-calendar/           — disconnect
"""
import logging

from django.conf import settings
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from .models import GoogleCalendarIntegration
from . import services

logger = logging.getLogger(__name__)

# Deep link the mobile app listens to after a successful OAuth callback
MOBILE_SUCCESS_REDIRECT = 'famsync://calendar-connected'
MOBILE_ERROR_REDIRECT = 'famsync://calendar-error'


def _scheme_redirect(url: str) -> HttpResponse:
    """
    Issue a raw HTTP 302 to a custom URI scheme (e.g. famsync://).
    Django's redirect() shortcut rejects non-http(s) schemes; building the
    HttpResponse manually bypasses that check while still sending a proper
    redirect that WebBrowser.openAuthSessionAsync can intercept.
    """
    response = HttpResponse(status=302)
    response['Location'] = url
    return response


# --- Status ---

@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def google_calendar_integration(request):
    if request.method == 'GET':
        try:
            integration = request.user.google_calendar
            return Response({
                'connected': integration.is_active,
                'calendar_id': integration.calendar_id,
                'last_sync_at': integration.last_sync_at,
            })
        except GoogleCalendarIntegration.DoesNotExist:
            return Response({'connected': False, 'calendar_id': None, 'last_sync_at': None})

    # DELETE — disconnect
    if request.method == 'DELETE':
        services.revoke_and_delete(request.user)
        return Response({'message': 'Google Calendar disconnected.'}, status=status.HTTP_200_OK)


# --- Connect: return auth URL ---

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def google_calendar_connect(request):
    if not settings.GOOGLE_CALENDAR_CLIENT_ID:
        return Response(
            {'error': 'Google Calendar is not configured on this server.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    auth_url = services.get_auth_url(request.user.id)
    return Response({'auth_url': auth_url})


# --- OAuth callback (Google redirects here — no JWT) ---

@api_view(['GET'])
@permission_classes([AllowAny])
def google_calendar_callback(request):
    code = request.query_params.get('code')
    state = request.query_params.get('state')  # contains user_id as string
    error = request.query_params.get('error')

    if error:
        logger.warning('Google Calendar OAuth error: %s', error)
        return _scheme_redirect(MOBILE_ERROR_REDIRECT + f'?error={error}')

    if not code or not state:
        return _scheme_redirect(MOBILE_ERROR_REDIRECT + '?error=missing_params')

    try:
        user_id = int(state)
        user = User.objects.get(id=user_id)
    except (ValueError, User.DoesNotExist):
        logger.warning('Google Calendar callback: invalid state param "%s"', state)
        return _scheme_redirect(MOBILE_ERROR_REDIRECT + '?error=invalid_state')

    try:
        services.exchange_code_and_save(user, code, state)
    except Exception as e:
        logger.exception('Google Calendar token exchange failed: %s', e)
        return _scheme_redirect(MOBILE_ERROR_REDIRECT + '?error=token_exchange_failed')

    # Kick off an initial sync right away (background thread)
    services.trigger_sync(user.id)

    return _scheme_redirect(MOBILE_SUCCESS_REDIRECT)


# --- Manual sync trigger ---

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def google_calendar_sync(request):
    try:
        integration = request.user.google_calendar
        if not integration.is_active:
            return Response({'error': 'Google Calendar is not connected.'}, status=status.HTTP_400_BAD_REQUEST)
    except GoogleCalendarIntegration.DoesNotExist:
        return Response({'error': 'Google Calendar is not connected.'}, status=status.HTTP_400_BAD_REQUEST)

    services.trigger_sync(request.user.id)
    return Response({'message': 'Sync started.'}, status=status.HTTP_202_ACCEPTED)
