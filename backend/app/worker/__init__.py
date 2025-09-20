from celery import Celery
from kombu import Queue
from app.config import settings

celery_app = Celery(
    "mimir",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.worker.tasks"],
)

celery_app.conf.update(
    task_default_queue="default",
    task_queues=[
        Queue("default"),
        Queue("ingest"),
        Queue("embed"),
        Queue("agent"),
        Queue("test"),
    ],
)
