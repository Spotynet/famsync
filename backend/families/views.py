import secrets
import string

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Family, FamilyMember
from .permissions import get_membership, is_family_admin, is_family_member
from .serializers import (
    FamilyCreateSerializer,
    FamilyMemberSerializer,
    FamilyMemberUpdateSerializer,
    FamilySerializer,
)


def _require_member(user, family):
    """Return membership or raise 403."""
    membership = get_membership(user, family)
    if not membership:
        return None, Response({'error': 'Not a member of this family.'}, status=status.HTTP_403_FORBIDDEN)
    return membership, None


def _require_admin(user, family):
    """Return membership or raise 403."""
    membership = get_membership(user, family)
    if not membership or membership.role != FamilyMember.ROLE_ADMIN:
        return None, Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
    return membership, None


# --- Family list / create ---

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def family_list_create(request):
    if request.method == 'GET':
        memberships = request.user.family_memberships.select_related('family').all()
        families = [m.family for m in memberships]
        return Response(FamilySerializer(families, many=True).data)

    serializer = FamilyCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    family = serializer.save(created_by=request.user)
    # Creator becomes admin automatically
    FamilyMember.objects.create(
        family=family,
        user=request.user,
        role=FamilyMember.ROLE_ADMIN,
        display_name=request.user.first_name or request.user.email.split('@')[0],
    )
    return Response(FamilySerializer(family).data, status=status.HTTP_201_CREATED)


# --- Family detail / update / delete ---

@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def family_detail(request, family_id):
    family = get_object_or_404(Family, id=family_id)

    if request.method == 'GET':
        _, err = _require_member(request.user, family)
        if err:
            return err
        return Response(FamilySerializer(family).data)

    if request.method == 'PATCH':
        _, err = _require_admin(request.user, family)
        if err:
            return err
        serializer = FamilyCreateSerializer(family, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(FamilySerializer(family).data)

    if request.method == 'DELETE':
        _, err = _require_admin(request.user, family)
        if err:
            return err
        if family.created_by != request.user:
            return Response({'error': 'Only the creator can delete this family.'}, status=status.HTTP_403_FORBIDDEN)
        family.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# --- Invite code regeneration ---

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def family_invite(request, family_id):
    family = get_object_or_404(Family, id=family_id)
    _, err = _require_admin(request.user, family)
    if err:
        return err

    alphabet = string.ascii_uppercase + string.digits
    family.invite_code = ''.join(secrets.choice(alphabet) for _ in range(12))
    family.save(update_fields=['invite_code'])
    return Response({'invite_code': family.invite_code})


# --- Join via invite code ---

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def family_join(request):
    invite_code = request.data.get('invite_code', '').strip()
    if not invite_code:
        return Response({'error': 'invite_code is required.'}, status=status.HTTP_400_BAD_REQUEST)

    family = Family.objects.filter(invite_code=invite_code).first()
    if not family:
        return Response({'error': 'Invalid invite code.'}, status=status.HTTP_404_NOT_FOUND)

    if is_family_member(request.user, family):
        return Response({'error': 'Already a member of this family.'}, status=status.HTTP_400_BAD_REQUEST)

    member = FamilyMember.objects.create(
        family=family,
        user=request.user,
        role=FamilyMember.ROLE_MEMBER,
        display_name=request.user.first_name or request.user.email.split('@')[0],
    )
    return Response({
        'family': {'id': family.id, 'name': family.name, 'color': family.color},
        'member': FamilyMemberSerializer(member).data,
    }, status=status.HTTP_201_CREATED)


# --- Members list ---

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def family_members(request, family_id):
    family = get_object_or_404(Family, id=family_id)
    _, err = _require_member(request.user, family)
    if err:
        return err
    members = family.members.select_related('user').all()
    return Response(FamilyMemberSerializer(members, many=True).data)


# --- Member update / remove ---

@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def family_member_detail(request, family_id, member_id):
    family = get_object_or_404(Family, id=family_id)
    member = get_object_or_404(FamilyMember, id=member_id, family=family)

    _, err = _require_admin(request.user, family)
    if err:
        return err

    if request.method == 'PATCH':
        serializer = FamilyMemberUpdateSerializer(member, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(FamilyMemberSerializer(member).data)

    if request.method == 'DELETE':
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# --- Leave family (own membership) ---

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def family_leave(request, family_id):
    family = get_object_or_404(Family, id=family_id)
    membership, err = _require_member(request.user, family)
    if err:
        return err
    membership.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
