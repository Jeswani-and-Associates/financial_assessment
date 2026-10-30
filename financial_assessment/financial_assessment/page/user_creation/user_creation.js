
frappe.pages["user-creation"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "User Creation",
        single_column: true
    });

    const $main = $(page.main);
    let availableRoles = [];

    $main.html(`
        <div class="uc-wrapper">
            <div class="uc-header">
                <h3>Create New User</h3>
                <p>Create a user and assign Financial Assessment access.</p>
            </div>

            <div class="uc-card">
                <div class="uc-grid">
                    <div class="form-group">
                        <label>Email Address <span>*</span></label>
                        <input type="email" class="form-control" id="uc-email"
                            placeholder="user@example.com" required>
                    </div>

                    <div class="form-group">
                        <label>First Name <span>*</span></label>
                        <input type="text" class="form-control" id="uc-first-name"
                            placeholder="First name" required>
                    </div>

                    <div class="form-group">
                        <label>Last Name</label>
                        <input type="text" class="form-control" id="uc-last-name"
                            placeholder="Last name">
                    </div>

                    <div class="form-group">
                        <label>Password <span>*</span></label>
                        <input type="password" class="form-control" id="uc-password"
                            autocomplete="new-password" required>
                    </div>

                    <div class="form-group">
                        <label>Confirm Password <span>*</span></label>
                        <input type="password" class="form-control"
                            id="uc-confirm-password" autocomplete="new-password" required>
                    </div>
                </div>

                <div class="uc-role-section">
                    <label>Assign Roles <span>*</span></label>
                    <div id="uc-roles" class="uc-roles">Loading roles...</div>
                </div>

                <div class="uc-footer">
                    <button type="button" class="btn btn-primary" id="uc-create-user">
                        Create User
                    </button>
                </div>
            </div>

            <div class="uc-header" style="margin-top:35px">
                <h3>Manage Financial Assessment Users</h3>
                <p>Update user details, roles, passwords, and account status.</p>
            </div>

            <div class="uc-card">
                <div class="form-group">
                    <input type="text" class="form-control" id="uc-user-search"
                        placeholder="Search by email, first name or last name">
                </div>

                <div class="table-responsive">
                    <table class="table table-bordered table-hover">
                        <thead>
                            <tr>
                                <th>Email Address</th>
                                <th>First Name</th>
                                <th>Last Name</th>
                                <th>Financial Assessment Roles</th>
                                <th style="text-align:center">Enabled</th>
                                <th style="text-align:center">Action</th>
                            </tr>
                        </thead>
                        <tbody id="uc-user-list">
                            <tr>
                                <td colspan="6" class="text-center">Loading users...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div id="uc-user-count" class="text-muted"></div>
            </div>
        </div>
    `);

    function showError(r, fallback) {
        console.error("User Creation API error:", r);

        frappe.msgprint({
            title: "Request Failed",
            indicator: "red",
            message: frappe.utils.escape_html(fallback)
        });
    }

    // Load Financial Assessment roles
    function loadRoles() {
        const $roles = $main.find("#uc-roles").text("Loading roles...");

        frappe.call({
            method: "financial_assessment.utils.user_management.get_available_roles",

            callback(r) {
                $roles.empty();

                if (r.exc || !Array.isArray(r.message)) {
                    availableRoles = [];
                    $roles.text("Unable to load roles.");
                    loadUsers();

                    showError(r, "Unable to load available roles. Check the server logs.");
                    return;
                }

                availableRoles = r.message;

                if (!availableRoles.length) {
                    $roles.text("No assignable Financial Assessment roles available.");
                }

                availableRoles.forEach((role, i) => {
                    const $label = $("<label>", {
                        class: "uc-role-option"
                    });

                    const $checkbox = $("<input>", {
                        type: "checkbox",
                        class: "uc-role-checkbox",
                        id: "uc-role-" + i
                    }).val(role);

                    $label.append($checkbox);
                    $label.append(document.createTextNode(" " + role));

                    $roles.append($label);
                });

                loadUsers();
            },

            error(r) {
                availableRoles = [];
                $roles.text("Unable to load roles.");
                loadUsers();

                showError(r, "Unable to load roles.");
            }
        });
    }

    // Load users
    function loadUsers() {
        const $tbody = $main.find("#uc-user-list").html(`
            <tr>
                <td colspan="6" class="text-center">Loading users...</td>
            </tr>
        `);

        frappe.call({
            method: "financial_assessment.utils.user_management.get_financial_assessment_users",

            callback(r) {
                if (r.exc || !Array.isArray(r.message)) {
                    $tbody.html(`
                        <tr>
                            <td colspan="6" class="text-center text-danger">
                                Unable to load users. Please try again.
                            </td>
                        </tr>
                    `);

                    $main.find("#uc-user-count").text("");
                    console.error("Load users failed:", r);
                    return;
                }

                const users = r.message;
                $tbody.empty();

                if (!users.length) {
                    $tbody.html(`
                        <tr>
                            <td colspan="6" class="text-center">
                                No Financial Assessment users found.
                            </td>
                        </tr>
                    `);

                    $main.find("#uc-user-count").text("Total users: 0");
                    return;
                }

                users.forEach(user => {
                    const roles = Array.isArray(user.roles) ? user.roles : [];

                    const manager =
                        user.is_manager === true ||
                        roles.includes("Financial Assessment");

                    const $row = $("<tr>").attr("data-user-id", user.name);

                    const $email = $("<input>", {
                        type: "email",
                        class: "form-control uc-edit-email",
                        required: true
                    }).val(user.email || user.name);

                    const $first = $("<input>", {
                        type: "text",
                        class: "form-control uc-edit-first-name",
                        required: true
                    }).val(user.first_name || "");

                    const $last = $("<input>", {
                        type: "text",
                        class: "form-control uc-edit-last-name"
                    }).val(user.last_name || "");

                    const $roleSelect = $("<select>", {
                        class: "form-control uc-edit-roles",
                        multiple: true
                    }).css({
                        minWidth: "220px",
                        minHeight: "85px"
                    });

                    availableRoles.forEach(role => {
                        const $option = $("<option>")
                            .val(role)
                            .text(role);

                        if (roles.includes(role)) {
                            $option.prop("selected", true);
                        }

                        $roleSelect.append($option);
                    });

                    const $roleCell = $("<td>").append($roleSelect);

                    // Protect the manager account's roles
                    if (manager) {
                        $roleSelect.prop("disabled", true);

                        $roleCell.append(
                            $("<div>", {
                                class: "text-muted",
                                text: "Manager role protected; roles cannot be edited here."
                            }).css({
                                fontSize: "11px",
                                marginTop: "4px"
                            })
                        );
                    }

                    const $enabled = $("<input>", {
                        type: "checkbox",
                        class: "uc-edit-enabled"
                    }).prop("checked", Number(user.enabled) === 1);

                    const $update = $("<button>", {
                        type: "button",
                        class: "btn btn-primary btn-sm uc-update-user",
                        text: "Update"
                    });

                    const $password = $("<button>", {
                        type: "button",
                        class: "btn btn-default btn-sm uc-update-password",
                        text: "Password"
                    }).css("margin-left", "6px");

                    $row.append(
                        $("<td>").append($email),
                        $("<td>").append($first),
                        $("<td>").append($last),
                        $roleCell,
                        $("<td>", {
                            class: "text-center"
                        }).append($enabled)
                    );

                    $row.append(
                        $("<td>", {
                            class: "text-center"
                        }).css({
                            whiteSpace: "nowrap"
                        }).append($update, $password)
                    );

                    $tbody.append($row);
                });

                $main.find("#uc-user-count").text(
                    "Total users: " + users.length
                );

                filterUsers();
            },

            error(r) {
                $tbody.html(`
                    <tr>
                        <td colspan="6" class="text-center text-danger">
                            Unable to load users. Check the server logs.
                        </td>
                    </tr>
                `);

                showError(r, "Unable to load users.");
            }
        });
    }

    // Search and filter users
    function filterUsers() {
        const search = String(
            $main.find("#uc-user-search").val() || ""
        ).toLowerCase().trim();

        $main.find("#uc-user-list tr[data-user-id]").each(function () {
            const $row = $(this);

            const roleText = $row
                .find(".uc-edit-roles option:selected")
                .map(function () {
                    return $(this).text();
                })
                .get()
                .join(" ");

            const text = [
                $row.find(".uc-edit-email").val(),
                $row.find(".uc-edit-first-name").val(),
                $row.find(".uc-edit-last-name").val(),
                roleText
            ].join(" ").toLowerCase();

            $row.toggle(text.includes(search));
        });
    }

    $main.on("input", "#uc-user-search", filterUsers);

    // Update user details, roles and account status
    $main.on("click", ".uc-update-user", function () {
        const $button = $(this);
        const $row = $button.closest("tr");

        const user_id = $row.attr("data-user-id");

        const email = String(
            $row.find(".uc-edit-email").val() || ""
        ).trim();

        const first_name = String(
            $row.find(".uc-edit-first-name").val() || ""
        ).trim();

        const last_name = String(
            $row.find(".uc-edit-last-name").val() || ""
        ).trim();

        const enabled = $row.find(".uc-edit-enabled").is(":checked") ? 1 : 0;

        const $select = $row.find(".uc-edit-roles");

        let roles = null;

        if (!$select.prop("disabled")) {
            roles = $select.val() || [];

            if (!roles.length) {
                frappe.msgprint(
                    "Please select at least one Financial Assessment role."
                );
                return;
            }
        }

        if (!email || !first_name) {
            frappe.msgprint(
                "Please enter the email address and first name."
            );
            return;
        }

        if (!$row.find(".uc-edit-email")[0].checkValidity()) {
            frappe.msgprint("Please enter a valid email address.");
            return;
        }

        frappe.confirm(
            "Update this user's details" +
            (roles === null ? "?" : " and roles?"),

            function () {
                $button.prop("disabled", true).text("Updating...");

                frappe.call({
                    method: "financial_assessment.utils.user_management.update_financial_assessment_user",

                    args: {
                        user_id,
                        email,
                        first_name,
                        last_name,
                        enabled,
                        roles: roles === null ? null : JSON.stringify(roles)
                    },

                    freeze: true,
                    freeze_message: "Updating user...",

                    callback(r) {
                        if (
                            r.exc ||
                            !r.message ||
                            r.message.success !== true
                        ) {
                            showError(r, "Unable to update this user.");
                            return;
                        }

                        frappe.show_alert({
                            message: r.message.message ||
                                "User updated successfully.",
                            indicator: "green"
                        });

                        loadUsers();
                    },

                    error(r) {
                        showError(r, "The user update request failed.");
                    },

                    always() {
                        $button.prop("disabled", false).text("Update");
                    }
                });
            }
        );
    });

    // Update user password
    $main.on("click", ".uc-update-password", function () {
        const user_id = $(this)
            .closest("tr")
            .attr("data-user-id");

        const dialog = new frappe.ui.Dialog({
            title: "Update User Password",

            fields: [
                {
                    fieldname: "new_password",
                    label: "New Password",
                    fieldtype: "Password",
                    reqd: 1
                },
                {
                    fieldname: "confirm_password",
                    label: "Confirm New Password",
                    fieldtype: "Password",
                    reqd: 1
                }
            ],

            primary_action_label: "Update Password",

            primary_action(values) {
                const password = values.new_password || "";

                if (!password) {
                    frappe.msgprint("Please enter a new password.");
                    return;
                }

                if (password !== (values.confirm_password || "")) {
                    frappe.msgprint("Passwords do not match.");
                    return;
                }

                frappe.confirm(
                    "Are you sure you want to change this user's password?",

                    function () {
                        const $primary = dialog
                            .get_primary_btn()
                            .prop("disabled", true)
                            .text("Updating...");

                        frappe.call({
                            method: "financial_assessment.utils.user_management.update_financial_assessment_user_password",

                            args: {
                                user_id,
                                new_password: password
                            },

                            freeze: true,
                            freeze_message: "Updating password...",

                            callback(r) {
                                if (
                                    r.exc ||
                                    !r.message ||
                                    r.message.success !== true
                                ) {
                                    showError(r, "Unable to update the password.");
                                    return;
                                }

                                dialog.hide();

                                frappe.show_alert({
                                    message: r.message.message ||
                                        "Password updated successfully.",
                                    indicator: "green"
                                });
                            },

                            error(r) {
                                showError(r, "The password update request failed.");
                            },

                            always() {
                                $primary
                                    .prop("disabled", false)
                                    .text("Update Password");
                            }
                        });
                    }
                );
            }
        });

        dialog.show();
    });

    // Create new user
    $main.on("click", "#uc-create-user", function () {
        const $button = $(this);

        const email = String(
            $main.find("#uc-email").val() || ""
        ).trim();

        const first_name = String(
            $main.find("#uc-first-name").val() || ""
        ).trim();

        const last_name = String(
            $main.find("#uc-last-name").val() || ""
        ).trim();

        const password = $main.find("#uc-password").val() || "";

        const confirm_password =
            $main.find("#uc-confirm-password").val() || "";

        const roles = $main
            .find(".uc-role-checkbox:checked")
            .map(function () {
                return $(this).val();
            })
            .get();

        if (!email || !first_name) {
            frappe.msgprint(
                "Please enter an email address and first name."
            );
            return;
        }

        if (!$main.find("#uc-email")[0].checkValidity()) {
            frappe.msgprint("Please enter a valid email address.");
            return;
        }

        if (!password) {
            frappe.msgprint("Please enter a password.");
            return;
        }

        if (password !== confirm_password) {
            frappe.msgprint("Passwords do not match.");
            return;
        }

        if (!roles.length) {
            frappe.msgprint("Please select at least one role.");
            return;
        }

        frappe.confirm(
            "Create this user with the selected role(s)?",

            function () {
                $button.prop("disabled", true).text("Creating...");

                frappe.call({
                    method: "financial_assessment.utils.user_management.create_user",

                    args: {
                        email,
                        first_name,
                        last_name,
                        roles: JSON.stringify(roles),
                        password,
                        confirm_password
                    },

                    freeze: true,
                    freeze_message: "Creating user...",

                    callback(r) {
                        if (
                            r.exc ||
                            !r.message ||
                            r.message.success !== true
                        ) {
                            showError(r, "Unable to create the user.");
                            return;
                        }

                        frappe.msgprint({
                            title: "Success",
                            indicator: "green",
                            message: frappe.utils.escape_html(
                                r.message.message || "User created successfully."
                            )
                        });

                        $main.find(
                            "#uc-email, #uc-first-name, #uc-last-name, " +
                            "#uc-password, #uc-confirm-password"
                        ).val("");

                        $main.find(".uc-role-checkbox").prop("checked", false);

                        loadUsers();
                    },

                    error(r) {
                        showError(r, "The user could not be created.");
                    },

                    always() {
                        $button.prop("disabled", false).text("Create User");
                    }
                });
            }
        );
    });

    // Load roles first, then build the editable role selectors.
    loadRoles();
};
