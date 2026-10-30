
frappe.pages["user-wise-clients"].on_page_load = function (wrapper) {
    frappe.ui.make_app_page({
        parent: wrapper,
        title: "User-Wise Clients",
        single_column: true,
    });

    page_user_wise_wrapper = wrapper;

    $(wrapper).find(".layout-main-section").html(`
        <div class="client-assessment-dashboard user-wise-clients-dashboard">

            <div class="dashboard-header">
                <h3>User-Wise Client Assessment Status</h3>
                <p>
                    View user-wise client allocation and financial assessment status.
                </p>
            </div>

            <div class="dashboard-filter-section">
                <div class="total-client-summary">
                    <span class="total-client-label">Total Users:</span>
                    <span id="total-users-count" class="total-client-value">0</span>
                </div>

                <div class="filter-divider"></div>

                <div class="advisor-filter user-wise-filter">
                    <label for="user-picker-input">User</label>

                    <div class="user-picker-container">
                        <input
                            type="text"
                            id="user-picker-input"
                            class="form-control"
                            placeholder="Search or select a user..."
                            autocomplete="off"
                        >

                        <div
                            id="user-picker-options"
                            class="user-picker-options"
                            style="display:none;"
                        ></div>
                    </div>
                </div>

                <div class="filter-actions">
                    <button
                        type="button"
                        class="btn btn-primary"
                        id="apply-filters"
                    >
                        Apply
                    </button>

                    <button
                        type="button"
                        class="btn btn-secondary"
                        id="clear-filters"
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div class="dashboard-chart-section">
                <h4>User-Wise Client Count</h4>
                <div id="user-clients-chart"></div>
            </div>

            <div class="dashboard-header">
                <h4>Client Assessment Status</h4>
            </div>

            <div class="table-responsive dashboard-table-container">
                <table class="table table-bordered assessment-table">
                    <thead>
                        <tr>
                            <th class="user-column">User</th>
                            <th class="client-header">Client</th>
                            <th class="action-header">Report</th>
                            <th class="window-income">Income And Expenses</th>
                            <th class="window-assets">Assets And Investments</th>
                            <th class="window-loans">Loans And Liabilities</th>
                            <th class="window-insurance">Insurance Coverage</th>
                            <th class="window-goals">Future Goals</th>
                            <th class="window-summary">Financial Summary</th>
                            <th class="window-advisory">Advisory And Recommendations</th>
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

    setup_user_picker_events();
    load_user_wise_dashboard("");
};


/* =========================================================
   Dashboard State
========================================================= */

let page_user_wise_wrapper = null;

let all_dashboard_users = [];
let current_window_order = [];

let current_selected_user = "";
let applied_selected_user = "";


/* =========================================================
   User Picker
========================================================= */

function setup_user_picker_events() {
    const $input = $("#user-picker-input");
    const $options = $("#user-picker-options");

    $input.on("input", function () {
        current_selected_user = "";
        render_user_picker_options($(this).val() || "");
    });

    $input.on("focus", function () {
        render_user_picker_options($(this).val() || "");
    });

    $(document)
        .off("click.userWiseClients")
        .on("click.userWiseClients", function (event) {
            if (!$(event.target).closest(".user-picker-container").length) {
                $options.hide();
            }
        });

    $("#apply-filters").on("click", function () {
        if (!current_selected_user) {
            frappe.msgprint("Please select a user from the dropdown.");
            return;
        }

        applied_selected_user = current_selected_user;
        load_user_wise_dashboard(applied_selected_user);
    });

    $("#clear-filters").on("click", function () {
        current_selected_user = "";
        applied_selected_user = "";

        $input.val("");
        $options.hide();

        load_user_wise_dashboard("");
    });
}


function render_user_picker_options(searchText = "") {
    const $options = $("#user-picker-options");
    const query = searchText.trim().toLowerCase();

    const filteredUsers = all_dashboard_users.filter(function (user) {
        const fullName = (user.user_name || "").toLowerCase();
        const userId = (user.user || "").toLowerCase();

        return fullName.includes(query) || userId.includes(query);
    });

    $options.empty();

    if (!filteredUsers.length) {
        $options.append(`
            <div class="user-picker-no-results">
                No matching users found
            </div>
        `);

        $options.show();
        return;
    }

    filteredUsers.forEach(function (user) {
        const $option = $("<div>", {
            class: "user-picker-option",
            text: get_user_label(user),
        });

        $option.attr("data-user", user.user);

        $option.on("mousedown", function (event) {
            event.preventDefault();

            current_selected_user = user.user;
            $("#user-picker-input").val(get_user_label(user));
            $options.hide();
        });

        $options.append($option);
    });

    $options.show();
}


function get_user_label(user) {
    return user.user_name || user.full_name || user.user;
}


/* =========================================================
   Load Dashboard Data
========================================================= */

function load_user_wise_dashboard(selectedUser = "") {
    frappe.call({
        method:
            "financial_assessment.financial_assessment.page.user_wise_clients.user_wise_clients.get_dashboard_data",

        args: {
            selected_user: selectedUser,
        },

        freeze: true,
        freeze_message: "Loading user-wise client assessment status...",

        callback: function (r) {
            const payload = r.message || {};

            all_dashboard_users = payload.users || [];
            current_window_order = payload.window_order || [];

            $("#total-users-count").text(payload.total_users || 0);

            const chartUsers = selectedUser
                ? all_dashboard_users.filter(function (user) {
                    return user.user === selectedUser;
                })
                : all_dashboard_users;

            render_user_clients_chart(chartUsers);

            if (selectedUser) {
                const selectedUserRecord = all_dashboard_users.find(
                    function (user) {
                        return user.user === payload.selected_user;
                    }
                );

                if (selectedUserRecord) {
                    current_selected_user = selectedUserRecord.user;
                    applied_selected_user = selectedUserRecord.user;

                    $("#user-picker-input").val(
                        get_user_label(selectedUserRecord)
                    );
                } else {
                    current_selected_user = "";
                    applied_selected_user = "";
                    $("#user-picker-input").val("");
                }
            } else {
                current_selected_user = "";
                applied_selected_user = "";
                $("#user-picker-input").val("");
            }

            render_assessment_table(
                payload.rows || [],
                current_window_order,
                all_dashboard_users
            );
        },

        error: function () {
            $("#assessment-table-body").html(`
                <tr>
                    <td colspan="10" class="text-center text-danger">
                        Unable to load dashboard data.
                    </td>
                </tr>
            `);
        },
    });
}


/* =========================================================
   User-Wise Client Count Chart
========================================================= */

function render_user_clients_chart(users) {
    const chartContainer = document.getElementById("user-clients-chart");

    if (!chartContainer) {
        return;
    }

    chartContainer.innerHTML = "";

    if (!users.length) {
        chartContainer.innerHTML = `
            <div class="text-muted text-center">
                No eligible users found.
            </div>
        `;
        return;
    }

    if (typeof frappe.Chart !== "function") {
        chartContainer.innerHTML = `
            <div class="text-muted">
                Chart library is not available on this page.
            </div>
        `;
        return;
    }

    new frappe.Chart("#user-clients-chart", {
        data: {
            labels: users.map(function (user) {
                return user.user_name || user.full_name || user.user;
            }),

            datasets: [
                {
                    name: "Clients",
                    values: users.map(function (user) {
                        return Number(user.total_clients || 0);
                    }),
                },
            ],
        },

        type: "bar",
        height: 280,
        colors: ["#5e64ff"],

        barOptions: {
            spaceRatio: 0.4,
        },

        axisOptions: {
            xAxisMode: "tick",
            yAxisMode: "span",
        },

        tooltipOptions: {
            formatTooltipY: function (value) {
                return `${value} clients`;
            },
        },
    });
}


/* =========================================================
   Render Assessment Table With Merged User Cells
========================================================= */



function render_assessment_table(data, windowOrder, users) {
    const $tbody = $("#assessment-table-body");
    $tbody.empty();

    const columnCount = 3 + windowOrder.length;

    if (!data.length) {
        $tbody.append(`
            <tr>
                <td colspan="${columnCount}" class="text-center no-data-cell">
                    No Client Information records found.
                </td>
            </tr>
        `);
        return;
    }

    /*
     * Group clients by owner.
     * The backend should provide row.owner as the assigned system user ID.
     */
    const groupedRows = new Map();

    data.forEach(function (row) {
        const owner = row.owner || "Unknown User";

        if (!groupedRows.has(owner)) {
            groupedRows.set(owner, []);
        }

        groupedRows.get(owner).push(row);
    });

    let html = "";

    groupedRows.forEach(function (clientRows, owner) {
        clientRows.forEach(function (row, index) {
            const statusMap = {};

            windowOrder.forEach(function (fieldname) {
                statusMap[fieldname] = row[fieldname];
            });

            html += "<tr>";

            // Render one merged user cell for this user's clients.
            if (index === 0) {
                const userRecord = users.find(function (user) {
                    return user.user === owner;
                });

                const userLabel = userRecord
                    ? get_user_label(userRecord)
                    : owner;

                html += `
                    <td
                        class="user-column user-group-cell"
                        rowspan="${clientRows.length}"
                    >
                        <div class="user-group-name">
                            ${frappe.utils.escape_html(userLabel)}
                        </div>
                        <div class="user-client-count">
                            ${clientRows.length}
                            ${clientRows.length === 1 ? "client" : "clients"}
                        </div>
                    </td>
                `;
            }

            html += `
                <td class="client-name-cell client-column">
                    <a
                        href="/app/client-information/${encodeURIComponent(row.name)}"
                        class="client-link"
                    >
                        ${frappe.utils.escape_html(row.client || "-")}
                    </a>
                </td>
            `;

            html += render_report_cell(row);

            windowOrder.forEach(function (fieldname) {
                html += render_status_cell(
                    row,
                    fieldname,
                    statusMap,
                    windowOrder
                );
            });

            html += "</tr>";
        });
    });

    $tbody.html(html);

    bind_assessment_table_events($tbody);
}


/* =========================================================
   Render Assessment Status Cell
========================================================= */

function render_status_cell(row, fieldname, statusMap, windowOrder) {
    const info = row[fieldname] || {};
    const status = info.status || "-";
    const docname = info.docname;
    const doctype = info.doctype;
    const windowClass = window_name_for(fieldname);

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

    if (status === "Draft" && docname) {
        return `
            <td class="assessment-status draft ${windowClass}">
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

    const idx = windowOrder.indexOf(fieldname);
    const previousField = idx > 0 ? windowOrder[idx - 1] : null;

    const previousStatus = previousField
        ? ((statusMap[previousField] || {}).status)
        : "Completed";

    const canCreate = previousStatus === "Completed";

    return `
        <td class="assessment-status not-created ${windowClass}">
            <span
                class="status-badge not-started-link"
                data-doctype="${frappe.utils.escape_html(doctype || "")}"
                data-client="${frappe.utils.escape_html(row.name || "")}"
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
   Render Report Cell
========================================================= */

function render_report_cell(row) {
    if (!row.name) {
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
                style="display:inline-flex;align-items:center;gap:4px;"
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
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
            </button>
        </td>
    `;
}


/* =========================================================
   Bind Assessment Table Events
========================================================= */

function bind_assessment_table_events($tbody) {
    $tbody.off("click", ".not-started-link").on(
        "click",
        ".not-started-link",
        function (e) {
            e.preventDefault();

            const $el = $(this);
            const canCreate =
                Number($el.attr("data-can-create")) === 1;

            const doctype = $el.attr("data-doctype");
            const client = $el.attr("data-client");
            const previousLabel = $el.attr("data-previous-label");

            if (!canCreate) {
                frappe.msgprint({
                    title: __("Incomplete Previous Window"),
                    indicator: "red",
                    message: __(
                        "Please complete the previous window ({0}) first before starting this one.",
                        [previousLabel || __("previous")]
                    ),
                });

                return;
            }

            frappe.route_options = {
                identifier: client,
            };

            frappe.set_route("Form", doctype, "new");
        }
    );

    $tbody.off("click", ".print-report-btn").on(
        "click",
        ".print-report-btn",
        function (e) {
            e.preventDefault();

            const clientId = $(this).attr("data-client");

            if (!clientId) {
                return;
            }

            const url =
                "/printview" +
                "?doctype=" + encodeURIComponent("Client Information") +
                "&name=" + encodeURIComponent(clientId) +
                "&format=" + encodeURIComponent("Financial Assessment Report") +
                "&no_letterhead=0";

            window.open(url, "_blank");
        }
    );
}


/* =========================================================
   Assessment Window CSS Classes
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
