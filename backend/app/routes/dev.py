from fastapi import APIRouter, Depends
from app.deps import get_current_user, get_db
from app import models

router = APIRouter(prefix="/dev", tags=["dev"])


@router.post("/seed")
def seed(db=Depends(get_db), user=Depends(get_current_user)):
    # Minimal seed tasks
    titles = ["Email CTO", "Update Kubernetes", "Purge S3 Buckets"]
    for t in titles:
        exists = db.query(models.Task).filter(models.Task.user_id == user.id, models.Task.title == t).first()
        if not exists:
            db.add(models.Task(user_id=user.id, title=t, horizon=models.HorizonEnum.week, status=models.StatusEnum.todo))
    return {"status": "ok"}
