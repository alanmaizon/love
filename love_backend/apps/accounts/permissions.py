"""OrgMembership role helpers — single source for content vs money powers."""
from accounts.models import OrgMembership

CONTENT_ROLES = (OrgMembership.OWNER, OrgMembership.ADMIN, OrgMembership.EDITOR)
MONEY_ROLES = (OrgMembership.OWNER, OrgMembership.ADMIN)
ADMIN_ROLES = (OrgMembership.OWNER, OrgMembership.ADMIN)


def charity_ids_for_user(user, roles=None):
    if not user or not user.is_authenticated:
        return []
    qs = OrgMembership.objects.filter(user=user)
    if roles is not None:
        qs = qs.filter(role__in=roles)
    return list(qs.values_list("charity_id", flat=True))


def user_manages_charity(user, charity, roles=ADMIN_ROLES):
    if user and user.is_authenticated and user.is_staff:
        return True
    if not user or not user.is_authenticated:
        return False
    return OrgMembership.objects.filter(
        user=user, charity=charity, role__in=roles,
    ).exists()


def user_can_edit_charity_profile(user, charity):
    return user_manages_charity(user, charity, roles=CONTENT_ROLES)
