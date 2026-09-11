# Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
# For license information, please see license.txt

from frappe.model.document import Document

from financial_assessment.utils.master_validation import (
    validate_unique_master_value,
)


class FutureGoalsFinancialGoalMaster(Document):

    def validate(self): validate_unique_master_value( "Future Goals Financial Goal Master", "financial_goal", self.financial_goal, self.name, "Financial Goal", )