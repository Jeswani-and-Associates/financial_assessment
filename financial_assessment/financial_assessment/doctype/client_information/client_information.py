# Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.naming import make_autoname

from financial_assessment.utils.validators import (
    validate_pan_tan,
    validate_email,
)


class ClientInformation(Document):

    def autoname(self):
        # Generate safe sequential number: CI-1, CI-2, CI-3...
        sequence = make_autoname("CI-.#")

        # Get client name
        client_name = (self.client_full_name_entity_name or "").strip()

        # Get Financial Year Master display value
        financial_year_name = frappe.db.get_value(
            "Financial Year Master",
            self.financial_year_of_assessment,
            "financial_year_name"
        )

        financial_year_name = (financial_year_name or "").strip()

        # Final document name
        self.name = f"{sequence}_{client_name}_{financial_year_name}"

    def validate(self):
        if self.pan_tan_no:
            self.pan_tan_no = validate_pan_tan(
                self.pan_tan_no,
                "PAN/TAN No."
            )

        if self.email_address:
            self.email_address = validate_email(
                self.email_address,
                "Email Address"
            )

        if self.date_of_birth_incorporation:
            if self.date_of_birth_incorporation > frappe.utils.today():
                frappe.throw(
                    "Date of Birth / Date of Incorporation cannot be a future date."
                )

    def after_insert(self):
        frappe.log_error(
            "ClientInformation after_insert executed",
            "Client Information Test"
        )

        self.db_set(
            "status",
            "Client Information Completed"
        )

@frappe.whitelist()
def create_income_and_expense(docname):

    # Check whether Client Information exists
    if not frappe.db.exists("Client Information", docname):
        frappe.throw("Client Information record does not exist.")

    # Check whether Income And Expenses already exists
    existing_record = frappe.db.exists(
        "Income And Expenses",
        {
            "identifier": docname
        }
    )

    if existing_record:
        return existing_record

    # Create new Income And Expenses document
    income_expense = frappe.new_doc("Income And Expenses")

    # Link it to Client Information
    income_expense.identifier = docname

    # Insert as Draft
    income_expense.insert()

    return income_expense.name


# @frappe.whitelist()
# def create_income_and_expense(docname):

#     existing_record = frappe.db.exists(
#         "Income And Expenses",
#         {
#             "identifier": docname
#         }
#     )

#     if existing_record:
#         return {
#             "name": existing_record,
#             "created": False
#         }

#     income_expense = frappe.new_doc("Income And Expenses")
#     income_expense.identifier = docname
#     income_expense.insert()

#     return {
#         "name": income_expense.name,
#         "created": True
#     }
                