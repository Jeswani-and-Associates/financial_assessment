// Copyright (c) 2026, DigiOpen Services Pvt Ltd and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Client Information", {
// 	refresh(frm) {

// 	},
// });


frappe.ui.form.on("Client Information", {
    refresh(frm) {
        // Show button only after the Client Information is saved
        if (!frm.is_new()) {
            frm.add_custom_button("Create Income And Expense", () => {

                frappe.call({
                    method: "financial_assessment.financial_assessment.doctype.client_information.client_information.create_income_and_expense",
                    args: {
                        docname: frm.doc.name
                    },
                    callback: function (r) {
                        if (r.message) {
                            frappe.set_route(
                                "Form",
                                "Income And Expenses",
                                r.message
                            );
                        }
                    }
                });

            });
        }
    }
});


// frappe.ui.form.on("Client Information", {
//     refresh(frm) {
//         if (!frm.is_new()) {
//             frm.add_custom_button("Create Income And Expense", () => {

//                 frappe.call({
//                     method: "financial_assessment.financial_assessment.doctype.client_information.client_information.create_income_and_expense",
//                     args: {
//                         docname: frm.doc.name
//                     },
//                     callback: function (r) {
//                         if (r.message) {

//                             if (r.message.created) {
//                                 frappe.msgprint({
//                                     title: __("Success"),
//                                     message: __(
//                                         "Income And Expenses document created successfully: <b>{0}</b>",
//                                         [r.message.name]
//                                     ),
//                                     indicator: "green"
//                                 });
//                             } else {
//                                 frappe.msgprint({
//                                     title: __("Already Exists"),
//                                     message: __(
//                                         "Income And Expenses document already exists: <b>{0}</b>",
//                                         [r.message.name]
//                                     ),
//                                     indicator: "blue"
//                                 });
//                             }
//                         }
//                     }
//                 });

//             });
//         }
//     }
// });