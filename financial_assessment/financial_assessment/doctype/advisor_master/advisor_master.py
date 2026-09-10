from frappe.model.document import Document

from financial_assessment.utils.master_validation import (
    validate_unique_master_value,
)


class AdvisorMaster(Document):

    def validate(self):
        validate_unique_master_value(
            doctype="Advisor Master",
            fieldname="advisor_name",
            value=self.advisor_name,
            current_name=self.name,
            label="Advisor Name",
        )