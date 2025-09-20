from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
import uuid


class Horizon(str, Enum):
    today = "today"
    week = "week"
    month = "month"
    past7d = "past7d"


class Status(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"
    scheduled = "scheduled"


class Task(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    horizon: Horizon
    status: Status
    priority: Optional[float] = None

    class Config:
        from_attributes = True


class TaskList(BaseModel):
    tasks: List[Task]


class HealthStatus(BaseModel):
    status: str = Field(example="ok")
