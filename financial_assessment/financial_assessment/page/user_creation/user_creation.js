frappe.pages["user-creation"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "User Creation",
        single_column: true
    });

    const $main = $(page.main);

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
                        <input type="email" class="form-control"
                            id="uc-email" placeholder="user@example.com" required>
                    </div>

                    <div class="form-group">
                        <label>First Name <span>*</span></label>
                        <input type="text" class="form-control"
                            id="uc-first-name" placeholder="First name" required>
                    </div>

                    <div class="form-group">
                        <label>Last Name</label>
                        <input type="text" class="form-control"
                            id="uc-last-name" placeholder="Last name">
                    </div>

                    <div class="form-group">
                        <label>Password <span>*</span></label>
                        <input type="password" class="form-control"
                            id="uc-password" autocomplete="new-password"
                            placeholder="Enter password" required>
                    </div>

                    <div class="form-group">
                        <label>Confirm Password <span>*</span></label>
                        <input type="password" class="form-control"
                            id="uc-confirm-password" autocomplete="new-password"
                            placeholder="Confirm password" required>
                    </div>
                </div>

                <div class="uc-role-section">
                    <label>Assign Roles <span>*</span></label>
                    <div id="uc-roles" class="uc-roles">
                        Loading roles...
                    </div>
                </div>

                <div class="uc-footer">
                    <button class="btn btn-primary" id="uc-create-user">
                        Create User
                    </button>
                </div>
            </div>
        </div>
    `);

    frappe.call({
        method: "financial_assessment.utils.user_management.get_available_roles",
        callback: function (r) {
            if (r.exc) return;

            const roles = r.message || [];
            const $roles = $main.find("#uc-roles").empty();

            if (!roles.length) {
                $roles.text("No roles available.");
                return;
            }

            roles.forEach(function (role, index) {
                const $label = $("<label>", {
                    class: "uc-role-option"
                });

                const $checkbox = $("<input>", {
                    type: "checkbox",
                    class: "uc-role-checkbox",
                    id: "uc-role-" + index
                }).val(role);

                $label.append($checkbox);
                $label.append(document.createTextNode(" " + role));
                $roles.append($label);
            });
        }
    });

    $main.on("input", "#uc-role-search", function () {
        const search = ($(this).val() || "").toLowerCase();

        $main.find(".uc-role-option").each(function () {
            $(this).toggle($(this).text().toLowerCase().includes(search));
        });
    });

    $main.on("click", "#uc-create-user", function () {
        const email = ($main.find("#uc-email").val() || "").trim();
        const first_name = ($main.find("#uc-first-name").val() || "").trim();
        const last_name = ($main.find("#uc-last-name").val() || "").trim();
        const password = $main.find("#uc-password").val() || "";
        const confirm_password =
            $main.find("#uc-confirm-password").val() || "";

        const roles = [];

        $main.find(".uc-role-checkbox:checked").each(function () {
            roles.push($(this).val());
        });

        if (!email || !first_name) {
            frappe.msgprint("Please enter an email address and first name.");
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

        frappe.confirm("Create this user with the selected role?", function () {
            frappe.call({
                method: "financial_assessment.utils.user_management.create_user",
                args: {
                    email: email,
                    first_name: first_name,
                    last_name: last_name,
                    roles: roles,
                    password: password,
                    confirm_password: confirm_password
                },
                freeze: true,
                freeze_message: "Creating user...",
                callback: function (r) {
                    if (r.exc || !r.message) return;

                    frappe.msgprint({
                        title: "Success",
                        indicator: "green",
                        message: r.message.message
                    });

                    $main.find(
                        "#uc-email, #uc-first-name, #uc-last-name, " +
                        "#uc-password, #uc-confirm-password, #uc-role-search"
                    ).val("");

                    $main.find(".uc-role-checkbox").prop("checked", false);
                }
            });
        });
    });
};
