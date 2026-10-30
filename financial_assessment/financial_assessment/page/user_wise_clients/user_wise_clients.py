
import frappe
from frappe import _


CLIENT_ROLE = "Financial Assessment Users"
CLIENT_DOCTYPE = "Client Information"

MANAGER_ROLES = {
    "Financial Assessment",
    "System Manager",
}

ASSESSMENT_WINDOWS = [
    ("Income And Expenses", "income_and_expenses"),
    ("Assets And Investments", "assets_and_investments"),
    ("Loans And Liabilities", "loans_and_liabilities"),
    ("Insurance Coverage", "insurance_coverage"),
    ("Future Goals", "future_goals"),
    ("Financial Summary", "financial_summary"),
    ("Advisory And Recommendations", "advisory_and_recommendations"),
]


def check_manager_access():
    """Allow only authorized dashboard managers."""

    user = frappe.session.user

    if user == "Guest":
        frappe.throw(
            _("Please log in to continue."),
            frappe.PermissionError,
        )

    roles = set(frappe.get_roles(user))

    if not roles.intersection(MANAGER_ROLES):
        frappe.throw(
            _("You do not have permission to access this dashboard."),
            frappe.PermissionError,
        )


def get_eligible_users():
    """Return enabled System Users with the client-creation role."""

    role_assignments = frappe.get_all(
        "Has Role",
        filters={
            "role": CLIENT_ROLE,
            "parenttype": "User",
        },
        fields=["parent"],
        distinct=True,
    )

    user_ids = list({
        row.parent
        for row in role_assignments
        if row.parent
    })

    if not user_ids:
        return []

    return frappe.get_all(
        "User",
        filters={
            "name": ["in", user_ids],
            "enabled": 1,
            "user_type": "System User",
        },
        fields=["name", "full_name"],
        order_by="full_name asc",
    )


def get_valid_selected_user(selected_user, users):
    """Validate that the selected user belongs to the eligible user list."""

    if not selected_user:
        return None

    valid_users = {
        user.name
        for user in users
    }

    if selected_user not in valid_users:
        frappe.throw(
            _("Please select an enabled Financial Assessment user."),
            frappe.PermissionError,
        )

    return selected_user



def get_client_assessment_row(client_record):
    """Build a client row using the existing assessment-status rules."""

    advisor_name = None

    if client_record.assigned_advisor:
        advisor_name = frappe.db.get_value(
            "Advisor Master",
            client_record.assigned_advisor,
            "advisor_name",
        )

    row = {
        "name": client_record.name,

        # Add the actual user ID who owns this client.
        "owner": client_record.owner,

        "client": (
            client_record.client_full_name_entity_name or "-"
        ),
        "assigned_advisor": (
            advisor_name
            or client_record.assigned_advisor
            or "-"
        ),
        "date_of_assessment": client_record.date_of_assessment,
    }

    for doctype, fieldname in ASSESSMENT_WINDOWS:
        record = frappe.db.get_value(
            doctype,
            {"identifier": client_record.name},
            ["name", "status"],
            as_dict=True,
        )

        if not record:
            row[fieldname] = {
                "status": "-",
                "docname": None,
                "doctype": doctype,
            }

        elif record.status == "Draft":
            row[fieldname] = {
                "status": "Draft",
                "docname": record.name,
                "doctype": doctype,
            }

        else:
            row[fieldname] = {
                "status": "Completed",
                "docname": record.name,
                "doctype": doctype,
            }

    return row

@frappe.whitelist()
def get_dashboard_data(
    selected_user=None,
    client=None,
    assign_from_date=None,
    assign_to_date=None,
):
    """
    Return eligible users, client counts, and assessment rows.

    Initial load:
        Show clients belonging to all eligible users.

    When selected_user is provided:
        Show clients belonging only to that user.

    Client and assessment-date filters work in both cases.
    """

    check_manager_access()

    selected_user = selected_user or None
    client = client or None
    assign_from_date = assign_from_date or None
    assign_to_date = assign_to_date or None

    if (
        assign_from_date
        and assign_to_date
        and assign_from_date > assign_to_date
    ):
        frappe.throw(
            _("Assigned From Date cannot be later than Assigned To Date.")
        )

    users = get_eligible_users()

    # Prepare the overall user counts for the chart.
    user_data = []

    for user in users:
        total_clients = frappe.db.count(
            CLIENT_DOCTYPE,
            filters={"owner": user.name},
        )

        user_data.append({
            "user": user.name,
            "user_name": user.full_name or user.name,
            "total_clients": total_clients,
        })

    # Validate the selected user, if one was provided.
    selected_user = get_valid_selected_user(
        selected_user,
        users,
    )

    # Build filters for the client table.
    if selected_user:
        # A selected user: show only that user's clients.
        filters = {
            "owner": selected_user,
        }

    else:
        # No user selected: show clients from all eligible users.
        eligible_user_ids = [
            user.name for user in users
        ]

        if eligible_user_ids:
            filters = {
                "owner": ["in", eligible_user_ids],
            }
        else:
            # No eligible users: return no client records.
            filters = {
                "name": ["=", ""],
            }

    # Apply the optional client filter.
    if client:
        filters["name"] = client

    # Apply the optional assessment-date filters.
    if assign_from_date and assign_to_date:
        filters["date_of_assessment"] = [
            "between",
            [assign_from_date, assign_to_date],
        ]

    elif assign_from_date:
        filters["date_of_assessment"] = [
            ">=",
            assign_from_date,
        ]

    elif assign_to_date:
        filters["date_of_assessment"] = [
            "<=",
            assign_to_date,
        ]

    # Use permission-aware retrieval for Client Information.
    clients = frappe.get_list(
        CLIENT_DOCTYPE,
        filters=filters,
        fields=[
            "name",
            "owner",
            "client_full_name_entity_name",
            "assigned_advisor",
            "date_of_assessment",
        ],
        order_by="creation asc",
    )

    rows = [
        get_client_assessment_row(client_record)
        for client_record in clients
    ]

    return {
        "total_users": len(user_data),
        "users": user_data,
        "selected_user": selected_user or "",
        "rows": rows,
        "window_order": [
            fieldname
            for _, fieldname in ASSESSMENT_WINDOWS
        ],
    }
