from app import models
from sqlalchemy.orm import Session
from typing import List, Tuple, Dict, Any
from datetime import datetime, timedelta, timezone

def build_graph(db: Session, user_id: str, window: str = "month"):
    # Define time windows
    now = datetime.now(timezone.utc)
    if window == "month":
        start_date = now - timedelta(days=30)
    elif window == "week":
        start_date = now - timedelta(days=7)
    else: # day
        start_date = now - timedelta(days=1)

    # Fetch tasks and links
    tasks_query = db.query(models.Task).filter(
        models.Task.user_id == user_id,
        (models.Task.created_at >= start_date) | (models.Task.status != "done")
    )
    tasks: List[models.Task] = tasks_query.all()
    
    task_ids = [task.id for task in tasks]
    links_query = db.query(models.TaskLink).filter(
        models.TaskLink.parent.in_(task_ids),
        models.TaskLink.child.in_(task_ids)
    )
    links: List[models.TaskLink] = links_query.all()

    # Assign lanes
    nodes = []
    for task in tasks:
        node = task.to_dict()
        status_val = task.status.value if hasattr(task.status, 'value') else task.status
        horizon_val = task.horizon.value if hasattr(task.horizon, 'value') else task.horizon
        completed_at = task.completed_at
        if completed_at and completed_at.tzinfo is None:
            # Assume UTC if naive
            completed_at = completed_at.replace(tzinfo=timezone.utc)
        if status_val == "done" and completed_at and completed_at >= now - timedelta(days=7):
            node["lane"] = "past7d"
        elif horizon_val == "today" and status_val != "done":
            node["lane"] = "today"
        elif horizon_val == "week" and status_val != "done":
            node["lane"] = "week"
        elif horizon_val == "month" and status_val != "done":
            node["lane"] = "month"
        else:
            node["lane"] = "archive"
        nodes.append(node)

    edges: List[Tuple[str, str]] = [(str(l.parent), str(l.child)) for l in links]
    
    # Prevent KeyError for sub-tasks
    _TASK_GRAPH = {str(task.id): {"task": task, "children": []} for task in tasks}
    for t in tasks:
        if t.source_kind == "task" and t.source_ref:
            # This is a sub-task, add an edge from parent to child
            # to capture dependency
            if t.source_ref in _TASK_GRAPH:
                _TASK_GRAPH[t.source_ref]["children"].append(t.id)
                _TASK_GRAPH[t.id]["parent"] = t.source_ref

    return {"nodes": nodes, "edges": edges}
