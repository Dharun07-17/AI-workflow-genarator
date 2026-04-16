import asyncio
from app.workers.consumer_base import WorkerConsumer


class CalendarWorker(WorkerConsumer):
    async def process_task(self, queue_name: str, payload: dict) -> dict:
        if queue_name == "calendar-create":
            await asyncio.sleep(0.8)
            return {"calendar_event_id": f"evt-{payload['workflow_step_id']}", "status": "scheduled"}

        if queue_name == "notifications":
            await asyncio.sleep(0.5)
            return {"notification_status": "sent", "channel": "slack"}

        if queue_name == "csv-analysis":
            await asyncio.sleep(1.0)
            return {"rows": 128, "insight": "Top category is Operations"}

        raise ValueError(f"Unsupported queue {queue_name}")


async def main() -> None:
    worker = CalendarWorker(worker_name="worker-calendar", queues=["calendar-create", "notifications", "csv-analysis"])
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
