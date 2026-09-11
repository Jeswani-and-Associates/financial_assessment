# Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FutureGoalBasedFinancialPlanningMatrixChild(Document):

    def validate(self):
        self.calculate_values()

    def calculate_values(self):
        # ---------------------------------------------------------
        # 1. YEARS REMAINING
        # Excel:
        # =IF(C8="",0,MAX(0,C8-2025))
        # ---------------------------------------------------------

        current_year = frappe.utils.getdate(
            frappe.utils.today()
        ).year

        if self.target_year:
            self.years_remaining = max(
                0,
                self.target_year - current_year
            )
        else:
            self.years_remaining = 0

        # ---------------------------------------------------------
        # 2. FUTURE VALUE REQUIRED
        # Excel:
        # =IFERROR(IF(E8="","-",E8*(1+F8)^D8),"-")
        # ---------------------------------------------------------

        if self.current_cost_today is not None and self.current_cost_today != "":
            current_cost_today = self.current_cost_today or 0
            inflation_rate = (self.inflation or 0) / 100

            self.future_value_required = round(
                current_cost_today
                * (1 + inflation_rate)
                ** self.years_remaining
            )
        else:
            self.future_value_required = 0

        # ---------------------------------------------------------
        # 3. SHORTFALL / SURPLUS
        # Excel:
        # =IFERROR(IF(G8="","-",H8-G8),"-")
        #
        # IMPORTANT:
        # Excel uses H8 - G8
        # Existing Corpus - Future Value Required
        #
        # Negative = Shortfall
        # Positive = Surplus
        # ---------------------------------------------------------

        if self.future_value_required:
            existing_corpus = self.existing_corpus_savings or 0

            self.shortfall_surplus = round(
                existing_corpus
                - self.future_value_required
            )
        else:
            self.shortfall_surplus = 0

        # ---------------------------------------------------------
        # 4. MONTHLY SIP REQUIRED
        #
        # Excel:
        # =IFERROR(
        #   IF(
        #       OR(D8=0,G8="",K8=0),
        #       "-",
        #       ABS(PMT(K8/12,D8*12,-H8,G8))
        #   ),
        # "-"
        # )
        # ---------------------------------------------------------

        years_remaining = self.years_remaining or 0
        future_value = self.future_value_required or 0
        existing_corpus = self.existing_corpus_savings or 0
        annual_return = (self.assumed_return or 0) / 100

        if (
            years_remaining == 0
            or not future_value
            or annual_return == 0
        ):
            self.monthly_sip_required = 0

        else:
            monthly_rate = annual_return / 12
            number_of_payments = years_remaining * 12

            future_value_of_corpus = (
                existing_corpus
                * (1 + monthly_rate)
                ** number_of_payments
            )

            denominator = (
                (1 + monthly_rate)
                ** number_of_payments
                - 1
            )

            monthly_sip = (
                (future_value_of_corpus - future_value)
                * monthly_rate
                / denominator
            )

            self.monthly_sip_required = round(
                abs(monthly_sip)
            )