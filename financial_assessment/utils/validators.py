import re

import frappe


def validate_pan_tan(value, field_label="PAN/TAN No."):
    """
    Validate Indian PAN or TAN number.

    PAN format:
        ABCDE1234F

    TAN format:
        ABCD12345E
    """

    if not value:
        return

    value = value.strip().upper()

    pan_pattern = r"^[A-Z]{5}[0-9]{4}[A-Z]$"
    tan_pattern = r"^[A-Z]{4}[0-9]{5}[A-Z]$"

    if not re.fullmatch(pan_pattern, value) and not re.fullmatch(tan_pattern, value):
        frappe.throw(
            f"Please enter a valid {field_label}. "
            "PAN format: ABCDE1234F, TAN format: ABCD12345E."
        )

    return value


def validate_pan(value, field_label="PAN No."):
    """
    Validate Indian PAN number.
    """

    if not value:
        return

    value = value.strip().upper()

    pattern = r"^[A-Z]{5}[0-9]{4}[A-Z]$"

    if not re.fullmatch(pattern, value):
        frappe.throw(
            f"Please enter a valid {field_label}. "
            "Expected format: ABCDE1234F."
        )

    return value


def validate_tan(value, field_label="TAN No."):
    """
    Validate Indian TAN number.
    """

    if not value:
        return

    value = value.strip().upper()

    pattern = r"^[A-Z]{4}[0-9]{5}[A-Z]$"

    if not re.fullmatch(pattern, value):
        frappe.throw(
            f"Please enter a valid {field_label}. "
            "Expected format: ABCD12345E."
        )

    return value


def validate_email(value, field_label="Email Address"):
    """
    Validate email address.
    """

    if not value:
        return

    value = value.strip()

    pattern = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"

    if not re.fullmatch(pattern, value):
        frappe.throw(
            f"Please enter a valid {field_label}."
        )

    return value
