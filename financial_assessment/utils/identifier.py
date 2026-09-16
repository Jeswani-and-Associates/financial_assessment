import frappe


ALLOWED_IDENTIFIER_DOCTYPES = [
    "Income And Expenses",
    "Assets And Investments",
    "Loans And Liabilities",
    "Insurance Coverage",
    "Future Goals",
    "Financial Summary",
    "Advisory And Recommendations",
]


def find_existing_identifier(
    doctype,
    identifier,
    current_name=None
):
    if not identifier:
        return None

    if doctype not in ALLOWED_IDENTIFIER_DOCTYPES:
        frappe.throw("Invalid DocType.")

    filters = {
        "identifier": identifier
    }

    if current_name:
        filters["name"] = ["!=", current_name]

    return frappe.db.exists(
        doctype,
        filters
    )


@frappe.whitelist()
def get_existing_identifier_record(
    doctype,
    identifier
):
    return find_existing_identifier(
        doctype,
        identifier
    )