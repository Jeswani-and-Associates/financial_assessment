// Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
// For license information, please see license.txt


frappe.ui.form.on("Income And Expenses", {

	identifier(frm) {
		check_existing_identifier(frm);
	},

	refresh(frm) {

		calculate_income_details(frm);
		calculate_expense_details(frm);
		calculate_parent_totals(frm);

		set_income_expense_header_fields_color(frm);


		// =====================================================
		// CREATE ASSETS AND INVESTMENTS BUTTON
		// =====================================================

		if (!frm.is_new() && frm.doc.identifier) {

			frm.add_custom_button(
				"Create Assets And Investments",
				function () {

					frappe.call({
						method:
							"financial_assessment.financial_assessment.doctype.income_and_expenses.income_and_expenses.create_assets_and_investments",

						args: {
							docname: frm.doc.name
						},

						freeze: true,

						freeze_message:
							"Creating Assets And Investments...",

						callback: function (r) {

							if (r.message) {

								frappe.show_alert({
									message:
										"Assets And Investments created successfully.",
									indicator: "green"
								});

								frappe.set_route(
									"Form",
									"Assets And Investments",
									r.message
								);
							}
						}
					});

				}
			);

		}
	},


	// =====================================================
	// INCOME CHILD TABLE
	// =====================================================

	annual_income_source_child_add(frm) {
		calculate_income_details(frm);
		calculate_expense_details(frm);
		calculate_parent_totals(frm);
		set_income_expense_header_fields_color(frm);
	},

	annual_income_source_child_remove(frm) {
		calculate_income_details(frm);
		calculate_expense_details(frm);
		calculate_parent_totals(frm);
		set_income_expense_header_fields_color(frm);
	},


	// =====================================================
	// EXPENSE CHILD TABLE
	// =====================================================

	annual_expense_and_outflow_add(frm) {
		calculate_expense_details(frm);
		calculate_parent_totals(frm);
		set_income_expense_header_fields_color(frm);
	},

	annual_expense_and_outflow_remove(frm) {
		calculate_expense_details(frm);
		calculate_parent_totals(frm);
		set_income_expense_header_fields_color(frm);
	}

});


/* =========================================================
   ANNUAL INCOME SOURCE
   ========================================================= */

frappe.ui.form.on("Annual Income Source", {

	monthly_income(frm) {
		calculate_income_details(frm);
		calculate_expense_details(frm);
		calculate_parent_totals(frm);
		set_income_expense_header_fields_color(frm);
	}

});


/* =========================================================
   ANNUAL EXPENSE AND OUTFLOW
   ========================================================= */

frappe.ui.form.on("Annual Expense And Outflow", {

	monthly_expense(frm) {
		calculate_expense_details(frm);
		calculate_parent_totals(frm);
		set_income_expense_header_fields_color(frm);
	}

});


/* =========================================================
   CALCULATE INCOME DETAILS
   ========================================================= */

function calculate_income_details(frm) {

	let total_annual_income = 0;


	// =====================================================
	// CALCULATE ANNUAL INCOME FOR EVERY ROW
	// =====================================================

	(frm.doc.annual_income_source_child || []).forEach(row => {

		row.annual_income =
			(row.monthly_income || 0) * 12;

		total_annual_income +=
			row.annual_income;

	});


	// =====================================================
	// CALCULATE PERCENTAGE FOR EVERY INCOME ROW
	// =====================================================

	(frm.doc.annual_income_source_child || []).forEach(row => {

		if (total_annual_income) {

			row.total_income_percentage =
				(row.annual_income / total_annual_income) * 100;

		} else {

			row.total_income_percentage = 0;

		}

	});


	frm.refresh_field(
		"annual_income_source_child"
	);
}


/* =========================================================
   CALCULATE EXPENSE DETAILS
   ========================================================= */

function calculate_expense_details(frm) {

	let total_annual_income = 0;


	// =====================================================
	// CALCULATE TOTAL ANNUAL INCOME FIRST
	// =====================================================

	(frm.doc.annual_income_source_child || []).forEach(row => {

		total_annual_income +=
			(row.monthly_income || 0) * 12;

	});


	// =====================================================
	// CALCULATE ANNUAL EXPENSE AND EXPENSE PERCENTAGE
	// =====================================================

	(frm.doc.annual_expense_and_outflow || []).forEach(row => {

		row.annual_expense =
			(row.monthly_expense || 0) * 12;


		// Expense percentage is based on TOTAL ANNUAL INCOME
		if (total_annual_income) {

			row.income_expense_percentage =
				(row.annual_expense / total_annual_income) * 100;

		} else {

			row.income_expense_percentage = 0;

		}

	});


	frm.refresh_field(
		"annual_expense_and_outflow"
	);
}


/* =========================================================
   CALCULATE PARENT TOTALS
   ========================================================= */

function calculate_parent_totals(frm) {

	let total_annual_income = 0;
	let total_annual_expenses = 0;


	// =====================================================
	// CALCULATE TOTAL ANNUAL INCOME
	// =====================================================

	(frm.doc.annual_income_source_child || []).forEach(row => {

		total_annual_income +=
			row.annual_income || 0;

	});


	// =====================================================
	// CALCULATE TOTAL ANNUAL EXPENSES
	// =====================================================

	(frm.doc.annual_expense_and_outflow || []).forEach(row => {

		total_annual_expenses +=
			row.annual_expense || 0;

	});


	// =====================================================
	// TOTAL ANNUAL INCOME
	// =====================================================

	frm.set_value(
		"total_annual_income",
		total_annual_income
	);


	// =====================================================
	// TOTAL ANNUAL EXPENSES
	// =====================================================

	frm.set_value(
		"total_annual_expenses",
		total_annual_expenses
	);


	// =====================================================
	// ANNUAL SURPLUS / DEFICIT
	// =====================================================

	let annual_surplus_deficit =
		total_annual_income -
		total_annual_expenses;

	frm.set_value(
		"annual_surplus_deficit",
		annual_surplus_deficit
	);


	// =====================================================
	// MONTHLY SURPLUS / DEFICIT
	// =====================================================

	let monthly_surplus_deficit =
		annual_surplus_deficit / 12;

	frm.set_value(
		"monthly_surplus_deficit",
		monthly_surplus_deficit
	);


	// =====================================================
	// SAVINGS RATE
	// =====================================================

	let savings_rate = 0;

	if (total_annual_income) {

		savings_rate =
			(annual_surplus_deficit /
				total_annual_income) * 100;

	}

	frm.set_value(
		"savings_rate",
		savings_rate
	);


	// =====================================================
	// EMERGENCY FUND TARGET
	// =====================================================

	let emergency_fund_target =
		(total_annual_expenses / 12) * 6;

	frm.set_value(
		"emergency_fund_target",
		emergency_fund_target
	);
}



/* =========================================================
   HEADER FIELD COLOUR STYLING
   ========================================================= */

function set_income_expense_header_fields_color(frm) {

	// =====================================================
	// GROUP 1 - ANNUAL INCOME & EXPENSES
	// Light Blue Background
	// Dark Blue Label + Text
	// =====================================================

	const annual_background_color = "#FFF3E0";   
	const annual_text_color = "#E65100";  

	set_income_expense_field_color(
		frm,
		"total_annual_income",
		annual_background_color,
		annual_text_color
	);

	set_income_expense_field_color(
		frm,
		"total_annual_expenses",
		annual_background_color,
		annual_text_color
	);


	// =====================================================
	// GROUP 2 - SURPLUS / DEFICIT
	// Light Orange Background
	// Dark Orange Label + Text
	// =====================================================

	const surplus_background_color = "#E3F2FD";
	const surplus_text_color = " #1565C0";

	set_income_expense_field_color(
		frm,
		"annual_surplus_deficit",
		surplus_background_color,
		surplus_text_color
	);

	set_income_expense_field_color(
		frm,
		"monthly_surplus_deficit",
		surplus_background_color,
		surplus_text_color
	);


	// =====================================================
	// GROUP 3 - SAVINGS & EMERGENCY FUND
	// Light Green Background
	// Dark Green Label + Text
	// =====================================================

	const savings_background_color = "#E8F5E9";
	const savings_text_color = "#2E7D32";

	set_income_expense_field_color(
		frm,
		"savings_rate",
		savings_background_color,
		savings_text_color
	);

	set_income_expense_field_color(
		frm,
		"emergency_fund_target",
		savings_background_color,
		savings_text_color
	);
}



/* =========================================================
   COMMON FIELD COLOUR FUNCTION
   ========================================================= */

function set_income_expense_field_color(
	frm,
	fieldname,
	background_color,
	text_color
) {

	const field = frm.fields_dict[fieldname];

	if (!field) {
		return;
	}


	// =====================================================
	// LABEL
	// =====================================================

	field.$wrapper.find(".control-label").css({
		"color": text_color,
		"font-weight": "bold"
	});


	// =====================================================
	// INPUT
	// =====================================================

	field.$wrapper.find("input").css({
		"background-color": background_color,
		"color": text_color,
		"font-weight": "bold"
	});


	// =====================================================
	// READ ONLY VALUE
	// =====================================================

	field.$wrapper.find(".control-value").css({
		"background-color": background_color,
		"color": text_color,
		"font-weight": "bold",
		"padding": "6px 8px",
		"border-radius": "4px"
	});
}



/* =========================================================
   CHECK EXISTING IDENTIFIER
   ========================================================= */

function check_existing_identifier(frm) {

	if (!frm.is_new()) {
		return;
	}

	if (!frm.doc.identifier) {
		return;
	}


	frappe.call({

		method:
			"financial_assessment.utils.identifier.get_existing_identifier_record",

		args: {
			doctype: frm.doctype,
			identifier: frm.doc.identifier
		},

		callback: function (r) {

			if (!r.message) {
				return;
			}


			const existing_record =
				r.message;


			frappe.confirm(

				`A ${frm.doctype} record already exists for identifier <b>${frm.doc.identifier}</b>.<br><br>Do you want to open the existing record?`,

				function () {

					frappe.set_route(
						"Form",
						frm.doctype,
						existing_record
					);

				}
			);

		}
	});
}

