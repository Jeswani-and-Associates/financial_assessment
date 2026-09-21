import frappe
from collections import Counter


@frappe.whitelist()
def get_advisor_client_count(advisor=None):

    advisor = advisor or None

    filters = {}

    if advisor:
        filters["assigned_advisor"] = advisor

    # ---------------------------------------------------------
    # Fetch Client Information
    # ---------------------------------------------------------

    clients = frappe.get_all(
        "Client Information",
        filters=filters,
        fields=[
            "name",
            "client_full_name_entity_name",
            "pan_tan_no",
            "financial_year_of_assessment",
            "assigned_advisor",
            "date_of_assessment",
            "current_status"
        ],
        order_by="creation desc"
    )

    # ---------------------------------------------------------
    # Total Client Count
    # ---------------------------------------------------------

    total_clients = len(clients)

    # ---------------------------------------------------------
    # Advisor-wise Client Count
    # ---------------------------------------------------------

    advisor_counter = Counter()

    for client in clients:

        advisor_name = (
            client.assigned_advisor
            or "Unassigned"
        )

        advisor_counter[advisor_name] += 1

    advisor_wise_count = [
        {
            "advisor": advisor_name,
            "count": count
        }
        for advisor_name, count
        in advisor_counter.items()
    ]

    # Highest count first
    advisor_wise_count.sort(
        key=lambda item: item["count"],
        reverse=True
    )

    # ---------------------------------------------------------
    # Client Table Data
    # ---------------------------------------------------------

    client_data = []

    for client in clients:

        client_data.append({
            "name": client.name,

            "client": (
                client.client_full_name_entity_name
                or "-"
            ),

            "pan_tan_no": (
                client.pan_tan_no
                or "-"
            ),

            "financial_year": (
                client.financial_year_of_assessment
                or "-"
            ),

            "advisor": (
                client.assigned_advisor
                or "Unassigned"
            ),

            "date_of_assessment": (
                client.date_of_assessment
                or "-"
            ),

            "current_status": (
                client.current_status
                or "-"
            )
        })

    # ---------------------------------------------------------
    # Response
    # ---------------------------------------------------------

    return {
        "advisor": advisor,
        "total_clients": total_clients,
        "advisor_wise_count": advisor_wise_count,
        "clients": client_data
    }
