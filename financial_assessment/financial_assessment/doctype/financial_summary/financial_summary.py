# Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from financial_assessment.utils.identifier import (
    find_existing_identifier
)


class FinancialSummary(Document):

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
        self.calculate_summary_values()
        self.calculate_key_financial_health_ratios()
        self.update_status()

    def calculate_summary_values(self):
        if not self.identifier:
            return

        identifier = self.identifier

        # ============================================================
        # Income & Expenses
        # ============================================================

        income_data = frappe.db.get_value(
            "Income And Expenses",
            {"identifier": identifier},
            [
                "total_annual_income",
                "total_annual_expenses"
            ],
            as_dict=True
        ) or {}

        total_annual_income = (
            income_data.get("total_annual_income") or 0
        )

        total_annual_expenses = (
            income_data.get("total_annual_expenses") or 0
        )

        # ============================================================
        # Assets & Investments
        # ============================================================

        assets_data = frappe.db.get_value(
            "Assets And Investments",
            {"identifier": identifier},
            [
                "financial_assets_current_market_value",
                "real_estate_assets_current_market_value",
                "business_assets_estimated_market_value",
                "other_assets_estimated_current_value",
                "gross_total_assets"
            ],
            as_dict=True
        ) or {}

        financial_assets = (
            assets_data.get(
                "financial_assets_current_market_value"
            ) or 0
        )

        real_estate_assets = (
            assets_data.get(
                "real_estate_assets_current_market_value"
            ) or 0
        )

        business_assets = (
            assets_data.get(
                "business_assets_estimated_market_value"
            ) or 0
        )

        other_assets = (
            assets_data.get(
                "other_assets_estimated_current_value"
            ) or 0
        )

        total_assets = (
            assets_data.get("gross_total_assets") or 0
        )

        # ============================================================
        # Loans & Liabilities
        # ============================================================

        loans_data = frappe.db.get_value(
            "Loans And Liabilities",
            {"identifier": identifier},
            [
                "total_outstanding_debt",
                "total_monthly_emi_burden"
            ],
            as_dict=True
        ) or {}

        total_outstanding_loans = (
            loans_data.get("total_outstanding_debt") or 0
        )

        total_monthly_emi = (
            loans_data.get("total_monthly_emi_burden") or 0
        )

        # ============================================================
        # Net Worth
        # ============================================================

        total_liabilities = total_outstanding_loans

        net_worth = (
            total_assets - total_liabilities
        )

        # ============================================================
        # Income & Cash Flow
        # ============================================================

        annual_surplus_deficit = (
            total_annual_income - total_annual_expenses
        )

        monthly_surplus_deficit = (
            annual_surplus_deficit / 12
        )

        if total_annual_income:

            savings_rate = (
                annual_surplus_deficit
                / total_annual_income
            ) * 100

        else:

            savings_rate = 0

        emergency_fund_target = (
            total_annual_expenses / 12
        ) * 6

        # ============================================================
        # Set Header Values
        # ============================================================

        self.financial_assets_current_market_value = (
            financial_assets
        )

        self.real_estate_assets_current_market_value = (
            real_estate_assets
        )

        self.business_assets_estimated_market_value = (
            business_assets
        )

        self.other_assets = other_assets

        self.total_assets = total_assets

        self.total_outstanding_loans = (
            total_outstanding_loans
        )

        self.total_liabilities = total_liabilities

        self.net_worth = net_worth

        self.total_annual_income = (
            total_annual_income
        )

        self.total_annual_expenses = (
            total_annual_expenses
        )

        self.annual_surplus_deficit = (
            annual_surplus_deficit
        )

        self.monthly_surplus_deficit = (
            monthly_surplus_deficit
        )

        self.savings_rate = savings_rate

        self.emergency_fund_target = (
            emergency_fund_target
        )

        self.total_monthly_emi = total_monthly_emi

    def calculate_key_financial_health_ratios(self):

        if not self.identifier:
            return

        # ============================================================
        # Insurance Coverage
        # ============================================================

        insurance_data = frappe.db.get_value(
            "Insurance Coverage",
            {"identifier": self.identifier},
            [
                "life_insurance_annual_premium",
                "health_insurance_annual_premium",
                "total_life_cover_in_force",
                "total_health_cover_all_policies"
            ],
            as_dict=True
        ) or {}

        annual_income = (
            self.total_annual_income or 0
        )

        annual_expenses = (
            self.total_annual_expenses or 0
        )

        total_monthly_emi = (
            self.total_monthly_emi or 0
        )

        total_assets = (
            self.total_assets or 0
        )

        total_outstanding_loans = (
            self.total_outstanding_loans or 0
        )

        net_worth = (
            self.net_worth or 0
        )

        life_cover = (
            insurance_data.get(
                "total_life_cover_in_force"
            ) or 0
        )

        health_cover = (
            insurance_data.get(
                "total_health_cover_all_policies"
            ) or 0
        )

        life_premium = (
            insurance_data.get(
                "life_insurance_annual_premium"
            ) or 0
        )

        health_premium = (
            insurance_data.get(
                "health_insurance_annual_premium"
            ) or 0
        )

        # ============================================================
        # Calculate Each Child Row
        # ============================================================

        for row in self.finiancial_summary_key_financial_health_ratios_child:

            if not row.metric:
                continue

            # Because the Link field is using metric as title_field,
            # row.metric contains the metric text.
            metric = row.metric

            # --------------------------------------------------------
            # 1. Savings Rate
            # --------------------------------------------------------

            if metric == "Savings Rate (%)":

                if annual_income:

                    value = (
                        (
                            annual_income
                            - annual_expenses
                        )
                        / annual_income
                    )

                else:

                    value = 0

                row.current_value = (
                    f"{value * 100:.2f}%"
                )

                if value >= 0.30:

                    row.status = "✅ Healthy"

                elif value >= 0.15:

                    row.status = "⚠️ Below Target"

                else:

                    row.status = "🔴 Critical"

            # --------------------------------------------------------
            # 2. EMI-to-Income Ratio
            # --------------------------------------------------------

            elif metric == "EMI-to-Income Ratio (%)":

                if annual_income:

                    value = (
                        (total_monthly_emi * 12)
                        / annual_income
                    )

                else:

                    value = 0

                row.current_value = (
                    f"{value * 100:.2f}%"
                )

                if value <= 0.40:

                    row.status = "✅ Acceptable"

                elif value <= 0.50:

                    row.status = "⚠️ High"

                else:

                    row.status = "🔴 Danger"

            # --------------------------------------------------------
            # 3. Debt-to-Asset Ratio
            # --------------------------------------------------------

            elif metric == "Debt-to-Asset Ratio (%)":

                if total_assets:

                    value = (
                        total_outstanding_loans
                        / total_assets
                    )

                else:

                    value = 0

                row.current_value = (
                    f"{value * 100:.2f}%"
                )

                if value <= 0.50:

                    row.status = "✅ Healthy"

                else:

                    row.status = "⚠️ High Leverage"

            # --------------------------------------------------------
            # 4. Life Insurance Adequacy
            # --------------------------------------------------------

            elif metric == "Life Insurance Adequacy (%)":

                if annual_income:

                    value = (
                        life_cover
                        / (annual_income * 15)
                    )

                else:

                    value = 0

                row.current_value = (
                    f"{value * 100:.2f}%"
                )

                if value >= 0.80:

                    row.status = "✅ Adequate"

                elif value >= 0.50:

                    row.status = "⚠️ Partial"

                else:

                    row.status = "🔴 Critically Under"

            # --------------------------------------------------------
            # 5. Health Cover
            # --------------------------------------------------------

            elif metric == "Health Cover — Total (₹)":

                row.current_value = str(
                    health_cover
                )

                if health_cover >= 1000000:

                    row.status = "✅ Adequate"

                elif health_cover >= 500000:

                    row.status = "⚠️ Review"

                else:

                    row.status = "🔴 Insufficient"

            # --------------------------------------------------------
            # 6. Net Worth
            # --------------------------------------------------------

            elif metric == "Net Worth (₹)":

                row.current_value = str(
                    net_worth
                )

                if net_worth > 0:

                    row.status = "✅ Positive Net Worth"

                else:

                    row.status = "🔴 Liabilities > Assets"

            # --------------------------------------------------------
            # 7. Insurance Premium as % of Income
            # --------------------------------------------------------

            elif metric == "Insurance Premium as % of Income":

                if annual_income:

                    value = (
                        (
                            life_premium
                            + health_premium
                        )
                        / annual_income
                    )

                else:

                    value = 0

                row.current_value = (
                    f"{value * 100:.2f}%"
                )

                if value <= 0.05:

                    row.status = "✅ Optimal"

                else:

                    row.status = "⚠️ Review Premium Load"

    def update_status(self):

        if not self.identifier:
            self.status = "Draft"
            return

        # ============================================================
        # Required Header Fields
        # ============================================================

        required_header_fields = [
            "financial_assets_current_market_value",
            "real_estate_assets_current_market_value",
            "business_assets_estimated_market_value",
            "other_assets",
            "total_assets",
            "total_outstanding_loans",
            "total_liabilities",
            "net_worth",
            "total_annual_income",
            "total_annual_expenses",
            "annual_surplus_deficit",
            "monthly_surplus_deficit",
            "savings_rate",
            "emergency_fund_target",
            "total_monthly_emi"
        ]

        header_completed = all(
            getattr(self, fieldname, None) is not None
            for fieldname in required_header_fields
        )

        # ============================================================
        # Expected Financial Health Metrics
        # ============================================================

        expected_metrics = {
            "Savings Rate (%)",
            "EMI-to-Income Ratio (%)",
            "Debt-to-Asset Ratio (%)",
            "Life Insurance Adequacy (%)",
            "Health Cover — Total (₹)",
            "Net Worth (₹)",
            "Insurance Premium as % of Income"
        }

        child_rows = (
            self.finiancial_summary_key_financial_health_ratios_child
            or []
        )

        # ============================================================
        # Check All Expected Metrics Are Present
        # ============================================================

        actual_metrics = {
            row.metric
            for row in child_rows
            if row.metric
        }

        all_metrics_present = expected_metrics.issubset(
            actual_metrics
        )

        # ============================================================
        # Check Current Value For Every Expected Metric
        # ============================================================

        child_values_completed = all(
            row.current_value not in (None, "")
            for row in child_rows
            if row.metric in expected_metrics
        )

        # ============================================================
        # Update Financial Summary Status
        # ============================================================

        if (
            header_completed
            and all_metrics_present
            and child_values_completed
        ):

            self.status = "Finanacial Summary Completed"

        else:

            self.status = "Draft"


# ====================================================================
# API: Header Summary Values
# ====================================================================

@frappe.whitelist()
def get_summary_values(identifier):

    if not identifier:
        return {}

    # ================================================================
    # Income & Expenses
    # ================================================================

    income_data = frappe.db.get_value(
        "Income And Expenses",
        {"identifier": identifier},
        [
            "total_annual_income",
            "total_annual_expenses"
        ],
        as_dict=True
    ) or {}

    total_annual_income = (
        income_data.get("total_annual_income") or 0
    )

    total_annual_expenses = (
        income_data.get("total_annual_expenses") or 0
    )

    # ================================================================
    # Assets & Investments
    # ================================================================

    assets_data = frappe.db.get_value(
        "Assets And Investments",
        {"identifier": identifier},
        [
            "financial_assets_current_market_value",
            "real_estate_assets_current_market_value",
            "business_assets_estimated_market_value",
            "other_assets_estimated_current_value",
            "gross_total_assets"
        ],
        as_dict=True
    ) or {}

    financial_assets = (
        assets_data.get(
            "financial_assets_current_market_value"
        ) or 0
    )

    real_estate_assets = (
        assets_data.get(
            "real_estate_assets_current_market_value"
        ) or 0
    )

    business_assets = (
        assets_data.get(
            "business_assets_estimated_market_value"
        ) or 0
    )

    other_assets = (
        assets_data.get(
            "other_assets_estimated_current_value"
        ) or 0
    )

    total_assets = (
        assets_data.get("gross_total_assets") or 0
    )

    # ================================================================
    # Loans & Liabilities
    # ================================================================

    loans_data = frappe.db.get_value(
        "Loans And Liabilities",
        {"identifier": identifier},
        [
            "total_outstanding_debt",
            "total_monthly_emi_burden"
        ],
        as_dict=True
    ) or {}

    total_outstanding_loans = (
        loans_data.get(
            "total_outstanding_debt"
        ) or 0
    )

    total_monthly_emi = (
        loans_data.get(
            "total_monthly_emi_burden"
        ) or 0
    )

    # ================================================================
    # Calculations
    # ================================================================

    total_liabilities = (
        total_outstanding_loans
    )

    net_worth = (
        total_assets
        - total_liabilities
    )

    annual_surplus_deficit = (
        total_annual_income
        - total_annual_expenses
    )

    monthly_surplus_deficit = (
        annual_surplus_deficit / 12
    )

    if total_annual_income:

        savings_rate = (
            annual_surplus_deficit
            / total_annual_income
        ) * 100

    else:

        savings_rate = 0

    emergency_fund_target = (
        total_annual_expenses / 12
    ) * 6

    return {

        "financial_assets_current_market_value":
            financial_assets,

        "real_estate_assets_current_market_value":
            real_estate_assets,

        "business_assets_estimated_market_value":
            business_assets,

        "other_assets":
            other_assets,

        "total_assets":
            total_assets,

        "total_outstanding_loans":
            total_outstanding_loans,

        "total_liabilities":
            total_liabilities,

        "net_worth":
            net_worth,

        "total_annual_income":
            total_annual_income,

        "total_annual_expenses":
            total_annual_expenses,

        "annual_surplus_deficit":
            annual_surplus_deficit,

        "monthly_surplus_deficit":
            monthly_surplus_deficit,

        "savings_rate":
            savings_rate,

        "emergency_fund_target":
            emergency_fund_target,

        "total_monthly_emi":
            total_monthly_emi
    }


# ====================================================================
# API: Key Financial Health Ratios
# ====================================================================

@frappe.whitelist()
def get_key_financial_health_ratios(identifier):

    if not identifier:
        return {}

    # ================================================================
    # Income & Expenses
    # ================================================================

    income_data = frappe.db.get_value(
        "Income And Expenses",
        {"identifier": identifier},
        [
            "total_annual_income",
            "total_annual_expenses"
        ],
        as_dict=True
    ) or {}

    annual_income = (
        income_data.get("total_annual_income") or 0
    )

    annual_expenses = (
        income_data.get("total_annual_expenses") or 0
    )

    # ================================================================
    # Assets
    # ================================================================

    assets_data = frappe.db.get_value(
        "Assets And Investments",
        {"identifier": identifier},
        [
            "gross_total_assets"
        ],
        as_dict=True
    ) or {}

    total_assets = (
        assets_data.get("gross_total_assets") or 0
    )

    # ================================================================
    # Loans
    # ================================================================

    loans_data = frappe.db.get_value(
        "Loans And Liabilities",
        {"identifier": identifier},
        [
            "total_outstanding_debt",
            "total_monthly_emi_burden"
        ],
        as_dict=True
    ) or {}

    total_outstanding_loans = (
        loans_data.get(
            "total_outstanding_debt"
        ) or 0
    )

    total_monthly_emi = (
        loans_data.get(
            "total_monthly_emi_burden"
        ) or 0
    )

    # ================================================================
    # Insurance
    # ================================================================

    insurance_data = frappe.db.get_value(
        "Insurance Coverage",
        {"identifier": identifier},
        [
            "life_insurance_annual_premium",
            "health_insurance_annual_premium",
            "total_life_cover_in_force",
            "total_health_cover_all_policies"
        ],
        as_dict=True
    ) or {}

    life_cover = (
        insurance_data.get(
            "total_life_cover_in_force"
        ) or 0
    )

    health_cover = (
        insurance_data.get(
            "total_health_cover_all_policies"
        ) or 0
    )

    life_premium = (
        insurance_data.get(
            "life_insurance_annual_premium"
        ) or 0
    )

    health_premium = (
        insurance_data.get(
            "health_insurance_annual_premium"
        ) or 0
    )

    # ================================================================
    # Base Calculations
    # ================================================================

    annual_surplus_deficit = (
        annual_income
        - annual_expenses
    )

    # Savings Rate
    if annual_income:

        savings_rate = (
            annual_surplus_deficit
            / annual_income
        )

    else:

        savings_rate = 0

    # EMI-to-Income Ratio
    if annual_income:

        emi_to_income_ratio = (
            (total_monthly_emi * 12)
            / annual_income
        )

    else:

        emi_to_income_ratio = 0

    # Debt-to-Asset Ratio
    if total_assets:

        debt_to_asset_ratio = (
            total_outstanding_loans
            / total_assets
        )

    else:

        debt_to_asset_ratio = 0

    # Life Insurance Adequacy
    if annual_income:

        life_insurance_adequacy = (
            life_cover
            / (annual_income * 15)
        )

    else:

        life_insurance_adequacy = 0

    # Net Worth
    net_worth = (
        total_assets
        - total_outstanding_loans
    )

    # Insurance Premium Percentage
    if annual_income:

        insurance_premium_percentage = (
            (
                life_premium
                + health_premium
            )
            / annual_income
        )

    else:

        insurance_premium_percentage = 0

    # ================================================================
    # Status Calculations
    # ================================================================

    # Savings Rate
    if savings_rate >= 0.30:

        savings_rate_status = "✅ Healthy"

    elif savings_rate >= 0.15:

        savings_rate_status = "⚠️ Below Target"

    else:

        savings_rate_status = "🔴 Critical"

    # EMI-to-Income
    if emi_to_income_ratio <= 0.40:

        emi_status = "✅ Acceptable"

    elif emi_to_income_ratio <= 0.50:

        emi_status = "⚠️ High"

    else:

        emi_status = "🔴 Danger"

    # Debt-to-Asset
    if debt_to_asset_ratio <= 0.50:

        debt_to_asset_status = "✅ Healthy"

    else:

        debt_to_asset_status = "⚠️ High Leverage"

    # Life Insurance
    if life_insurance_adequacy >= 0.80:

        life_insurance_status = "✅ Adequate"

    elif life_insurance_adequacy >= 0.50:

        life_insurance_status = "⚠️ Partial"

    else:

        life_insurance_status = "🔴 Critically Under"

    # Health Cover
    if health_cover >= 1000000:

        health_cover_status = "✅ Adequate"

    elif health_cover >= 500000:

        health_cover_status = "⚠️ Review"

    else:

        health_cover_status = "🔴 Insufficient"

    # Net Worth
    if net_worth > 0:

        net_worth_status = "✅ Positive Net Worth"

    else:

        net_worth_status = "🔴 Liabilities > Assets"

    # Insurance Premium
    if insurance_premium_percentage <= 0.05:

        insurance_premium_status = "✅ Optimal"

    else:

        insurance_premium_status = "⚠️ Review Premium Load"

    # ================================================================
    # Return Values
    # ================================================================

    return {

        "Savings Rate (%)": {
            "current_value":
                f"{savings_rate * 100:.2f}%",
            "status":
                savings_rate_status
        },

        "EMI-to-Income Ratio (%)": {
            "current_value":
                f"{emi_to_income_ratio * 100:.2f}%",
            "status":
                emi_status
        },

        "Debt-to-Asset Ratio (%)": {
            "current_value":
                f"{debt_to_asset_ratio * 100:.2f}%",
            "status":
                debt_to_asset_status
        },

        "Life Insurance Adequacy (%)": {
            "current_value":
                f"{life_insurance_adequacy * 100:.2f}%",
            "status":
                life_insurance_status
        },

        "Health Cover — Total (₹)": {
            "current_value":
                str(health_cover),
            "status":
                health_cover_status
        },

        "Net Worth (₹)": {
            "current_value":
                str(net_worth),
            "status":
                net_worth_status
        },

        "Insurance Premium as % of Income": {
            "current_value":
                f"{insurance_premium_percentage * 100:.2f}%",
            "status":
                insurance_premium_status
        }
    }