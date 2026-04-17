import re

from sqlalchemy.orm import Session

from app.core.db import db_manager
from app.models.workflow import Workflow
from app.services.ai_client import AIClient
from app.services.workflow_naming_service import suggest_workflow_name


def _clean_title(raw: str) -> str:
    s = (raw or "").strip()
    s = re.sub(r"^title\\s*:\\s*", "", s, flags=re.I).strip()
    s = s.strip(" \t\r\n\"'`")
    s = re.sub(r"\\s+", " ", s).strip()
    s = s.strip(" .,:;!?\t\r\n")
    s = s[:120].strip()
    if not s:
        return ""

    # Avoid clearly non-title outputs.
    if s.lower().startswith("[fallback]"):
        return ""
    if len(s.split(" ")) > 12:
        s = " ".join(s.split(" ")[:12]).strip()
    return s.title()


async def suggest_better_title(prompt: str, intent_summary: str | None) -> str:
    client = AIClient()
    base = (intent_summary or prompt or "").strip()
    if not base:
        return ""

    instruction = (
        "Generate a short, specific title for this workflow.\n"
        "Rules:\n"
        "- 3 to 8 words\n"
        "- No quotes\n"
        "- No trailing punctuation\n"
        "- No emojis\n"
        "- Output ONLY the title text\n\n"
        f"Workflow request: {base}\n\n"
        "Title:"
    )
    raw = await client.generate_text(instruction)
    return _clean_title(raw)


async def auto_rename_workflow(workflow_id: str) -> None:
    db: Session = db_manager.get_session()
    try:
        workflow: Workflow | None = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not workflow:
            return

        current = (workflow.display_name or "").strip()
        heuristic = suggest_workflow_name(workflow.intent_summary or workflow.original_prompt)

        # Only auto-rename if the name is missing or still on the heuristic default.
        if current and current != heuristic:
            return

        better = await suggest_better_title(workflow.original_prompt, workflow.intent_summary)
        if not better or better == heuristic:
            workflow.display_name = heuristic
            db.commit()
            return

        workflow.display_name = better
        db.commit()
    finally:
        db.close()

