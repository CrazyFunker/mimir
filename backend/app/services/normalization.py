from app import models, schemas
from sqlalchemy.orm import Session
import uuid


def normalise_and_create_task(db: Session, user: models.User, connector: models.Connector, item: dict) -> models.Task:
    """
    Normalises a data item from a connector and creates a Task object.
    """
    # Dummy implementation: creates a task with title and description from the item
    # and a random priority. In a real implementation, this would involve more
    # sophisticated logic to extract relevant information from the item.
    title = item.get("title", "Untitled Task")
    description = item.get("description", "")
    
    task = models.Task(
        user_id=user.id,
        connector_id=connector.id,
        title=title,
        description=description,
        status=models.StatusEnum.todo,
        horizon=models.HorizonEnum.week, # default horizon
        source_id=item.get("id"),
        source_link=item.get("link"),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task
