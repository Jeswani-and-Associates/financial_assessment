# Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document


class AssetsAndInvestments(Document):

    def validate(self):
        self.calculate_asset_values()
        self.update_status()

    def update_status(self):

        # =====================================================
        # FINANCIAL ASSETS
        # =====================================================

        financial_complete = (
            bool(self.assets_and_investments_financial_assets)
            and all(
                row.invested_value is not None
                and row.current_market_value is not None
                for row in self.assets_and_investments_financial_assets
            )
        )

        # =====================================================
        # REAL ESTATE ASSETS
        # =====================================================

        real_estate_complete = (
            bool(self.assets_and_investments_real_estate_assets)
            and all(
                row.purchase_value is not None
                and row.current_market_value is not None
                and row.ownership_percentage is not None
                and row.annual_rental_income is not None
                for row in self.assets_and_investments_real_estate_assets
            )
        )

        # =====================================================
        # BUSINESS ASSETS
        # =====================================================

        business_complete = (
            bool(self.assets_and_investments_business_assets)
            and all(
                row.estimated_market_value is not None
                and row.book_value_of_capital is not None
                and row.annual_drawings_dividend is not None
                for row in self.assets_and_investments_business_assets
            )
        )

        # =====================================================
        # OTHER ASSETS
        # =====================================================

        other_complete = (
            bool(self.assets_and_investments_other_assets)
            and all(
                row.estimated_current_value is not None
                for row in self.assets_and_investments_other_assets
            )
        )

        # =====================================================
        # FINAL STATUS
        # =====================================================

        if (
            financial_complete
            and real_estate_complete
            and business_complete
            and other_complete
        ):
            self.status = "Assets And Investments Completed"
        else:
            self.status = "Draft"

    def calculate_asset_values(self):

        # =====================================================
        # FINANCIAL ASSETS
        # =====================================================

        financial_assets_current_market_value = 0
        financial_assets_invested_value = 0

        for row in self.assets_and_investments_financial_assets or []:

            financial_assets_current_market_value += (
                row.current_market_value or 0
            )

            financial_assets_invested_value += (
                row.invested_value or 0
            )

        self.financial_assets_current_market_value = (
            financial_assets_current_market_value
        )

        self.financial_assets_invested_value = (
            financial_assets_invested_value
        )

        # =====================================================
        # REAL ESTATE ASSETS
        # =====================================================

        real_estate_current_market_value = 0
        real_estate_purchase_value = 0
        real_estate_annual_rental_income = 0

        for row in self.assets_and_investments_real_estate_assets or []:

            ownership_percentage = row.ownership_percentage or 0

            ownership_factor = ownership_percentage / 100

            real_estate_purchase_value += (
                (row.purchase_value or 0)
                * ownership_factor
            )

            real_estate_current_market_value += (
                (row.current_market_value or 0)
                * ownership_factor
            )

            real_estate_annual_rental_income += (
                row.annual_rental_income or 0
            )

        self.real_estate_purchase_value = (
            real_estate_purchase_value
        )

        self.real_estate_assets_current_market_value = (
            real_estate_current_market_value
        )

        self.real_estate_annual_rental_income = (
            real_estate_annual_rental_income
        )

        # =====================================================
        # BUSINESS ASSETS
        # =====================================================

        business_assets_estimated_market_value = 0
        business_assets_book_value_of_capital = 0
        business_assets_annual_drawings_dividend = 0

        for row in self.assets_and_investments_business_assets or []:

            business_assets_estimated_market_value += (
                row.estimated_market_value or 0
            )

            business_assets_book_value_of_capital += (
                row.book_value_of_capital or 0
            )

            business_assets_annual_drawings_dividend += (
                row.annual_drawings_dividend or 0
            )

        self.business_assets_estimated_market_value = (
            business_assets_estimated_market_value
        )

        self.business_assets_book_value_of_capital = (
            business_assets_book_value_of_capital
        )

        self.business_assets_annual_drawings_dividend = (
            business_assets_annual_drawings_dividend
        )

        # =====================================================
        # OTHER ASSETS
        # =====================================================

        other_assets_estimated_current_value = 0

        for row in self.assets_and_investments_other_assets or []:

            other_assets_estimated_current_value += (
                row.estimated_current_value or 0
            )

        self.other_assets_estimated_current_value = (
            other_assets_estimated_current_value
        )

        # =====================================================
        # GROSS TOTAL ASSETS
        # =====================================================

        self.gross_total_assets = (
            financial_assets_current_market_value
            + real_estate_current_market_value
            + business_assets_estimated_market_value
            + other_assets_estimated_current_value
        )

@frappe.whitelist()
def create_loans_and_liabilities(docname):

    if not frappe.db.exists("Assets And Investments", docname):
        frappe.throw(
            "Assets And Investments record does not exist."
        )

    assets_and_investments = frappe.get_doc(
        "Assets And Investments",
        docname
    )

    if not assets_and_investments.identifier:
        frappe.throw(
            "Identifier is not set in Assets And Investments."
        )

    # Check if Loans And Liabilities already exists
    existing_record = frappe.db.exists(
        "Loans And Liabilities",
        {
            "identifier": assets_and_investments.identifier
        }
    )

    if existing_record:
        return existing_record

    # Create new Loans And Liabilities record
    loans_and_liabilities = frappe.new_doc(
        "Loans And Liabilities"
    )

    loans_and_liabilities.identifier = (
        assets_and_investments.identifier
    )

    loans_and_liabilities.status = "Draft"

    loans_and_liabilities.insert()

    return loans_and_liabilities.name



        

