frappe.pages["role-management"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "Role Management",
        single_column: true,
    });

    const $main = $(wrapper).find(".layout-main-section");

    $main.html(`
        <div class="role-management-page" style="padding: 15px;">

            <div class="card" style="padding: 20px; margin-bottom: 20px;">
                <h4 id="role-form-title">
                    Create Financial Assessment Role
                </h4>

                <div class="form-group">
                    <label for="role-name">Role Name</label>
                    <input
                        id="role-name"
                        class="form-control"
                        type="text"
                        maxlength="140"
                        placeholder="Enter role name"
                    >
                </div>

                <p class="text-muted">
                    Select the Financial Assessment DocTypes and configure
                    the permissions required for this role.
                </p>
            </div>

            <div class="card" style="padding: 20px; margin-bottom: 20px;">

                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                    margin-bottom: 15px;
                ">
                    <h4 style="margin: 0;">
                        DocType Permissions
                    </h4>

                    <button
                        type="button"
                        class="btn btn-default"
                        id="toggle-all-permissions">
                        Select All
                    </button>
                </div>

                <div class="table-responsive">
                    <table class="table table-bordered table-hover">
                        <thead>
                            <tr>
                                <th style="min-width: 220px;">
                                    DocType
                                </th>
                                <th>Select</th>
                                <th>Read</th>
                                <th>Create</th>
                                <th>Write</th>
                                <th>Delete</th>
                                <th>Print</th>
                            </tr>
                        </thead>

                        <tbody id="role-doctype-permissions">
                            <tr>
                                <td colspan="7" class="text-muted">
                                    Loading Financial Assessment DocTypes...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div style="
                    margin-top: 20px;
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                ">
                    <button
                        class="btn btn-primary"
                        id="create-role-btn">
                        Create Role and Save Permissions
                    </button>

                    <button
                        class="btn btn-default"
                        id="cancel-role-edit-btn"
                        style="display: none;">
                        Cancel Edit
                    </button>

                    <button
                        class="btn btn-default"
                        id="refresh-role-doctypes">
                        Refresh DocTypes
                    </button>
                </div>
            </div>

            <div class="card" style="padding: 20px;">
                <h4>Configured Financial Assessment Roles</h4>

                <div id="configured-role-list">
                    <p class="text-muted">
                        Loading roles...
                    </p>
                </div>
            </div>

        </div>
    `);

    // Available permission fields.
    const permission_fields = [
        "select",
        "read",
        "create",
        "write",
        "delete",
        "print",
    ];

    let editing_role = null;
    let loading_doctypes = false;

    function escape_html(value) {
        return frappe.utils.escape_html(String(value || ""));
    }

    // ---------------------------------------------------------
    // Update Select All / Deselect All button label.
    // ---------------------------------------------------------

    function update_select_all_button() {
        const $checkboxes = $("#role-doctype-permissions")
            .find("input.doctype-permission");

        const total_checkboxes = $checkboxes.length;
        const checked_checkboxes = $checkboxes.filter(":checked").length;

        const all_checked =
            total_checkboxes > 0 &&
            total_checkboxes === checked_checkboxes;

        $("#toggle-all-permissions").text(
            all_checked ? "Deselect All" : "Select All"
        );
    }

    // ---------------------------------------------------------
    // Select All / Deselect All functionality.
    // ---------------------------------------------------------

    $("#toggle-all-permissions").on("click", function () {
        const $button = $(this);

        const $checkboxes = $("#role-doctype-permissions")
            .find("input.doctype-permission");

        if (loading_doctypes || !$checkboxes.length) {
            frappe.msgprint(
                "Please wait until the DocType list has loaded."
            );
            return;
        }

        const all_checked =
            $checkboxes.length === $checkboxes.filter(":checked").length;

        // Select all if at least one checkbox is unchecked.
        // Otherwise, deselect all.
        $checkboxes.prop("checked", !all_checked);

        update_select_all_button();

        frappe.show_alert({
            message: all_checked
                ? "All permissions have been deselected."
                : "All permissions have been selected.",
            indicator: all_checked ? "orange" : "green",
        });
    });

    // Keep the button label synchronized when individual
    // permission checkboxes are changed.
    $main.on(
        "change",
        "#role-doctype-permissions input.doctype-permission",
        function () {
            update_select_all_button();
        }
    );

    // ---------------------------------------------------------
    // Reset form.
    // ---------------------------------------------------------

    function reset_form() {
        editing_role = null;

        $("#role-name")
            .val("")
            .prop("readonly", false);

        $("#role-form-title").text(
            "Create Financial Assessment Role"
        );

        $("#create-role-btn").text(
            "Create Role and Save Permissions"
        );

        $("#cancel-role-edit-btn").hide();

        $("#role-doctype-permissions")
            .find("input[type='checkbox']")
            .prop("checked", false);

        update_select_all_button();
    }

    // ---------------------------------------------------------
    // Load Financial Assessment DocTypes.
    // ---------------------------------------------------------

    function load_doctypes(callback) {
        loading_doctypes = true;

        $("#toggle-all-permissions").prop("disabled", true);

        $("#role-doctype-permissions").html(`
            <tr>
                <td colspan="7" class="text-muted">
                    Loading Financial Assessment DocTypes...
                </td>
            </tr>
        `);

        update_select_all_button();

        frappe.call({
            method:
                "financial_assessment.utils.role_management.get_financial_assessment_doctypes",

            callback: function (r) {
                const doctypes = r.message || [];

                if (!doctypes.length) {
                    $("#role-doctype-permissions").html(`
                        <tr>
                            <td colspan="7" class="text-muted">
                                No standalone DocTypes found in the
                                Financial Assessment module.
                            </td>
                        </tr>
                    `);

                    loading_doctypes = false;

                    $("#toggle-all-permissions").prop("disabled", true);

                    update_select_all_button();

                    return;
                }

                let rows = "";

                doctypes.forEach(function (item) {
                    const doctype = item.name;
                    const safe_name = escape_html(doctype);

                    rows += `
                        <tr data-doctype="${safe_name}">
                            <td>
                                <strong>${safe_name}</strong>
                            </td>
                    `;

                    permission_fields.forEach(function (field) {
                        rows += `
                            <td class="text-center">
                                <input
                                    type="checkbox"
                                    class="doctype-permission"
                                    data-field="${field}"
                                    aria-label="${field} permission for ${safe_name}"
                                >
                            </td>
                        `;
                    });

                    rows += "</tr>";
                });

                $("#role-doctype-permissions").html(rows);

                loading_doctypes = false;

                $("#toggle-all-permissions").prop("disabled", false);

                update_select_all_button();

                if (typeof callback === "function") {
                    callback();
                }
            },

            error: function () {
                loading_doctypes = false;

                $("#role-doctype-permissions").html(`
                    <tr>
                        <td colspan="7" class="text-danger">
                            Could not load DocTypes.
                            Check the server error log.
                        </td>
                    </tr>
                `);

                $("#toggle-all-permissions").prop("disabled", true);

                update_select_all_button();
            },
        });
    }

    // ---------------------------------------------------------
    // Load configured Financial Assessment roles.
    // ---------------------------------------------------------

    function load_configured_roles() {
        $("#configured-role-list").html(`
            <p class="text-muted">
                Loading roles...
            </p>
        `);

        frappe.call({
            method:
                "financial_assessment.utils.role_management.get_financial_assessment_roles",

            callback: function (r) {
                const roles = r.message || [];

                if (!roles.length) {
                    $("#configured-role-list").html(`
                        <p class="text-muted">
                            No configured Financial Assessment roles found.
                        </p>
                    `);
                    return;
                }

                let html = `
                    <div class="table-responsive">
                        <table class="table table-bordered table-hover">
                            <thead>
                                <tr>
                                    <th>Role Name</th>
                                    <th style="width: 150px;">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                `;

                roles.forEach(function (role) {
                    const safe_role = escape_html(role);

                    html += `
                        <tr>
                            <td>${safe_role}</td>

                            <td>
                                <button
                                    type="button"
                                    class="btn btn-sm btn-primary edit-role-access"
                                    data-role="${safe_role}">
                                    Edit Access
                                </button>
                            </td>
                        </tr>
                    `;
                });

                html += `
                            </tbody>
                        </table>
                    </div>
                `;

                $("#configured-role-list").html(html);
            },
        });
    }

    // ---------------------------------------------------------
    // Collect permissions from the table.
    // ---------------------------------------------------------

    function collect_permissions(include_empty = false) {
        const permissions = [];

        $("#role-doctype-permissions tr[data-doctype]").each(function () {
            const $row = $(this);

            const item = {
                doctype: $row.attr("data-doctype"),
            };

            permission_fields.forEach(function (field) {
                item[field] = $row
                    .find(
                        `.doctype-permission[data-field="${field}"]`
                    )
                    .is(":checked")
                    ? 1
                    : 0;
            });

            const has_permission = permission_fields.some(function (field) {
                return item[field] === 1;
            });

            if (include_empty || has_permission) {
                permissions.push(item);
            }
        });

        return permissions;
    }

    // ---------------------------------------------------------
    // Load an existing role's permissions for editing.
    // ---------------------------------------------------------

    function load_role_for_edit(role_name) {
        if (loading_doctypes) {
            frappe.msgprint(
                "Please wait until the DocType list has finished loading."
            );
            return;
        }

        frappe.call({
            method:
                "financial_assessment.utils.role_management.get_role_permissions",

            args: {
                role_name: role_name,
            },

            freeze: true,
            freeze_message: "Loading role permissions...",

            callback: function (r) {
                if (!r.message) {
                    return;
                }

                const apply_permissions = function () {
                    editing_role = role_name;

                    $("#role-name")
                        .val(role_name)
                        .prop("readonly", true);

                    $("#role-form-title").text(
                        "Edit Financial Assessment Role"
                    );

                    $("#create-role-btn").text(
                        "Update Permissions"
                    );

                    $("#cancel-role-edit-btn").show();

                    // Clear existing checkbox selections.
                    $("#role-doctype-permissions")
                        .find("input[type='checkbox']")
                        .prop("checked", false);

                    // Apply the saved permissions.
                    r.message.forEach(function (item) {
                        const $row = $(
                            "#role-doctype-permissions tr"
                        ).filter(function () {
                            return (
                                $(this).attr("data-doctype") ===
                                item.doctype
                            );
                        });

                        permission_fields.forEach(function (field) {
                            $row.find(
                                `.doctype-permission[data-field="${field}"]`
                            ).prop(
                                "checked",
                                Number(item[field]) === 1
                            );
                        });
                    });

                    // Update the Select All button after loading.
                    update_select_all_button();

                    frappe.show_alert({
                        message: `Editing access for ${role_name}`,
                        indicator: "blue",
                    });

                    window.scrollTo({
                        top: 0,
                        behavior: "smooth",
                    });
                };

                if (
                    $("#role-doctype-permissions tr[data-doctype]")
                        .length
                ) {
                    apply_permissions();
                } else {
                    load_doctypes(function () {
                        apply_permissions();
                    });
                }
            },
        });
    }

    // ---------------------------------------------------------
    // Edit Access button.
    // ---------------------------------------------------------

    $main.on("click", ".edit-role-access", function () {
        const role_name = $(this).attr("data-role");

        if (role_name) {
            load_role_for_edit(role_name);
        }
    });

    // ---------------------------------------------------------
    // Cancel editing.
    // ---------------------------------------------------------

    $("#cancel-role-edit-btn").on("click", function () {
        reset_form();
    });

    // ---------------------------------------------------------
    // Create a new role or update an existing role.
    // ---------------------------------------------------------

    $("#create-role-btn").on("click", function () {
        const role_name = ($("#role-name").val() || "").trim();

        // Include unchecked DocTypes when editing so that
        // previously granted permissions can be removed.
        const permissions = collect_permissions(Boolean(editing_role));

        if (!role_name) {
            frappe.msgprint("Please enter a Role Name.");
            return;
        }

        if (loading_doctypes) {
            frappe.msgprint(
                "Please wait until the DocType list has loaded."
            );
            return;
        }

        if (!permissions.length) {
            frappe.msgprint(
                "Select at least one DocType and configure its permissions."
            );
            return;
        }

        const is_editing = Boolean(editing_role);

        const method = is_editing
            ? "financial_assessment.utils.role_management.update_role_permissions"
            : "financial_assessment.utils.role_management.create_role_with_permissions";

        const confirmation_message = is_editing
            ? `Update permissions for "${escape_html(role_name)}"?`
            : `Create the role "${escape_html(role_name)}" with the selected permissions?`;

        frappe.confirm(confirmation_message, function () {
            const $button = $("#create-role-btn");

            $button.prop("disabled", true);

            frappe.call({
                method: method,

                args: {
                    role_name: role_name,
                    permissions: JSON.stringify(permissions),
                },

                freeze: true,
                freeze_message: is_editing
                    ? "Updating role permissions..."
                    : "Creating role and saving permissions...",

                callback: function (r) {
                    if (r.message && r.message.success) {
                        frappe.show_alert({
                            message: r.message.message,
                            indicator: "green",
                        });

                        reset_form();

                        load_configured_roles();
                    }
                },

                error: function () {
                    frappe.msgprint(
                        is_editing
                            ? "Could not update role permissions. Please check the server error log."
                            : "Role creation failed. Please check the server error log."
                    );
                },

                always: function () {
                    $button.prop("disabled", false);
                },
            });
        });
    });

    // ---------------------------------------------------------
    // Refresh DocTypes.
    // ---------------------------------------------------------

    $("#refresh-role-doctypes").on("click", function () {
        const current_role = editing_role;

        load_doctypes(function () {
            if (current_role) {
                load_role_for_edit(current_role);
            }
        });
    });

    // ---------------------------------------------------------
    // Initial page loading.
    // ---------------------------------------------------------

    load_doctypes();

    load_configured_roles();
};
