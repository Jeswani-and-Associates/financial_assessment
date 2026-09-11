# Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
# For license information, please see license.txt

from frappe.model.document import Document

from financial_assessment.utils.master_validation import (
    validate_unique_master_value,
)


class FutureGoalsPlanOrTopic(Document):

    def validate(self):
        validate_unique_master_value(
            "Future Goals Plan Or Topic",
            "reference_code",
            self.reference_code,
            self.name,
            "Reference Code",
        )