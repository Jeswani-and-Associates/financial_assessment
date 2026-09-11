# Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class FutureGoals(Document):

    def validate(self):
        self.update_status()

    def update_status(self):
        rows = self.future_goal_based_financial_planning_matrix_child or []

        if not rows:
            self.status = "Draft"
            return

        all_rows_completed = True

        for row in rows:
            if not (
                row.financial_goal
                and row.target_year
                and row.current_cost_today
                and row.inflation is not None
                and row.existing_corpus_savings is not None
                and row.assumed_return is not None
                and row.years_remaining is not None
                and row.future_value_required is not None
                and row.shortfall_surplus is not None
                and row.monthly_sip_required is not None
            ):
                all_rows_completed = False
                break

        if all_rows_completed:
            self.status = "Future Goals Completed"
        else:
            self.status = "Draft"