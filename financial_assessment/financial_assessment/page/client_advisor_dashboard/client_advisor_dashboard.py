
import frappe
from collections import Counter


@frappe.whitelist()
def get_advisor_client_count(advisor=None):

    user = frappe.session.user
    filters = {}

    # Restrict newly created Financial Assessment users
    # to Client Information records they own.
    if (
        "Financial Assessment Users" in frappe.get_roles(user)
        and user != "Administrator"
    ):
        filters["owner"] = user

    # Apply advisor filter only when provided.
    if advisor:
        filters["assigned_advisor"] = advisor

    # Fetch only records the current user is permitted to read.
    clients = frappe.get_list(
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

    total_clients = len(clients)

    advisor_counter = Counter()

    for client in clients:
        advisor_name = client.assigned_advisor or "Unassigned"
        advisor_counter[advisor_name] += 1

    advisor_wise_count = [
        {"advisor": name, "count": count}
        for name, count in advisor_counter.items()
    ]

    advisor_wise_count.sort(
        key=lambda item: item["count"],
        reverse=True
    )

    client_data = []

    for client in clients:
        client_data.append({
            "name": client.name,
            "client": client.client_full_name_entity_name or "-",
            "pan_tan_no": client.pan_tan_no or "-",
            "financial_year": client.financial_year_of_assessment or "-",
            "advisor": client.assigned_advisor or "Unassigned",
            "date_of_assessment": client.date_of_assessment or "-",
            "current_status": client.current_status or "-"
        })

    return {
        "advisor": advisor,
        "total_clients": total_clients,
        "advisor_wise_count": advisor_wise_count,
        "clients": client_data
    }
