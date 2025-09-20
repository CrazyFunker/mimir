from fastapi import APIRouter, Depends, Request, HTTPException
from app.schemas import ConnectorList, Connector, ConnectorTestResult
from app.deps import get_current_user, get_db
from sqlalchemy import select
from sqlalchemy.orm import Session
from app import models
from fastapi.responses import StreamingResponse
from app.services.sse import sse_event
import time
from app.services.connectors.base import get_connector_by_kind
from app.config import settings
from app.services.crypto import decrypt_token
from sse_starlette.sse import EventSourceResponse
import json

router = APIRouter(prefix="/connectors", tags=["connectors"])


@router.get("", response_model=ConnectorList)
def list_connectors(user=Depends(get_current_user), db=Depends(get_db)):
    stmt = select(models.Connector).where(models.Connector.user_id == user.id)
    connectors = db.scalars(stmt).all()
    return {"connectors": connectors}


@router.post("/{kind}/connect", response_model=dict)
def start_connect(kind: str, user=Depends(get_current_user), db=Depends(get_db)):
    existing = db.query(models.Connector).filter(models.Connector.user_id == user.id, models.Connector.kind == kind).first()
    if not existing:
        existing = models.Connector(user_id=user.id, kind=kind, status="connecting")
        db.add(existing)
        db.flush()
    # instruct client to visit oauth start endpoint
    return {"authorize_start": f"/oauth/start/{kind}", "status": existing.status}


@router.get("/{kind}/authorize")
def authorize_connector(kind: str, user: models.User = Depends(get_current_user)):
    connector_service = get_connector_by_kind(kind)
    if not connector_service:
        raise HTTPException(status_code=400, detail=f"Unsupported connector kind: {kind}")
    
    connector = connector_service(user_id=str(user.id), config=settings)
    auth_url = connector.authorize()
    return {"authorization_url": auth_url}


@router.post("/{kind}/test", response_model=ConnectorTestResult)
def test_connector(kind: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    connector_model = db.scalar(select(models.Connector).where(models.Connector.user_id == user.id, models.Connector.kind == kind))
    if not connector_model or not connector_model.access_token:
        raise HTTPException(status_code=404, detail="Connector not configured")

    try:
        access_token = decrypt_token(connector_model.access_token)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt access token")

    connector_service = get_connector_by_kind(kind)
    connector = connector_service(user_id=str(user.id), config=settings, access_token=access_token)
    
    result = connector.test()
    status = result.get("status", "error")
    message = result.get("message")
    
    connector_model.status = models.ConnectorStatusEnum.working if status == "ok" else models.ConnectorStatusEnum.failed
    db.commit()
    
    return {"status": status, "message": message, "kind": kind}


@router.post("/test_all")
async def test_all_connectors(request: Request, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    connectors = db.scalars(select(models.Connector).where(models.Connector.user_id == user.id, models.Connector.access_token.isnot(None))).all()

    async def event_generator():
        for conn in connectors:
            if await request.is_disconnected():
                break
            
            try:
                access_token = decrypt_token(conn.access_token)
                connector_service = get_connector_by_kind(conn.kind)
                connector_instance = connector_service(user_id=str(user.id), config=settings, access_token=access_token)
                result = connector_instance.test()
                status = result.get("status", "error")
                message = result.get("message")
                
                conn.status = models.ConnectorStatusEnum.working if status == "ok" else models.ConnectorStatusEnum.failed
                db.commit()
                
                yield {
                    "event": "update",
                    "data": json.dumps({"kind": conn.kind, "status": status, "message": message}),
                }
            except Exception as e:
                yield {
                    "event": "update",
                    "data": json.dumps({"kind": conn.kind, "status": "error", "message": str(e)}),
                }

    return EventSourceResponse(event_generator())
