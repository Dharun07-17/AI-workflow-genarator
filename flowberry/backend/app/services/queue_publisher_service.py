import json
import aio_pika
from aio_pika import Message, DeliveryMode
from app.core.config import settings


class QueuePublisherService:
    def __init__(self) -> None:
        self._connection: aio_pika.RobustConnection | None = None
        self._channel: aio_pika.abc.AbstractRobustChannel | None = None

    async def _get_channel(self):
        if self._channel:
            return self._channel
        self._connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        self._channel = await self._connection.channel(publisher_confirms=True)
        await self._channel.set_qos(prefetch_count=20)
        return self._channel

    async def publish_job(self, queue_name: str, payload: dict, idempotency_key: str) -> None:
        channel = await self._get_channel()
        await channel.declare_queue(queue_name, durable=True)
        message = Message(
            body=json.dumps(payload).encode("utf-8"),
            content_type="application/json",
            delivery_mode=DeliveryMode.PERSISTENT,
            message_id=idempotency_key,
            headers={"idempotency_key": idempotency_key},
        )
        await channel.default_exchange.publish(message, routing_key=queue_name)

    async def close(self) -> None:
        if self._connection:
            await self._connection.close()
