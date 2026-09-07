# Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.naming import make_autoname

from financial_assessment.utils.validators import (
    validate_pan_tan,
    validate_email,
)


class ClientInformation(Document):

    def autoname(self):
        # Generate safe sequential number: CI-1, CI-2, CI-3...
        sequence = make_autoname("CI-.#")

        # Get client name
        client_name = (self.client_full_name_entity_name or "").strip()

        # Get Financial Year Master display value
        financial_year_name = frappe.db.get_value(
            "Financial Year Master",
            self.financial_year_of_assessment,
            "financial_year_name"
        )

        financial_year_name = (financial_year_name or "").strip()

        # Final document name
        self.name = f"{sequence}_{client_name}_{financial_year_name}"

    def validate(self):
        if self.pan_tan_no:
            self.pan_tan_no = validate_pan_tan(
                self.pan_tan_no,
                "PAN/TAN No."
            )

        if self.email_address:
            self.email_address = validate_email(
                self.email_address,
                "Email Address"
            )