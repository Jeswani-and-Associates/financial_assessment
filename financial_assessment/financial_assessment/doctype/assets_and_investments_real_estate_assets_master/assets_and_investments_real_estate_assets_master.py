from frappe.model.document import Document

from financial_assessment.utils.master_validation import (
    validate_unique_master_value,
)


class AssetsAndInvestmentsRealEstateAssetsMaster(Document):

    def validate(self):
        validate_unique_master_value(
            doctype="Assets And Investments Real Estate Assets Master",
            fieldname="property_type",
            value=self.property_type,
            current_name=self.name,
            label="Property Type",
        )