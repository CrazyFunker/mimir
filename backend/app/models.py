import uuid
from sqlalchemy import Column, String, DateTime, Text, Enum, Float, ForeignKey, JSON, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db import Base
import enum


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
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=True)
    display_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    tasks = relationship("Task", back_populates="user")


class Task(Base):
    __tablename__ = "tasks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    horizon = Column(Enum(HorizonEnum), nullable=False, default=HorizonEnum.week)
    status = Column(Enum(StatusEnum), nullable=False, default=StatusEnum.todo)
    source_kind = Column(String, nullable=True)
    source_ref = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    priority = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    user = relationship("User", back_populates="tasks")


class Connector(Base):
    __tablename__ = "connectors"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    kind = Column(String, nullable=False)
    status = Column(String, nullable=False, default="disconnected")
    scopes = Column(JSON, nullable=True)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    meta = Column(JSON, nullable=True)
    last_checked = Column(DateTime(timezone=True), nullable=True)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class TaskLink(Base):
    __tablename__ = "task_links"
    parent = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), primary_key=True)
    child = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), primary_key=True)
    kind = Column(String, nullable=False, default="relates_to")


class Event(Base):
    __tablename__ = "events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    type = Column(String, nullable=False)
    payload = Column(JSON, nullable=True)
    ts = Column(DateTime(timezone=True), server_default=func.now())


class Embedding(Base):
    __tablename__ = "embeddings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    source_kind = Column(String, nullable=True)
    source_id = Column(String, nullable=True)
    vector_id = Column(String, nullable=True)
    meta = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

