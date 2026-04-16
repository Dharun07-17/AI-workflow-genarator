import re


def sanitize_log_message(message: str) -> str:
    # Basic masking for common PII patterns.
    message = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[redacted-email]", message)
    message = re.sub(r"\+?[0-9][0-9\- ]{8,}[0-9]", "[redacted-phone]", message)
    return message
