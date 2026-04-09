"""
Fernet-based symmetric encryption for OAuth tokens stored in the DB.
Uses FIELD_ENCRYPTION_KEY from settings.
"""
from cryptography.fernet import Fernet
from django.conf import settings


def _fernet():
    key = settings.FIELD_ENCRYPTION_KEY
    if not key:
        raise RuntimeError('FIELD_ENCRYPTION_KEY is not set in settings.')
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt(plaintext: str) -> str:
    """Encrypt a string and return a base64-encoded ciphertext string."""
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt a base64-encoded ciphertext string and return plaintext."""
    return _fernet().decrypt(ciphertext.encode()).decode()
