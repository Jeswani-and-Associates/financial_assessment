import frappe


STATUS_SEQUENCE = [

    (
        "Income And Expenses",
        "Income And Expenses Completed"
    ),

    (
        "Assets And Investments",
        "Assets And Investments Completed"
    ),

    (
        "Loans And Liabilities",
        "Loans And Liabilities Completed"
    ),

    (
        "Insurance Coverage",
        "Insurance Coverage Completed"
    ),

    (
        "Future Goals",
        "Future Goals Completed"
    ),

    (
        "Financial Summary",
        "Finanacial Summary Completed"
    ),

    (
        "Advisory And Recommendations",
        "Advisory and Recommendations Completed"
    )

]


def update_client_current_status(identifier):

    if not identifier:
        return

    # ------------------------------------------------------------
    # Make sure Client Information exists
    # ------------------------------------------------------------

    if not frappe.db.exists(
        "Client Information",
        identifier
    ):
        return

    # ------------------------------------------------------------
    # Default status
    # ------------------------------------------------------------

    current_status = ""

    # ------------------------------------------------------------
    # Check each window sequentially
    # ------------------------------------------------------------

    for doctype, completed_status in STATUS_SEQUENCE:

        status = frappe.db.get_value(
            doctype,
            {
                "identifier": identifier
            },
            "status"
        )

        # If this window is not completed,
        # stop checking further windows.
        if status != completed_status:
            break

        # This window is completed,
        # so make it the current status.
        current_status = completed_status

    # ------------------------------------------------------------
    # Update Client Information
    # ------------------------------------------------------------

    frappe.db.set_value(
        "Client Information",
        identifier,
        "current_status",
        current_status,
        update_modified=False
    )