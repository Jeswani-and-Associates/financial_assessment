// Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
// For license information, please see license.txt


frappe.ui.form.on("Income And Expenses", {
	refresh(frm) {
		calculate_income_details(frm);
		calculate_expense_details(frm);
		calculate_parent_totals(frm);
	},

	annual_income_source_child_add(frm) {
		calculate_income_details(frm);
		calculate_expense_details(frm);
		calculate_parent_totals(frm);
	},

	annual_income_source_child_remove(frm) {
		calculate_income_details(frm);
		calculate_expense_details(frm);
		calculate_parent_totals(frm);
	},

	annual_expense_and_outflow_add(frm) {
		calculate_expense_details(frm);
		calculate_parent_totals(frm);
	},

	annual_expense_and_outflow_remove(frm) {
		calculate_expense_details(frm);
		calculate_parent_totals(frm);
	}
});


frappe.ui.form.on("Annual Income Source", {
	monthly_income(frm) {
		calculate_income_details(frm);
		calculate_expense_details(frm);
		calculate_parent_totals(frm);
	}
});


frappe.ui.form.on("Annual Expense And Outflow", {
	monthly_expense(frm) {
		calculate_expense_details(frm);
		calculate_parent_totals(frm);
	}
});


function calculate_income_details(frm) {
	let total_annual_income = 0;

	// Calculate annual income for every row
	(frm.doc.annual_income_source_child || []).forEach(row => {
		row.annual_income = (row.monthly_income || 0) * 12;

		total_annual_income += row.annual_income;
	});

	// Calculate percentage for every income row
	(frm.doc.annual_income_source_child || []).forEach(row => {
		if (total_annual_income) {
			row.total_income_percentage =
				(row.annual_income / total_annual_income) * 100;
		} else {
			row.total_income_percentage = 0;
		}
	});

	frm.refresh_field("annual_income_source_child");
}


function calculate_expense_details(frm) {
	let total_annual_income = 0;

	// Calculate total annual income first
	(frm.doc.annual_income_source_child || []).forEach(row => {
		total_annual_income += (row.monthly_income || 0) * 12;
	});

	// Calculate annual expense and expense percentage
	(frm.doc.annual_expense_and_outflow || []).forEach(row => {
		row.annual_expense = (row.monthly_expense || 0) * 12;

		// Expense percentage is based on TOTAL ANNUAL INCOME
		if (total_annual_income) {
			row.income_expense_percentage =
				(row.annual_expense / total_annual_income) * 100;
		} else {
			row.income_expense_percentage = 0;
		}
	});

	frm.refresh_field("annual_expense_and_outflow");
}


function calculate_parent_totals(frm) {
	let total_annual_income = 0;
	let total_annual_expenses = 0;

	// -----------------------------------------
	// Calculate Total Annual Income
	// -----------------------------------------
	(frm.doc.annual_income_source_child || []).forEach(row => {
		total_annual_income += row.annual_income || 0;
	});

	// -----------------------------------------
	// Calculate Total Annual Expenses
	// -----------------------------------------
	(frm.doc.annual_expense_and_outflow || []).forEach(row => {
		total_annual_expenses += row.annual_expense || 0;
	});

	// -----------------------------------------
	// Set Total Annual Income
	// -----------------------------------------
	frm.set_value("total_annual_income", total_annual_income);

	// -----------------------------------------
	// Set Total Annual Expenses
	// -----------------------------------------
	frm.set_value("total_annual_expenses", total_annual_expenses);

	// -----------------------------------------
	// Annual Surplus / Deficit
	// -----------------------------------------
	let annual_surplus_deficit =
		total_annual_income - total_annual_expenses;

	frm.set_value(
		"annual_surplus_deficit",
		annual_surplus_deficit
	);

	// -----------------------------------------
	// Monthly Surplus / Deficit
	// -----------------------------------------
	let monthly_surplus_deficit =
		annual_surplus_deficit / 12;

	frm.set_value(
		"monthly_surplus_deficit",
		monthly_surplus_deficit
	);

	// -----------------------------------------
	// Savings Rate
	// -----------------------------------------
	let savings_rate = 0;

	if (total_annual_income) {
		savings_rate =
			(annual_surplus_deficit / total_annual_income) * 100;
	}

	frm.set_value("savings_rate", savings_rate);

	// -----------------------------------------
	// Emergency Fund Target
	// -----------------------------------------
	let emergency_fund_target =
		(total_annual_expenses / 12) * 6;

	frm.set_value(
		"emergency_fund_target",
		emergency_fund_target
	);
}

frappe.ui.form.on("Income And Expenses", {

	refresh(frm) {

		if (!frm.is_new() && frm.doc.identifier) {

			frm.add_custom_button(
				"Create Assets And Investments",
				function () {

					frappe.call({
						method: "financial_assessment.financial_assessment.doctype.income_and_expenses.income_and_expenses.create_assets_and_investments",
						args: {
							docname: frm.doc.name
						},
						freeze: true,
						freeze_message: "Creating Assets And Investments...",
						callback: function (r) {

							if (r.message) {

								frappe.show_alert({
									message: "Assets And Investments created successfully.",
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
	}

});