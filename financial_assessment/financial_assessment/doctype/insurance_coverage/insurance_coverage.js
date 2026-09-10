async function calculate_insurance_values(frm) {
    let life_insurance_sum_assured = 0;
    let life_insurance_annual_premium = 0;

    (frm.doc.insurance_coverage_life_insurance_policies || []).forEach(row => {
        life_insurance_sum_assured += flt(row.sum_assured);
        life_insurance_annual_premium += flt(row.annual_premium);
    });

    let health_insurance_sum_insured = 0;
    let health_insurance_annual_premium = 0;

    (frm.doc.insurance_coverage_health_insurance_policies || []).forEach(row => {
        health_insurance_sum_insured += flt(row.sum_insured);
        health_insurance_annual_premium += flt(row.annual_premium);
    });

    let general_other_annual_premium = 0;

    (frm.doc.insurance_coverage_general_and_other_insurance || []).forEach(row => {
        general_other_annual_premium += flt(row.annual_premium);
    });

    // Life Insurance totals
    frm.set_value(
        "life_insurance_sum_assured",
        life_insurance_sum_assured
    );

    frm.set_value(
        "life_insurance_annual_premium",
        life_insurance_annual_premium
    );

    // Health Insurance totals
    frm.set_value(
        "health_insurance_sum_insured",
        health_insurance_sum_insured
    );

    frm.set_value(
        "health_insurance_annual_premium",
        health_insurance_annual_premium
    );

    // Total Life Cover in Force
    frm.set_value(
        "total_life_cover_in_force",
        life_insurance_sum_assured
    );

    // Get Annual Income from Income And Expenses
    let annual_income = 0;

    if (frm.doc.identifier) {
        const response = await frappe.db.get_value(
            "Income And Expenses",
            { identifier: frm.doc.identifier },
            "total_annual_income"
        );

        annual_income = flt(
            response.message?.total_annual_income
        );
    }

    frm.set_value(
        "annual_income",
        annual_income
    );

    // Recommended Life Cover = Annual Income × 25
    let recommended_life_cover = annual_income * 25;

    frm.set_value(
        "recommended_life_cover",
        recommended_life_cover
    );

    // Life Insurance Adequacy Ratio
    let life_insurance_adequacy_ratio = 0;

    if (recommended_life_cover) {
        life_insurance_adequacy_ratio =
            (life_insurance_sum_assured /
                recommended_life_cover) * 100;
    }

    frm.set_value(
        "life_insurance_adequacy_ratio",
        life_insurance_adequacy_ratio
    );

    // Life Cover Gap / (Surplus)
    // Life Cover - (Annual Income × 15)
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

    // Total Health Cover
    frm.set_value(
        "total_health_cover_all_policies",
        health_insurance_sum_insured
    );

    // Total Annual Insurance Premiums
    let total_annual_insurance_premiums =
        life_insurance_annual_premium +
        health_insurance_annual_premium 

    frm.set_value(
        "total_annual_insurance_premiums",
        total_annual_insurance_premiums
    );

    // Premium as % of Annual Income
    let premium_as_percentage_of_annual_income = 0;

    if (annual_income) {
        premium_as_percentage_of_annual_income =
            (total_annual_insurance_premiums /
                annual_income) * 100;
    }

    frm.set_value(
        "premium_as_percentage_of_annual_income",
        premium_as_percentage_of_annual_income
    );
}


frappe.ui.form.on("Insurance Coverage", {
    refresh(frm) {
        calculate_insurance_values(frm);
    },

    validate(frm) {
        calculate_insurance_values(frm);
    },

    identifier(frm) {
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


frappe.ui.form.on(
    "Insurance Coverage General And Other Insurance",
    {
        annual_premium(frm) {
            calculate_insurance_values(frm);
        }
    }
);