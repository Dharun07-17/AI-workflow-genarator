class NotificationService:
    def build_notification(self, workflow_id: str, status: str) -> dict:
        return {
            "title": "Flowberry Update",
            "body": f"Workflow {workflow_id} is now {status}",
            "channel": "internal",
        }
