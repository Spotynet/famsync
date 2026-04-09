from rest_framework import serializers

from .models import Family, FamilyMember


class FamilyMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = FamilyMember
        fields = ['id', 'user_id', 'email', 'role', 'display_name', 'color', 'initials', 'joined_at']
        read_only_fields = ['id', 'user_id', 'email', 'joined_at']


class FamilySerializer(serializers.ModelSerializer):
    members = FamilyMemberSerializer(many=True, read_only=True)
    created_by_id = serializers.IntegerField(source='created_by.id', read_only=True, default=None)

    class Meta:
        model = Family
        fields = ['id', 'name', 'description', 'color', 'invite_code', 'invite_code_expires_at',
                  'created_by_id', 'created_at', 'members']
        read_only_fields = ['id', 'invite_code', 'created_by_id', 'created_at']


class FamilyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Family
        fields = ['name', 'description', 'color']

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError('Name cannot be blank.')
        return value.strip()


class FamilyMemberUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyMember
        fields = ['role', 'display_name', 'color', 'initials']
