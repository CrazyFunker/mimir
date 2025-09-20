from fastapi import APIRouter, Depends
from app.schemas import TaskList, Horizon, Task
from app.deps import get_current_user, get_db
from sqlalchemy import select
from app import models

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=TaskList)
def list_tasks(horizon: Horizon | None = None, user=Depends(get_current_user), db=Depends(get_db)):
    stmt = select(models.Task).where(models.Task.user_id == user.id)
    if horizon:
        stmt = stmt.where(models.Task.horizon == horizon.value)
    tasks = db.scalars(stmt.limit(50)).all()
    return {"tasks": tasks}


@router.post("/{task_id}/complete")
def complete_task(task_id: str):  # stub
    return {"status": "ok"}


@router.post("/{task_id}/undo")
def undo_task(task_id: str):  # stub
    return {"status": "ok"}
