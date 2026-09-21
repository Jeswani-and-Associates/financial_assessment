frappe.pages["client-advisor-dashboard"].on_page_load = function (
    wrapper
) {

    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "Client Advisor Dashboard",
        single_column: true
    });


    // =========================================================
    // Dashboard HTML
    // =========================================================

    page.main.html(`

        <div class="client-advisor-dashboard">


            <!-- =================================================
                 Dashboard Header
                 ================================================= -->

            <div class="dashboard-header">

                <h3>
                    Client Advisor Dashboard
                </h3>

                <p>
                    View advisor-wise client allocation and
                    client information.
                </p>

            </div>


            <!-- =================================================
                 Total Clients + Advisor Filter
                 ================================================= -->

            <div class="dashboard-filter-section">


                <!-- =================================================
                     Total Clients
                     ================================================= -->

                <div class="total-client-summary">

                    <span class="total-client-label">
                        Total Clients:
                    </span>

                    <span
                        id="total-client-count"
                        class="total-client-value"
                    >
                        0
                    </span>

                </div>


                <!-- =================================================
                     Divider
                     ================================================= -->

                <div class="filter-divider"></div>


                <!-- =================================================
                     Advisor Filter
                     ================================================= -->

                <div class="advisor-filter">

                    <label>
                        Advisor
                    </label>

                    <div id="advisor-filter"></div>

                </div>


                <!-- =================================================
                     Filter Actions
                     ================================================= -->

                <div class="filter-actions">

                    <button
                        type="button"
                        class="btn btn-primary"
                        id="apply-advisor-filter"
                    >
                        Apply
                    </button>


                    <button
                        type="button"
                        class="btn btn-secondary"
                        id="clear-advisor-filter"
                    >
                        Clear
                    </button>

                </div>


            </div>


            <!-- =================================================
                 Clients by Advisor Chart
                 ================================================= -->

            <div class="dashboard-chart-card">


                <div class="section-header">

                    <div>

                        <h4>
                            Clients by Advisor
                        </h4>

                        <p>
                            Number of clients assigned to each advisor.
                        </p>

                    </div>

                </div>


                <div
                    id="advisor-client-chart"
                    class="advisor-client-chart"
                ></div>


            </div>


            <!-- =================================================
                 Client Information Table
                 ================================================= -->

            <div class="dashboard-table-card">


                <div class="section-header">

                    <div>

                        <h4>
                            Client Information
                        </h4>

                        <p>
                            Client details assigned to the selected advisor.
                        </p>

                    </div>

                </div>


                <div class="table-responsive">


                    <table
                        class="table client-information-table"
                    >


                        <thead>

                            <tr>

                                <th>
                                    Client
                                </th>

                                <th>
                                    PAN / TAN
                                </th>

                                <th>
                                    Financial Year
                                </th>

                                <th>
                                    Advisor
                                </th>

                                <th>
                                    Assessment Date
                                </th>

                                <th>
                                    Current Status
                                </th>

                            </tr>

                        </thead>


                        <tbody id="client-information-body">

                            <tr>

                                <td
                                    colspan="6"
                                    class="no-data"
                                >
                                    Loading client information...
                                </td>

                            </tr>

                        </tbody>


                    </table>


                </div>


            </div>


        </div>

    `);


    // =========================================================
    // Initialize Dashboard
    // =========================================================

    setup_advisor_filter();

    load_advisor_client_count();

};


let advisor_filter;


// =============================================================
// Setup Advisor Filter
// =============================================================

function setup_advisor_filter() {


    advisor_filter = frappe.ui.form.make_control({

        parent: $("#advisor-filter"),

        df: {

            fieldtype: "Link",

            fieldname: "advisor",

            options: "Advisor Master",

            placeholder: "Select Advisor"

        },

        render_input: true

    });


    // =========================================================
    // Apply Filter
    // =========================================================

    $("#apply-advisor-filter").on(
        "click",
        function () {


            const selected_advisor =
                advisor_filter.get_value() || "";


            console.log(
                "Selected Advisor:",
                selected_advisor
            );


            load_advisor_client_count(
                selected_advisor
            );


        }
    );


    // =========================================================
    // Clear Filter
    // =========================================================

    $("#clear-advisor-filter").on(
        "click",
        function () {


            advisor_filter.set_value("");


            load_advisor_client_count();


        }
    );

}


// =============================================================
// Load Dashboard Data
// =============================================================

function load_advisor_client_count(
    advisor = ""
) {


    console.log(
        "Loading advisor dashboard:",
        advisor
    );


    frappe.call({

        method:
            "financial_assessment.financial_assessment.page.client_advisor_dashboard.client_advisor_dashboard.get_advisor_client_count",

        args: {

            advisor: advisor

        },

        freeze: true,

        freeze_message:
            "Loading client dashboard...",


        callback: function (r) {


            console.log(
                "Advisor Dashboard Response:",
                r.message
            );


            const data =
                r.message || {};


            // =================================================
            // Total Clients
            // =================================================

            $("#total-client-count").text(
                data.total_clients || 0
            );


            // =================================================
            // Advisor Chart
            // =================================================

            render_advisor_chart(
                data.advisor_wise_count || []
            );


            // =================================================
            // Client Table
            // =================================================

            render_client_table(
                data.clients || []
            );


        },


        error: function (err) {


            console.error(
                "Failed to load advisor dashboard:",
                err
            );


            // -------------------------------------------------
            // Reset Total Client Count
            // -------------------------------------------------

            $("#total-client-count").text("0");


            // -------------------------------------------------
            // Chart Error
            // -------------------------------------------------

            $("#advisor-client-chart").html(`
                <div class="dashboard-no-data">
                    Unable to load advisor data.
                </div>
            `);


            // -------------------------------------------------
            // Table Error
            // -------------------------------------------------

            $("#client-information-body").html(`
                <tr>

                    <td
                        colspan="6"
                        class="no-data"
                    >
                        Unable to load client information.
                    </td>

                </tr>
            `);


            frappe.msgprint(
                "Unable to load client dashboard."
            );


        }

    });

}


// =============================================================
// Render Advisor Chart
// =============================================================

function render_advisor_chart(
    advisor_data
) {


    const chart_container =
        $("#advisor-client-chart");


    chart_container.empty();


    // =========================================================
    // No Advisor Data
    // =========================================================

    if (!advisor_data.length) {


        chart_container.html(`
            <div class="dashboard-no-data">
                No advisor data available.
            </div>
        `);


        return;

    }


    // =========================================================
    // Chart Labels
    // =========================================================

    const labels =
        advisor_data.map(
            item => item.advisor
        );


    // =========================================================
    // Chart Values
    // =========================================================

    const values =
        advisor_data.map(
            item => item.count
        );


    // =========================================================
    // Create Bar Chart
    // =========================================================

    new frappe.Chart(
        "#advisor-client-chart",
        {

            title: "Clients by Advisor",

            data: {

                labels: labels,

                datasets: [

                    {

                        name: "Clients",

                        values: values

                    }

                ]

            },

            type: "bar",

            height: 320,


            axisOptions: {

                xAxisMode: "tick",

                yAxisMode: "tick",

                xIsSeries: true

            },


            barOptions: {

                spaceRatio: 0.4

            },


            tooltipOptions: {

                formatTooltipX: d => d,

                formatTooltipY: d =>
                    `${d} Clients`

            }

        }
    );

}


// =============================================================
// Render Client Table
// =============================================================

function render_client_table(
    clients
) {


    const table_body =
        $("#client-information-body");


    table_body.empty();


    // =========================================================
    // No Client Data
    // =========================================================

    if (!clients.length) {


        table_body.html(`
            <tr>

                <td
                    colspan="6"
                    class="no-data"
                >
                    No client information available.
                </td>

            </tr>
        `);


        return;

    }


    // =========================================================
    // Create Client Rows
    // =========================================================

    clients.forEach(function (client) {


        const client_name =
            frappe.utils.escape_html(
                client.client || "-"
            );


        const pan_tan =
            frappe.utils.escape_html(
                client.pan_tan_no || "-"
            );


        const financial_year =
            frappe.utils.escape_html(
                client.financial_year || "-"
            );


        const advisor =
            frappe.utils.escape_html(
                client.advisor || "-"
            );


        const assessment_date =
            frappe.utils.escape_html(
                client.date_of_assessment || "-"
            );


        const current_status =
            frappe.utils.escape_html(
                client.current_status || "-"
            );


        const row = `

            <tr>


                <!-- Client -->

                <td>

                    <a
                        href="#Form/Client Information/${encodeURIComponent(client.name)}"
                        class="client-link"
                    >
                        ${client_name}
                    </a>

                </td>


                <!-- PAN / TAN -->

                <td>
                    ${pan_tan}
                </td>


                <!-- Financial Year -->

                <td>
                    ${financial_year}
                </td>


                <!-- Advisor -->

                <td>
                    ${advisor}
                </td>


                <!-- Assessment Date -->

                <td>
                    ${assessment_date}
                </td>


                <!-- Current Status -->

                <td>

                    <span class="client-status">
                        ${current_status}
                    </span>

                </td>


            </tr>

        `;


        table_body.append(row);


    });

}
