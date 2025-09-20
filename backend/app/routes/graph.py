from fastapi import APIRouter, Depends
from app.schemas import GraphResponse
from app.deps import get_current_user, get_db
from app import models
from sqlalchemy import select
from app.services.graph import build_graph

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("", response_model=GraphResponse)
def get_graph(window: str = "month", user=Depends(get_current_user), db=Depends(get_db)):
    graph_data = build_graph(db, str(user.id), window)
    return graph_data


@router.get("/filters")
def graph_filters():
    return {"sources": ["jira", "gmail", "github", "drive"], "statuses": ["done", "future"]}
