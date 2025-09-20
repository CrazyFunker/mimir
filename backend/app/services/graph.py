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
        node = task.to_dict() # Assuming a to_dict() method on the model
        if task.status == "done" and task.completed_at and task.completed_at >= now - timedelta(days=7):
            node["lane"] = "past7d"
        elif task.horizon == "today" and task.status != "done":
            node["lane"] = "today"
        elif task.horizon == "week" and task.status != "done":
            node["lane"] = "week"
        elif task.horizon == "month" and task.status != "done":
            node["lane"] = "month"
        else:
            node["lane"] = "archive" # Or some other default
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
