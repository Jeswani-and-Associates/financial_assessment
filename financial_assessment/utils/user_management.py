
import frappe
from frappe import _


USER_MANAGER_ROLE = "Financial Assessment"

ALLOWED_USER_ROLES = {
    "Financial Assessment Users",
}


def _check_user_management_access():
    """Restrict this API to authorized Financial Assessment users."""

    if frappe.session.user == "Guest":
        frappe.throw(
            _("Login is required."),
            frappe.PermissionError,
        )

    user_roles = frappe.get_roles(frappe.session.user)

    if USER_MANAGER_ROLE not in user_roles:
        frappe.throw(
            _("You are not permitted to manage users."),
            frappe.PermissionError,
        )


@frappe.whitelist()
def get_available_roles():
    """Return only approved Financial Assessment roles."""
    _check_user_management_access()

    return sorted(ALLOWED_USER_ROLES)

def set_financial_assessment_module_access(user):
    """Allow only the Financial Assessment module for this user."""

    from frappe.utils.modules import get_blockable_module_names

    allowed_module = "Financial Assessment"

    if not frappe.db.exists("Module Def", allowed_module):
        frappe.throw(_("Financial Assessment module does not exist."))

    all_modules = get_blockable_module_names()

    user.module_profile = None
    user.block_modules = []

    for module in all_modules:
        if module != allowed_module:
            user.append("block_modules", {"module": module})


@frappe.whitelist()
def create_user(email, first_name, roles, last_name=None,
                password=None, confirm_password=None):
    """Create a System User with an initial password."""
    _check_user_management_access()

    email = (email or "").strip().lower()
    first_name = (first_name or "").strip()
    last_name = (last_name or "").strip()

    if not email or not first_name:
        frappe.throw(_("Email and first name are required."))

    if not password:
        frappe.throw(_("Password is required."))

    if password != confirm_password:
        frappe.throw(_("Passwords do not match."))

    if frappe.db.exists("User", email):
        frappe.throw(_("A user with this email already exists."))

    if isinstance(roles, str):
        roles = frappe.parse_json(roles)

    if not isinstance(roles, list):
        frappe.throw(_("Roles must be provided as a list."))

    roles = list(dict.fromkeys(roles))

    if not roles:
        frappe.throw(_("Select at least one role."))

    invalid_roles = set(roles) - ALLOWED_USER_ROLES
    if invalid_roles:
        frappe.throw(
            _("Invalid or disabled roles: {0}").format(
                ", ".join(sorted(invalid_roles))
            )
        )

    user = frappe.get_doc({
        "doctype": "User",
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "enabled": 1,
        "user_type": "System User",
        "send_welcome_email": 0,
        "roles": [{"role": role} for role in roles],
    })

    set_financial_assessment_module_access(user)
    user.new_password = password
    user.insert(ignore_permissions=True)

    return {
        "name": user.name,
        "message": _("User created successfully with an initial password."),
    }
