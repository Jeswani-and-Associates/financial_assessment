import re
import unicodedata

import frappe


def normalize_master_value(value):
    """
    Normalize a Master value only for duplicate comparison.

    The original value is not modified.
    """

    if not value:
        return ""

    value = unicodedata.normalize("NFKC", str(value))
    value = value.strip()
    value = value.casefold()

    # Treat common separators/punctuation as spaces
    value = re.sub(r"[\(\)\[\]\{\}:;,./\\|_-]+", " ", value)

    # Collapse multiple spaces
    value = re.sub(r"\s+", " ", value)

    return value.strip()


def validate_unique_master_value(
    doctype,
    fieldname,
    value,
    current_name=None,
    label=None,
):
    """
    Validate that a Master value is unique
    after normalization.
    """

    if not value:
        return

    normalized_value = normalize_master_value(value)

    records = frappe.get_all(
        doctype,
        fields=["name", fieldname],
    )

    for record in records:

        # Ignore the current record while editing
        if current_name and record.name == current_name:
            continue

        existing_value = getattr(record, fieldname, None)

        if normalize_master_value(existing_value) == normalized_value:

            display_label = (
                label
                or fieldname.replace("_", " ").title()
            )

            frappe.throw(
                f"{display_label} <b>{value}</b> already exists."
            )