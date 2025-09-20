from fastapi import APIRouter, Depends
from app.deps import get_current_user, get_db
from app import models
from sqlalchemy import select
import random
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/dev", tags=["dev"])


@router.post("/seed")
def seed(db=Depends(get_db), user=Depends(get_current_user)):
    # Clear existing data for the user
    db.query(models.TaskLink).delete()
    db.query(models.Task).filter(models.Task.user_id == user.id).delete()
    db.query(models.Connector).filter(models.Connector.user_id == user.id).delete()
    db.flush()

    # More realistic tasks
    tasks_to_create = [
        # Today
        {"title": "Finalize Q3 presentation slides", "horizon": "today", "priority": 0.98, "source_kind": "gdrive", "status": "in_progress"},
        {"title": "Review and merge critical security patch PR #1337", "horizon": "today", "priority": 0.95, "source_kind": "github"},
        {"title": "Respond to urgent client email re: outage", "horizon": "today", "priority": 0.99, "source_kind": "gmail"},
        
        # This Week
        {"title": "Draft project plan for 'Phoenix' initiative", "horizon": "week", "priority": 0.85, "source_kind": "jira"},
        {"title": "Onboard new team member, Alice", "horizon": "week", "priority": 0.80},
        {"title": "Fix intermittent bug in payment processing (JIRA-456)", "horizon": "week", "priority": 0.90, "source_kind": "jira"},
        
        # This Month
        {"title": "Plan team offsite for Q4", "horizon": "month", "priority": 0.70},
        {"title": "Research new database technologies for performance improvements", "horizon": "month", "priority": 0.65},
        {"title": "Complete mandatory compliance training", "horizon": "month", "priority": 0.50, "due_date": datetime.now(timezone.utc) + timedelta(days=20)},

        # Completed
        {"title": "Deploy v2.5.1 to production", "horizon": "past7d", "priority": 0.9, "status": "done", "completed_at": datetime.now(timezone.utc) - timedelta(days=1)},
        {"title": "Submit expense report for August", "horizon": "past7d", "priority": 0.6, "status": "done", "completed_at": datetime.now(timezone.utc) - timedelta(days=3)},
    ]
    
    created_tasks = {}
    for task_data in tasks_to_create:
        task = models.Task(
            user_id=user.id,
            title=task_data["title"],
            horizon=task_data["horizon"],
            status=task_data.get("status", "todo"),
            priority=task_data["priority"],
            source_kind=task_data.get("source_kind"),
            due_date=task_data.get("due_date"),
            completed_at=task_data.get("completed_at"),
            description=f"This is a seeded task for {task_data['title']}.",
        )
        db.add(task)
        db.flush()
        created_tasks[task_data["title"]] = task

    # Connectors
    connector_states = {
        "gmail": "disconnected",
        "jira": "disconnected",
        "github": "disconnected",
        "gdrive": "disconnected",
    }
    for kind, status in connector_states.items():
        message = "Authentication failed. Please reconnect." if status == "error" else None
        c = models.Connector(user_id=user.id, kind=kind, status=status, message=message)
        db.add(c)

    # Task Links
    links_to_create = [
        ("Draft project plan for 'Phoenix' initiative", "Finalize Q3 presentation slides"),
        ("Review and merge critical security patch PR #1337", "Deploy v2.5.1 to production"),
    ]
    for parent_title, child_title in links_to_create:
        if parent_title in created_tasks and child_title in created_tasks:
            parent_task = created_tasks[parent_title]
            child_task = created_tasks[child_title]
            link = models.TaskLink(parent=parent_task.id, child=child_task.id, kind="relates_to")
            db.add(link)

    db.commit()
    return {"status": "ok", "tasks_seeded": len(created_tasks)}
