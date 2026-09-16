# Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

from financial_assessment.utils.identifier import (
    find_existing_identifier
)
from financial_assessment.utils.client_status import (
    update_client_current_status
)


class AdvisoryAndRecommendations(Document):

    def on_update(self):

        update_client_current_status(
            self.identifier
        )

    def validate(self):

        # Check duplicate identifier
        self.check_duplicate_identifier()

        # Update status
        self.update_status()

    # ================================================================
    # DUPLICATE IDENTIFIER CHECK
    # ================================================================

    def check_duplicate_identifier(self):

        if not self.identifier:
            return

        existing_record = find_existing_identifier(
            self.doctype,
            self.identifier,
            self.name
        )

        if existing_record:
            frappe.throw(
                f"Advisory And Recommendations already exists "
                f"for identifier <b>{self.identifier}</b>."
            )

    # ================================================================
    # UPDATE STATUS
    # ================================================================

    def update_status(self):

        if not self.identifier:
            self.status = "Draft"
            return

        # ------------------------------------------------------------
        # Child tables that must contain at least one row
        # ------------------------------------------------------------

        child_tables = [

            "key_observations_child",

            "insurance_recommendations_child",

            "investment_and_wealth_building_recommendations_child",

            "debt_management_recommendations_child",

            "tax_planning_recommendations_child",

            "estate_succession_and_legal_planning_child",

            "goal_planning_implementation_recommendations_child",

            "agreed_action_plan_immediate_next_steps_child"

        ]

        # ------------------------------------------------------------
        # Header fields that must be filled
        # ------------------------------------------------------------

        required_header_fields = [

            "assessment_date",

            "next_review_date",

            "services_proposed_to_client",

            "assigned_advisor_at_krb_and_co",

            "review_frequency",

            "client_acknowledgment_and_signoff"

        ]

        # ------------------------------------------------------------
        # Check all child tables
        # ------------------------------------------------------------

        all_child_tables_completed = all(
            getattr(self, fieldname, None)
            and len(getattr(self, fieldname)) > 0
            for fieldname in child_tables
        )

        # ------------------------------------------------------------
        # Check all required header fields
        # ------------------------------------------------------------

        all_header_fields_completed = all(
            getattr(self, fieldname, None)
            not in (None, "")
            for fieldname in required_header_fields
        )

        # ------------------------------------------------------------
        # Final status
        # ------------------------------------------------------------

        if (
            all_child_tables_completed
            and all_header_fields_completed
        ):

            self.status = (
                "Advisory and Recommendations Completed"
            )

        else:

            self.status = "Draft"