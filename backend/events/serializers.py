from rest_framework import serializers

from .models import Category, Event, EventAttendee


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'label', 'icon', 'color', 'is_default', 'order']
        read_only_fields = ['id', 'is_default']


class EventAttendeeSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source='family_member.display_name', read_only=True)
    color = serializers.CharField(source='family_member.color', read_only=True)
    initials = serializers.CharField(source='family_member.initials', read_only=True)
    member_id = serializers.IntegerField(source='family_member.id', read_only=True)

    class Meta:
        model = EventAttendee
        fields = ['id', 'member_id', 'display_name', 'color', 'initials', 'status']


class EventSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        write_only=True,
        required=False,
        allow_null=True,
    )
    attendees = EventAttendeeSerializer(many=True, read_only=True)
    attendee_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
    )
    created_by = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'date', 'start_time', 'end_time',
            'all_day', 'location', 'priority', 'category', 'category_id',
            'attendees', 'attendee_ids', 'created_by', 'created_at', 'updated_at',
            'google_event_id',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'attendees', 'category', 'google_event_id']

    def get_created_by(self, obj):
        if obj.created_by:
            return {'id': obj.created_by.id, 'display_name': obj.created_by.display_name}
        return None

    def create(self, validated_data):
        attendee_ids = validated_data.pop('attendee_ids', [])
        event = Event.objects.create(**validated_data)
        self._set_attendees(event, attendee_ids)
        return event

    def update(self, instance, validated_data):
        attendee_ids = validated_data.pop('attendee_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if attendee_ids is not None:
            self._set_attendees(instance, attendee_ids)
        return instance

    def _set_attendees(self, event, member_ids):
        from families.models import FamilyMember
        EventAttendee.objects.filter(event=event).delete()
        for member_id in member_ids:
            try:
                member = FamilyMember.objects.get(id=member_id, family=event.family)
                EventAttendee.objects.create(event=event, family_member=member)
            except FamilyMember.DoesNotExist:
                pass


class EventWithFamilySerializer(EventSerializer):
    """EventSerializer that also exposes the owning family's id, name and color."""
    family_id = serializers.IntegerField(source='family.id', read_only=True)
    family_name = serializers.CharField(source='family.name', read_only=True)
    family_color = serializers.CharField(source='family.color', read_only=True)

    class Meta(EventSerializer.Meta):
        fields = EventSerializer.Meta.fields + ['family_id', 'family_name', 'family_color']
