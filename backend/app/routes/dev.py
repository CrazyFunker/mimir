from fastapi import APIRouter, Depends
from app.deps import get_current_user, get_db
from app import models
from sqlalchemy import select
import random

router = APIRouter(prefix="/dev", tags=["dev"])


@router.post("/seed")
def seed(db=Depends(get_db), user=Depends(get_current_user)):
    # Minimal seed tasks
    titles = [
        ("Email CTO", models.HorizonEnum.today, 0.95),
        ("Update Kubernetes", models.HorizonEnum.week, 0.85),
        ("Purge S3 Buckets", models.HorizonEnum.month, 0.7),
        ("Write Quarterly Report", models.HorizonEnum.month, 0.6),
        ("Review PR #42", models.HorizonEnum.today, 0.9),
    ]
    created_tasks = []
    for title, horizon, priority in titles:
        task = db.query(models.Task).filter(models.Task.user_id == user.id, models.Task.title == title).first()
        if not task:
            task = models.Task(user_id=user.id, title=title, horizon=horizon, status=models.StatusEnum.todo, priority=priority)
            db.add(task)
            db.flush()
        created_tasks.append(task)

    # connectors in varied states
    connector_kinds = ["gmail", "jira", "github", "gdrive"]
    states = ["ok", "error", "connecting", "disconnected"]
    for kind in connector_kinds:
        c = db.query(models.Connector).filter(models.Connector.user_id == user.id, models.Connector.kind == kind).first()
        if not c:
            c = models.Connector(user_id=user.id, kind=kind, status=random.choice(states), message="Press to retry" if random.random() < 0.3 else None)
            db.add(c)

    # simple edges between first few tasks
    if len(created_tasks) >= 3:
        existing_edge = db.query(models.TaskLink).first()
        if not existing_edge:
            db.add(models.TaskLink(parent=created_tasks[0].id, child=created_tasks[1].id, kind="progression"))
            db.add(models.TaskLink(parent=created_tasks[1].id, child=created_tasks[2].id, kind="relates_to"))

    return {"status": "ok", "tasks": len(created_tasks)}
