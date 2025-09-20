from app.worker import celery_app
from app.db import session_scope
from app import models
from app.services import ingest as ingest_service
from app.services.embeddings import embed_texts


@celery_app.task(name="run_connector_test", queue="test")
def run_connector_test(kind: str, user_id: str):  # placeholder
    return {"status": "ok", "kind": kind}


@celery_app.task(name="ingest_connector", queue="ingest")
def ingest_connector(kind: str, user_id: str):  # basic placeholder logic
    with session_scope() as db:
        connector = (
            db.query(models.Connector)
            .filter(models.Connector.user_id == user_id, models.Connector.kind == kind)
            .first()
        )
        if not connector:
            return 0
        # Placeholder raw items
        raw_items = [
            {"id": f"{kind}-demo-1", "title": f"Demo item 1 from {kind}", "snippet": "Lorem ipsum"},
            {"id": f"{kind}-demo-2", "title": f"Demo item 2 from {kind}", "snippet": "Dolor sit"},
        ]
        created = ingest_service.ingest_connector(db, user_id, connector, raw_items)
        # enqueue embedding step synchronously for now
        if created:
            texts = [c.title for c in created]
            embed_texts(texts, {"user_id": user_id, "kind": kind})
        return len(created)


@celery_app.task(name="embed_items", queue="embed")
def embed_items(user_id: str, items: list[dict]):  # placeholder
    return len(items)


@celery_app.task(name="run_agents", queue="agent")
def run_agents(user_id: str):  # placeholder
    return 0
