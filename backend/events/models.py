from django.conf import settings
from django.db import models


class Category(models.Model):
    family = models.ForeignKey(
        'families.Family',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='categories',
    )
    label = models.CharField(max_length=50)
    icon = models.CharField(max_length=50, default='ellipsis-horizontal')
    color = models.CharField(max_length=7, default='#9CA3AF')
    is_default = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['order', 'label']

    def __str__(self):
        return self.label


class Event(models.Model):
    PRIORITY_LOW = 'low'
    PRIORITY_MEDIUM = 'medium'
    PRIORITY_HIGH = 'high'
    PRIORITY_FAMILY = 'family'
    PRIORITY_CHOICES = [
        (PRIORITY_LOW, 'Low'),
        (PRIORITY_MEDIUM, 'Medium'),
        (PRIORITY_HIGH, 'High'),
        (PRIORITY_FAMILY, 'Family'),
    ]

    family = models.ForeignKey(
        'families.Family',
        on_delete=models.CASCADE,
        related_name='events',
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events',
    )
    created_by = models.ForeignKey(
        'families.FamilyMember',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_events',
    )
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    all_day = models.BooleanField(default=False)
    location = models.CharField(max_length=255, blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM)
    # Used to track events imported from Google Calendar; avoids duplicates on re-sync
    google_event_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=['family', 'date'])]
        ordering = ['date', 'start_time']

    def __str__(self):
        return f'{self.title} ({self.date})'


class EventAttendee(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_DECLINED = 'declined'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_DECLINED, 'Declined'),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='attendees')
    family_member = models.ForeignKey(
        'families.FamilyMember',
        on_delete=models.CASCADE,
        related_name='event_attendances',
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)

    class Meta:
        unique_together = ('event', 'family_member')
