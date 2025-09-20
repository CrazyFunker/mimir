from __future__ import annotations
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from datetime import date, datetime, timezone
from app import models
from app.services.embeddings import embed_texts, find_similar
from app.config import settings
from app.services.connectors.base import get_connector_by_kind


def normalise_items(user_id, kind: str, raw_items: List[Dict[str, Any]]):
    """Convert provider raw items to internal Task creation dicts.

    Expected raw item keys (provider stubs should adapt):
        id, title, snippet, url, due (optional ISO date)
    """
    tasks: list[dict] = []
    for r in raw_items:
        tasks.append(
            {
                "user_id": user_id,
                "title": r.get("title") or r.get("subject") or "Untitled",
                "description": r.get("snippet"),
                "horizon": models.HorizonEnum.week,  # initial guess
                "status": models.StatusEnum.todo,
                "source_kind": kind,
                "source_ref": r.get("id"),
                "source_url": r.get("url"),
                "due_date": _parse_date(r.get("due")),
            }
        )
    return tasks


def _parse_date(val):
    if not val:
        return None
    try:
        return date.fromisoformat(val[:10])
    except Exception:
        return None


def dedupe_new(db: Session, user_id, tasks: list[dict]):
    """Remove tasks whose (user_id, source_kind, source_ref) already exist or near-duplicates via embeddings.

    Embedding similarity currently heuristic: if any existing vector within top_k returns distance < 0.15 treat as duplicate.
    (Chroma distance for default embedding function is cosine; adapt threshold later.)
    """
    if not tasks:
        return []
    refs = {(t["source_kind"], t["source_ref"]) for t in tasks if t.get("source_ref")}
    if not refs:
        return tasks
    existing = (
        db.query(models.Task.source_kind, models.Task.source_ref)
        .filter(models.Task.user_id == user_id, models.Task.source_ref.isnot(None))
        .filter(models.Task.source_kind.in_({k for k, _ in refs}))
        .all()
    )
    existing_set = {(ek, ev) for ek, ev in existing}
    filtered = []
    for t in tasks:
        key = (t["source_kind"], t.get("source_ref"))
        if key in existing_set:
            continue
        # similarity check (simple) using title
        similar = find_similar(user_id, t["title"], top_k=1)
        if similar and similar[0].get("distance") is not None and similar[0]["distance"] < 0.15:
            continue
        filtered.append(t)
    return filtered


def persist_tasks(db: Session, tasks: list[dict]):
    created = []
    for data in tasks:
        obj = models.Task(**data)
        db.add(obj)
        created.append(obj)
    db.flush()
    return created


def ingest_connector(db: Session, user_id, connector: models.Connector, raw_items: List[Dict[str, Any]]):
    norm = normalise_items(user_id, connector.kind, raw_items)
    new_items = dedupe_new(db, user_id, norm)
    created = persist_tasks(db, new_items)
    if created:
        ids = embed_texts([c.title for c in created], {"user_id": user_id, "kind": connector.kind})
        # record embedding rows
        for task_obj, vec_id in zip(created, ids):
            emb = models.Embedding(user_id=user_id, source_kind=connector.kind, source_id=str(task_obj.id), vector_id=vec_id, meta={"task_id": str(task_obj.id), "provider": "bedrock" if (getattr(settings, 'litellm_provider', '') or '').startswith('bedrock') else 'default'})
            db.add(emb)
    return created


def ingest_data_for_user(db: Session, user_id):
    """Fetch data from all of user's connected connectors and ingest."""
    connectors = db.query(models.Connector).filter(models.Connector.user_id == user_id, models.Connector.status == "connected").all()
    total_created = 0
    for c in connectors:
        try:
            connector_cls = get_connector_by_kind(c.kind)
            # TODO: this config passing is a bit of a mess
            connector = connector_cls(user_id=user_id, config=settings, access_token=c.access_token)
            raw_items = connector.fetch()
            created = ingest_connector(db, user_id, c, raw_items)
            total_created += len(created)
            c.last_checked = datetime.now(timezone.utc)
            db.add(c)
        except Exception as e:
            print(f"Error fetching from {c.kind}: {e}")
            c.status = "error"
            c.status_message = str(e)
            db.add(c)
    db.commit()
    return total_created
