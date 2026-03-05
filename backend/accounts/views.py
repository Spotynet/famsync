"""
Auth API views: Google, email OTP, logout, me.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django_ratelimit.decorators import ratelimit

from .models import User
from .serializers import (
    GoogleAuthSerializer,
    RequestOTPSerializer,
    VerifyOTPSerializer,
    UserSerializer,
)
from .services import (
    verify_google_token,
    get_or_create_user_from_google,
    create_and_send_otp,
    verify_otp,
)


def get_tokens_for_user(user: User) -> dict:
    """Return access and refresh tokens for user."""
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    """Exchange Google ID token for JWT."""
    serializer = GoogleAuthSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    payload = verify_google_token(serializer.validated_data['id_token'])
    if not payload:
        return Response(
            {'error': 'Invalid or expired Google token'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    try:
        user = get_or_create_user_from_google(payload)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(get_tokens_for_user(user), status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='3/15m', method='POST')
def request_otp(request):
    """Send OTP to email."""
    if getattr(request, 'limited', False):
        return Response(
            {'error': 'Too many requests. Please try again later.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    serializer = RequestOTPSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email']
    try:
        create_and_send_otp(email)
    except Exception as e:
        return Response(
            {'error': 'Failed to send verification code.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response({'message': 'Verification code sent to your email'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='10/15m', method='POST')
def verify_otp_view(request):
    """Verify OTP and return JWT."""
    if getattr(request, 'limited', False):
        return Response(
            {'error': 'Too many attempts. Please try again later.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    serializer = VerifyOTPSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email']
    code = serializer.validated_data['code']
    user = verify_otp(email, code)

    if not user:
        return Response(
            {'error': 'Invalid or expired verification code'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    return Response(get_tokens_for_user(user), status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Blacklist refresh token on logout."""
    refresh_token = request.data.get('refresh')
    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass
    return Response({'message': 'Logged out'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Get current user."""
    return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)
