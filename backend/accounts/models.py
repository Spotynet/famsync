from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_superuser(self, email, password=None, **kwargs):
        user = self.model(email=email, username=email, is_staff=True, is_superuser=True, **kwargs)
        user.set_password(password)
        user.save(using=self._db)
        return user


class User(AbstractUser):
    """Custom user with email as primary identifier, passwordless auth support."""
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True, blank=True)  # Keep for admin, can use email
    objects = UserManager()
    google_id = models.CharField(max_length=255, unique=True, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email


class VerificationCode(models.Model):
    """One-time verification code for email login/registration."""
    email = models.EmailField(db_index=True)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
