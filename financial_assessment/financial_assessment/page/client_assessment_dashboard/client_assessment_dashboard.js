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

            <!-- ================================
                 Filters
            ================================= -->

            <div class="dashboard-filters">

                <div class="filter-field">
                    <label>Client</label>
                    <div id="client-filter"></div>
                </div>

                <div class="filter-field">
                    <label>Assigned From Date</label>
                    <div id="assigned-from-filter"></div>
                </div>

                <div class="filter-field">
                    <label>Assigned To Date</label>
                    <div id="assigned-to-filter"></div>
                </div>

                <div class="filter-actions">

                    <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        id="apply-filters"
                    >
                        Apply Filters
                    </button>

                    <button
                        type="button"
                        class="btn btn-default btn-sm"
                        id="clear-filters"
                    >
                        Clear Filters
                    </button>

                </div>

            </div>


            <!-- ================================
                 Dashboard Table
            ================================= -->

            <div class="table-responsive dashboard-table-container">

                <table class="table table-bordered assessment-table">

                    <thead>
                        <tr>

                            <th class="client-header">
                                Client
                            </th>

                            <th class="window-income">
                                Income And Expenses
                            </th>

                            <th class="window-assets">
                                Assets And Investments
                            </th>

                            <th class="window-loans">
                                Loans And Liabilities
                            </th>

                            <th class="window-insurance">
                                Insurance Coverage
                            </th>

                            <th class="window-goals">
                                Future Goals
                            </th>

                            <th class="window-summary">
                                Financial Summary
                            </th>

                            <th class="window-advisory">
                                Advisory And Recommendations
                            </th>

                        </tr>
                    </thead>

                    <tbody id="assessment-table-body">

                        <tr>
                            <td colspan="8" class="text-center loading-cell">
                                Loading...
                            </td>
                        </tr>

                    </tbody>

                </table>

            </div>

        </div>
    `);

    setup_dashboard_filters();

    load_client_assessment_status();
};


/* =========================================================
   Dashboard Filters
========================================================= */

let client_filter;
let assigned_from_filter;
let assigned_to_filter;


function setup_dashboard_filters() {

    client_filter = frappe.ui.form.make_control({
        parent: $("#client-filter"),
        df: {
            fieldtype: "Link",
            fieldname: "client",
            // label: "Client",
            options: "Client Information",
            placeholder: "Select Client"
        },
        render_input: true
    });


    assigned_from_filter = frappe.ui.form.make_control({
        parent: $("#assigned-from-filter"),
        df: {
            fieldtype: "Date",
            fieldname: "assigned_from_date",
            // label: "Assigned From Date",
            placeholder: "From Date"
        },
        render_input: true
    });


    assigned_to_filter = frappe.ui.form.make_control({
        parent: $("#assigned-to-filter"),
        df: {
            fieldtype: "Date",
            fieldname: "assigned_to_date",
            // label: "Assigned To Date",
            placeholder: "To Date"
        },
        render_input: true
    });


    // ---------------------------------------------------------
    // Apply Filters
    // ---------------------------------------------------------

    $("#apply-filters").on("click", function () {

        const selected_client = client_filter.get_value() || "";
        const selected_from_date =
            assigned_from_filter.get_value() || "";
        const selected_to_date =
            assigned_to_filter.get_value() || "";


        console.log("Dashboard Filters:", {
            client: selected_client,
            assign_from_date: selected_from_date,
            assign_to_date: selected_to_date
        });


        // Validate date range

        if (
            selected_from_date &&
            selected_to_date &&
            selected_from_date > selected_to_date
        ) {

            frappe.msgprint(
                "Assigned From Date cannot be later than Assigned To Date."
            );

            return;
        }


        // Send ALL selected filters together

        load_client_assessment_status({
            client: selected_client,
            assign_from_date: selected_from_date,
            assign_to_date: selected_to_date
        });

    });


    // ---------------------------------------------------------
    // Clear Filters
    // ---------------------------------------------------------

    $("#clear-filters").on("click", function () {

        client_filter.set_value("");
        assigned_from_filter.set_value("");
        assigned_to_filter.set_value("");

        load_client_assessment_status();

    });
}


/* =========================================================
   Load Dashboard Data
========================================================= */

function load_client_assessment_status(filters = {}) {

    console.log("Loading dashboard with filters:", filters);

    frappe.call({

        method:
            "financial_assessment.financial_assessment.page.client_assessment_dashboard.client_assessment_dashboard.get_client_assessment_status",

        args: {
            client: filters.client || "",
            assign_from_date: filters.assign_from_date || "",
            assign_to_date: filters.assign_to_date || ""
        },

        freeze: true,

        freeze_message: "Loading client assessment status...",

        callback: function (r) {

            console.log(
                "Dashboard response:",
                r.message
            );

            const data = r.message || [];

            render_assessment_table(data);

        }

    });
}


/* =========================================================
   Render Dashboard Table
========================================================= */

function render_assessment_table(data) {

    const tbody = $("#assessment-table-body");

    tbody.empty();


    if (!data.length) {

        tbody.append(`
            <tr>
                <td colspan="8" class="text-center no-data-cell">
                    No Client Information records found.
                </td>
            </tr>
        `);

        return;
    }


    data.forEach(function (row) {

        tbody.append(`

            <tr>

                <td class="client-name-cell">

                    <a
                        href="/app/client-information/${encodeURIComponent(row.name)}"
                        class="client-link"
                    >
                        ${frappe.utils.escape_html(row.client)}
                    </a>

                </td>

                ${render_status_cell(
            row.income_and_expenses,
            "income"
        )}

                ${render_status_cell(
            row.assets_and_investments,
            "assets"
        )}

                ${render_status_cell(
            row.loans_and_liabilities,
            "loans"
        )}

                ${render_status_cell(
            row.insurance_coverage,
            "insurance"
        )}

                ${render_status_cell(
            row.future_goals,
            "goals"
        )}

                ${render_status_cell(
            row.financial_summary,
            "summary"
        )}

                ${render_status_cell(
            row.advisory_and_recommendations,
            "advisory"
        )}

            </tr>

        `);
    });
}


/* =========================================================
   Render Status Cell
========================================================= */

function render_status_cell(status, window_name) {

    if (status === "Completed") {

        return `
            <td class="assessment-status completed ${window_name}">
                <span class="status-badge">
                    Completed
                </span>
            </td>
        `;
    }


    if (status === "Draft") {

        return `
            <td class="assessment-status draft">
                <span class="status-badge">
                    Draft
                </span>
            </td>
        `;
    }


    return `
        <td class="assessment-status not-created">
            <span class="status-badge">
                Not Started
            </span>
        </td>
    `;
}