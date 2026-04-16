import asyncio
from app.workers.consumer_base import WorkerConsumer


class EmailWorker(WorkerConsumer):
    async def process_task(self, queue_name: str, payload: dict) -> dict:
        if queue_name == "report-generation":
            # Placeholder for report generation service (PDF, summary, etc)
            await asyncio.sleep(1.2)
            return {"report_id": f"report-{payload['workflow_step_id']}", "status": "generated"}

        if queue_name == "email-send":
            await asyncio.sleep(1.0)
            return {"delivery": "sent", "provider": "gmail", "status": "ok"}

        raise ValueError(f"Unsupported queue {queue_name}")


async def main() -> None:
    worker = EmailWorker(worker_name="worker-email", queues=["report-generation", "email-send"])
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
