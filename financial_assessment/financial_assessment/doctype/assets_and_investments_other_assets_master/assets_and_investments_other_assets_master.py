from frappe.model.document import Document

from financial_assessment.utils.master_validation import (
    validate_unique_master_value,
)


class AssetsAndInvestmentsOtherAssetsMaster(Document):

    def validate(self):
        validate_unique_master_value(
            doctype="Assets And Investments Other Assets Master",
            fieldname="other_asset",
            value=self.other_asset,
            current_name=self.name,
            label="Other Asset",
        )