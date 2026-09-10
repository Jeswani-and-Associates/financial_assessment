from frappe.model.document import Document

from financial_assessment.utils.master_validation import (
    validate_unique_master_value,
)


class FamilyAndDependentMaster(Document):

    def validate(self):
        validate_unique_master_value(
            doctype="Family And Dependent Master",
            fieldname="members",
            value=self.members,
            current_name=self.name,
            label="Member",
        )