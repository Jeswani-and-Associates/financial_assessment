# Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
# For license information, please see license.txt

from frappe.model.document import Document

from financial_assessment.utils.master_validation import (
    validate_unique_master_value,
)


class InsuranceCoverageTypeofInsurance(Document):

    def validate(self):
        validate_unique_master_value(
            "Insurance Coverage Type of Insurance",
            "type_of_insurance",
            self.type_of_insurance,
            self.name,
            "Type of Insurance",
        )