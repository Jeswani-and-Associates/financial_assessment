# Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
# For license information, please see license.txt

from frappe.model.document import Document
import frappe

from financial_assessment.utils.identifier import (
    find_existing_identifier
)
from financial_assessment.utils.client_status import (
    update_client_current_status
)


class IncomeAndExpenses(Document):

    def on_update(self):

        update_client_current_status(
            self.identifier
        )

    def validate(self):
        
        existing_record = find_existing_identifier(
            self.doctype,
            self.identifier,
            self.name
        )

        if existing_record:
            frappe.throw(
                f"An {self.doctype} record already exists "
                f"for identifier <b>{self.identifier}</b>.<br>"
                f"Existing record: <b>{existing_record}</b>"
            )

        # Calculate child table values
        self.calculate_income_and_expense_values()

        # Calculate parent fields
        self.calculate_parent_fields()

        # Update status based on mandatory monthly values
        self.update_status()

    def calculate_income_and_expense_values(self):
        # -----------------------------------------
        # Calculate Annual Income
        # -----------------------------------------
        total_annual_income = 0

        for row in self.annual_income_source_child or []:
            row.annual_income = (row.monthly_income or 0) * 12
            total_annual_income += row.annual_income

        # -----------------------------------------
        # Calculate Income Percentage
        # -----------------------------------------
        for row in self.annual_income_source_child or []:
            if total_annual_income:
                row.total_income_percentage = (
                    row.annual_income / total_annual_income
                ) * 100
            else:
                row.total_income_percentage = 0

        # -----------------------------------------
        # Calculate Annual Expense
        # -----------------------------------------
        for row in self.annual_expense_and_outflow or []:
            row.annual_expense = (row.monthly_expense or 0) * 12

            if total_annual_income:
                row.income_expense_percentage = (
                    row.annual_expense / total_annual_income
                ) * 100
            else:
                row.income_expense_percentage = 0

    def calculate_parent_fields(self):
        # -----------------------------------------
        # Calculate Total Annual Income
        # -----------------------------------------
        total_annual_income = sum(
            (row.annual_income or 0)
            for row in self.annual_income_source_child or []
        )

        # -----------------------------------------
        # Calculate Total Annual Expenses
        # -----------------------------------------
        total_annual_expenses = sum(
            (row.annual_expense or 0)
            for row in self.annual_expense_and_outflow or []
        )

        self.total_annual_income = total_annual_income
        self.total_annual_expenses = total_annual_expenses

        # -----------------------------------------
        # Annual Surplus / Deficit
        # -----------------------------------------
        annual_surplus_deficit = (
            total_annual_income - total_annual_expenses
        )

        self.annual_surplus_deficit = annual_surplus_deficit

        # -----------------------------------------
        # Monthly Surplus / Deficit
        # -----------------------------------------
        self.monthly_surplus_deficit = (
            annual_surplus_deficit / 12
        )

        # -----------------------------------------
        # Savings Rate
        # -----------------------------------------
        if total_annual_income:
            self.savings_rate = (
                annual_surplus_deficit
                / total_annual_income
            ) * 100
        else:
            self.savings_rate = 0

        # -----------------------------------------
        # Emergency Fund Target
        # -----------------------------------------
        self.emergency_fund_target = (
            total_annual_expenses / 12
        ) * 6

    def update_status(self):
        # -----------------------------------------
        # Check Income Child Table
        # -----------------------------------------
        income_complete = (
            bool(self.annual_income_source_child)
            and all(
                row.monthly_income is not None
                for row in self.annual_income_source_child
            )
        )

        # -----------------------------------------
        # Check Expense Child Table
        # -----------------------------------------
        expense_complete = (
            bool(self.annual_expense_and_outflow)
            and all(
                row.monthly_expense is not None
                for row in self.annual_expense_and_outflow
            )
        )

        # -----------------------------------------
        # Update Status
        # -----------------------------------------
        if income_complete and expense_complete:
            self.status = "Income And Expenses Completed"
        else:
            self.status = "Draft"


# =====================================================
# CREATE ASSETS AND INVESTMENTS
# =====================================================

@frappe.whitelist()
def create_assets_and_investments(docname):

    if not frappe.db.exists("Income And Expenses", docname):
        frappe.throw("Income And Expenses record does not exist.")

    income_expense = frappe.get_doc(
        "Income And Expenses",
        docname
    )

    if not income_expense.identifier:
        frappe.throw(
            "Identifier is not set in Income And Expenses."
        )

    # Check whether Assets And Investments
    # already exists for this identifier
    existing_record = frappe.db.exists(
        "Assets And Investments",
        {
            "identifier": income_expense.identifier
        }
    )

    if existing_record:
        return existing_record

    # Create new Assets And Investments
    assets_and_investments = frappe.new_doc(
        "Assets And Investments"
    )

    assets_and_investments.identifier = (
        income_expense.identifier
    )

    assets_and_investments.status = "Draft"

    assets_and_investments.insert()

    return assets_and_investments.name

