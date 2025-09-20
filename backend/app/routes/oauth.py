from fastapi import APIRouter, Depends, HTTPException
from app.deps import get_current_user, get_db
from app.services.connectors.base import get_connector_by_kind
from app.config import settings
from app.services import crypto
from app import models
from sqlalchemy import select
from app.worker.tasks import ingest_connector as ingest_task
import json

router = APIRouter(prefix="/oauth", tags=["oauth"])


@router.get("/start/{kind}")
def oauth_start(kind: str, user=Depends(get_current_user), db=Depends(get_db)):
    connector_service = get_connector_by_kind(kind)
    connector = connector_service(user_id=str(user.id), config=settings)
    url = connector.authorize()
    return {"authorize_url": url}


@router.get("/callback/{kind}")
def oauth_callback(kind: str, code: str | None = None, user=Depends(get_current_user), db=Depends(get_db)):
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")
    
    connector_service = get_connector_by_kind(kind)
    provider = connector_service(user_id=str(user.id), config=settings)
    
    token_data = provider.exchange_code(code)
    
    # Encrypt the whole token data dictionary
    encrypted_token = crypto.encrypt(json.dumps(token_data))

    stmt = select(models.Connector).where(models.Connector.user_id == user.id, models.Connector.kind == kind)
    conn = db.scalars(stmt).first()
    if not conn:
        conn = models.Connector(user_id=user.id, kind=kind)
        db.add(conn)
    
    conn.status = models.ConnectorStatusEnum.connected
    conn.access_token = encrypted_token
    conn.scopes = token_data.get("scopes")
    conn.meta = token_data.get("meta")
    conn.message = None
    db.commit()
    
    # trigger ingestion asynchronously
    ingest_task.delay(kind, str(user.id))
    
    return {"status": "connected", "kind": kind}
