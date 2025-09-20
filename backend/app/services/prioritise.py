from app import models
from sqlalchemy.orm import Session
from app.services import agents


def compute_priority(task: models.Task, factors: dict) -> float:
    # Weighted combination; weights may be tuned later
    w = {"urgency": 0.4, "importance": 0.3, "recency": 0.2, "source_signal": 0.1}
    score = 0.0
    for k, weight in w.items():
        score += weight * factors.get(k, 0.5)
    # horizon bias
    horizon_weight = {"today": 1.0, "week": 0.85, "month": 0.6, "past7d": 0.3}
    score *= horizon_weight.get(task.horizon.value if hasattr(task.horizon, 'value') else task.horizon, 0.7)
    return round(score, 4)


def refresh_priorities(db: Session, user_id):
    tasks = db.query(models.Task).filter(models.Task.user_id == user_id, models.Task.status != models.StatusEnum.done).all()
    for t in tasks:
        factors = agents.get_factors(t)
        # Possibly adjust horizon based on suggestion (soft apply if lower horizon urgency)
        suggested = factors.get("suggested_horizon")
        if suggested and suggested != t.horizon.value:
            # only escalate (today > week > month); never downgrade automatically
            order = ["month", "week", "today"]
            if order.index(suggested) > order.index(t.horizon.value):
                t.horizon = models.HorizonEnum(suggested)
        t.priority_factors = factors
        t.priority = compute_priority(t, factors)
    db.flush()

