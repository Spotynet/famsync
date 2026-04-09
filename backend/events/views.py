from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from families.models import Family, FamilyMember
from families.permissions import get_membership, is_family_admin, is_family_member

from .models import Category, Event, EventAttendee
from .serializers import CategorySerializer, EventSerializer, EventWithFamilySerializer


def _require_member(user, family):
    membership = get_membership(user, family)
    if not membership:
        return None, Response({'error': 'Not a member of this family.'}, status=status.HTTP_403_FORBIDDEN)
    return membership, None


def _require_admin(user, family):
    membership = get_membership(user, family)
    if not membership or membership.role != FamilyMember.ROLE_ADMIN:
        return None, Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
    return membership, None


# --- Global categories ---

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_categories(request):
    cats = Category.objects.filter(family__isnull=True)
    return Response(CategorySerializer(cats, many=True).data)


# --- Family categories ---

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def family_categories(request, family_id):
    family = get_object_or_404(Family, id=family_id)
    _, err = _require_member(request.user, family)
    if err:
        return err

    if request.method == 'GET':
        cats = Category.objects.filter(family__isnull=True) | Category.objects.filter(family=family)
        return Response(CategorySerializer(cats.order_by('order', 'label'), many=True).data)

    _, err = _require_admin(request.user, family)
    if err:
        return err
    serializer = CategorySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    cat = serializer.save(family=family)
    return Response(CategorySerializer(cat).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def family_category_detail(request, family_id, cat_id):
    family = get_object_or_404(Family, id=family_id)
    cat = get_object_or_404(Category, id=cat_id, family=family)

    _, err = _require_admin(request.user, family)
    if err:
        return err

    if request.method == 'PATCH':
        serializer = CategorySerializer(cat, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(CategorySerializer(cat).data)

    if request.method == 'DELETE':
        if cat.is_default:
            return Response({'error': 'Cannot delete default categories.'}, status=status.HTTP_400_BAD_REQUEST)
        cat.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# --- Events ---

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def event_list_create(request, family_id):
    family = get_object_or_404(Family, id=family_id)
    membership, err = _require_member(request.user, family)
    if err:
        return err

    if request.method == 'GET':
        qs = Event.objects.filter(family=family).select_related('category', 'created_by').prefetch_related('attendees__family_member')

        date = request.query_params.get('date')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        member_id = request.query_params.get('member_id')
        priority = request.query_params.get('priority')
        category = request.query_params.get('category')

        if date:
            qs = qs.filter(date=date)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if member_id:
            qs = qs.filter(attendees__family_member_id=member_id)
        if priority:
            qs = qs.filter(priority=priority)
        if category:
            qs = qs.filter(category_id=category)

        return Response(EventSerializer(qs, many=True).data)

    serializer = EventSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    event = serializer.save(family=family, created_by=membership)
    return Response(EventSerializer(event).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def event_detail(request, family_id, event_id):
    family = get_object_or_404(Family, id=family_id)
    membership, err = _require_member(request.user, family)
    if err:
        return err

    event = get_object_or_404(Event, id=event_id, family=family)

    if request.method == 'GET':
        return Response(EventSerializer(event).data)

    # Edit or delete — must be creator or admin
    is_creator = event.created_by == membership
    is_admin = membership.role == FamilyMember.ROLE_ADMIN
    if not (is_creator or is_admin):
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PATCH':
        serializer = EventSerializer(event, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(EventSerializer(event).data)

    if request.method == 'DELETE':
        event.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# --- Attendee RSVP ---

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def attendee_me(request, family_id, event_id):
    family = get_object_or_404(Family, id=family_id)
    membership, err = _require_member(request.user, family)
    if err:
        return err

    event = get_object_or_404(Event, id=event_id, family=family)
    attendee = get_object_or_404(EventAttendee, event=event, family_member=membership)

    new_status = request.data.get('status')
    if new_status not in [EventAttendee.STATUS_ACCEPTED, EventAttendee.STATUS_DECLINED, EventAttendee.STATUS_PENDING]:
        return Response({'error': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

    attendee.status = new_status
    attendee.save(update_fields=['status'])
    return Response({'status': attendee.status})


# --- Cross-group events for the authenticated user ---

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_events(request):
    """Return events from ALL groups the user belongs to."""
    family_ids = FamilyMember.objects.filter(
        user=request.user
    ).values_list('family_id', flat=True)

    qs = (
        Event.objects
        .filter(family_id__in=family_ids)
        .select_related('category', 'created_by', 'family')
        .prefetch_related('attendees__family_member')
    )

    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    if date_from:
        qs = qs.filter(date__gte=date_from)
    if date_to:
        qs = qs.filter(date__lte=date_to)

    return Response(EventWithFamilySerializer(qs, many=True).data)
