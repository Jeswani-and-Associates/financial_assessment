# Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document

from financial_assessment.utils.master_validation import (
    validate_unique_master_value,
)



class AdvisorSignOffAndNextReviewMaster(Document):
	def validate(self):
		validate_unique_master_value(
			doctype="Advisor SignOff And Next Review Master",
			fieldname="observation_gap_recommendation",
			value=self.observation_gap_recommendation,
			current_name=self.name,
			label="Observation / Gap / Recommendation",
		)
