import re


def suggest_workflow_name(text: str) -> str:
    """
    UI-friendly workflow name (ChatGPT-like) from a prompt/intent.
    Deterministic heuristic: strip emails + trailing "email/send" clauses, then title-case.
    """
    s = (text or "").strip()
    if not s:
        return "Workflow"

    s = re.sub(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", "", s, flags=re.I)
    s = re.sub(r"\b(and\s+)?(email|send)\b.*$", "", s, flags=re.I).strip()
    s = re.sub(r"\s+", " ", s).strip()
    s = s.strip(" .,:;!?\t\r\n")

    if not s:
        return "Workflow"

    words = s.split(" ")
    words = words[:8]
    name = " ".join(words)
    name = name[:80].strip()
    return name.title()

