from fastapi import APIRouter, Depends, HTTPException
from app.schemas import TaskList, Horizon, Task
from app.deps import get_current_user, get_db
from sqlalchemy import select, cast, String
from app import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import uuid
from app.services.prioritise import refresh_priorities
from app.services.ingest import ingest_data_for_user
from app.services.agents import generate_suggested_tasks
from app.schemas import Job as JobSchema
from sqlalchemy.exc import SQLAlchemyError
try:  # pragma: no cover - optional celery broker
    from app.worker import celery_app  # type: ignore
except Exception:  # pragma: no cover
    celery_app = None  # type: ignore

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=TaskList)
def list_tasks(horizon: Horizon | None = None, limit: int = 3, user=Depends(get_current_user), db=Depends(get_db)):
    # If specific horizon requested, just return up to limit ordered by priority
    if horizon:
        stmt = (
            select(models.Task)
            .where(models.Task.user_id == user.id, models.Task.horizon == horizon.value, models.Task.status != models.StatusEnum.done)
            .order_by(models.Task.priority.desc().nullslast(), models.Task.created_at.asc())
        )
        if limit:
            stmt = stmt.limit(limit)
        tasks = db.scalars(stmt).all()
        return {"tasks": tasks}
    # aggregate all active tasks and select top N per horizon (today, week, month)
    all_tasks = db.scalars(
        select(models.Task).where(models.Task.user_id == user.id, models.Task.status != models.StatusEnum.done)
        .order_by(models.Task.priority.desc().nullslast(), models.Task.created_at.asc())
    ).all()
    buckets = {"today": [], "week": [], "month": []}
    for t in all_tasks:
        hv = t.horizon.value if hasattr(t.horizon, 'value') else t.horizon
        if hv in buckets and len(buckets[hv]) < limit:
            buckets[hv].append(t)
        # stop early if all filled
        if all(len(buckets[k]) >= limit for k in buckets):
            break
    # flatten preserving order today->week->month
    ordered = buckets["today"] + buckets["week"] + buckets["month"]
    return {"tasks": ordered}


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
        return {"status": "done"}
    prior = task.status
    task.status = models.StatusEnum.done
    task.completed_at = datetime.now(timezone.utc)
    db.add(models.Event(user_id=user.id, type="task_completed", payload={"task_id": str(task.id), "prior_status": prior.value}))
    db.commit()
    return {"status": "done"}


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
        return {"status": task.status.value}
    # fetch last completion event for this task
    event = db.query(models.Event).filter(
        models.Event.user_id == user.id, 
        models.Event.type == "task_completed", 
        cast(models.Event.payload["task_id"], String) == str(task.id)
    ).order_by(models.Event.ts.desc()).first()
    prior_status = models.StatusEnum.todo
    if event and event.payload and event.payload.get("prior_status") and event.payload["prior_status"] in models.StatusEnum.__members__:
        prior_status = models.StatusEnum(event.payload["prior_status"])  # type: ignore[arg-type]
    task.status = prior_status
    task.completed_at = None
    db.add(models.Event(user_id=user.id, type="task_undo", payload={"task_id": str(task.id)}))
    db.commit()
    return {"status": prior_status.value}


@router.post("/recompute_priorities")
def recompute_priorities(user=Depends(get_current_user), db: Session = Depends(get_db)):
    refresh_priorities(db, user.id)
    return {"status": "ok"}


@router.post("/suggest", status_code=202)
def suggest_tasks(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Kick off (async) suggested task generation + prioritisation.

    Returns 202 with a job id that can be polled.
    """
    # Create a Job row
    job = models.Job(user_id=user.id, status="pending", job_type="suggest_tasks", result=None)
    db.add(job)
    db.commit()
    db.refresh(job)

    def _inline_run(job_id: uuid.UUID, user_id: uuid.UUID):
        """Fallback inline execution if Celery not available."""
        try:
            j = db.scalar(select(models.Job).where(models.Job.id == job_id, models.Job.user_id == user_id))
            if not j:
                return
            j.status = "in_progress"
            db.add(j)
            db.commit()
            created = 0
            # connectors ingestion or random generation
            connectors = db.scalars(select(models.Connector).where(models.Connector.user_id == user_id, models.Connector.status == "connected")).all()
            if connectors:
                try:
                    created = ingest_data_for_user(db, user_id)
                except Exception as e:  # pragma: no cover
                    j.status = "failed"
                    j.result = {"error": str(e)}
                    db.add(j)
                    db.commit()
                    return
            else:
                random_tasks = generate_suggested_tasks(user)
                if random_tasks:
                    for t in random_tasks:
                        db.add(t)
                    db.commit()
                    created = len(random_tasks)
            # Recompute priorities
            refresh_priorities(db, user_id)
            j.status = "completed"
            j.result = {"created": created}
            db.add(j)
            db.commit()
        except SQLAlchemyError as e:  # pragma: no cover
            db.rollback()
            try:
                j = db.scalar(select(models.Job).where(models.Job.id == job_id))
                if j:
                    j.status = "failed"
                    j.result = {"error": str(e)}
                    db.add(j)
                    db.commit()
            except Exception:
                pass

    # Enqueue Celery task if available, else run inline
    dispatched = False
    if celery_app is not None:
        try:  # pragma: no cover
            celery_app.send_task("suggest_tasks_job", args=[str(job.id), str(user.id)], queue="agent")
            dispatched = True
        except Exception:
            dispatched = False
    if not dispatched:
        _inline_run(job.id, user.id)

    return {"job_id": str(job.id), "status": job.status}


@router.get("/suggest/{job_id}", response_model=JobSchema)
def get_suggest_job_status(job_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job id")
    job = db.scalar(select(models.Job).where(models.Job.id == job_uuid, models.Job.user_id == user.id, models.Job.job_type == "suggest_tasks"))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
