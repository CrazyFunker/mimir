import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.deps import get_db, get_current_user
from app import models
from app.models import User, Task, Connector, TaskLink
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
import uuid
from datetime import datetime

# Use a separate test database
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency overrides
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

def override_get_current_user():
    return User(id=uuid.UUID(settings.dev_user_id), email="test@example.com")

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

@pytest.fixture(scope="function")
def db_session():
    # Create the database
    from app.db import Base
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_health_check():
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_seed_data(db_session):
    response = client.post("/api/dev/seed")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    
    tasks = db_session.query(Task).all()
    assert len(tasks) > 0
    
    connectors = db_session.query(Connector).all()
    assert len(connectors) > 0

def test_get_tasks(db_session):
    client.post("/api/dev/seed")
    response = client.get("/api/tasks?horizon=today")
    assert response.status_code == 200
    data = response.json()
    assert "tasks" in data
    assert len(data["tasks"]) <= 3

def test_get_graph(db_session):
    client.post("/api/dev/seed")
    response = client.get("/api/graph")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) > 0

def test_complete_and_undo_task(db_session):
    client.post("/api/dev/seed")
    task_to_complete = db_session.query(Task).filter(Task.status == "todo").first()
    
    # Complete task
    response = client.post(f"/api/tasks/{task_to_complete.id}/complete")
    assert response.status_code == 200
    assert response.json()["status"] == "done"
    
    db_session.refresh(task_to_complete)
    completed_task = db_session.query(Task).get(task_to_complete.id)
    assert completed_task.status == models.StatusEnum.done
    assert completed_task.completed_at is not None
    
    # Undo completion
    response = client.post(f"/api/tasks/{completed_task.id}/undo")
    assert response.status_code == 200
    assert response.json()["status"] == "todo"
    
    db_session.refresh(task_to_complete)
    undone_task = db_session.query(Task).get(task_to_complete.id)
    assert undone_task.status == models.StatusEnum.todo
