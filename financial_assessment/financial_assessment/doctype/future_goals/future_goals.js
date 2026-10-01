// Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
// For license information, please see license.txt


frappe.ui.form.on("Future Goals", {

    // =====================================================
    // IDENTIFIER
    // =====================================================

    identifier(frm) {
        check_existing_identifier(frm);
    },


    // =====================================================
    // REFRESH
    // =====================================================

    refresh(frm) {

        calculate_all_future_goal_rows(frm);

        set_future_goal_header_fields_color(frm);


        // =====================================================
        // CREATE FINANCIAL SUMMARY BUTTON
        // =====================================================

        if (!frm.is_new() && frm.doc.identifier) {

            frm.add_custom_button(
                "Create Financial Summary",
                function () {

                    frappe.call({

                        method:
                            "financial_assessment.financial_assessment.doctype.future_goals.future_goals.create_financial_summary",

                        args: {
                            docname: frm.doc.name
                        },

                        freeze: true,

                        freeze_message:
                            "Creating Financial Summary...",

                        callback: function (r) {

                            if (r.message) {

                                frappe.show_alert({
                                    message:
                                        "Financial Summary created successfully.",
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

    },


    // =====================================================
    // VALIDATE
    // =====================================================

    validate(frm) {

        calculate_all_future_goal_rows(frm);

    },


    // =====================================================
    // CHILD ROW ADD
    // =====================================================

    future_goal_based_financial_planning_matrix_child_add(frm) {

        calculate_all_future_goal_rows(frm);

    },


    // =====================================================
    // CHILD ROW REMOVE
    // =====================================================

    future_goal_based_financial_planning_matrix_child_remove(frm) {

        calculate_all_future_goal_rows(frm);

    }

});


// =========================================================
// FUTURE GOAL CHILD TABLE
// =========================================================

frappe.ui.form.on(
    "Future Goal Based Financial Planning Matrix Child",
    {

        target_year(frm) {

            calculate_all_future_goal_rows(frm);

        },


        current_cost_today(frm) {

            calculate_all_future_goal_rows(frm);

        },


        inflation(frm) {

            calculate_all_future_goal_rows(frm);

        },


        existing_corpus_savings(frm) {

            calculate_all_future_goal_rows(frm);

        },


        assumed_return(frm) {

            calculate_all_future_goal_rows(frm);

        }

    }
);


// =========================================================
// CALCULATE SINGLE FUTURE GOAL ROW
// =========================================================

function calculate_future_goal_row(frm, cdt, cdn) {

    const row = locals[cdt][cdn];

    if (!row) {
        return;
    }


    // =====================================================
    // 1. YEARS REMAINING
    //
    // Current Year = Current System Year
    // Years Remaining = Target Year - Current Year
    // Minimum = 0
    // =====================================================

    const currentYear = new Date().getFullYear();

    const targetYear = cint(
        row.target_year
    );


    if (targetYear) {

        row.years_remaining = Math.max(
            0,
            targetYear - currentYear
        );

    } else {

        row.years_remaining = 0;

    }


    // =====================================================
    // 2. FUTURE VALUE REQUIRED
    //
    // Current Cost ×
    // (1 + Inflation / 100) ^ Years Remaining
    // =====================================================

    const currentCost =
        flt(row.current_cost_today);

    const inflationRate =
        flt(row.inflation) / 100;

    const yearsRemaining =
        cint(row.years_remaining);


    if (
        row.current_cost_today !== null &&
        row.current_cost_today !== undefined &&
        row.current_cost_today !== ""
    ) {

        row.future_value_required =
            Math.round(
                currentCost *
                Math.pow(
                    1 + inflationRate,
                    yearsRemaining
                )
            );

    } else {

        row.future_value_required = 0;

    }


    // =====================================================
    // 3. SHORTFALL / SURPLUS
    //
    // Existing Corpus - Future Value Required
    //
    // Negative = Shortfall
    // Positive = Surplus
    // =====================================================

    const existingCorpus =
        flt(row.existing_corpus_savings);

    const futureValue =
        flt(row.future_value_required);


    if (futureValue) {

        row.shortfall_surplus =
            Math.round(
                existingCorpus - futureValue
            );

    } else {

        row.shortfall_surplus = 0;

    }


    // =====================================================
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
    // =====================================================

    const assumedReturn =
        flt(row.assumed_return) / 100;


    if (
        yearsRemaining === 0 ||
        !futureValue ||
        assumedReturn === 0
    ) {

        row.monthly_sip_required = 0;

    } else {

        const monthlyRate =
            assumedReturn / 12;

        const numberOfPayments =
            yearsRemaining * 12;


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


        row.monthly_sip_required =
            Math.round(
                Math.abs(monthlySIP)
            );

    }

}


// =========================================================
// CALCULATE ALL FUTURE GOAL ROWS + PARENT TOTALS
// =========================================================

function calculate_all_future_goal_rows(frm) {

    const rows =
        frm.doc.future_goal_based_financial_planning_matrix_child || [];


    // =====================================================
    // TOTAL VARIABLES
    // =====================================================

    let totalCurrentCostToday = 0;

    let totalFutureValueRequired = 0;

    let totalExistingCorpusSavings = 0;

    let totalShortfallSurplus = 0;

    let totalMonthlySIPRequired = 0;


    // =====================================================
    // CALCULATE EACH CHILD ROW
    // =====================================================

    rows.forEach(row => {

        calculate_future_goal_row(
            frm,
            row.doctype,
            row.name
        );


        // =================================================
        // ADD CHILD VALUES TO TOTALS
        // =================================================

        totalCurrentCostToday +=
            flt(row.current_cost_today);


        totalFutureValueRequired +=
            flt(row.future_value_required);


        totalExistingCorpusSavings +=
            flt(row.existing_corpus_savings);


        totalShortfallSurplus +=
            flt(row.shortfall_surplus);


        totalMonthlySIPRequired +=
            flt(row.monthly_sip_required);

    });


    // =====================================================
    // SET PARENT TOTAL FIELDS
    // =====================================================

    frm.set_value(
        "total_current_cost_today",
        Math.round(totalCurrentCostToday)
    );


    frm.set_value(
        "total_future_value_required",
        Math.round(totalFutureValueRequired)
    );


    frm.set_value(
        "total_existing_corpus_savings",
        Math.round(totalExistingCorpusSavings)
    );


    frm.set_value(
        "total_shortfall__surplus",
        Math.round(totalShortfallSurplus)
    );


    frm.set_value(
        "total_monthly_sip_required",
        Math.round(totalMonthlySIPRequired)
    );


    // =====================================================
    // REFRESH CHILD TABLE
    // =====================================================

    frm.refresh_field(
        "future_goal_based_financial_planning_matrix_child"
    );


    // Apply colours after calculated values are updated
    set_future_goal_header_fields_color(frm);

}


// =========================================================
// HEADER FIELD COLOUR STYLING
// =========================================================

function set_future_goal_header_fields_color(frm) {

    // =====================================================
    // GROUP 1 - FUTURE GOAL REQUIREMENT
    // Light Blue / Dark Blue
    // =====================================================

    const requirement_background_color = "#E3F2FD";
    const requirement_text_color = "#1565C0";


    set_future_goal_field_color(
        frm,
        "total_current_cost_today",
        requirement_background_color,
        requirement_text_color
    );


    set_future_goal_field_color(
        frm,
        "total_future_value_required",
        requirement_background_color,
        requirement_text_color
    );


    // =====================================================
    // GROUP 2 - FUNDING POSITION
    // Light Green / Dark Green
    // =====================================================

    const funding_background_color = "#E8F5E9";
    const funding_text_color = "#2E7D32";


    set_future_goal_field_color(
        frm,
        "total_existing_corpus_savings",
        funding_background_color,
        funding_text_color
    );


    set_future_goal_field_color(
        frm,
        "total_shortfall__surplus",
        funding_background_color,
        funding_text_color
    );


    // =====================================================
    // GROUP 3 - MONTHLY INVESTMENT
    // Light Orange / Dark Orange
    // =====================================================

    const investment_background_color = "#FFF3E0";
    const investment_text_color = "#E65100";


    set_future_goal_field_color(
        frm,
        "total_monthly_sip_required",
        investment_background_color,
        investment_text_color
    );

}


// =========================================================
// COMMON FIELD COLOUR FUNCTION
// =========================================================

function set_future_goal_field_color(
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
    // LABEL COLOR
    // =====================================================

    field.$wrapper.find(".control-label").css({
        "color": text_color,
        "font-weight": "bold"
    });


    // =====================================================
    // INPUT BACKGROUND + TEXT COLOR
    // =====================================================

    field.$wrapper.find("input").css({
        "background-color": background_color,
        "color": text_color,
        "font-weight": "bold"
    });


    // =====================================================
    // READ ONLY FIELD
    // =====================================================

    field.$wrapper.find(".control-value").css({
        "background-color": background_color,
        "color": text_color,
        "font-weight": "bold",
        "padding": "6px 8px",
        "border-radius": "4px"
    });

}


// =========================================================
// CHECK EXISTING IDENTIFIER
// =========================================================

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
