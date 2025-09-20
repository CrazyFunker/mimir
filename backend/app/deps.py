from fastapi import Header, Depends
from app.config import settings
from app.db import session_scope
from app import models
from sqlalchemy import select
import uuid


def get_db():
    with session_scope() as s:
        yield s


def get_current_user(x_dev_user: str | None = Header(default=None, alias="X-Dev-User"), db=Depends(get_db)):
    user_id = x_dev_user or settings.dev_user_id
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        user_uuid = uuid.UUID(settings.dev_user_id)
    user = db.scalar(select(models.User).where(models.User.id == user_uuid))
    if not user:
        user = models.User(id=user_uuid, email=None, display_name="Dev User")
        db.add(user)
        db.flush()
    return user
