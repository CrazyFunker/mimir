from fastapi import APIRouter, Depends, HTTPException
from app.deps import get_current_user, get_db
from app.services.connectors.base import get_connector
from app.config import settings
from app.services import crypto
from app import models
from sqlalchemy import select
from app.worker.tasks import ingest_connector as ingest_task
from app.worker import celery_app

router = APIRouter(prefix="/oauth", tags=["oauth"])


@router.get("/start/{kind}")
def oauth_start(kind: str, user=Depends(get_current_user), db=Depends(get_db)):
    connector = get_connector(kind, str(user.id), settings)
    url = connector.authorize()
    return {"authorize_url": url}


@router.get("/callback/{kind}")
def oauth_callback(kind: str, code: str | None = None, user=Depends(get_current_user), db=Depends(get_db)):
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")
    provider = get_connector(kind, str(user.id), settings)
    token_data = provider.exchange_code(code)
    enc_access = crypto.encrypt(token_data.get("access_token", "")) if token_data.get("access_token") else None
    enc_refresh = crypto.encrypt(token_data.get("refresh_token", "")) if token_data.get("refresh_token") else None
    stmt = select(models.Connector).where(models.Connector.user_id == user.id, models.Connector.kind == kind)
    conn = db.scalars(stmt).first()
    if not conn:
        conn = models.Connector(user_id=user.id, kind=kind)
        db.add(conn)
        db.flush()
    conn.status = "connected"
    conn.access_token = enc_access
    # ... existing code ...
    conn.refresh_token = enc_refresh
    conn.expires_at = token_data.get("expires_at")
    conn.scopes = token_data.get("scopes")
    conn.meta = token_data.get("meta")
    conn.message = None
    # trigger ingestion asynchronously
    celery_app.send_task("ingest_connector", args=[kind, str(user.id)], queue="ingest")
# ... existing code ...
    return {"status": "connected", "kind": kind}
