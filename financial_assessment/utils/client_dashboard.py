import frappe


ASSESSMENT_WINDOWS = [
    (
        "Income And Expenses",
        "income_and_expenses"
    ),
    (
        "Assets And Investments",
        "assets_and_investments"
    ),
    (
        "Loans And Liabilities",
        "loans_and_liabilities"
    ),
    (
        "Insurance Coverage",
        "insurance_coverage"
    ),
    (
        "Future Goals",
        "future_goals"
    ),
    (
        "Financial Summary",
        "financial_summary"
    ),
    (
        "Advisory And Recommendations",
        "advisory_and_recommendations"
    ),
]


@frappe.whitelist()
def get_client_assessment_status():

    clients = frappe.get_all(
        "Client Information",
        fields=[
            "name",
            "client_full_name_entity_name"
        ],
        order_by="creation asc"
    )

    dashboard_data = []

    for client in clients:

        row = {
            "name": client.name,
            "client": client.client_full_name_entity_name or "-",
        }

        for doctype, fieldname in ASSESSMENT_WINDOWS:

            status = frappe.db.get_value(
                doctype,
                {
                    "identifier": client.name
                },
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