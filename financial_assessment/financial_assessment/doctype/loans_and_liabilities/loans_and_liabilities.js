// Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("Loans And Liabilities", {
    refresh(frm) {
        if (
            !frm.is_new()
            && frm.doc.identifier
            && frm.doc.status === "Loans And Liabilities Completed"
        ) {
            frm.add_custom_button(
                "Create Insurance Coverage",
                function () {
                    create_insurance_coverage(frm);
                }
            );
        }
    }
});


function create_insurance_coverage(frm) {
    if (!frm.doc.identifier) {
        frappe.msgprint(
            "Client Information is required before creating Insurance Coverage."
        );
        return;
    }

    frappe.call({
        method:
            "financial_assessment.financial_assessment.doctype.loans_and_liabilities.loans_and_liabilities.create_insurance_coverage",
        args: {
            docname: frm.doc.name
        },
        callback: function (r) {
            if (r.message) {
                frappe.set_route(
                    "Form",
                    "Insurance Coverage",
                    r.message
                );
            }
        }
    });
}


frappe.ui.form.on("Loans And Liabilities", {

    refresh(frm) {
        calculate_loan_values(frm);
    },

    validate(frm) {
        calculate_loan_values(frm);
    },

    loans_and_liabilities_comprehensive_loan_schedule_child_add(frm) {
        calculate_loan_values(frm);
    },

    loans_and_liabilities_comprehensive_loan_schedule_child_remove(frm) {
        calculate_loan_values(frm);
    }

});


/* =========================================================
   COMPREHENSIVE LOAN SCHEDULE
   ========================================================= */

frappe.ui.form.on(
    "Loans And Liabilities Comprehensive Loan Schedule Child",
    {

        original_loan_amount(frm) {
            calculate_loan_values(frm);
        },

        outstanding_principal(frm) {
            calculate_loan_values(frm);
        },

        monthly_emi(frm) {
            calculate_loan_values(frm);
        },

        interest_rate(frm) {
            calculate_loan_values(frm);
        }

    }
);


/* =========================================================
   MAIN CALCULATION
   ========================================================= */

function calculate_loan_values(frm) {

    // =====================================================
    // LOAN TOTALS
    // =====================================================

    let original_loan_amount = 0;
    let total_outstanding_debt = 0;
    let total_monthly_emi_burden = 0;

    let weighted_interest_numerator = 0;


    (frm.doc.loans_and_liabilities_comprehensive_loan_schedule_child || [])
        .forEach(row => {

            const child_original_loan_amount =
                flt(row.original_loan_amount);

            const outstanding_principal =
                flt(row.outstanding_principal);

            const monthly_emi =
                flt(row.monthly_emi);

            const interest_rate =
                flt(row.interest_rate);


            // Total Original Loan Amount
            original_loan_amount +=
                child_original_loan_amount;


            // Total Outstanding Debt
            total_outstanding_debt +=
                outstanding_principal;


            // Total Monthly EMI Burden
            total_monthly_emi_burden +=
                monthly_emi;


            // Weighted Average Interest Rate
            weighted_interest_numerator +=
                outstanding_principal * interest_rate;

        });


    // =====================================================
    // TOTAL ANNUAL EMI OUTFLOW
    // =====================================================

    const total_annual_emi_outflow =
        total_monthly_emi_burden * 12;


    // =====================================================
    // WEIGHTED AVERAGE INTEREST RATE
    // =====================================================

    let weighted_average_interest_rate = 0;

    if (total_outstanding_debt) {

        weighted_average_interest_rate =
            weighted_interest_numerator /
            total_outstanding_debt;

    }


    // =====================================================
    // REFERENCE VALUES
    // =====================================================

    let annual_income = 0;
    let gross_total_assets = 0;


    if (frm.doc.identifier) {

        // Income And Expenses
        const income_expense =
            frappe.db.get_value(
                "Income And Expenses",
                {
                    identifier: frm.doc.identifier
                },
                "total_annual_income"
            );


        // Assets And Investments
        const assets_and_investments =
            frappe.db.get_value(
                "Assets And Investments",
                {
                    identifier: frm.doc.identifier
                },
                "gross_total_assets"
            );


        Promise.all([
            income_expense,
            assets_and_investments
        ]).then(values => {

            annual_income =
                flt(values[0].message?.total_annual_income);

            gross_total_assets =
                flt(values[1].message?.gross_total_assets);


            set_reference_calculations(
                frm,
                annual_income,
                gross_total_assets,
                total_annual_emi_outflow,
                total_outstanding_debt
            );

        });

    } else {

        set_reference_calculations(
            frm,
            0,
            0,
            total_annual_emi_outflow,
            total_outstanding_debt
        );

    }


    // =====================================================
    // SET LOAN TOTAL FIELDS
    // =====================================================

    frm.set_value(
        "original_loan_amount",
        original_loan_amount
    );

    frm.set_value(
        "total_outstanding_debt",
        total_outstanding_debt
    );

    frm.set_value(
        "total_monthly_emi_burden",
        total_monthly_emi_burden
    );

    frm.set_value(
        "total_annual_emi_outflow",
        total_annual_emi_outflow
    );

    frm.set_value(
        "weighted_average_interest_rate",
        weighted_average_interest_rate
    );

}


/* =========================================================
   REFERENCE CALCULATIONS
   ========================================================= */

function set_reference_calculations(
    frm,
    annual_income,
    gross_total_assets,
    total_annual_emi_outflow,
    total_outstanding_debt
) {

    // =====================================================
    // ANNUAL INCOME REFERENCE
    // =====================================================

    frm.set_value(
        "annual_income_reference",
        annual_income
    );


    // =====================================================
    // EMI-TO-INCOME RATIO
    // =====================================================

    let emi_to_income_ratio = 0;

    if (annual_income) {

        emi_to_income_ratio =
            (
                total_annual_emi_outflow /
                annual_income
            ) * 100;

    }


    frm.set_value(
        "emi_to_income_ratio",
        emi_to_income_ratio
    );


    // =====================================================
    // DEBT-TO-ASSET RATIO
    // =====================================================

    let debt_to_asset_ratio = 0;

    if (gross_total_assets) {

        debt_to_asset_ratio =
            (
                total_outstanding_debt /
                gross_total_assets
            ) * 100;

    }


    frm.set_value(
        "debt_to_asset_ratio",
        debt_to_asset_ratio
    );


    // =====================================================
    // NET WORTH
    // =====================================================

    const net_worth_reference =
        gross_total_assets -
        total_outstanding_debt;


    frm.set_value(
        "net_worth_reference",
        net_worth_reference
    );

}
