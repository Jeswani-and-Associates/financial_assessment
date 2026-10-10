
import frappe


def configure_financial_assessment_desktop_icon():
    app_name = "financial_assessment"

    app_titles = frappe.get_hooks("app_title", app_name=app_name)
    app_details = frappe.get_hooks(
        "add_to_apps_screen", app_name=app_name
    )

    if not app_titles or not app_details:
        return

    app_title = app_titles[0]
    app_config = app_details[0]

    if not app_config.get("route"):
        return

    if frappe.db.exists("Desktop Icon", app_title):
        icon = frappe.get_doc("Desktop Icon", app_title)
    else:
        icon = frappe.new_doc("Desktop Icon")
        icon.label = app_title

    icon.icon_type = "App"
    icon.link_type = "External"
    icon.app = app_name
    icon.link = app_config["route"]
    icon.link_to = None
    icon.logo_url = app_config.get("logo") or ""
    icon.parent_icon = None
    icon.hidden = 0

    icon.save(ignore_permissions=True)