import types
from app.services import agents
from app import models
from datetime import datetime, timezone, date

# Minimal Task model stand-in if needed (use actual models.Task if available)
class DummyTask:
    def __init__(self, **kwargs):
        self.title = kwargs.get("title", "Sample Task")
        self.description = kwargs.get("description", "Desc")
        self.source_kind = kwargs.get("source_kind", "github")
        self.source_ref = kwargs.get("source_ref", "123")
        self.due_date = kwargs.get("due_date", date.today())
        self.horizon = kwargs.get("horizon", models.HorizonEnum.week)
        self.created_at = kwargs.get("created_at", datetime.now(timezone.utc))


def test_extract_json_like_direct():
    payload = {"urgency": 0.9, "importance": 0.8}
    s = str(payload).replace("'", '"')
    parsed = agents._extract_json_like(s)
    assert parsed == payload


def test_extract_json_like_embedded():
    s = "Noise before {\n  \"urgency\": 0.5, \"importance\": 0.4\n} trailing text"
    parsed = agents._extract_json_like(s)
    assert parsed["urgency"] == 0.5
    assert parsed["importance"] == 0.4


def test_extract_json_like_array():
    """Test extraction of JSON arrays"""
    array = [{"title": "Task 1", "horizon": "today"}, {"title": "Task 2", "horizon": "week"}]
    s = str(array).replace("'", '"')
    parsed = agents._extract_json_like(s)
    assert isinstance(parsed, list)
    assert len(parsed) == 2
    assert parsed[0]["title"] == "Task 1"


def test_extract_json_like_array_with_markdown():
    """Test extraction of JSON arrays wrapped in markdown code fences"""
    s = """```json
[
    {
        "title": "Prepare presentation for client meeting",
        "description": "Create slides showcasing project progress",
        "horizon": "today"
    },
    {
        "title": "Conduct performance reviews",
        "description": "Schedule quarterly evaluations",
        "horizon": "week"
    }
]
```"""
    parsed = agents._extract_json_like(s)
    assert isinstance(parsed, list)
    assert len(parsed) == 2
    assert parsed[0]["title"] == "Prepare presentation for client meeting"
    assert parsed[1]["horizon"] == "week"


def test_extract_json_like_object_with_markdown():
    """Test extraction of JSON objects wrapped in markdown code fences"""
    s = """```json
{
    "urgency": 0.9,
    "importance": 0.8,
    "suggested_horizon": "today"
}
```"""
    parsed = agents._extract_json_like(s)
    assert isinstance(parsed, dict)
    assert parsed["urgency"] == 0.9
    assert parsed["suggested_horizon"] == "today"


def test_extract_json_like_array_embedded():
    """Test extraction of JSON arrays embedded in other text"""
    s = "Here are the tasks: [\n  {\"title\": \"Task 1\"},\n  {\"title\": \"Task 2\"}\n] end"
    parsed = agents._extract_json_like(s)
    assert isinstance(parsed, list)
    assert len(parsed) == 2


def test_extract_json_like_exact_log_scenario():
    """Test extraction matching the exact format from the worker logs"""
    # This is the exact format that was failing in the logs
    s = """```json
[
    {
        "title": "Prepare presentation for client meeting",
        "description": "Create slides showcasing project progress and next steps for tomorrow's stakeholder review.",
        "horizon": "today"
    },
    {
        "title": "Conduct performance reviews for team members",
        "description": "Schedule and complete quarterly performance evaluations with direct reports.",
        "horizon": "week"
    },
    {
        "title": "Research and propose new project management tools",
        "description": "Evaluate software options to improve team collaboration and workflow efficiency.",
        "horizon": "month"
    },
    {
        "title": "Update department budget forecast",
        "description": "Review current spending and adjust financial projections for the remainder of the fiscal year.",
        "horizon": "week"
    }
]
```"""
    parsed = agents._extract_json_like(s)
    assert parsed is not None, "Should successfully parse the JSON array"
    assert isinstance(parsed, list), "Should return a list"
    assert len(parsed) == 4, "Should contain 4 tasks"
    assert parsed[0]["title"] == "Prepare presentation for client meeting"
    assert parsed[0]["horizon"] == "today"
    assert parsed[3]["horizon"] == "week"


def test_get_factors_heuristic(monkeypatch):
    task = DummyTask()
    # Force disable crewai
    monkeypatch.setattr(agents.settings, "enable_crewai", False)
    factors = agents.get_factors(task)
    assert factors["strategy"] == "heuristic"
    for k in ["urgency", "importance", "recency", "source_signal"]:
        assert 0 <= factors[k] <= 1
    assert factors["suggested_horizon"] in {"today", "week", "month"}


def test_get_factors_crewai_mock(monkeypatch):
    task = DummyTask()
    # Enable crewai but patch internals to simulate output object
    monkeypatch.setattr(agents.settings, "enable_crewai", True)

    class MockCrewOutput:
        def __init__(self):
            self.json_dict = {
                "urgency": 0.7,
                "importance": 0.6,
                "recency": 0.5,
                "source_signal": 0.4,
                "suggested_horizon": "today",
            }

    class MockCrew:
        def kickoff(self):
            return MockCrewOutput()

    # Patch construction of Crew
    monkeypatch.setattr(agents, "Crew", lambda **kwargs: MockCrew())
    # Patch Agent & CrewTask to no-op simple callables if not present
    monkeypatch.setattr(agents, "Agent", object)
    monkeypatch.setattr(agents, "CrewTask", object)

    factors = agents.get_factors(task)
    assert factors["strategy"] == "crewai"
    assert factors["urgency"] == 0.7
    assert factors["suggested_horizon"] == "today"
