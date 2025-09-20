from app.worker import celery_app


@celery_app.task(name="run_connector_test", queue="test")
def run_connector_test(kind: str, user_id: str):  # placeholder
    return {"status": "ok", "kind": kind}


@celery_app.task(name="ingest_connector", queue="ingest")
def ingest_connector(kind: str, user_id: str):  # placeholder
    return 0


@celery_app.task(name="embed_items", queue="embed")
def embed_items(user_id: str, items: list[dict]):  # placeholder
    return len(items)


@celery_app.task(name="run_agents", queue="agent")
def run_agents(user_id: str):  # placeholder
    return 0
