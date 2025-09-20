from fastapi import APIRouter, Depends, HTTPException
from app.schemas import TaskList, Horizon, Task
from app.deps import get_current_user, get_db
from sqlalchemy import select
from app import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import uuid

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=TaskList)
def list_tasks(horizon: Horizon | None = None, limit: int = 3, user=Depends(get_current_user), db=Depends(get_db)):
    stmt = select(models.Task).where(models.Task.user_id == user.id)
    if horizon:
        stmt = stmt.where(models.Task.horizon == horizon.value)
    # order by priority desc then created_at as fallback
    stmt = stmt.order_by(models.Task.priority.desc().nullslast(), models.Task.created_at.asc())
    if limit:
        stmt = stmt.limit(limit)
    tasks = db.scalars(stmt).all()
    return {"tasks": tasks}


@router.post("/{task_id}/complete")
def complete_task(task_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        task_uuid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid task id")
    task = db.scalar(select(models.Task).where(models.Task.id == task_uuid, models.Task.user_id == user.id))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status == models.StatusEnum.done:
        return {"status": "ok"}
    prior = task.status
    task.status = models.StatusEnum.done
    task.completed_at = datetime.now(timezone.utc)
    db.add(models.Event(user_id=user.id, type="task_completed", payload={"task_id": str(task.id), "prior_status": prior.value}))
    db.flush()
    return {"status": "ok"}


@router.post("/{task_id}/undo")
def undo_task(task_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        task_uuid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid task id")
    task = db.scalar(select(models.Task).where(models.Task.id == task_uuid, models.Task.user_id == user.id))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != models.StatusEnum.done:
        return {"status": "ok"}
    # fetch last completion event for this task
    event = db.query(models.Event).filter(models.Event.user_id == user.id, models.Event.type == "task_completed", models.Event.payload["task_id"].astext == str(task.id)).order_by(models.Event.ts.desc()).first()
    prior_status = models.StatusEnum.todo
    if event and event.payload and event.payload.get("prior_status") and event.payload["prior_status"] in models.StatusEnum.__members__:
        prior_status = models.StatusEnum(event.payload["prior_status"])  # type: ignore[arg-type]
    task.status = prior_status
    task.completed_at = None
    db.add(models.Event(user_id=user.id, type="task_undo", payload={"task_id": str(task.id)}))
    db.flush()
    return {"status": "ok"}
