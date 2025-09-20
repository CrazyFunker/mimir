from __future__ import annotations
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from datetime import date
from app import models


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
    """Remove tasks whose (user_id, source_kind, source_ref) already exist."""
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
    return [t for t in tasks if (t["source_kind"], t.get("source_ref")) not in existing_set]


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
    return created
