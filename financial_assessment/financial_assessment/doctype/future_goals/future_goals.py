# Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
# For license information, please see license.txt


from frappe.model.document import Document
import frappe

from financial_assessment.utils.identifier import (
    find_existing_identifier
)

from financial_assessment.utils.client_status import (
    update_client_current_status
)


class FutureGoals(Document):


    # =====================================================
    # ON UPDATE
    # =====================================================

    def on_update(self):

        update_client_current_status(
            self.identifier
        )


    # =====================================================
    # VALIDATE
    # =====================================================

    def validate(self):

        existing_record = find_existing_identifier(
            self.doctype,
            self.identifier,
            self.name
        )


        if existing_record:

            frappe.throw(
                f"An {self.doctype} record already exists "
                f"for identifier <b>{self.identifier}</b>.<br>"
                f"Existing record: <b>{existing_record}</b>"
            )


        # =================================================
        # CALCULATE TOTALS
        # =================================================

        self.calculate_totals()


        # =================================================
        # UPDATE STATUS
        # =================================================

        self.update_status()


    # =====================================================
    # CALCULATE PARENT TOTALS
    # =====================================================

    def calculate_totals(self):

        rows = (
            self.future_goal_based_financial_planning_matrix_child
            or []
        )


        # =================================================
        # TOTAL VARIABLES
        # =================================================

        total_current_cost_today = 0

        total_future_value_required = 0

        total_existing_corpus_savings = 0

        total_shortfall_surplus = 0

        total_monthly_sip_required = 0


        # =================================================
        # SUM CHILD TABLE VALUES
        # =================================================

        for row in rows:

            total_current_cost_today += (
                row.current_cost_today or 0
            )


            total_future_value_required += (
                row.future_value_required or 0
            )


            total_existing_corpus_savings += (
                row.existing_corpus_savings or 0
            )


            total_shortfall_surplus += (
                row.shortfall_surplus or 0
            )


            total_monthly_sip_required += (
                row.monthly_sip_required or 0
            )


        # =================================================
        # SET PARENT TOTAL FIELDS
        # =================================================

        self.total_current_cost_today = (
            total_current_cost_today
        )


        self.total_future_value_required = (
            total_future_value_required
        )


        self.total_existing_corpus_savings = (
            total_existing_corpus_savings
        )


        self.total_shortfall__surplus = (
            total_shortfall_surplus
        )


        self.total_monthly_sip_required = (
            total_monthly_sip_required
        )


    # =====================================================
    # UPDATE STATUS
    # =====================================================

    def update_status(self):

        rows = (
            self.future_goal_based_financial_planning_matrix_child
            or []
        )


        if not rows:

            self.status = "Draft"

            return


        all_rows_completed = True


        for row in rows:

            if not (
               
                row.target_year
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

            self.status = (
                "Future Goals Completed"
            )

        else:

            self.status = "Draft"


# =====================================================
# CREATE FINANCIAL SUMMARY
# =====================================================

@frappe.whitelist()
def create_financial_summary(docname):

    # =================================================
    # CHECK FUTURE GOALS EXISTS
    # =================================================

    if not frappe.db.exists(
        "Future Goals",
        docname
    ):

        frappe.throw(
            "Future Goals record does not exist."
        )


    # =================================================
    # GET FUTURE GOALS
    # =================================================

    future_goals = frappe.get_doc(
        "Future Goals",
        docname
    )


    # =================================================
    # CHECK IDENTIFIER
    # =================================================

    if not future_goals.identifier:

        frappe.throw(
            "Identifier is not set in Future Goals."
        )


    # =================================================
    # CHECK EXISTING FINANCIAL SUMMARY
    # =================================================

    existing_record = frappe.db.exists(
        "Financial Summary",
        {
            "identifier":
                future_goals.identifier
        }
    )


    if existing_record:

        return existing_record


    # =================================================
    # CREATE FINANCIAL SUMMARY
    # =================================================

    financial_summary = frappe.new_doc(
        "Financial Summary"
    )


    financial_summary.identifier = (
        future_goals.identifier
    )


    financial_summary.status = "Draft"


    # =================================================
    # POPULATE FINANCIAL HEALTH RATIO
    # =================================================

    masters = frappe.get_all(

        "Finiancial Summary Key Financial Health Ratios Master",

        filters={
            "docstatus": 1
        },

        fields=[
            "name",
            "metric",
            "benchmark"
        ],

        order_by="name asc"
    )


    for master in masters:

        row = financial_summary.append(

            "finiancial_summary_key_financial_health_ratios_child",

            {}

        )


        row.metric = (
            master.metric
        )


        row.benchmark = (
            master.benchmark
        )


    # =================================================
    # INSERT FINANCIAL SUMMARY
    # =================================================

    financial_summary.insert()


    return financial_summary.name
