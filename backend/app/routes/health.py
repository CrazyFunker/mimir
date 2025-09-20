from fastapi import APIRouter
from app.schemas import HealthStatus
from app.db import db_ready
from app.config import settings
import redis

router = APIRouter()


@router.get("/healthz", response_model=HealthStatus)
def healthz():
    return {"status": "ok"}


@router.get("/readyz", response_model=HealthStatus)
def readyz():
    # DB + Redis simple check
    db_ok = db_ready()
    redis_ok = False
    try:
        r = redis.from_url(settings.redis_url, decode_responses=True)
        r.ping()
        redis_ok = True
    except Exception:
        redis_ok = False
    if db_ok and redis_ok:
        return {"status": "ok"}
    return {"status": "starting"}
