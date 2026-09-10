from frappe.model.document import Document

from financial_assessment.utils.master_validation import (
    validate_unique_master_value,
)


class AnnualExpenseAndOutflowMaster(Document):

    def validate(self):
        validate_unique_master_value(
            doctype="Annual Expense And Outflow Master",
            fieldname="expense_category",
            value=self.expense_category,
            current_name=self.name,
            label="Expense Category",
        )