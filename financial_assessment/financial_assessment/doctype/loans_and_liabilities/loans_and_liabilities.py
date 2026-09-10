# Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class LoansAndLiabilities(Document):

    def validate(self):
        self.calculate_loan_values()
        self.update_status()

    def update_status(self):

        loan_schedule_complete = (
            bool(
                self.loans_and_liabilities_comprehensive_loan_schedule_child
            )
            and all(
                row.original_loan_amount is not None
                and row.outstanding_principal is not None
                and row.monthly_emi is not None
                and row.interest_rate is not None
                for row in (
                    self.loans_and_liabilities_comprehensive_loan_schedule_child
                    or []
                )
            )
        )

        if loan_schedule_complete:
            self.status = "Loans And Liabilities Completed"
        else:
            self.status = "Draft"    

    def calculate_loan_values(self):

        # =====================================================
        # LOAN TOTALS
        # =====================================================

        original_loan_amount = 0
        total_outstanding_debt = 0
        total_monthly_emi_burden = 0

        weighted_interest_numerator = 0

        for row in (
            self.loans_and_liabilities_comprehensive_loan_schedule_child
            or []
        ):

            child_original_loan_amount = (
                row.original_loan_amount or 0
            )

            outstanding_principal = (
                row.outstanding_principal or 0
            )

            monthly_emi = (
                row.monthly_emi or 0
            )

            interest_rate = (
                row.interest_rate or 0
            )

            # Total Original Loan Amount
            original_loan_amount += (
                child_original_loan_amount
            )

            # Total Outstanding Debt
            total_outstanding_debt += (
                outstanding_principal
            )

            # Total Monthly EMI Burden
            total_monthly_emi_burden += (
                monthly_emi
            )

            # Weighted Average Interest Rate
            weighted_interest_numerator += (
                outstanding_principal
                * interest_rate
            )

        # =====================================================
        # TOTAL ANNUAL EMI OUTFLOW
        # =====================================================

        total_annual_emi_outflow = (
            total_monthly_emi_burden * 12
        )

        # =====================================================
        # WEIGHTED AVERAGE INTEREST RATE
        # =====================================================

        if total_outstanding_debt:

            weighted_average_interest_rate = (
                weighted_interest_numerator
                / total_outstanding_debt
            )

        else:

            weighted_average_interest_rate = 0

        # =====================================================
        # SET LOAN TOTAL FIELDS
        # =====================================================

        self.original_loan_amount = (
            original_loan_amount
        )

        self.total_outstanding_debt = (
            total_outstanding_debt
        )

        self.total_monthly_emi_burden = (
            total_monthly_emi_burden
        )

        self.total_annual_emi_outflow = (
            total_annual_emi_outflow
        )

        self.weighted_average_interest_rate = (
            weighted_average_interest_rate
        )

        # =====================================================
        # REFERENCE VALUES
        # =====================================================

        annual_income = 0
        gross_total_assets = 0

        if self.identifier:

            annual_income = frappe.db.get_value(
                "Income And Expenses",
                {
                    "identifier": self.identifier
                },
                "total_annual_income"
            ) or 0

            gross_total_assets = frappe.db.get_value(
                "Assets And Investments",
                {
                    "identifier": self.identifier
                },
                "gross_total_assets"
            ) or 0

        # =====================================================
        # ANNUAL INCOME REFERENCE
        # =====================================================

        self.annual_income_reference = (
            annual_income
        )

        # =====================================================
        # EMI-TO-INCOME RATIO
        # =====================================================

        if annual_income:

            self.emi_to_income_ratio = (
                total_annual_emi_outflow
                / annual_income
            ) * 100

        else:

            self.emi_to_income_ratio = 0

        # =====================================================
        # DEBT-TO-ASSET RATIO
        # =====================================================

        if gross_total_assets:

            self.debt_to_asset_ratio = (
                total_outstanding_debt
                / gross_total_assets
            ) * 100

        else:

            self.debt_to_asset_ratio = 0

        # =====================================================
        # NET WORTH
        # =====================================================

        self.net_worth_reference = (
            gross_total_assets
            - total_outstanding_debt
        )