// Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("Assets And Investments", {

    identifier(frm) {
        check_existing_identifier(frm);
    },

    refresh(frm) {
        calculate_asset_values(frm);
        set_asset_header_fields_color(frm);

        // =====================================================
        // CREATE LOANS AND LIABILITIES BUTTON
        // =====================================================

        if (!frm.is_new() && frm.doc.identifier) {

            frm.add_custom_button(
                "Create Loans And Liabilities",
                function () {

                    frappe.call({

                        method:
                            "financial_assessment.financial_assessment.doctype.assets_and_investments.assets_and_investments.create_loans_and_liabilities",

                        args: {
                            docname: frm.doc.name
                        },

                        freeze: true,

                        freeze_message:
                            "Creating Loans And Liabilities...",

                        callback: function (r) {

                            if (r.message) {

                                frappe.show_alert({
                                    message:
                                        "Loans And Liabilities created successfully.",
                                    indicator: "green"
                                });

                                frappe.set_route(
                                    "Form",
                                    "Loans and Liabilities",
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
        calculate_asset_values(frm);
    },

    assets_and_investments_financial_assets_add(frm) {
        calculate_asset_values(frm);
    },

    assets_and_investments_financial_assets_remove(frm) {
        calculate_asset_values(frm);
    },

    assets_and_investments_real_estate_assets_add(frm) {
        calculate_asset_values(frm);
    },

    assets_and_investments_real_estate_assets_remove(frm) {
        calculate_asset_values(frm);
    },

    assets_and_investments_business_assets_add(frm) {
        calculate_asset_values(frm);
    },

    assets_and_investments_business_assets_remove(frm) {
        calculate_asset_values(frm);
    },

    assets_and_investments_other_assets_add(frm) {
        calculate_asset_values(frm);
    },

    assets_and_investments_other_assets_remove(frm) {
        calculate_asset_values(frm);
    }

});


/* =========================================================
   FINANCIAL ASSETS
   ========================================================= */

frappe.ui.form.on("Assets And Investments Financial Assets", {

    invested_value(frm) {
        calculate_asset_values(frm);
    },

    current_market_value(frm) {
        calculate_asset_values(frm);
    }

});


/* =========================================================
   REAL ESTATE ASSETS
   ========================================================= */

frappe.ui.form.on("Assets And Investments Real Estate Assets", {

    ownership_percentage(frm) {
        calculate_asset_values(frm);
    },

    purchase_value(frm) {
        calculate_asset_values(frm);
    },

    current_market_value(frm) {
        calculate_asset_values(frm);
    },

    annual_rental_income(frm) {
        calculate_asset_values(frm);
    }

});


/* =========================================================
   BUSINESS ASSETS
   ========================================================= */

frappe.ui.form.on("Assets and Investments Business Assets", {

    estimated_market_value(frm) {
        calculate_asset_values(frm);
    },

    book_value_of_capital(frm) {
        calculate_asset_values(frm);
    },

    annual_drawings_dividend(frm) {
        calculate_asset_values(frm);
    }

});


/* =========================================================
   OTHER ASSETS
   ========================================================= */

frappe.ui.form.on("Assets And Investments Other Assets", {

    estimated_current_value(frm) {
        calculate_asset_values(frm);
    }

});


/* =========================================================
   MAIN CALCULATION
   ========================================================= */

function calculate_asset_values(frm) {

    // =====================================================
    // FINANCIAL ASSETS
    // =====================================================

    let financial_assets_current_market_value = 0;
    let financial_assets_invested_value = 0;

    (frm.doc.assets_and_investments_financial_assets || []).forEach(row => {

        financial_assets_current_market_value +=
            flt(row.current_market_value);

        financial_assets_invested_value +=
            flt(row.invested_value);

    });


    // =====================================================
    // REAL ESTATE ASSETS
    // =====================================================

    let real_estate_purchase_value = 0;
    let real_estate_current_market_value = 0;
    let real_estate_annual_rental_income = 0;

    (frm.doc.assets_and_investments_real_estate_assets || []).forEach(row => {

        const ownership_percentage =
            flt(row.ownership_percentage);

        const ownership_factor =
            ownership_percentage / 100;

        // Purchase Value × Ownership %
        real_estate_purchase_value +=
            flt(row.purchase_value) * ownership_factor;

        // Current Market Value × Ownership %
        real_estate_current_market_value +=
            flt(row.current_market_value) * ownership_factor;

        // Annual Rental Income
        real_estate_annual_rental_income +=
            flt(row.annual_rental_income);

    });


    // =====================================================
    // BUSINESS ASSETS
    // =====================================================

    let business_assets_estimated_market_value = 0;
    let business_assets_book_value_of_capital = 0;
    let business_assets_annual_drawings_dividend = 0;

    (frm.doc.assets_and_investments_business_assets || []).forEach(row => {

        business_assets_estimated_market_value +=
            flt(row.estimated_market_value);

        business_assets_book_value_of_capital +=
            flt(row.book_value_of_capital);

        business_assets_annual_drawings_dividend +=
            flt(row.annual_drawings_dividend);

    });


    // =====================================================
    // OTHER ASSETS
    // =====================================================

    let other_assets_estimated_current_value = 0;

    (frm.doc.assets_and_investments_other_assets || []).forEach(row => {

        other_assets_estimated_current_value +=
            flt(row.estimated_current_value);

    });


    // =====================================================
    // GROSS TOTAL ASSETS
    // =====================================================

    const gross_total_assets =
        financial_assets_current_market_value
        + real_estate_current_market_value
        + business_assets_estimated_market_value
        + other_assets_estimated_current_value;


    // =====================================================
    // SET PARENT FIELDS
    // =====================================================

    frm.set_value(
        "financial_assets_current_market_value",
        financial_assets_current_market_value
    );

    frm.set_value(
        "financial_assets_invested_value",
        financial_assets_invested_value
    );

    frm.set_value(
        "real_estate_purchase_value",
        real_estate_purchase_value
    );

    frm.set_value(
        "real_estate_assets_current_market_value",
        real_estate_current_market_value
    );

    frm.set_value(
        "real_estate_annual_rental_income",
        real_estate_annual_rental_income
    );

    frm.set_value(
        "business_assets_estimated_market_value",
        business_assets_estimated_market_value
    );

    frm.set_value(
        "business_assets_book_value_of_capital",
        business_assets_book_value_of_capital
    );

    frm.set_value(
        "business_assets_annual_drawings_dividend",
        business_assets_annual_drawings_dividend
    );

    frm.set_value(
        "other_assets_estimated_current_value",
        other_assets_estimated_current_value
    );

    frm.set_value(
        "gross_total_assets",
        gross_total_assets
    );


    // Apply colours after setting calculated values
    set_asset_header_fields_color(frm);
}


/* =========================================================
   HEADER FIELD COLOUR STYLING
   ========================================================= */

function set_asset_header_fields_color(frm) {

    // =====================================================
    // FINANCIAL ASSETS
    // Light Teal Background
    // Dark Teal Text
    // =====================================================

    set_asset_field_color(
        frm,
        "financial_assets_invested_value",
        "#E0F2F1",
        "#00695C"
    );

    set_asset_field_color(
        frm,
        "financial_assets_current_market_value",
        "#E0F2F1",
        "#00695C"
    );


    // =====================================================
    // REAL ESTATE ASSETS
    // Light Green Background
    // Dark Green Text
    // =====================================================

    set_asset_field_color(
        frm,
        "real_estate_purchase_value",
        "#E8F5E9",
        "#2E7D32"
    );

    set_asset_field_color(
        frm,
        "real_estate_assets_current_market_value",
        "#E8F5E9",
        "#2E7D32"
    );

    set_asset_field_color(
        frm,
        "real_estate_annual_rental_income",
        "#E8F5E9",
        "#2E7D32"
    );


    // =====================================================
    // BUSINESS ASSETS
    // Light Orange Background
    // Dark Orange Text
    // =====================================================

    set_asset_field_color(
        frm,
        "business_assets_book_value_of_capital",
        "#FFF3E0",
        "#E65100"
    );

    set_asset_field_color(
        frm,
        "business_assets_estimated_market_value",
        "#FFF3E0",
        "#E65100"
    );

    set_asset_field_color(
        frm,
        "business_assets_annual_drawings_dividend",
        "#FFF3E0",
        "#E65100"
    );


    // =====================================================
    // OTHER ASSETS
    // Light Purple Background
    // Dark Purple Text
    // =====================================================

    set_asset_field_color(
        frm,
        "other_assets_estimated_current_value",
        "#F3E5F5",
        "#6A1B9A"
    );


    // =====================================================
    // GROSS TOTAL ASSETS
    // Light Blue Background
    // Dark Blue Text
    // =====================================================

    set_asset_field_color(
        frm,
        "gross_total_assets",
        "#E3F2FD",
        "#003366"
    );
}


/* =========================================================
   COMMON FIELD COLOUR FUNCTION
   ========================================================= */

function set_asset_field_color(
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
