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

                            <th class="advisor-header">
                                Assigned Advisor
                            </th>

                            <th class="action-header">
                                Report
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
                            <td colspan="10" class="text-center loading-cell">
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

            const payload = r.message || {};
            const data = payload.rows || [];
            const windowOrder = payload.window_order || [];

            render_assessment_table(data, windowOrder);

        }

    });
}


/* =========================================================
   Render Dashboard Table
========================================================= */

function render_assessment_table(data, windowOrder) {

    const tbody = $("#assessment-table-body");

    tbody.empty();


    if (!data.length) {

        tbody.append(`
            <tr>
                <td colspan="10" class="text-center no-data-cell">
                    No Client Information records found.
                </td>
            </tr>
        `);

        return;
    }


    data.forEach(function (row) {

        // Build a status map for this row so we can check
        // "is the previous window completed?" per cell.
        const statusMap = {};
        windowOrder.forEach(function (fieldname) {
            statusMap[fieldname] = row[fieldname];
        });

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


                <td class="client-name-cell assigned-advisor-cell">
                    ${frappe.utils.escape_html(row.assigned_advisor || "-")}
                </td>


                ${render_report_cell(row)}

                ${render_status_cell(
            row,
            "income_and_expenses",
            statusMap,
            windowOrder
        )}

                ${render_status_cell(
            row,
            "assets_and_investments",
            statusMap,
            windowOrder
        )}

                ${render_status_cell(
            row,
            "loans_and_liabilities",
            statusMap,
            windowOrder
        )}

                ${render_status_cell(
            row,
            "insurance_coverage",
            statusMap,
            windowOrder
        )}

                ${render_status_cell(
            row,
            "future_goals",
            statusMap,
            windowOrder
        )}

                ${render_status_cell(
            row,
            "financial_summary",
            statusMap,
            windowOrder
        )}

                ${render_status_cell(
            row,
            "advisory_and_recommendations",
            statusMap,
            windowOrder
        )}

            </tr>

        `);
    });


    // Bind click events for "Not Started" badges

    tbody.off("click", ".print-report-btn").on(
        "click",
        ".print-report-btn",
        function (e) {
            e.preventDefault();

            const client_id = $(this).data("client");

            if (!client_id) {
                return;
            }

            // Open a blank tab synchronously to avoid popup blockers.
            const printWindow = window.open("about:blank", "_blank");

            if (!printWindow) {
                frappe.msgprint({
                    title: __("Popup Blocked"),
                    message: __("Please allow popups to print the report."),
                    indicator: "orange"
                });
                return;
            }

            // Recheck permission on the server before opening the report.
            frappe.call({
                method:
                    "financial_assessment.utils.role_management.can_print_assessment_report",
                args: {
                    client_name: client_id
                },
                callback: function (r) {
                    if (r.message !== true) {
                        printWindow.close();

                        frappe.msgprint({
                            title: __("Access Denied"),
                            message: __(
                                "You do not have permission to print this report."
                            ),
                            indicator: "red"
                        });
                        return;
                    }

                    const url =
                        "/printview" +
                        "?doctype=" +
                        encodeURIComponent("Client Information") +
                        "&name=" +
                        encodeURIComponent(client_id) +
                        "&format=" +
                        encodeURIComponent("Financial Assessment Report") +
                        "&no_letterhead=0";

                    printWindow.location.href = url;
                },
                error: function () {
                    printWindow.close();

                    frappe.msgprint({
                        title: __("Access Denied"),
                        message: __(
                            "Unable to verify print permission. Printing has been blocked."
                        ),
                        indicator: "red"
                    });
                }
            });
        }
    );



    // Bind click events for "Print Report" buttons
    tbody.off("click", ".print-report-btn").on(
        "click",
        ".print-report-btn",
        function (e) {

            e.preventDefault();

            const client_id = $(this).data("client");
            if (!client_id) {
                return;
            }

            const print_format = "Financial Assessment Report";

            const url =
                "/printview" +
                "?doctype=" + encodeURIComponent("Client Information") +
                "&name=" + encodeURIComponent(client_id) +
                "&format=" + encodeURIComponent(print_format) +
                "&no_letterhead=0";

            window.open(url, "_blank");
        }
    );
}


/* =========================================================
   Render Status Cell
========================================================= */

function render_status_cell(row, fieldname, statusMap, windowOrder) {

    const info = row[fieldname] || {};
    const status = info.status || "-";
    const docname = info.docname;
    const doctype = info.doctype;

    const windowClass = window_name_for(fieldname);

    // ---------- Completed ----------
    if (status === "Completed" && docname) {

        return `
            <td class="assessment-status completed ${windowClass}">
                <a
                    href="/app/${frappe.router.slug(doctype)}/${encodeURIComponent(docname)}"
                    class="status-badge"
                    target="_blank"
                >
                    Completed
                </a>
            </td>
        `;
    }

    // ---------- Draft ----------
    if (status === "Draft" && docname) {

        return `
            <td class="assessment-status draft">
                <a
                    href="/app/${frappe.router.slug(doctype)}/${encodeURIComponent(docname)}"
                    class="status-badge"
                    target="_blank"
                >
                    Draft
                </a>
            </td>
        `;
    }

    // ---------- Not Started ----------
    const idx = windowOrder.indexOf(fieldname);
    const previousField = idx > 0 ? windowOrder[idx - 1] : null;
    const previousStatus = previousField
        ? ((statusMap[previousField] || {}).status)
        : "Completed"; // first window has no predecessor → allow

    const canCreate = previousStatus === "Completed";

    return `
        <td class="assessment-status not-created">
            <span
                class="status-badge not-started-link"
                data-doctype="${frappe.utils.escape_html(doctype)}"
                data-client="${frappe.utils.escape_html(row.name)}"
                data-can-create="${canCreate ? 1 : 0}"
                data-previous-label="${frappe.utils.escape_html(
        previousField
            ? frappe.model.unscrub(previousField)
            : ""
    )}"
            >
                Not Started
            </span>
        </td>
    `;
}


/* =========================================================
   Render Report Cell (Print Report button)
========================================================= */


function render_report_cell(row) {
    // Do not show the print button when permission is denied.
    if (!row.name || row.can_print_report !== true) {
        return `
            <td class="action-cell report-cell">-</td>
        `;
    }

    return `
        <td class="action-cell report-cell">
            <button
                type="button"
                class="btn btn-xs btn-default print-report-btn"
                data-client="${frappe.utils.escape_html(row.name)}"
                title="Print Report"
                aria-label="Print Report"
                style="display: inline-flex; align-items: center; gap: 4px;"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
            </button>
        </td>
    `;
}


/* =========================================================
   Map fieldname → window CSS class suffix
========================================================= */

function window_name_for(fieldname) {

    const map = {
        income_and_expenses: "income",
        assets_and_investments: "assets",
        loans_and_liabilities: "loans",
        insurance_coverage: "insurance",
        future_goals: "goals",
        financial_summary: "summary",
        advisory_and_recommendations: "advisory",
    };

    return map[fieldname] || "";
}