from frappe.model.document import Document

from financial_assessment.utils.master_validation import (
    validate_unique_master_value,
)


class AnnualIncomeSourceMaster(Document):

    def validate(self):
        validate_unique_master_value(
            doctype="Annual Income Source Master",
            fieldname="income_source",
            value=self.income_source,
            current_name=self.name,
            label="Income Source",
        )