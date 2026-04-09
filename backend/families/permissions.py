from .models import FamilyMember


def get_membership(user, family):
    """Return FamilyMember or None."""
    return FamilyMember.objects.filter(family=family, user=user).first()


def is_family_member(user, family):
    return FamilyMember.objects.filter(family=family, user=user).exists()


def is_family_admin(user, family):
    return FamilyMember.objects.filter(family=family, user=user, role=FamilyMember.ROLE_ADMIN).exists()
