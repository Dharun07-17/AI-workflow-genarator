import asyncio
from app.workers.consumer_base import WorkerConsumer
from app.services.ai_client import AIClient


class EmailWorker(WorkerConsumer):
    async def process_task(self, queue_name: str, payload: dict) -> dict:
        if queue_name == "report-generation":
            prompt = payload.get("prompt") or "Generate a concise workflow report."
            ai = AIClient()
            summary = await ai.generate_text(
                "Generate a concise report summary for this request:\n" + prompt
            )
            await asyncio.sleep(0.3)
            return {"report_id": f"report-{payload['workflow_step_id']}", "status": "generated", "summary": summary}

        if queue_name == "email-send":
            if payload.get("approve") is True:
                await asyncio.sleep(1.0)
                return {"delivery": "sent", "provider": "gmail", "status": "ok"}

            draft = {
                "to": payload.get("to", "team@example.com"),
                "subject": "Workflow Report Draft",
                "body": payload.get("draft_body", "Draft email body goes here."),
                "status": "draft",
            }
            return {"_step_status": "waiting_approval", "draft": draft}

        raise ValueError(f"Unsupported queue {queue_name}")


async def main() -> None:
    worker = EmailWorker(worker_name="worker-email", queues=["report-generation", "email-send"])
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
