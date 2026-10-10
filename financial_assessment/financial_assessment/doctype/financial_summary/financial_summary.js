// Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors

// For license information, please see license.txt


frappe.ui.form.on("Financial Summary", {

    // ============================================================
    // Refresh
    // ============================================================

    refresh(frm) {

        if (frm.doc.identifier) {

            frm.trigger("calculate_summary_values");

            frm.trigger(
                "calculate_key_financial_health_ratios"
            );
        }

        // Apply header field colors
        set_financial_summary_header_fields_color(frm);


        // Create Advisory And Recommendations button
        if (!frm.is_new() && frm.doc.identifier) {

            frm.add_custom_button(
                "Create Advisory And Recommendations",
                function () {

                    frappe.call({
                        method:
                            "financial_assessment.financial_assessment.doctype.financial_summary.financial_summary.create_advisory_and_recommendations",

                        args: {
                            docname: frm.doc.name
                        },

                        freeze: true,
                        freeze_message:
                            "Creating Advisory And Recommendations...",

                        callback: function (r) {

                            if (r.message) {

                                frappe.show_alert({
                                    message:
                                        "Advisory And Recommendations created successfully.",
                                    indicator: "green"
                                });

                                frappe.set_route(
                                    "Form",
                                    "Advisory And Recommendations",
                                    r.message
                                );
                            }
                        }
                    });

                }
            );
        }
    },


    // ============================================================
    // Identifier Changed
    // ============================================================

    identifier(frm) {

        check_existing_identifier(frm);

        if (!frm.doc.identifier) {
            return;
        }

        frm.trigger("calculate_summary_values");

        frm.trigger(
            "calculate_key_financial_health_ratios"
        );
    },


    // ============================================================
    // Header Summary Values
    // ============================================================

    calculate_summary_values(frm) {

        if (!frm.doc.identifier) {
            return;
        }

        frappe.call({

            method:
                "financial_assessment.financial_assessment.doctype.financial_summary.financial_summary.get_summary_values",

            args: {

                identifier:
                    frm.doc.identifier

            },

            freeze: false

        }).then(r => {

            if (!r.message) {
                return;
            }

            const values = r.message;


            // ----------------------------------------------------
            // Net Worth Statement
            // ----------------------------------------------------

            frm.set_value(
                "financial_assets_current_market_value",
                values.financial_assets_current_market_value
            );

            frm.set_value(
                "real_estate_assets_current_market_value",
                values.real_estate_assets_current_market_value
            );

            frm.set_value(
                "business_assets_estimated_market_value",
                values.business_assets_estimated_market_value
            );

            frm.set_value(
                "other_assets",
                values.other_assets
            );

            frm.set_value(
                "total_assets",
                values.total_assets
            );

            frm.set_value(
                "total_outstanding_loans",
                values.total_outstanding_loans
            );

            frm.set_value(
                "total_liabilities",
                values.total_liabilities
            );

            frm.set_value(
                "net_worth",
                values.net_worth
            );


            // ----------------------------------------------------
            // Income & Cash Flow Summary
            // ----------------------------------------------------

            frm.set_value(
                "total_annual_income",
                values.total_annual_income
            );

            frm.set_value(
                "total_annual_expenses",
                values.total_annual_expenses
            );

            frm.set_value(
                "annual_surplus_deficit",
                values.annual_surplus_deficit
            );

            frm.set_value(
                "monthly_surplus_deficit",
                values.monthly_surplus_deficit
            );

            frm.set_value(
                "savings_rate",
                values.savings_rate
            );

            frm.set_value(
                "emergency_fund_target",
                values.emergency_fund_target
            );

            frm.set_value(
                "total_monthly_emi",
                values.total_monthly_emi
            );


            // Re-apply colors after values are populated
            set_financial_summary_header_fields_color(frm);

        });
    },


    // ============================================================
    // Key Financial Health Ratios
    // ============================================================

    calculate_key_financial_health_ratios(frm) {

        if (!frm.doc.identifier) {
            return;
        }

        frappe.call({

            method:
                "financial_assessment.financial_assessment.doctype.financial_summary.financial_summary.get_key_financial_health_ratios",

            args: {

                identifier:
                    frm.doc.identifier

            },

            freeze: false

        }).then(r => {

            if (!r.message) {
                return;
            }

            const values = r.message;

            const rows =
                frm.doc.finiancial_summary_key_financial_health_ratios_child;


            if (!rows || !rows.length) {
                return;
            }


            rows.forEach(row => {

                if (!row.metric) {
                    return;
                }


                /*
                 * IMPORTANT:
                 *
                 * The child table metric field is a Link field.
                 *
                 * Its title_field is "metric".
                 *
                 * Therefore row.metric contains:
                 *
                 * "Savings Rate (%)"
                 * "EMI-to-Income Ratio (%)"
                 * etc.
                 *
                 * We use that value directly as the key.
                 */

                const result =
                    values[row.metric];


                if (!result) {
                    return;
                }


                // ------------------------------------------------
                // Current Value
                // ------------------------------------------------

                row.current_value =
                    result.current_value;


                // ------------------------------------------------
                // Status
                // ------------------------------------------------

                row.status =
                    result.status;

            });


            frm.refresh_field(
                "finiancial_summary_key_financial_health_ratios_child"
            );

        });
    },



    // ============================================================
    // Load Financial Health Ratio Master Records
    // ============================================================

    onload(frm) {

        const table_field =
            "finiancial_summary_key_financial_health_ratios_child";

        const master_doctype =
            "Finiancial Summary Key Financial Health Ratios Master";

        // Do not reload rows if the child table already has data.
        if (frm.doc[table_field] && frm.doc[table_field].length > 0) {
            return;
        }

        frappe.db.get_list(master_doctype, {
            fields: ["name", "metric", "benchmark"],
            order_by: "name asc",
            limit: 100
        }).then(masters => {

            if (!masters || masters.length === 0) {
                frappe.msgprint(
                    "No Financial Health Ratio Master records found."
                );
                return;
            }

            masters.forEach(master => {

                const row = frm.add_child(table_field);

                row.metric = master.metric;
                row.benchmark = master.benchmark;

            });

            // Refresh the child table so all rows appear immediately.
            frm.refresh_field(table_field);

            // Calculate values and statuses if an identifier exists.
            if (frm.doc.identifier) {
                frm.trigger("calculate_key_financial_health_ratios");
            }

        }).catch(error => {

            console.error(
                "Error loading Financial Health Ratio Master records:",
                error
            );

            frappe.msgprint(
                "Unable to load Financial Health Ratio Master records. Please check the browser console."
            );

        });

    }


});


// ============================================================
// FINANCIAL SUMMARY HEADER FIELD COLOR STYLING
// ============================================================

function set_financial_summary_header_fields_color(frm) {


    // ============================================================
    // GROUP 1 - ASSETS
    // Light Blue / Dark Blue
    // ============================================================

    const assets_background_color = "#E3F2FD";
    const assets_text_color = "#1565C0";

    set_financial_summary_field_color(
        frm,
        "total_outstanding_loans",
        assets_background_color,
        assets_text_color
    );


    set_financial_summary_field_color(
        frm,
        "total_liabilities",
        assets_background_color,
        assets_text_color
    );


    set_financial_summary_field_color(
        frm,
        "financial_assets_current_market_value",
        assets_background_color,
        assets_text_color
    );


    set_financial_summary_field_color(
        frm,
        "real_estate_assets_current_market_value",
        assets_background_color,
        assets_text_color
    );


    set_financial_summary_field_color(
        frm,
        "business_assets_estimated_market_value",
        assets_background_color,
        assets_text_color
    );


    set_financial_summary_field_color(
        frm,
        "other_assets",
        assets_background_color,
        assets_text_color
    );


    set_financial_summary_field_color(
        frm,
        "total_assets",
        assets_background_color,
        assets_text_color
    );


    // ============================================================
    // GROUP 2 - LIABILITIES & NET WORTH
    // Light Orange / Dark Orange
    // ============================================================

    const liabilities_background_color = "#FFF3E0";
    const liabilities_text_color = "#E65100";

    set_financial_summary_field_color(
        frm,
        "net_worth",
        liabilities_background_color,
        liabilities_text_color
    );


    // ============================================================
    // GROUP 3 - INCOME & CASH FLOW
    // Light Green / Dark Green
    // ============================================================

    const income_background_color = "#E8F5E9";
    const income_text_color = "#2E7D32";


    set_financial_summary_field_color(
        frm,
        "total_annual_income",
        income_background_color,
        income_text_color
    );


    set_financial_summary_field_color(
        frm,
        "total_annual_expenses",
        income_background_color,
        income_text_color
    );


    set_financial_summary_field_color(
        frm,
        "annual_surplus_deficit",
        income_background_color,
        income_text_color
    );


    set_financial_summary_field_color(
        frm,
        "monthly_surplus_deficit",
        income_background_color,
        income_text_color
    );

    set_financial_summary_field_color(
        frm,
        "savings_rate",
        income_background_color,
        income_text_color
    );


    set_financial_summary_field_color(
        frm,
        "emergency_fund_target",
        income_background_color,
        income_text_color
    );

    set_financial_summary_field_color(
        frm,
        "total_monthly_emi",
        income_background_color,
        income_text_color
    );



    // ============================================================
    // GROUP 4 - SAVINGS & EMERGENCY PLANNING
    // Light Teal / Dark Teal
    // ============================================================

    const savings_background_color = "#E0F2F1";
    const savings_text_color = "#00695C";




    // ============================================================
    // GROUP 5 - EMI / DEBT BURDEN
    // Light Purple / Dark Purple
    // ============================================================

    const emi_background_color = "#F3E5F5";
    const emi_text_color = "#6A1B9A";




}


// ============================================================
// COMMON FIELD COLOR FUNCTION
// ============================================================

function set_financial_summary_field_color(
    frm,
    fieldname,
    background_color,
    text_color
) {

    const field = frm.fields_dict[fieldname];

    if (!field) {
        return;
    }


    // ============================================================
    // LABEL
    // ============================================================

    field.$wrapper.find(".control-label").css({
        "color": text_color,
        "font-weight": "bold"
    });


    // ============================================================
    // INPUT FIELD
    // ============================================================

    field.$wrapper.find("input").css({
        "background-color": background_color,
        "color": text_color,
        "font-weight": "bold"
    });


    // ============================================================
    // READ ONLY / CONTROL VALUE
    // ============================================================

    field.$wrapper.find(".control-value").css({
        "background-color": background_color,
        "color": text_color,
        "font-weight": "bold",
        "padding": "6px 8px",
        "border-radius": "4px"
    });

}


// ============================================================
// CHECK EXISTING IDENTIFIER
// ============================================================

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
