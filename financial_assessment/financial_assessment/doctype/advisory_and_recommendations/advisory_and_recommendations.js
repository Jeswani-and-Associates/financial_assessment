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


frappe.ui.form.on(
    "Advisory And Recommendations",
    {

        refresh(frm) {

            check_existing_identifier(frm);

        },

        identifier(frm) {

            check_existing_identifier(frm);

        }

    }
);