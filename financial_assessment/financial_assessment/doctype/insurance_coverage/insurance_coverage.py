import frappe
from frappe.model.document import Document


class InsuranceCoverage(Document):

    def validate(self):
        self.calculate_insurance_values()
        self.update_status()

    def calculate_insurance_values(self):
        life_insurance_sum_assured = 0
        life_insurance_annual_premium = 0

        for row in (
            self.insurance_coverage_life_insurance_policies
            or []
        ):
            life_insurance_sum_assured += row.sum_assured or 0
            life_insurance_annual_premium += row.annual_premium or 0

        health_insurance_sum_insured = 0
        health_insurance_annual_premium = 0

        for row in (
            self.insurance_coverage_health_insurance_policies
            or []
        ):
            health_insurance_sum_insured += row.sum_insured or 0
            health_insurance_annual_premium += row.annual_premium or 0

        general_other_annual_premium = 0

        for row in (
            self.insurance_coverage_general_and_other_insurance
            or []
        ):
            general_other_annual_premium += row.annual_premium or 0

        # Life Insurance totals
        self.life_insurance_sum_assured = (
            life_insurance_sum_assured
        )

        self.life_insurance_annual_premium = (
            life_insurance_annual_premium
        )

        # Health Insurance totals
        self.health_insurance_sum_insured = (
            health_insurance_sum_insured
        )

        self.health_insurance_annual_premium = (
            health_insurance_annual_premium
        )

        # Total Life Cover in Force
        self.total_life_cover_in_force = (
            life_insurance_sum_assured
        )

        # Annual Income from Income And Expenses
        annual_income = 0

        if self.identifier:
            annual_income = frappe.db.get_value(
                "Income And Expenses",
                {"identifier": self.identifier},
                "total_annual_income",
            ) or 0

        self.annual_income = annual_income

        # Recommended Life Cover = Annual Income × 25
        recommended_life_cover = annual_income * 25

        self.recommended_life_cover = (
            recommended_life_cover
        )

        # Life Insurance Adequacy Ratio
        if recommended_life_cover:
            self.life_insurance_adequacy_ratio = (
                life_insurance_sum_assured
                / recommended_life_cover
            ) * 100
        else:
            self.life_insurance_adequacy_ratio = 0

        # Life Cover Gap / (Surplus)
        # Excel:
        # =IFERROR(E15-('A — Income & Expenses'!D24*15),0)
        if annual_income:
            self.life_cover_gap_surplus = (
                life_insurance_sum_assured
                - (annual_income * 15)
            )
        else:
            self.life_cover_gap_surplus = 0

        # Total Health Cover
        self.total_health_cover_all_policies = (
            health_insurance_sum_insured
        )

        # Total Annual Insurance Premiums
        total_annual_insurance_premiums = (
            life_insurance_annual_premium
            + health_insurance_annual_premium
        )

        self.total_annual_insurance_premiums = (
            total_annual_insurance_premiums
        )

        # Premium as % of Annual Income
        if annual_income:
            self.premium_as_percentage_of_annual_income = (
                total_annual_insurance_premiums
                / annual_income
            ) * 100
        else:
            self.premium_as_percentage_of_annual_income = 0

    def update_status(self):
        life_policies_completed = False
        health_policies_completed = False

        # Check Life Insurance Policies
        if self.insurance_coverage_life_insurance_policies:
            life_policies_completed = all(
                row.sum_assured is not None
                and row.sum_assured != ""
                and row.annual_premium is not None
                and row.annual_premium != ""
                for row in self.insurance_coverage_life_insurance_policies
            )

        # Check Health Insurance Policies
        if self.insurance_coverage_health_insurance_policies:
            health_policies_completed = all(
                row.sum_insured is not None
                and row.sum_insured != ""
                and row.annual_premium is not None
                and row.annual_premium != ""
                for row in self.insurance_coverage_health_insurance_policies
            )

        if (
            self.identifier
            and life_policies_completed
            and health_policies_completed
        ):
            self.status = "Insurance Coverage Completed"
        else:
            self.status = "Draft"