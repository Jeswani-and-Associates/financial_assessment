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
    // Load Child Table Masters
    // ============================================================

    onload(frm) {

        /*
         * Only create the default rows for a new
         * Financial Summary.
         */

        if (!frm.is_new()) {
            return;
        }


        /*
         * Do not create duplicate rows if the child table
         * already contains data.
         */

        if (

            frm.doc
                .finiancial_summary_key_financial_health_ratios_child

            &&

            frm.doc
                .finiancial_summary_key_financial_health_ratios_child
                .length > 0

        ) {

            return;
        }


        frappe.db.get_list(

            "Finiancial Summary Key Financial Health Ratios Master",

            {

                filters: {

                    docstatus: 1

                },

                fields: [

                    "name",
                    "metric",
                    "benchmark"

                ],

                order_by:
                    "name asc"

            }

        ).then(masters => {


            masters.forEach(master => {

                const row = frm.add_child(

                    "finiancial_summary_key_financial_health_ratios_child"

                );


                /*
                 * IMPORTANT:
                 *
                 * Keep the Link field populated using
                 * master.metric.
                 *
                 * The Master DocType has:
                 *
                 * title_field = metric
                 *
                 * so the user sees the metric name instead
                 * of the Master document ID.
                 */

                row.metric =
                    master.metric;


                /*
                 * Copy benchmark from the Master.
                 */

                row.benchmark =
                    master.benchmark;

            });


            frm.refresh_field(

                "finiancial_summary_key_financial_health_ratios_child"

            );


            /*
             * After creating the child rows, calculate the
             * Current Value and Status immediately.
             *
             * This makes the values visible without saving.
             */

            if (frm.doc.identifier) {

                frm.trigger(
                    "calculate_key_financial_health_ratios"
                );

            }

        });

    }

});


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
