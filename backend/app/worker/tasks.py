from app.worker import celery_app
from app.db import session_scope
from app import models
from app.services import ingest as ingest_service
from app.services.embeddings import embed_texts
from app.services.connectors.base import get_connector_by_kind
from app.services.crypto import decrypt_token
from app.services import normalization
from datetime import datetime, timezone


@celery_app.task(name="suggest_tasks_job", queue="agent")
def suggest_tasks_job(job_id: str, user_id: str):
    """Celery job to generate suggested tasks (if needed) and recompute priorities.

    Updates the jobs table with status/result.
    """
    from app.services.agents import generate_suggested_tasks
    from app.services.ingest import ingest_data_for_user
    from app.services.prioritise import refresh_priorities
    
    print(f"Starting suggest_tasks_job for job_id: {job_id}, user_id: {user_id}")
    
    with session_scope() as db:
        job = db.query(models.Job).filter(models.Job.id == job_id, models.Job.user_id == user_id).first()
        if not job:
            print(f"Job not found: {job_id} for user {user_id}")
            return
        
        print(f"Found job {job_id}, setting status to in_progress")
        job.status = "in_progress"
        db.add(job)
        db.commit()
        created = 0
        
        try:
            connectors = db.query(models.Connector).filter(models.Connector.user_id == user_id, models.Connector.status == "connected").all()
            print(f"Found {len(connectors)} connected connectors for user {user_id}")
            
            if connectors:
                print("Processing with connectors - calling ingest_data_for_user")
                created = ingest_data_for_user(db, user_id)
                print(f"Ingested {created} items from connectors")
            else:
                print("No connectors found - generating suggested tasks")
                user_obj = db.query(models.User).filter(models.User.id == user_id).first()
                if user_obj:
                    print(f"Found user {user_id}, generating suggested tasks")
                    tasks = generate_suggested_tasks(user_obj)
                    if tasks:
                        print(f"Generated {len(tasks)} suggested tasks")
                        for t in tasks:
                            db.add(t)
                        db.commit()
                        created = len(tasks)
                    else:
                        print("No suggested tasks generated")
                else:
                    print(f"User not found: {user_id}")
            
            print(f"Refreshing priorities for user {user_id}")
            refresh_priorities(db, user_id)
            
            job.status = "completed"
            job.result = {"created": created}
            job.updated_at = datetime.now(timezone.utc)
            db.add(job)
            db.commit()
            print(f"Job {job_id} completed successfully with {created} items created")
            
        except Exception as e:  # pragma: no cover
            print(f"Error in suggest_tasks_job for job {job_id}: {str(e)}")
            db.rollback()
            job.status = "failed"
            job.result = {"error": str(e)}
            job.updated_at = datetime.now(timezone.utc)
            db.add(job)
            db.commit()
            print(f"Job {job_id} failed and rolled back")
            
    print(f"Finished suggest_tasks_job for job_id: {job_id}")
    return True


@celery_app.task(name="run_connector_test", queue="test")
def run_connector_test(kind: str, user_id: str):  # placeholder
    return {"status": "ok", "kind": kind}


@celery_app.task(name="ingest_connector", queue="ingest")
def ingest_connector(kind: str, user_id: str):
    with session_scope() as db:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            # TODO: proper logging
            print(f"User not found: {user_id}")
            return 0

        connector_model = (
            db.query(models.Connector)
            .filter(models.Connector.user_id == user_id, models.Connector.kind == kind)
            .first()
        )
        if not connector_model or not connector_model.access_token:
            print(f"Connector not configured for {kind} for user {user_id}")
            return 0

        connector_service = get_connector_by_kind(kind)
        if not connector_service:
            print(f"No connector service for kind: {kind}")
            return 0

        try:
            token = decrypt_token(connector_model.access_token)
            # special handling for jira
            if kind == "jira" and connector_model.meta:
                token["cloud_id"] = connector_model.meta.get("cloud_id")
            connector_instance = connector_service(token=token)
            raw_items = connector_instance.fetch()
        except Exception as e:
            # TODO: proper logging
            print(f"Failed to fetch from {kind}: {e}")
            # can also mark connector as failed
            return 0

        created_tasks = []
        for item in raw_items:
            try:
                task = normalization.normalise_and_create_task(db, user, connector_model, item)
                created_tasks.append(task)
            except Exception as e:
                # TODO: proper logging
                print(f"Failed to normalise item {item.get('id')}: {e}")
                continue
        
        if created_tasks:
            # TODO: make this async
            texts = [c.title for c in created_tasks]
            metadatas = [{"user_id": user_id, "kind": kind, "task_id": str(c.id)} for c in created_tasks]
            ids = [str(c.id) for c in created_tasks]
            embed_texts(texts, metadatas, ids)
        
        # Trigger agent-based prioritization
        if created_tasks:
            run_agents.delay(user_id)
            
        return len(created_tasks)


@celery_app.task(name="embed_items", queue="embed")
def embed_items(user_id: str, items: list[dict]):  # placeholder
    return len(items)


@celery_app.task(name="run_agents", queue="agent")
def run_agents(user_id: str):
    from app.services import agents as agent_service
    from app.services.prioritise import calculate_priority
    
    with session_scope() as db:
        tasks_to_process = db.query(models.Task).filter(
            models.Task.user_id == user_id,
            models.Task.status != models.StatusEnum.done,
            # To avoid re-processing, we could add a filter here, e.g., based on a timestamp
            # or a flag indicating that the task has been prioritized.
            # For now, we re-prioritize all active tasks.
        ).all()
        
        count = 0
        for task in tasks_to_process:
            try:
                factors = agent_service.get_factors(task)
                task.priority_factors = factors
                task.priority = calculate_priority(factors)
                if factors.get("suggested_horizon"):
                    task.horizon = models.HorizonEnum(factors["suggested_horizon"])
                db.add(task)
                count += 1
            except Exception as e:
                # TODO: proper logging
                print(f"Failed to prioritize task {task.id}: {e}")
                continue
        db.commit()
    return count
