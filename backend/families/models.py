import secrets
import string

from django.conf import settings
from django.db import models


def _generate_invite_code():
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(12))


class Family(models.Model):
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True)
    color = models.CharField(max_length=7, default='#22C55E')
    invite_code = models.CharField(max_length=12, unique=True, default=_generate_invite_code)
    invite_code_expires_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_families',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'families'

    def __str__(self):
        return self.name


class FamilyMember(models.Model):
    ROLE_ADMIN = 'admin'
    ROLE_MEMBER = 'member'
    ROLE_CHOICES = [(ROLE_ADMIN, 'Admin'), (ROLE_MEMBER, 'Member')]

    family = models.ForeignKey(Family, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='family_memberships',
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_MEMBER)
    display_name = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=7, default='#60A5FA')
    initials = models.CharField(max_length=3, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('family', 'user')

    def __str__(self):
        return f'{self.user.email} in {self.family.name} ({self.role})'
