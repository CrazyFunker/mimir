from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any, List, Dict


class ConnectorStatus(str):
    pass


class BaseConnector(ABC):
    kind: str

    def __init__(self, user_id: str, config: Any):
        self.user_id = user_id
        self.config = config

    @abstractmethod
    def authorize(self) -> str:  # return URL
        ...

    @abstractmethod
    def exchange_code(self, code: str) -> dict:
        ...

    @abstractmethod
    def refresh(self) -> None:
        ...

    @abstractmethod
    def test(self) -> dict:
        ...

    @abstractmethod
    def fetch(self) -> List[Dict[str, Any]]:
        ...


def get_connector(kind: str, user_id: str, config: Any) -> BaseConnector:
    mapping = {
        "gmail": GmailConnector,
        "jira": JiraConnector,
        "github": GithubConnector,
        "gdrive": GoogleDriveConnector,
    }
    cls = mapping.get(kind)
    if not cls:
        raise ValueError(f"Unsupported connector kind {kind}")
    return cls(user_id=user_id, config=config)


class GmailConnector(BaseConnector):
    kind = "gmail"

    def authorize(self) -> str: return "https://example.com/oauth/google"
    def exchange_code(self, code: str) -> dict: return {"access_token": "stub"}
    def refresh(self) -> None: return None
    def test(self) -> dict: return {"status": "ok"}
    def fetch(self) -> List[Dict[str, Any]]: return []


class JiraConnector(BaseConnector):
    kind = "jira"
    def authorize(self) -> str: return "https://example.com/oauth/atlassian"
    def exchange_code(self, code: str) -> dict: return {"access_token": "stub"}
    def refresh(self) -> None: return None
    def test(self) -> dict: return {"status": "ok"}
    def fetch(self) -> List[Dict[str, Any]]: return []


class GithubConnector(BaseConnector):
    kind = "github"
    def authorize(self) -> str: return "https://example.com/oauth/github"
    def exchange_code(self, code: str) -> dict: return {"access_token": "stub"}
    def refresh(self) -> None: return None
    def test(self) -> dict: return {"status": "ok"}
    def fetch(self) -> List[Dict[str, Any]]: return []


class GoogleDriveConnector(BaseConnector):
    kind = "gdrive"
    def authorize(self) -> str: return "https://example.com/oauth/google"
    def exchange_code(self, code: str) -> dict: return {"access_token": "stub"}
    def refresh(self) -> None: return None
    def test(self) -> dict: return {"status": "ok"}
    def fetch(self) -> List[Dict[str, Any]]: return []
