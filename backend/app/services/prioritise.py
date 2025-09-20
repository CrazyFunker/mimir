from app import models
from sqlalchemy.orm import Session


def compute_priority(task: models.Task) -> float:
    # naive placeholder using horizon weight
    weights = {"today": 1.0, "week": 0.7, "month": 0.4, "past7d": 0.2}
    return weights.get(task.horizon.value if hasattr(task.horizon, 'value') else task.horizon, 0.5)


def refresh_priorities(db: Session, user_id):
    tasks = db.query(models.Task).filter(models.Task.user_id == user_id).all()
    for t in tasks:
        t.priority = compute_priority(t)
    db.flush()
