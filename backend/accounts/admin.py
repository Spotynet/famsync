from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, VerificationCode


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'is_verified', 'google_id', 'created_at']
    list_filter = ['is_verified', 'is_staff']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-created_at']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal', {'fields': ('first_name', 'last_name')}),
        ('Auth', {'fields': ('google_id', 'is_verified')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
        ('Dates', {'fields': ('created_at', 'updated_at')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2'),
        }),
    )


@admin.register(VerificationCode)
class VerificationCodeAdmin(admin.ModelAdmin):
    list_display = ['email', 'code', 'used', 'created_at', 'expires_at']
    list_filter = ['used']
    search_fields = ['email']
    readonly_fields = ['created_at']
