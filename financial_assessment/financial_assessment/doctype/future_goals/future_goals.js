// Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors

// For license information, please see license.txt

frappe.ui.form.on("Future Goals", {

     identifier(frm) {
        check_existing_identifier(frm);
    },

    refresh(frm) {
        calculate_all_future_goal_rows(frm);
    },

    validate(frm) {
        calculate_all_future_goal_rows(frm);
    },

    future_goal_based_financial_planning_matrix_child_add(frm, cdt, cdn) {
        calculate_future_goal_row(frm, cdt, cdn);
    },

    future_goal_based_financial_planning_matrix_child_remove(frm) {
        calculate_all_future_goal_rows(frm);
    }
});


frappe.ui.form.on(
    "Future Goal Based Financial Planning Matrix Child",
    {
        target_year(frm, cdt, cdn) {
            calculate_future_goal_row(frm, cdt, cdn);
        },

        current_cost_today(frm, cdt, cdn) {
            calculate_future_goal_row(frm, cdt, cdn);
        },

        inflation(frm, cdt, cdn) {
            calculate_future_goal_row(frm, cdt, cdn);
        },

        existing_corpus_savings(frm, cdt, cdn) {
            calculate_future_goal_row(frm, cdt, cdn);
        },

        assumed_return(frm, cdt, cdn) {
            calculate_future_goal_row(frm, cdt, cdn);
        }
    }
);


function calculate_future_goal_row(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    if (!row) {
        return;
    }

    // ---------------------------------------------------------
    // 1. YEARS REMAINING
    // Current Year = current system year
    // Years Remaining = Target Year - Current Year
    // Minimum = 0
    // ---------------------------------------------------------

    const currentYear = new Date().getFullYear();
    const targetYear = cint(row.target_year);

    if (targetYear) {
        row.years_remaining = Math.max(
            0,
            targetYear - currentYear
        );
    } else {
        row.years_remaining = 0;
    }


    // ---------------------------------------------------------
    // 2. FUTURE VALUE REQUIRED
    //
    // Current Cost ×
    // (1 + Inflation / 100) ^ Years Remaining
    // ---------------------------------------------------------

    const currentCost = flt(row.current_cost_today);
    const inflationRate = flt(row.inflation) / 100;
    const yearsRemaining = cint(row.years_remaining);

    if (row.current_cost_today !== null && row.current_cost_today !== undefined && row.current_cost_today !== "") {
        row.future_value_required = Math.round(
            currentCost *
            Math.pow(
                1 + inflationRate,
                yearsRemaining
            )
        );
    } else {
        row.future_value_required = 0;
    }


    // ---------------------------------------------------------
    // 3. SHORTFALL / SURPLUS
    //
    // Existing Corpus - Future Value Required
    //
    // Negative = Shortfall
    // Positive = Surplus
    // ---------------------------------------------------------

    const existingCorpus = flt(
        row.existing_corpus_savings
    );

    const futureValue = flt(
        row.future_value_required
    );

    if (futureValue) {
        row.shortfall_surplus = Math.round(
            existingCorpus - futureValue
        );
    } else {
        row.shortfall_surplus = 0;
    }


    // ---------------------------------------------------------
    // 4. MONTHLY SIP REQUIRED
    //
    // Excel:
    //
    // ABS(
    //     PMT(
    //         Assumed Return / 12,
    //         Years Remaining * 12,
    //         -Existing Corpus,
    //         Future Value Required
    //     )
    // )
    // ---------------------------------------------------------

    const assumedReturn = flt(
        row.assumed_return
    ) / 100;

    if (
        yearsRemaining === 0 ||
        !futureValue ||
        assumedReturn === 0
    ) {
        row.monthly_sip_required = 0;
    } else {
        const monthlyRate = assumedReturn / 12;
        const numberOfPayments = yearsRemaining * 12;

        const futureValueOfCorpus =
            existingCorpus *
            Math.pow(
                1 + monthlyRate,
                numberOfPayments
            );

        const denominator =
            Math.pow(
                1 + monthlyRate,
                numberOfPayments
            ) - 1;

        let monthlySIP =
            (
                futureValueOfCorpus -
                futureValue
            ) *
            monthlyRate /
            denominator;

        row.monthly_sip_required = Math.round(
            Math.abs(monthlySIP)
        );
    }


    // Refresh the child row so calculated values
    // are immediately visible.
    frm.refresh_field(
        "future_goal_based_financial_planning_matrix_child"
    );
}


function calculate_all_future_goal_rows(frm) {
    const rows =
        frm.doc.future_goal_based_financial_planning_matrix_child || [];

    rows.forEach(row => {
        calculate_future_goal_row(
            frm,
            row.doctype,
            row.name
        );
    });
}

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

            const existing_record = r.message;

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


// =====================================================
// CREATE FINANCIAL SUMMARY BUTTON
// =====================================================

frappe.ui.form.on("Future Goals", {

    refresh(frm) {

        if (!frm.is_new() && frm.doc.identifier) {

            frm.add_custom_button(
                "Create Financial Summary",
                function () {

                    frappe.call({
                        method: "financial_assessment.financial_assessment.doctype.future_goals.future_goals.create_financial_summary",
                        args: {
                            docname: frm.doc.name
                        },
                        freeze: true,
                        freeze_message: "Creating Financial Summary...",

                        callback: function (r) {

                            if (r.message) {

                                frappe.show_alert({
                                    message: "Financial Summary created successfully.",
                                    indicator: "green"
                                });

                                frappe.set_route(
                                    "Form",
                                    "Financial Summary",
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
