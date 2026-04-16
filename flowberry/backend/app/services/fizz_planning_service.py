import re
from uuid import uuid4


class FizzPlanningService:
    """Simple rule planner. Replace with LLM planner for production."""

    def create_plan(self, prompt: str) -> dict:
        text = prompt.lower()
        steps: list[dict] = []

        if ".csv" in text or "csv" in text:
            steps.append({"id": str(uuid4()), "type": "csv-analysis", "name": "Analyze CSV"})
            steps.append({"id": str(uuid4()), "type": "report-generation", "name": "Generate Report"})

        if "report" in text and not any(s["type"] == "report-generation" for s in steps):
            steps.append({"id": str(uuid4()), "type": "report-generation", "name": "Generate Report"})

        if "email" in text:
            steps.append({"id": str(uuid4()), "type": "email-send", "name": "Send Email"})

        if "meeting" in text or "schedule" in text or "calendar" in text:
            steps.append({"id": str(uuid4()), "type": "calendar-create", "name": "Create Calendar Event"})

        if "notify" in text or "notification" in text:
            steps.append({"id": str(uuid4()), "type": "notifications", "name": "Send Notification"})

        if not steps:
            steps.append({"id": str(uuid4()), "type": "report-generation", "name": "Generate Report"})
            steps.append({"id": str(uuid4()), "type": "email-send", "name": "Send Email"})

        # Example dependency chain: report depends on csv, email depends on report
        previous_report_id = None
        csv_step = next((s for s in steps if s["type"] == "csv-analysis"), None)
        report_step = next((s for s in steps if s["type"] == "report-generation"), None)
        email_step = next((s for s in steps if s["type"] == "email-send"), None)

        if report_step and csv_step:
            report_step["depends_on_step_id"] = csv_step["id"]
            previous_report_id = report_step["id"]
        elif report_step:
            previous_report_id = report_step["id"]

        if email_step and previous_report_id:
            email_step["depends_on_step_id"] = previous_report_id

        for idx, step in enumerate(steps, start=1):
            step["step_order"] = idx
            step.setdefault("depends_on_step_id", None)

        intent = re.sub(r"\s+", " ", prompt).strip()[:160]
        return {"intent_summary": intent, "steps": steps}
