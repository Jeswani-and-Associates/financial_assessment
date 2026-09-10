from frappe.model.document import Document

from financial_assessment.utils.master_validation import (
    validate_unique_master_value,
)


class AssetsAndInvestmentsFinancialAssetsMaster(Document):

    def validate(self):
        validate_unique_master_value(
            doctype="Assets And Investments Financial Assets Master",
            fieldname="asset_category",
            value=self.asset_category,
            current_name=self.name,
            label="Asset Category",
        )