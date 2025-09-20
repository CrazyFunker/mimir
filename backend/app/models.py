import uuid
from sqlalchemy import Column, String, DateTime, Text, Enum, Float, ForeignKey, JSON, Date, TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db import Base
import enum


class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses
    CHAR(32), storing as string.
    """

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID())
        else:
            return dialect.type_descriptor(CHAR(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == "postgresql":
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                return "%.32x" % uuid.UUID(value).int
            else:
                # hexstring
                return "%.32x" % value.int

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                value = uuid.UUID(value)
            return value


class HorizonEnum(str, enum.Enum):
    today = "today"
    week = "week"
    month = "month"
    past7d = "past7d"


class StatusEnum(str, enum.Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"
    scheduled = "scheduled"


class User(Base):
    __tablename__ = "users"
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=True)
    display_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    tasks = relationship("Task", back_populates="user")


class Task(Base):
    __tablename__ = "tasks"
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    horizon = Column(Enum(HorizonEnum), nullable=False, default=HorizonEnum.week)
    status = Column(Enum(StatusEnum), nullable=False, default=StatusEnum.todo)
    source_kind = Column(String, nullable=True)
    source_ref = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    priority = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    priority_factors = Column(JSON, nullable=True)
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    user = relationship("User", back_populates="tasks")

    def to_dict(self):
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "title": self.title,
            "description": self.description,
            "horizon": self.horizon.value if self.horizon else None,
            "status": self.status.value if self.status else None,
            "source_kind": self.source_kind,
            "source_ref": self.source_ref,
            "source_url": self.source_url,
            "priority": self.priority,
            "confidence": self.confidence,
            "priority_factors": self.priority_factors,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Connector(Base):
    __tablename__ = "connectors"
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id"), nullable=False)
    kind = Column(String, nullable=False)
    status = Column(String, nullable=False, default="disconnected")
    scopes = Column(JSON, nullable=True)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    meta = Column(JSON, nullable=True)
    last_checked = Column(DateTime(timezone=True), nullable=True)
    message = Column(Text, nullable=True)
    status_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class TaskLink(Base):
    __tablename__ = "task_links"
    parent = Column(GUID, ForeignKey("tasks.id"), primary_key=True)
    child = Column(GUID, ForeignKey("tasks.id"), primary_key=True)
    kind = Column(String, nullable=False, default="relates_to")


class Event(Base):
    __tablename__ = "events"
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, nullable=False)
    type = Column(String, nullable=False)
    payload = Column(JSON, nullable=True)
    ts = Column(DateTime(timezone=True), server_default=func.now())


class Embedding(Base):
    __tablename__ = "embeddings"
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, nullable=False)
    source_kind = Column(String, nullable=True)
    source_id = Column(String, nullable=True)
    vector_id = Column(String, nullable=True)
    meta = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

