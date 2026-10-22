import frappe


ASSESSMENT_WINDOWS = [
    ("Income And Expenses", "income_and_expenses"),
    ("Assets And Investments", "assets_and_investments"),
    ("Loans And Liabilities", "loans_and_liabilities"),
    ("Insurance Coverage", "insurance_coverage"),
    ("Future Goals", "future_goals"),
    ("Financial Summary", "financial_summary"),
    ("Advisory And Recommendations", "advisory_and_recommendations"),
]



@frappe.whitelist()
def get_client_assessment_status(
    client=None,
    assign_from_date=None,
    assign_to_date=None
):
    client = client or None
    assign_from_date = assign_from_date or None
    assign_to_date = assign_to_date or None

    filters = {}

    # Restrict Financial Assessment Users to clients they created.
    user = frappe.session.user
    roles = frappe.get_roles(user)

    if (
        "Financial Assessment Users" in roles
        and user != "Administrator"
    ):
        filters["owner"] = user

    # Preserve the existing client filter.
    if client:
        filters["name"] = client

    # Preserve the existing date filters.
    if assign_from_date and assign_to_date:
        filters["date_of_assessment"] = [
            "between",
            [assign_from_date, assign_to_date]
        ]
    elif assign_from_date:
        filters["date_of_assessment"] = [
            ">=",
            assign_from_date
        ]
    elif assign_to_date:
        filters["date_of_assessment"] = [
            "<=",
            assign_to_date
        ]

    # Fetch records using Frappe's permission-aware API.
    clients = frappe.get_list(
        "Client Information",
        filters=filters,
        fields=[
            "name",
            "client_full_name_entity_name",
            "assigned_advisor",
            "date_of_assessment"
        ],
        order_by="creation asc"
    )

    dashboard_data = []

    for client_record in clients:

        # Fetch the actual advisor name dynamically.
        advisor_name = None

        if client_record.assigned_advisor:
            advisor_name = frappe.db.get_value(
                "Advisor Master",
                client_record.assigned_advisor,
                "advisor_name"
            )

        row = {
            "name": client_record.name,
            "client": (
                client_record.client_full_name_entity_name or "-"
            ),
            "assigned_advisor": (
                advisor_name
                or client_record.assigned_advisor
                or "-"
            ),
            "date_of_assessment": (
                client_record.date_of_assessment
            ),
        }

        # Preserve the existing assessment-status logic.
        for doctype, fieldname in ASSESSMENT_WINDOWS:

            record = frappe.db.get_value(
                doctype,
                {"identifier": client_record.name},
                ["name", "status"],
                as_dict=True
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

        dashboard_data.append(row)

    return {
        "rows": dashboard_data,
        "window_order": [
            fieldname
            for _, fieldname in ASSESSMENT_WINDOWS
        ],
    }
