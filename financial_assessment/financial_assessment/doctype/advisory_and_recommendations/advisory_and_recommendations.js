
function check_existing_identifier(frm) {
    if (!frm.is_new()) {
        return;
    }

    if (!frm.doc.identifier) {
        return;
    }

    frappe.call({
        method:
            "financial_assessment.utils.identifier.get_existing_identifier_record",

        args: {
            doctype: frm.doctype,
            identifier: frm.doc.identifier
        },

        callback: function (r) {
            if (!r.message) {
                return;
            }

            const existing_record = r.message;

            frappe.confirm(
                `A ${frm.doctype} record already exists for identifier <b>${frm.doc.identifier}</b>.<br><br>` +
                `Do you want to open the existing record?`,

                function () {
                    frappe.set_route(
                        "Form",
                        frm.doctype,
                        existing_record
                    );
                }
            );
        }
    });
}

function add_assessment_print_button(frm) {
    const buttonLabel = __("PRINT REPORT");

    // Remove any previously added custom print button.
    frm.remove_custom_button(buttonLabel);

    if (frm.is_new() || !frm.doc.identifier) {
        return;
    }

    const identifier = frm.doc.identifier;

    frappe.call({
        method:
            "financial_assessment.utils.role_management.can_print_assessment_report",

        args: {
            client_name: identifier
        },

        callback: function (r) {
            // Do not show the button unless the server explicitly allows printing.
            if (r.message !== true) {
                return;
            }

            if (
                !frm.wrapper.isConnected ||
                frm.doc.identifier !== identifier
            ) {
                return;
            }

            frm.add_custom_button(buttonLabel, function () {
                frappe.call({
                    method:
                        "financial_assessment.utils.role_management.can_print_assessment_report",

                    args: {
                        client_name: identifier
                    },

                    callback: function (response) {
                        if (response.message !== true) {
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
                            "/printview?doctype=" +
                            encodeURIComponent("Client Information") +
                            "&name=" +
                            encodeURIComponent(identifier) +
                            "&format=" +
                            encodeURIComponent("Financial Assessment Report") +
                            "&no_letterhead=0";

                        window.open(url, "_blank");
                    },

                    error: function () {
                        frappe.msgprint({
                            title: __("Access Denied"),
                            message: __(
                                "You do not have permission to print this report."
                            ),
                            indicator: "red"
                        });
                    }
                });
            });
        },

        error: function () {
            // Permission verification failed: keep the button hidden.
            frm.remove_custom_button(buttonLabel);
        }
    });
}

frappe.ui.form.on("Advisory And Recommendations", {
    refresh(frm) {
        check_existing_identifier(frm);
        add_assessment_print_button(frm);
    },

    identifier(frm) {
        check_existing_identifier(frm);
    }
});
