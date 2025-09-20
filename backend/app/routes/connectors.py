from fastapi import APIRouter, Depends
from app.schemas import ConnectorList, Connector
from app.deps import get_current_user, get_db
from app import models
from sqlalchemy import select
from fastapi.responses import StreamingResponse
from app.services.sse import sse_event
import time
from app.services.connectors.base import get_connector
from app.config import settings
from app.services import crypto

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


@router.post("/{kind}/test", response_model=dict)
def test_connector(kind: str, user=Depends(get_current_user), db=Depends(get_db)):
    conn = db.scalars(select(models.Connector).where(models.Connector.user_id == user.id, models.Connector.kind == kind)).first()
    if not conn or not conn.access_token:
        return {"status": "error", "message": "Not connected"}
    
    access_token = crypto.decrypt(conn.access_token)
    connector = get_connector(kind, str(user.id), settings, access_token)
    result = connector.test()
    return result

@router.post("/test_all")
def test_all_connectors(user=Depends(get_current_user), db=Depends(get_db)):
    connectors = db.scalars(select(models.Connector).where(models.Connector.user_id == user.id)).all()

    def stream():
        for conn in connectors:
            yield sse_event("status", {"kind": conn.kind, "status": "connecting"})
            
            if not conn.access_token:
                yield sse_event("status", {"kind": conn.kind, "status": "error", "message": "Not connected"})
                continue

            access_token = crypto.decrypt(conn.access_token)
            connector_instance = get_connector(conn.kind, str(user.id), settings, access_token)
            result = connector_instance.test()
            
            yield sse_event("status", {"kind": conn.kind, "status": result["status"], "message": result.get("message")})
        
        yield sse_event("done", {"count": len(connectors)})

    return StreamingResponse(stream(), media_type="text/event-stream")
