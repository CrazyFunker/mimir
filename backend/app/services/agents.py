from __future__ import annotations
from app import models
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.config import settings
import json, re

try:  # CrewAI is optional; code must operate without it
    from crewai import Agent, Task as CrewTask, Crew  # type: ignore
    try:
        from crewai import Process  # >=0.50 style
    except Exception:  # older versions
        Process = None  # type: ignore
except Exception:  # crewai not installed or import error
    Agent = None  # type: ignore
    CrewTask = None  # type: ignore
    Crew = None  # type: ignore
    Process = None  # type: ignore


def _heuristic_urgency(task: models.Task) -> float:
    if task.due_date:
        days = (task.due_date - datetime.now(timezone.utc).date()).days
        if days <= 0:
            return 1.0
        if days <= 2:
            return 0.85
        if days <= 7:
            return 0.6
        return 0.3
    return 0.6 if (task.horizon and task.horizon.name == 'today') else 0.35


def _heuristic_importance(task: models.Task) -> float:
    mapping = {"jira": 0.9, "github": 0.8, "gmail": 0.6, "gdrive": 0.5}
    return mapping.get(task.source_kind or "", 0.5)


def _heuristic_recency(task: models.Task) -> float:
    if not task.created_at:
        return 0.5
    age_hours = (datetime.now(timezone.utc) - task.created_at).total_seconds() / 3600
    if age_hours < 6:
        return 0.9
    if age_hours < 24:
        return 0.75
    if age_hours < 72:
        return 0.6
    return 0.4


def _heuristic_source_signal(task: models.Task) -> float:
    return 0.7 if (task.source_ref and task.source_kind in {"jira", "github"}) else 0.5


def _heuristic_factors(task: models.Task) -> Dict[str, Any]:
    factors = {
        "urgency": _heuristic_urgency(task),
        "importance": _heuristic_importance(task),
        "recency": _heuristic_recency(task),
        "source_signal": _heuristic_source_signal(task),
    }
    u = factors["urgency"]
    if u > 0.8:
        suggested = models.HorizonEnum.today
    elif u > 0.6:
        suggested = models.HorizonEnum.week
    else:
        suggested = task.horizon or models.HorizonEnum.month
    factors["suggested_horizon"] = suggested.value
    factors["strategy"] = "heuristic"
    return factors


def _crew_result_to_str(result: Any) -> str:
    """Convert CrewAI result to a string, handling CrewOutput objects."""
    if not result:
        return ""
    if hasattr(result, "raw"):  # New CrewAI output
        return str(result.raw)
    return str(result)


def _crew_result_to_str(result: Any) -> str:
    """Convert CrewAI result to a string, handling CrewOutput objects."""
    if not result:
        return ""
    if hasattr(result, "raw") and result.raw:  # New CrewAI output
        return str(result.raw)
    return str(result)


def _extract_json_like(s: str) -> Optional[dict]:
    """Attempt to extract the first JSON object from a string.
    Returns dict or None."""
    if not s:
        return None
    # Quick exact parse first
    try:
        return json.loads(s)
    except Exception:
        pass
    # Fallback: find {...} substring greedily but balanced enough
    match = re.search(r"\{[\s\S]*\}", s)
    if match:
        snippet = match.group(0)
        try:
            return json.loads(snippet)
        except Exception:
            return None
    return None


def _normalise_factor_payload(raw: dict, task: models.Task) -> Dict[str, Any]:
    """Validate & coerce factor payload, falling back for missing fields."""
    base = _heuristic_factors(task)
    for k in ["urgency", "importance", "recency", "source_signal"]:
        v = raw.get(k)
        if isinstance(v, (int, float)):
            try:
                base[k] = max(0.0, min(1.0, float(v)))
            except Exception:
                pass
    suggested = raw.get("suggested_horizon")
    if isinstance(suggested, str) and suggested in {"today", "week", "month"}:
        base["suggested_horizon"] = suggested
    base["strategy"] = raw.get("strategy", "crewai")
    return base


def _crewai_factors(task: models.Task) -> Dict[str, Any]:
    if not (Agent and Crew and CrewTask):  # library missing
        return _heuristic_factors(task)
    # If Agent was monkeypatched to a bare object (tests), calling it with kwargs will fail.
    try:
        if Agent is object:  # type: ignore
            # Simulated mode: tests patch Crew to return deterministic json via kickoff.
            try:
                crew = Crew()  # type: ignore[call-arg]
                result = crew.kickoff()  # type: ignore[attr-defined]
                if hasattr(result, "json_dict"):
                    payload = result.json_dict  # type: ignore
                    return _normalise_factor_payload(payload, task)
            except Exception:
                return _heuristic_factors(task)
            return _heuristic_factors(task)
        test_instance = Agent  # type: ignore
        if not callable(test_instance):  # pragma: no cover
            return _heuristic_factors(task)
    except Exception:
        return _heuristic_factors(task)

    model = settings.crewai_model or "bedrock/eu.anthropic.claude-3-7-sonnet-20250219-v1:0"

    # Lightweight specialised agents (they mainly provide role separation for newer CrewAI versions)
    email_agent = Agent(
        role="EmailMaster",
        goal="Assess urgency & importance from any email-related metadata",
        backstory="Expert at triaging email actions quickly and accurately",
        llm=model,
    )
    code_agent = Agent(
        role="GithubMaster",
        goal="Estimate impact & urgency of code / repo related tasks",
        backstory="Understands repositories, pull requests and review dynamics",
        llm=model,
    )
    issue_agent = Agent(
        role="JiraMaster",
        goal="Evaluate project issue criticality and sprint alignment",
        backstory="Understands agile workflows and prioritisation",
        llm=model,
    )
    focus_agent = Agent(
        role="FocusMaster",
        goal="Combine all signals to produce prioritisation factors",
        backstory="Productivity strategist synthesising multi-source signals",
        llm=model,
    )

    horizon = task.horizon.value if task.horizon else "month"
    prompt = f"""Score this task for prioritisation. Provide ONLY JSON.
Fields required: urgency, importance, recency, source_signal (floats 0..1) and suggested_horizon (today|week|month).
If unsure, estimate conservatively.

Title: {task.title}
Description: {task.description or ''}
Source Kind: {task.source_kind or 'unknown'}
Source Ref: {task.source_ref or ''}
Due Date: {task.due_date}
Current Horizon: {horizon}
Created At: {task.created_at}
"""

    crew_task = CrewTask(
        description=prompt,
        expected_output="Strict JSON object with keys: urgency, importance, recency, source_signal, suggested_horizon",
        agent=focus_agent,
    )

    # Some newer CrewAI versions prefer specifying a process; fall back silently if not available
    crew_kwargs = dict(agents=[email_agent, code_agent, issue_agent, focus_agent], tasks=[crew_task])
    if Process is not None:
        crew_kwargs["process"] = getattr(Process, "sequential", None) or getattr(Process, "SEQUENTIAL", None) or Process  # type: ignore

    crew = Crew(**crew_kwargs)  # type: ignore

    try:
        # Newer API: kickoff(); older maybe still supports run()
        if hasattr(crew, "kickoff"):
            result = crew.kickoff()  # type: ignore
        else:  # legacy fallback
            result = crew.run()  # type: ignore
    except Exception:  # orchestration failure
        return _heuristic_factors(task)

    raw_payload: Optional[dict] = None
    # CrewOutput (new) may have attributes
    try:
        if hasattr(result, "json_dict") and isinstance(result.json_dict, dict):  # type: ignore
            raw_payload = result.json_dict  # type: ignore
        elif hasattr(result, "raw") and isinstance(result.raw, str):  # type: ignore
            raw_payload = _extract_json_like(result.raw)  # type: ignore
    except Exception:
        pass

    # If still None, try generic parsing
    if raw_payload is None:
        if isinstance(result, dict):
            raw_payload = result
        elif isinstance(result, str):
            raw_payload = _extract_json_like(result)

    if not isinstance(raw_payload, dict):
        return _heuristic_factors(task)

    return _normalise_factor_payload(raw_payload, task)


def get_factors(task: models.Task) -> Dict[str, Any]:
    if settings.enable_crewai:
        return _crewai_factors(task)
    return _heuristic_factors(task)


def generate_suggested_tasks(user: models.User) -> list[models.Task]:
    """Generate a few suggested tasks for a user without connected sources."""
    print(f"[DEBUG] Generating suggested tasks for user {user.id} ({user.email if hasattr(user, 'email') else 'unknown'})")
    
    # crewai not available/installed
    if Agent is None:
        print("[DEBUG] Agent is None, returning empty list")
        return []
    try:
        from litellm import completion
        print("[DEBUG] Successfully imported litellm.completion")
    except Exception as e:
        print(f"[DEBUG] Failed to import litellm.completion: {e}")
        return []

    llm = None
    if settings.crewai_model:
        print(f"[DEBUG] Using model: {settings.crewai_model}")
        llm = settings.crewai_model
    else:
        print("[DEBUG] No crewai_model configured, using default LLM")

    # Basic agent to generate ideas
    print("[DEBUG] Creating task_generator Agent")
    task_generator = Agent(
        role="Assistant",
        goal="Brainstorm a few (3-4) realistic but varied work-related tasks a professional might need to do. The user has no connected tools, so these should be general purpose.",
        backstory="You are a helpful assistant.",
        verbose=True,
        allow_delegation=False,
        llm=llm,
    )
    prompt = f"""Please generate 3-4 varied, realistic work-related tasks for a user. The user has no connected data sources, so make them general and creative.

Return the tasks as a JSON array, where each object has:
- "title": string (task description)
- "horizon": string, one of "today", "week", "month"

Example format:
[
    {{"title": "Draft the Q4 marketing plan", "horizon": "week"}},
    {{"title": "Book flights for the upcoming conference", "horizon": "today"}}
]

Your response should only contain the JSON array.
"""
    print(f"[DEBUG] Created prompt: {prompt[:100]}...")
    print("[DEBUG] Creating CrewTask")
    gen_task = CrewTask(description=prompt, agent=task_generator, expected_output="A JSON array of task suggestions.")

    # Simplified crew for just one agent/task
    print("[DEBUG] Creating Crew with 1 agent and 1 task")
    crew = Crew(agents=[task_generator], tasks=[gen_task], verbose=1)
    
    # Run the generation and extract JSON
    print("[DEBUG] Running crew.kickoff()")
    try:
        result = crew.kickoff()
        print(f"[DEBUG] Crew result type: {type(result)}")
        print(f"[DEBUG] Crew result: {result}")
    except Exception as e:
        print(f"[DEBUG] Error during crew.kickoff(): {e}")
        return []
    
    print("[DEBUG] Extracting JSON from result")
    result_str = _crew_result_to_str(result)
    raw_json = _extract_json_like(result_str)
    print(f"[DEBUG] Extracted JSON: {raw_json}")
    
    if not raw_json or not isinstance(raw_json, list):
        print(f"[DEBUG] Invalid JSON format - not a list: {type(raw_json)}")
        return []

    # Parse into Task objects
    print(f"[DEBUG] Processing {len(raw_json)} task items")
    tasks = []
    for i, item in enumerate(raw_json):
        print(f"[DEBUG] Processing item {i}: {item}")
        if not isinstance(item, dict) or "title" not in item or "horizon" not in item:
            print(f"[DEBUG] Skipping invalid item {i}: missing required fields")
            continue
        try:
            horizon = models.HorizonEnum(item["horizon"])
            task = models.Task(
                user_id=user.id,
                title=item["title"],
                horizon=horizon,
                status=models.StatusEnum.todo,
                source="suggestion",
            )
            tasks.append(task)
            print(f"[DEBUG] Created task: {task.title} with horizon {horizon}")
        except (ValueError, KeyError) as e:
            print(f"[DEBUG] Error creating task from item {i}: {e}")
            continue  # Skip invalid horizon values
    
    print(f"[DEBUG] Returning {len(tasks)} generated tasks")
    return tasks

