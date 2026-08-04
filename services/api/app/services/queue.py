"""Celery client used by the API to enqueue durable execution tasks."""

from __future__ import annotations

import os

from celery import Celery
from kombu import Exchange, Queue

broker = os.getenv(
    "CELERY_BROKER_URL",
    "amqp://agentmesh:agentmesh_dev_password@localhost:5672//",
)

EXECUTIONS_QUEUE = "agentmesh.executions"

celery_client = Celery("agentmesh", broker=broker)
celery_client.conf.task_queues = (
    Queue(
        EXECUTIONS_QUEUE,
        Exchange(""),
        routing_key=EXECUTIONS_QUEUE,
        queue_arguments={
            "x-dead-letter-exchange": "agentmesh.dlx",
            "x-dead-letter-routing-key": "executions.dead",
        },
    ),
)
celery_client.conf.update(
    task_default_queue=EXECUTIONS_QUEUE,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_create_missing_queues=True,
)


def enqueue_execution(execution_id: str) -> str:
    """Publish at-least-once execution task. Idempotency is enforced in the worker."""
    async_result = celery_client.send_task(
        "agentmesh.executions.run",
        args=[execution_id],
        queue=EXECUTIONS_QUEUE,
    )
    return async_result.id
