from frappe.model.document import Document

from financial_assessment.utils.master_validation import (
    validate_unique_master_value,
)


class LoansAndLiabilitiesLoanTypeMaster(Document):

    def validate(self):
        validate_unique_master_value(
            doctype="Loans And Liabilities Loan Type Master",
            fieldname="loan_type",
            value=self.loan_type,
            current_name=self.name,
            label="Loan Type",
        )