from django.conf import settings
from django.db import models


class GoogleCalendarIntegration(models.Model):
    """
    Stores per-user Google Calendar OAuth tokens (Fernet-encrypted at rest).
    One row per user; updated on each token refresh.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='google_calendar',
    )
    # Tokens are stored as Fernet-encrypted strings (see integrations.encryption)
    access_token = models.TextField()
    refresh_token = models.TextField()
    token_expiry = models.DateTimeField(null=True, blank=True)
    calendar_id = models.CharField(max_length=255, default='primary')
    last_sync_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'GoogleCalendar({self.user.email}, active={self.is_active})'
