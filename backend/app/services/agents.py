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

    model = settings.crewai_model or "gpt-4o-mini"

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

