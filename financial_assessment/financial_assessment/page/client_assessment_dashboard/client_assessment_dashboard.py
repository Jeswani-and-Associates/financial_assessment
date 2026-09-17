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

    # Convert empty values to None
    client = client or None
    assign_from_date = assign_from_date or None
    assign_to_date = assign_to_date or None

    filters = {}

    # ---------------------------------------------------------
    # Client Filter
    # ---------------------------------------------------------

    if client:
        filters["name"] = client

    # ---------------------------------------------------------
    # Date Filters
    # Field used from Client Information:
    # date_of_assessment
    # ---------------------------------------------------------

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

    # ---------------------------------------------------------
    # Get filtered clients
    # ---------------------------------------------------------

    clients = frappe.get_all(
        "Client Information",
        filters=filters,
        fields=[
            "name",
            "client_full_name_entity_name",
            "date_of_assessment"
        ],
        order_by="creation asc"
    )

    dashboard_data = []

    # ---------------------------------------------------------
    # Build dashboard data
    # ---------------------------------------------------------

    for client_record in clients:

        row = {
            "name": client_record.name,
            "client": client_record.client_full_name_entity_name or "-",
            "date_of_assessment": client_record.date_of_assessment,
        }

        for doctype, fieldname in ASSESSMENT_WINDOWS:

            status = frappe.db.get_value(
                doctype,
                {"identifier": client_record.name},
                "status"
            )

            if not status:
                row[fieldname] = "-"

            elif status == "Draft":
                row[fieldname] = "Draft"

            else:
                row[fieldname] = "Completed"

        dashboard_data.append(row)

    return dashboard_data