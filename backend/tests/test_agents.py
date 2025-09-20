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
