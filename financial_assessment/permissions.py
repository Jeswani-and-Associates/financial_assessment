
import frappe


ASSESSMENT_DOCTYPES = [
    "Income And Expenses",
    "Assets And Investments",
    "Loans And Liabilities",
    "Insurance Coverage",
    "Future Goals",
    "Financial Summary",
    "Advisory And Recommendations",
]


def is_assessment_admin(user=None):
    user = user or frappe.session.user
    roles = frappe.get_roles(user)

    return (
        user == "Administrator"
        or "System Manager" in roles
        or "Financial Assessment" in roles
    )


def has_permission(doc, ptype=None, user=None, debug=False):
    user = user or frappe.session.user

    # Admin users can access all assessment records.
    if is_assessment_admin(user):
        return True

    if doc.doctype not in ASSESSMENT_DOCTYPES:
        return True

    # Let standard Frappe permissions handle users
    # who are not governed by this custom ownership rule.
    if "Financial Assessment Users" not in frappe.get_roles(user):
        return True

    # A new document must pass through to standard
    # Frappe create-permission checks.
    if doc.is_new():
        return True

    client_name = doc.get("identifier")
    if not client_name:
        return False

    client_owner = frappe.db.get_value(
        "Client Information",
        client_name,
        "owner",
    )

    # Existing assessments are accessible only to
    # the owner of their linked client.
    return client_owner == user


def get_permission_query_conditions(user=None):
    user = user or frappe.session.user

    if is_assessment_admin(user):
        return ""

    if "Financial Assessment Users" not in frappe.get_roles(user):
        return ""

    user = frappe.db.escape(user)

    return f"""
        `identifier` IN (
            SELECT `name`
            FROM `tabClient Information`
            WHERE `owner` = {user}
        )
    """


def set_assessment_owner_from_client(doc, method=None):
    user = frappe.session.user

    client_name = doc.get("identifier")
    if not client_name:
        frappe.throw("Please select a Client Information record.")

    client_owner = frappe.db.get_value(
        "Client Information",
        client_name,
        "owner",
    )

    if not client_owner:
        frappe.throw(
            "The linked Client Information owner could not be found."
        )

    # Administrative users can create assessments for any client's owner.
    if is_assessment_admin(user):
        doc.owner = client_owner
        return

    # Regular users can create assessments only for their own clients.
    if client_owner != user:
        frappe.throw(
            "You can create an assessment only for your own Client Information."
        )
