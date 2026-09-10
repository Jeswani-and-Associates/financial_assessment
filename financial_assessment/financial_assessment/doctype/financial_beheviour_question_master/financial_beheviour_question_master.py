from frappe.model.document import Document

from financial_assessment.utils.master_validation import (
    validate_unique_master_value,
)


class FinancialBeheviourQuestionMaster(Document):

    def validate(self):
        validate_unique_master_value(
            doctype="Financial Beheviour Question Master",
            fieldname="question",
            value=self.question,
            current_name=self.name,
            label="Question",
        )