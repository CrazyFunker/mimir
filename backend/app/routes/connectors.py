from fastapi import APIRouter, Depends
from app.schemas import ConnectorList, Connector
from app.deps import get_current_user, get_db
from app import models
from sqlalchemy import select
from fastapi.responses import StreamingResponse
from app.services.sse import sse_event
import time

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
def test_connector(kind: str, user=Depends(get_current_user)):
    # stub test always ok
    return {"status": "ok", "kind": kind}

@router.post("/test_all")
def test_all_connectors(user=Depends(get_current_user), db=Depends(get_db)):
    kinds = [c.kind for c in db.scalars(select(models.Connector).where(models.Connector.user_id == user.id)).all()]
    if not kinds:
        kinds = []

    def stream():
        for k in kinds:
            yield sse_event("status", {"kind": k, "status": "connecting"})
            time.sleep(0.1)
            yield sse_event("status", {"kind": k, "status": "ok"})
        yield sse_event("done", {"count": len(kinds)})

    return StreamingResponse(stream(), media_type="text/event-stream")
