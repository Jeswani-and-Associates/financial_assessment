// Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
// For license information, please see license.txt


/* =========================================================
   MAIN INSURANCE CALCULATION
   ========================================================= */

async function calculate_insurance_values(frm) {

    // =====================================================
    // LIFE INSURANCE TOTALS
    // =====================================================

    let life_insurance_sum_assured = 0;
    let life_insurance_annual_premium = 0;

    (
        frm.doc.insurance_coverage_life_insurance_policies || []
    ).forEach(row => {

        life_insurance_sum_assured +=
            flt(row.sum_assured);

        life_insurance_annual_premium +=
            flt(row.annual_premium);

    });


    // =====================================================
    // HEALTH INSURANCE TOTALS
    // =====================================================

    let health_insurance_sum_insured = 0;
    let health_insurance_annual_premium = 0;

    (
        frm.doc.insurance_coverage_health_insurance_policies || []
    ).forEach(row => {

        health_insurance_sum_insured +=
            flt(row.sum_insured);

        health_insurance_annual_premium +=
            flt(row.annual_premium);

    });


    // =====================================================
    // GENERAL / OTHER INSURANCE TOTALS
    // =====================================================

    let general_other_sum_insured = 0;
    let general_other_annual_premium = 0;

    (
        frm.doc.insurance_coverage_general_and_other_insurance || []
    ).forEach(row => {

        general_other_sum_insured +=
            flt(row.sum_insured);

        general_other_annual_premium +=
            flt(row.annual_premium);

    });


    // =====================================================
    // SET LIFE INSURANCE TOTALS
    // =====================================================

    frm.set_value(
        "life_insurance_sum_assured",
        life_insurance_sum_assured
    );


    frm.set_value(
        "life_insurance_annual_premium",
        life_insurance_annual_premium
    );


    // =====================================================
    // SET HEALTH INSURANCE TOTALS
    // =====================================================

    frm.set_value(
        "health_insurance_sum_insured",
        health_insurance_sum_insured
    );


    frm.set_value(
        "health_insurance_annual_premium",
        health_insurance_annual_premium
    );


    // =====================================================
    // SET GENERAL / OTHER INSURANCE TOTALS
    // =====================================================

    frm.set_value(
        "other_insurance_sum_insured",
        general_other_sum_insured
    );


    frm.set_value(
        "other_insurance_annual_premium",
        general_other_annual_premium
    );


    // =====================================================
    // TOTAL LIFE COVER IN FORCE
    // =====================================================

    frm.set_value(
        "total_life_cover_in_force",
        life_insurance_sum_assured
    );


    // =====================================================
    // GET ANNUAL INCOME FROM INCOME AND EXPENSES
    // =====================================================

    let annual_income = 0;

    if (frm.doc.identifier) {

        const response = await frappe.db.get_value(
            "Income And Expenses",
            {
                identifier: frm.doc.identifier
            },
            "total_annual_income"
        );


        annual_income =
            flt(response.message?.total_annual_income);

    }


    frm.set_value(
        "annual_income",
        annual_income
    );


    // =====================================================
    // RECOMMENDED LIFE COVER
    // Annual Income × 25
    // =====================================================

    const recommended_life_cover =
        annual_income * 25;


    frm.set_value(
        "recommended_life_cover",
        recommended_life_cover
    );


    // =====================================================
    // LIFE INSURANCE ADEQUACY RATIO
    // =====================================================

    let life_insurance_adequacy_ratio = 0;

    if (recommended_life_cover) {

        life_insurance_adequacy_ratio =
            (
                life_insurance_sum_assured /
                recommended_life_cover
            ) * 100;

    }


    frm.set_value(
        "life_insurance_adequacy_ratio",
        life_insurance_adequacy_ratio
    );


    // =====================================================
    // LIFE COVER GAP / SURPLUS
    // Life Cover - (Annual Income × 15)
    // =====================================================

    let life_cover_gap_surplus = 0;

    if (annual_income) {

        life_cover_gap_surplus =
            life_insurance_sum_assured -
            (annual_income * 15);

    }


    frm.set_value(
        "life_cover_gap_surplus",
        life_cover_gap_surplus
    );


    // =====================================================
    // TOTAL HEALTH COVER
    // =====================================================

    frm.set_value(
        "total_health_cover_all_policies",
        health_insurance_sum_insured
    );


    // =====================================================
    // TOTAL ANNUAL INSURANCE PREMIUMS
    // =====================================================

    const total_annual_insurance_premiums =
        life_insurance_annual_premium +
        health_insurance_annual_premium;


    frm.set_value(
        "total_annual_insurance_premiums",
        total_annual_insurance_premiums
    );


    // =====================================================
    // PREMIUM AS % OF ANNUAL INCOME
    // =====================================================

    let premium_as_percentage_of_annual_income = 0;

    if (annual_income) {

        premium_as_percentage_of_annual_income =
            (
                total_annual_insurance_premiums /
                annual_income
            ) * 100;

    }


    frm.set_value(
        "premium_as_percentage_of_annual_income",
        premium_as_percentage_of_annual_income
    );


    // Apply header colours after calculations
    set_insurance_header_fields_color(frm);

}


/* =========================================================
   INSURANCE COVERAGE FORM EVENTS
   ========================================================= */

frappe.ui.form.on("Insurance Coverage", {

    refresh(frm) {

        calculate_insurance_values(frm);

        set_insurance_header_fields_color(frm);


        // =================================================
        // CREATE FUTURE GOALS BUTTON
        // =================================================

        if (!frm.is_new() && frm.doc.identifier) {

            frm.add_custom_button(
                "Create Future Goals",
                function () {

                    frappe.call({

                        method:
                            "financial_assessment.financial_assessment.doctype.insurance_coverage.insurance_coverage.create_future_goals",

                        args: {
                            docname: frm.doc.name
                        },

                        freeze: true,

                        freeze_message:
                            "Creating Future Goals...",

                        callback: function (r) {

                            if (r.message) {

                                frappe.show_alert({
                                    message:
                                        "Future Goals created successfully.",
                                    indicator: "green"
                                });


                                frappe.set_route(
                                    "Form",
                                    "Future Goals",
                                    r.message
                                );

                            }

                        }

                    });

                }
            );

        }

    },


    validate(frm) {

        calculate_insurance_values(frm);

    },


    identifier(frm) {

        check_existing_identifier(frm);

        calculate_insurance_values(frm);

    },


    insurance_coverage_life_insurance_policies_add(frm) {

        calculate_insurance_values(frm);

    },


    insurance_coverage_life_insurance_policies_remove(frm) {

        calculate_insurance_values(frm);

    },


    insurance_coverage_health_insurance_policies_add(frm) {

        calculate_insurance_values(frm);

    },


    insurance_coverage_health_insurance_policies_remove(frm) {

        calculate_insurance_values(frm);

    },


    insurance_coverage_general_and_other_insurance_add(frm) {

        calculate_insurance_values(frm);

    },


    insurance_coverage_general_and_other_insurance_remove(frm) {

        calculate_insurance_values(frm);

    }

});


/* =========================================================
   LIFE INSURANCE CHILD TABLE
   ========================================================= */

frappe.ui.form.on(
    "Insurance Coverage Life Insurance Policies",
    {

        sum_assured(frm) {

            calculate_insurance_values(frm);

        },


        annual_premium(frm) {

            calculate_insurance_values(frm);

        }

    }
);


/* =========================================================
   HEALTH INSURANCE CHILD TABLE
   ========================================================= */

frappe.ui.form.on(
    "Insurance Coverage Health Insurance Policies",
    {

        sum_insured(frm) {

            calculate_insurance_values(frm);

        },


        annual_premium(frm) {

            calculate_insurance_values(frm);

        }

    }
);


/* =========================================================
   GENERAL / OTHER INSURANCE CHILD TABLE
   ========================================================= */

frappe.ui.form.on(
    "Insurance Coverage General And Other Insurance",
    {

        sum_insured(frm) {

            calculate_insurance_values(frm);

        },


        annual_premium(frm) {

            calculate_insurance_values(frm);

        }

    }
);


/* =========================================================
   HEADER FIELD COLOUR STYLING
   ========================================================= */

function set_insurance_header_fields_color(frm) {


    // =====================================================
    // GROUP 1 - LIFE INSURANCE
    // Light Blue / Dark Blue
    // =====================================================

    const life_background_color = "#E3F2FD";
    const life_text_color = "#1565C0";


    set_insurance_field_color(
        frm,
        "life_insurance_sum_assured",
        life_background_color,
        life_text_color
    );


    set_insurance_field_color(
        frm,
        "life_insurance_annual_premium",
        life_background_color,
        life_text_color
    );


    set_insurance_field_color(
        frm,
        "total_life_cover_in_force",
        life_background_color,
        life_text_color
    );


    set_insurance_field_color(
        frm,
        "recommended_life_cover",
        life_background_color,
        life_text_color
    );


    set_insurance_field_color(
        frm,
        "life_insurance_adequacy_ratio",
        life_background_color,
        life_text_color
    );


    set_insurance_field_color(
        frm,
        "life_cover_gap_surplus",
        life_background_color,
        life_text_color
    );


    // =====================================================
    // GROUP 2 - HEALTH INSURANCE
    // Light Green / Dark Green
    // =====================================================

    const health_background_color = "#E8F5E9";
    const health_text_color = "#2E7D32";


    set_insurance_field_color(
        frm,
        "health_insurance_annual_premium",
        health_background_color,
        health_text_color
    );


    set_insurance_field_color(
        frm,
        "health_insurance_sum_insured",
        health_background_color,
        health_text_color
    );


    set_insurance_field_color(
        frm,
        "total_health_cover_all_policies",
        health_background_color,
        health_text_color
    );

     set_insurance_field_color(
        frm,
        "total_annual_insurance_premiums",
        health_background_color,
        health_text_color
    );


    set_insurance_field_color(
        frm,
        "premium_as_percentage_of_annual_income",
        health_background_color,
        health_text_color
    );


    // =====================================================
    // GROUP 3 - OTHER INSURANCE
    // Light Purple / Dark Purple
    // =====================================================

    const other_background_color = "#F3E5F5";
    const other_text_color = "#6A1B9A";


    set_insurance_field_color(
        frm,
        "other_insurance_sum_insured",
        other_background_color,
        other_text_color
    );


    set_insurance_field_color(
        frm,
        "other_insurance_annual_premium",
        other_background_color,
        other_text_color
    );


    // =====================================================
    // GROUP 4 - OVERALL INSURANCE COST
    // Light Orange / Dark Orange
    // =====================================================

    const overall_background_color = "#FFF3E0";
    const overall_text_color = "#E65100";

     set_insurance_field_color(
        frm,
        "annual_income",
        overall_background_color,
        overall_text_color
    );


   


    // =====================================================
    // GROUP 5 - FINANCIAL REFERENCE
    // Light Teal / Dark Teal
    // =====================================================

    const reference_background_color = "#E0F2F1";
    const reference_text_color = "#00695C";


   

}


/* =========================================================
   COMMON FIELD COLOUR FUNCTION
   ========================================================= */

function set_insurance_field_color(
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
