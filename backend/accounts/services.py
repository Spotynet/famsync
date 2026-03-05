"""
Auth services: Google token verification, OTP generation, email sending.
"""
from typing import Optional
import secrets
from datetime import timedelta
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from .models import User, VerificationCode


def verify_google_token(id_token_str: str) -> Optional[dict]:
    """Verify Google ID token and return payload, or None if invalid."""
    try:
        idinfo = id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
        return idinfo
    except (ValueError, Exception):
        return None


def get_or_create_user_from_google(payload: dict) -> User:
    """Get or create user from Google OAuth payload."""
    email = payload.get('email')
    google_id = payload.get('sub')
    email_verified = payload.get('email_verified', False)
    name = payload.get('name', '')
    given_name = payload.get('given_name', '')
    family_name = payload.get('family_name', '')

    if not email:
        raise ValueError('Email not provided by Google')

    user = User.objects.filter(google_id=google_id).first()
    if user:
        user.is_verified = user.is_verified or email_verified
        user.save()
        return user

    user = User.objects.filter(email=email).first()
    if user:
        user.google_id = google_id
        user.is_verified = user.is_verified or email_verified
        user.set_unusable_password()
        user.save()
        return user

    # Create new user
    first_name = given_name or (name.split()[0] if name else '')
    last_name = family_name or (name.split()[-1] if len(name.split()) > 1 else '')
    user = User.objects.create(
        email=email,
        username=email,
        google_id=google_id,
        first_name=first_name,
        last_name=last_name,
        is_verified=bool(email_verified),
    )
    user.set_unusable_password()
    user.save()
    return user


def generate_otp_code() -> str:
    """Generate a 6-digit cryptographically random OTP."""
    return ''.join(secrets.choice('0123456789') for _ in range(6))


def create_and_send_otp(email: str) -> bool:
    """
    Create verification code, send email, return True on success.
    """
    # Invalidate any existing unused codes for this email
    VerificationCode.objects.filter(email=email, used=False).update(used=True)

    code = generate_otp_code()
    expires_at = timezone.now() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
    VerificationCode.objects.create(email=email, code=code, expires_at=expires_at)

    subject = 'Tu código de verificación - Famsync'
    message = f'Tu código de verificación es: {code}\n\nVálido por {settings.OTP_EXPIRY_MINUTES} minutos.'
    from_email = settings.DEFAULT_FROM_EMAIL

    send_mail(
        subject=subject,
        message=message,
        from_email=from_email,
        recipient_list=[email],
        fail_silently=False,
    )
    return True


def verify_otp(email: str, code: str) -> Optional[User]:
    """
    Verify OTP and return user (get or create). Returns None if invalid.
    """
    now = timezone.now()
    vc = (
        VerificationCode.objects
        .filter(email=email, code=code, used=False, expires_at__gt=now)
        .order_by('-created_at')
        .first()
    )
    if not vc:
        return None

    vc.used = True
    vc.save()

    user = User.objects.filter(email=email).first()
    if user:
        user.is_verified = True
        user.set_unusable_password()
        user.save()
        return user

    user = User.objects.create(
        email=email,
        username=email,
        is_verified=True,
    )
    user.set_unusable_password()
    user.save()
    return user
