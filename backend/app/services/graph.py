from app import models
from sqlalchemy.orm import Session
from typing import List, Tuple


def build_graph(db: Session, user_id):
    tasks: List[models.Task] = db.query(models.Task).filter(models.Task.user_id == user_id).all()
    links: List[models.TaskLink] = db.query(models.TaskLink).all()
    edges: List[Tuple[str, str]] = [(str(l.parent), str(l.child)) for l in links]
    return tasks, edges
