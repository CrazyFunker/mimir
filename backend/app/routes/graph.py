from fastapi import APIRouter

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("")
def get_graph(window: str = "month"):
    return {"nodes": [], "edges": []}


@router.get("/filters")
def graph_filters():
    return {"sources": ["jira", "gmail", "github", "drive"], "statuses": ["done", "future"]}
