
import json

import frappe
from frappe import _
from frappe.utils import cint


USER_MANAGER_ROLE = "Financial Assessment"
ROLE_PREFIX = "Financial Assessment"
APP_MODULE = "Financial Assessment"


def _check_user_management_access():
    """Allow only Financial Assessment managers to manage users."""

    if frappe.session.user == "Guest":
        frappe.throw(_("Please log in to continue."), frappe.PermissionError)

    if not frappe.db.exists(
        "Has Role",
        {
            "parent": frappe.session.user,
            "role": USER_MANAGER_ROLE,
            "parenttype": "User",
        },
    ):
        frappe.throw(
            _("You are not authorized to manage Financial Assessment users."),
            frappe.PermissionError,
        )


def _is_fa_role(role):
    """Check whether a role belongs to the Financial Assessment app."""

    return (
        isinstance(role, str)
        and role.startswith(ROLE_PREFIX)
        and frappe.db.exists("Role", role)
    )


def _parse_roles(roles):
    """Convert role input into a validated list."""

    if isinstance(roles, str):
        try:
            roles = json.loads(roles)
        except (TypeError, ValueError):
            frappe.throw(_("Invalid role selection."))

    if not isinstance(roles, list):
        frappe.throw(_("Roles must be provided as a list."))

    cleaned_roles = []

    for role in roles:
        if not isinstance(role, str):
            frappe.throw(_("Invalid role selection."))

        role = role.strip()

        if role and role not in cleaned_roles:
            cleaned_roles.append(role)

    return cleaned_roles


def _validate_fa_roles(roles):
    """Validate that selected roles are Financial Assessment roles."""

    invalid = [
        role
        for role in roles
        if role == USER_MANAGER_ROLE or not _is_fa_role(role)
    ]

    if invalid:
        frappe.throw(
            _("Invalid or unauthorized roles: {0}").format(
                ", ".join(sorted(invalid))
            )
        )

    if not roles:
        frappe.throw(_("Please select at least one Financial Assessment role."))


def _has_fa_role(user):
    """Check whether a user has any Financial Assessment role."""

    return bool(
        frappe.db.exists(
            "Has Role",
            {
                "parent": user,
                "parenttype": "User",
                "role": ["like", f"{ROLE_PREFIX}%"],
            },
        )
    )


def _get_user_roles(user):
    """Return Financial Assessment roles assigned to a user."""

    roles = frappe.get_all(
        "Has Role",
        filters={
            "parent": user,
            "parenttype": "User",
            "role": ["like", f"{ROLE_PREFIX}%"],
        },
        pluck="role",
    )

    return sorted(set(roles))


def _set_financial_assessment_module_access(user):
    """Allow only the Financial Assessment module."""

    from frappe.utils.modules import get_blockable_module_names

    allowed_module = APP_MODULE

    blocked_modules = [
        module
        for module in get_blockable_module_names()
        if module != allowed_module
    ]

    user.set(
        "block_modules",
        [{"module": module} for module in blocked_modules],
    )


@frappe.whitelist()
def get_available_roles():
    """Return assignable Financial Assessment roles."""

    _check_user_management_access()

    roles = frappe.get_all(
        "Role",
        filters={
            "name": ["like", f"{ROLE_PREFIX}%"],
            "disabled": 0,
        },
        pluck="name",
        order_by="name asc",
    )

    return [
        role
        for role in roles
        if role != USER_MANAGER_ROLE
    ]


@frappe.whitelist()
def create_user(
    email,
    first_name,
    last_name=None,
    roles=None,
    password=None,
    confirm_password=None,
):
    """Create a new Financial Assessment user."""

    _check_user_management_access()

    email = (email or "").strip().lower()
    first_name = (first_name or "").strip()
    last_name = (last_name or "").strip()

    if not email or not first_name:
        frappe.throw(_("Email address and first name are required."))

    if frappe.db.exists("User", email):
        frappe.throw(_("A user with email {0} already exists.").format(email))

    if not password:
        frappe.throw(_("Password is required."))

    if password != confirm_password:
        frappe.throw(_("Passwords do not match."))

    selected_roles = _parse_roles(roles)
    _validate_fa_roles(selected_roles)

    user = frappe.new_doc("User")
    user.email = email
    user.first_name = first_name
    user.last_name = last_name
    user.enabled = 1
    user.user_type = "System User"
    user.send_welcome_email = 0

    user.flags.ignore_permissions = True
    user.insert()

    # Replace default roles with the selected Financial Assessment roles.
    user.set("roles", [])

    for role in selected_roles:
        user.append("roles", {"role": role})

    _set_financial_assessment_module_access(user)

    user.flags.ignore_permissions = True
    user.save()

    user.new_password = password
    user.save()

    frappe.db.commit()

    return {
        "success": True,
        "message": _("User {0} created successfully.").format(email),
        "user": email,
    }


@frappe.whitelist()
def get_financial_assessment_users():
    """Get users who have at least one Financial Assessment role."""

    _check_user_management_access()

    role_users = frappe.get_all(
        "Has Role",
        filters={
            "parenttype": "User",
            "role": ["like", f"{ROLE_PREFIX}%"],
        },
        pluck="parent",
    )

    user_ids = sorted(set(role_users))

    if not user_ids:
        return []

    users = frappe.get_all(
        "User",
        filters={
            "name": ["in", user_ids],
            "user_type": "System User",
        },
        fields=[
            "name",
            "email",
            "first_name",
            "last_name",
            "enabled",
        ],
        order_by="first_name asc",
    )

    for user in users:
        user["roles"] = _get_user_roles(user.name)
        user["is_manager"] = USER_MANAGER_ROLE in user["roles"]

    return users


@frappe.whitelist()
def update_financial_assessment_user(
    user_id,
    email,
    first_name,
    last_name=None,
    enabled=1,
    roles=None,
):
    """Update a Financial Assessment user's details and roles."""

    _check_user_management_access()

    if not frappe.db.exists("User", user_id):
        frappe.throw(_("User does not exist."))

    user = frappe.get_doc("User", user_id)

    if user.user_type != "System User":
        frappe.throw(_("Only System Users can be updated here."))

    if not _has_fa_role(user_id):
        frappe.throw(
            _("This user does not have a Financial Assessment role.")
        )

    email = (email or "").strip().lower()
    first_name = (first_name or "").strip()
    last_name = (last_name or "").strip()

    if not email or not first_name:
        frappe.throw(_("Email address and first name are required."))

    if email != user_id and frappe.db.exists("User", email):
        frappe.throw(_("A user with email {0} already exists.").format(email))

    is_manager = frappe.db.exists(
        "Has Role",
        {
            "parent": user_id,
            "parenttype": "User",
            "role": USER_MANAGER_ROLE,
        },
    )

    # Do not allow the manager account to be disabled or have its roles changed.
    if is_manager and roles is not None:
        frappe.throw(
            _("The Financial Assessment manager's roles cannot be changed here.")
        )

    if is_manager and not cint(enabled):
        frappe.throw(
            _("The Financial Assessment manager account cannot be disabled here.")
        )

    if roles is not None:
        selected_roles = _parse_roles(roles)
        _validate_fa_roles(selected_roles)

        existing_roles = frappe.get_all(
            "Has Role",
            filters={
                "parent": user_id,
                "parenttype": "User",
            },
            pluck="role",
        )

        # Preserve any roles outside the Financial Assessment app.
        non_fa_roles = [
            role
            for role in existing_roles
            if not role.startswith(ROLE_PREFIX)
        ]

        user.set("roles", [])

        for role in non_fa_roles + selected_roles:
            user.append("roles", {"role": role})

    user.first_name = first_name
    user.last_name = last_name
    user.enabled = cint(enabled)

    _set_financial_assessment_module_access(user)

    user.flags.ignore_permissions = True
    user.save()

    if email != user_id:
        frappe.rename_doc(
            "User",
            user_id,
            email,
            force=True,
        )

    frappe.db.commit()

    return {
        "success": True,
        "message": _("User updated successfully."),
        "user": email,
    }


@frappe.whitelist()
def update_financial_assessment_user_password(user_id, new_password):
    """Update the password of a Financial Assessment user."""

    _check_user_management_access()

    if not frappe.db.exists("User", user_id):
        frappe.throw(_("User does not exist."))

    if not _has_fa_role(user_id):
        frappe.throw(
            _("This user does not have a Financial Assessment role.")
        )

    if not new_password:
        frappe.throw(_("Please enter a new password."))

    if frappe.session.user == user_id:
        frappe.throw(
            _("Use your account password settings to change your own password.")
        )

    user = frappe.get_doc("User", user_id)
    user.new_password = new_password
    user.flags.ignore_permissions = True
    user.save()

    frappe.db.commit()

    return {
        "success": True,
        "message": _("Password updated successfully."),
    }
