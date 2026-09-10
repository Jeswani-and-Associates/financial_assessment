from frappe.model.document import Document

from financial_assessment.utils.master_validation import (
    validate_unique_master_value,
)


class FinancialYearMaster(Document):

    def validate(self):
        validate_unique_master_value(
            doctype="Financial Year Master",
            fieldname="financial_year_name",
            value=self.financial_year_name,
            current_name=self.name,
            label="Financial Year",
        )