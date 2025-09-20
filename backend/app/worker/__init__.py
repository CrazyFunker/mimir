from celery import Celery
from app.config import settings

celery_app = Celery(
    "mimir",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.worker.tasks"],
)

celery_app.conf.task_queues = (
    {"name": "ingest"},
    {"name": "embed"},
    {"name": "agent"},
    {"name": "test"},
)
