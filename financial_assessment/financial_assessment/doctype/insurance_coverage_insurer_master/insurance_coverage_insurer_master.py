# Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
# For license information, please see license.txt

from frappe.model.document import Document

from financial_assessment.utils.master_validation import (
    validate_unique_master_value,
)


class InsuranceCoverageInsurerMaster(Document):

    def validate(self):
        validate_unique_master_value(
            "Insurance Coverage Insurer Master",
            "insurer",
            self.insurer,
            self.name,
            "Insurer",
        )