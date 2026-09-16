frappe.pages["client-assessment-dashboard"].on_page_load = function (
    wrapper
) {

    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "Client Assessment Dashboard",
        single_column: true
    });

    page.main.html(`
        <div class="client-assessment-dashboard">

            <div class="dashboard-header">
                <h3>Client Assessment Status</h3>
            </div>

            <div class="table-responsive">
                <table class="table table-bordered assessment-table">

                    <thead>
                        <tr>
                            <th>Client</th>
                            <th>Income And Expenses</th>
                            <th>Assets And Investments</th>
                            <th>Loans And Liabilities</th>
                            <th>Insurance Coverage</th>
                            <th>Future Goals</th>
                            <th>Financial Summary</th>
                            <th>Advisory And Recommendations</th>
                        </tr>
                    </thead>

                    <tbody id="assessment-table-body">
                        <tr>
                            <td colspan="8" class="text-center">
                                Loading...
                            </td>
                        </tr>
                    </tbody>

                </table>
            </div>

        </div>
    `);

    load_client_assessment_status();
};


function load_client_assessment_status() {

    frappe.call({

        method:
            "financial_assessment.utils.client_dashboard.get_client_assessment_status",

        freeze: true,

        freeze_message: "Loading client assessment status...",

        callback: function (r) {

            const data = r.message || [];

            render_assessment_table(data);
        }
    });
}


function render_assessment_table(data) {

    const tbody = $("#assessment-table-body");

    tbody.empty();

    if (!data.length) {

        tbody.append(`
            <tr>
                <td colspan="8" class="text-center">
                    No Client Information records found.
                </td>
            </tr>
        `);

        return;
    }

    data.forEach(function (row) {

        tbody.append(`

            <tr>

                <td>
                    <a href="/app/client-information/${row.name}">
                        ${frappe.utils.escape_html(row.client)}
                    </a>
                </td>

                ${render_status_cell(row.income_and_expenses)}

                ${render_status_cell(row.assets_and_investments)}

                ${render_status_cell(row.loans_and_liabilities)}

                ${render_status_cell(row.insurance_coverage)}

                ${render_status_cell(row.future_goals)}

                ${render_status_cell(row.financial_summary)}

                ${render_status_cell(row.advisory_and_recommendations)}

            </tr>

        `);
    });
}


function render_status_cell(status) {

    if (status === "Completed") {

        return `
            <td class="assessment-status completed">
                Completed
            </td>
        `;
    }

    if (status === "Draft") {

        return `
            <td class="assessment-status draft">
                Draft
            </td>
        `;
    }

    return `
        <td class="assessment-status not-created">
            -
        </td>
    `;
}