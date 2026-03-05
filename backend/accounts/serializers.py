from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'is_verified']


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField(required=True)


class RequestOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    code = serializers.CharField(max_length=6, min_length=6, required=True)
