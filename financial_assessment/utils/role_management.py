import json

import frappe
from frappe import _
from frappe.utils import cint


MANAGER_ROLE = "Financial Assessment"
APP_MODULE = "Financial Assessment"
ROLE_PREFIX = "Financial Assessment"

PERMISSION_FIELDS = [
    "select",
    "read",
    "write",
    "create",
    "delete",
    "print",
    # "submit",
    # "cancel",
    # "amend",
    
    # "email",
    # "export",
    # "import",
    # "report",
    # "share",
]


def _check_role_management_access():
    if frappe.session.user == "Guest":
        frappe.throw(_("Login is required."), frappe.PermissionError)

    if MANAGER_ROLE not in frappe.get_roles(frappe.session.user):
        frappe.throw(
            _("You are not permitted to manage Financial Assessment roles."),
            frappe.PermissionError,
        )


def _get_allowed_doctype(doctype_name):
    """Only allow standalone DocTypes in our own module."""

    if not frappe.db.exists("DocType", doctype_name):
        frappe.throw(_("Invalid DocType: {0}").format(doctype_name))

    details = frappe.db.get_value(
        "DocType",
        doctype_name,
        ["module", "istable"],
        as_dict=True,
    )

    if details.module != APP_MODULE or cint(details.istable):
        frappe.throw(
            _("Only standalone DocTypes from the Financial Assessment module are allowed.")
        )

    return details


@frappe.whitelist()
def get_financial_assessment_doctypes():
    """Return selectable DocTypes from the Financial Assessment module."""

    _check_role_management_access()

    return frappe.get_all(
        "DocType",
        filters={
            "module": APP_MODULE,
            "istable": 0,
        },
        fields=["name"],
        order_by="name asc",
    )


def _get_configured_roles():
    """Get roles configured on Financial Assessment DocTypes."""

    doctypes = frappe.get_all(
        "DocType",
        filters={
            "module": APP_MODULE,
            "istable": 0,
        },
        pluck="name",
    )

    roles = set()

    for doctype_name in doctypes:
        # Standard permissions defined on the DocType.
        doctype_doc = frappe.get_doc("DocType", doctype_name)

        for permission in doctype_doc.permissions:
            if permission.role:
                roles.add(permission.role)

        # Custom permissions configured through Role Permission Manager.
        custom_roles = frappe.get_all(
            "Custom DocPerm",
            filters={"parent": doctype_name},
            pluck="role",
        )

        roles.update(role for role in custom_roles if role)

    excluded_roles = {
        "System Manager",
        "Administrator",
        "Guest",
        "All",
        "Desk User",
        MANAGER_ROLE,
    }

    return sorted(
        role
        for role in roles
        if role not in excluded_roles
        and frappe.db.exists("Role", role)
    )


@frappe.whitelist()
def get_financial_assessment_roles():
    """Return roles configured for Financial Assessment DocTypes."""

    _check_role_management_access()
    return _get_configured_roles()


@frappe.whitelist()
def get_role_permissions(role_name):
    """Load the current permissions for an existing role."""

    _check_role_management_access()

    role_name = (role_name or "").strip()

    if role_name not in _get_configured_roles():
        frappe.throw(
            _("This role is not configured for the Financial Assessment module.")
        )

    result = []

    doctypes = frappe.get_all(
        "DocType",
        filters={
            "module": APP_MODULE,
            "istable": 0,
        },
        pluck="name",
        order_by="name asc",
    )

    for doctype_name in doctypes:
        # Prefer custom permissions when they exist.
        permission = frappe.db.get_value(
            "Custom DocPerm",
            {
                "parent": doctype_name,
                "role": role_name,
                "permlevel": 0,
            },
            ["role", *PERMISSION_FIELDS],
            as_dict=True,
        )

        if not permission:
            # Otherwise load the role's standard DocType permissions.
            doctype_doc = frappe.get_doc("DocType", doctype_name)

            permission = next(
                (
                    row
                    for row in doctype_doc.permissions
                    if row.role == role_name and cint(row.permlevel) == 0
                ),
                None,
            )

        item = {"doctype": doctype_name}

        for field in PERMISSION_FIELDS:
            item[field] = cint(permission.get(field, 0)) if permission else 0

        result.append(item)

    return result


@frappe.whitelist()
def update_role_permissions(role_name, permissions):
    """Update permissions for an existing Financial Assessment role."""

    _check_role_management_access()

    role_name = (role_name or "").strip()

    if role_name not in _get_configured_roles():
        frappe.throw(
            _("This role is not configured for the Financial Assessment module.")
        )

    if isinstance(permissions, str):
        try:
            permissions = json.loads(permissions)
        except (TypeError, ValueError):
            frappe.throw(_("Invalid permission configuration."))

    if not isinstance(permissions, list):
        frappe.throw(_("Permissions must be provided as a list."))

    allowed_doctypes = set(
        frappe.get_all(
            "DocType",
            filters={
                "module": APP_MODULE,
                "istable": 0,
            },
            pluck="name",
        )
    )

    submitted = {}

    # Validate all submitted rows before changing permissions.
    for item in permissions:
        if not isinstance(item, dict):
            frappe.throw(_("Invalid permission row."))

        doctype_name = (item.get("doctype") or "").strip()

        _get_allowed_doctype(doctype_name)

        if doctype_name not in allowed_doctypes:
            frappe.throw(
                _("DocType {0} does not belong to the Financial Assessment module.")
                .format(doctype_name)
            )

        if doctype_name in submitted:
            frappe.throw(
                _("Duplicate DocType permission row: {0}").format(doctype_name)
            )

        values = {
            field: cint(item.get(field, 0))
            for field in PERMISSION_FIELDS
        }

        meta = frappe.get_meta(doctype_name)

        if not meta.is_submittable:
            values["submit"] = 0
            values["cancel"] = 0
            values["amend"] = 0

        submitted[doctype_name] = values

    if set(submitted) != allowed_doctypes:
        frappe.throw(
            _("Please load and submit permissions for all Financial Assessment DocTypes.")
        )

    from frappe.permissions import (
        add_permission,
        update_permission_property,
    )

    for doctype_name, values in submitted.items():
        custom_permission_exists = frappe.db.exists(
            "Custom DocPerm",
            {
                "parent": doctype_name,
                "role": role_name,
                "permlevel": 0,
            },
        )

        if not custom_permission_exists:
            frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": doctype_name,
                "parenttype": "DocType",
                 "parentfield": "permissions",
                "role": role_name,
                "permlevel": 0,
                 **{field: 0 for field in PERMISSION_FIELDS},
            }).insert(ignore_permissions=True)

        # Update only this role's permissions on this app's DocTypes.
        for field in PERMISSION_FIELDS:
            if field == "read":
                continue

            update_permission_property(
                doctype_name,
                role_name,
                0,
                field,
                values[field],
            )

        update_permission_property(
            doctype_name,
            role_name,
            0,
            "read",
            values["read"],
        )

        frappe.clear_cache(doctype=doctype_name)

    frappe.clear_cache()

    return {
        "success": True,
        "role": role_name,
        "message": _("Role permissions updated successfully."),
    }



@frappe.whitelist()
def create_role_with_permissions(role_name, permissions):
    """Create a role and configure its permissions on selected app DocTypes."""

    _check_role_management_access()

    role_name = (role_name or "").strip()

    if not role_name:
        frappe.throw(_("Role Name is required."))

    # Remove an existing prefix before adding the standard prefix.
    if role_name.casefold().startswith(ROLE_PREFIX.casefold()):
        role_suffix = role_name[len(ROLE_PREFIX):].strip()
    else:
        role_suffix = role_name

    if not role_suffix:
        frappe.throw(
            _("Please enter a role name after the Financial Assessment prefix.")
        )

    role_name = f"{ROLE_PREFIX} {role_suffix}"

    if len(role_name) > 140:
        frappe.throw(_("Role Name cannot exceed 140 characters."))

    if role_name in {
        "Administrator",
        "System Manager",
        "Guest",
        "All",
        "Desk User",
        MANAGER_ROLE,
    }:
        frappe.throw(_("This role name is reserved."))

    if frappe.db.exists("Role", role_name):
        frappe.throw(_("The role '{0}' already exists.").format(role_name))

    if isinstance(permissions, str):
        try:
            permissions = json.loads(permissions)
        except (TypeError, ValueError):
            frappe.throw(_("Invalid permission configuration."))

    if not isinstance(permissions, list) or not permissions:
        frappe.throw(_("Select at least one DocType and configure its permissions."))

    # Validate all selected DocTypes before making any changes.
    validated = []
    seen = set()

    for item in permissions:
        if not isinstance(item, dict):
            frappe.throw(_("Invalid DocType permission row."))

        doctype_name = (item.get("doctype") or "").strip()

        if not doctype_name or doctype_name in seen:
            frappe.throw(_("Each selected DocType must be valid and unique."))

        _get_allowed_doctype(doctype_name)
        seen.add(doctype_name)

        values = {
            field: cint(item.get(field, 0))
            for field in PERMISSION_FIELDS
        }

        # Do not create permission rows that grant no access at all.
        if not any(values.values()):
            frappe.throw(
                _("Select at least one permission for {0}.").format(doctype_name)
            )

        meta = frappe.get_meta(doctype_name)

        if not meta.is_submittable:
            values["submit"] = 0
            values["cancel"] = 0
            values["amend"] = 0

        validated.append((doctype_name, values))

    role = frappe.get_doc({
        "doctype": "Role",
        "role_name": role_name,
        "desk_access": 1,
    })
    role.insert(ignore_permissions=True)

    from frappe.permissions import update_permission_property

    for doctype_name, values in validated:
        # Create the Custom DocPerm record with permission bypass.
        # This is necessary because the logged-in manager may not have
        # direct permission to create Custom DocPerm records.
        if not frappe.db.exists(
            "Custom DocPerm",
            {
                "parent": doctype_name,
                "role": role_name,
                "permlevel": 0,
            },
        ):
            frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": doctype_name,
                "parenttype": "DocType",
                "parentfield": "permissions",
                "role": role_name,
                "permlevel": 0,
                **{field: 0 for field in PERMISSION_FIELDS},
            }).insert(ignore_permissions=True)

        # Apply the selected permissions.
        # Set read last to avoid temporarily removing read permission.
        for field in PERMISSION_FIELDS:
            if field == "read":
                continue

            update_permission_property(
                doctype_name,
                role_name,
                0,
                field,
                values[field],
            )

        update_permission_property(
            doctype_name,
            role_name,
            0,
            "read",
            values["read"],
        )

        frappe.clear_cache(doctype=doctype_name)

    frappe.clear_cache()

    return {
        "success": True,
        "role": role.name,
        "message": _("Role created and permissions saved successfully."),
    }


@frappe.whitelist()
def can_print_assessment_report(client_name):
    if frappe.session.user == "Guest":
        frappe.throw(
            _("Please log in to print this report."),
            frappe.PermissionError,
        )

    if not frappe.db.exists("Client Information", client_name):
        frappe.throw(_("Client Information record not found."))

    client_doc = frappe.get_doc("Client Information", client_name)

    # Check the permission configured on Client Information.
    if not frappe.has_permission(
        "Client Information",
        ptype="print",
        doc=client_doc,
    ):
        return False

    # Also check the permission configured on Advisory And Recommendations.
    advisory_name = frappe.db.get_value(
        "Advisory And Recommendations",
        {"identifier": client_name},
        "name",
    )

    if advisory_name:
        advisory_doc = frappe.get_doc(
            "Advisory And Recommendations",
            advisory_name,
        )

        if not frappe.has_permission(
            "Advisory And Recommendations",
            ptype="print",
            doc=advisory_doc,
        ):
            return False

    return True
