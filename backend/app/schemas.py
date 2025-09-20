from pydantic import BaseModel, Field
from typing import Optional, List, Any
from enum import Enum
import uuid
from datetime import datetime


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


class Connector(BaseModel):
    id: Optional[uuid.UUID] = None
    kind: str
    status: str = "disconnected"
    message: Optional[str] = None

    class Config:
        from_attributes = True


class ConnectorList(BaseModel):
    connectors: List[Connector]


class ConnectorTestResult(BaseModel):
    kind: str
    status: str
    message: Optional[str] = None


class GraphResponse(BaseModel):
    nodes: List[Task]
    edges: List[List[uuid.UUID]]
    meta: Optional[Any] = None


class HealthStatus(BaseModel):
    status: str = Field(example="ok")


class Job(BaseModel):
    id: uuid.UUID
    status: str
    job_type: str
    result: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
