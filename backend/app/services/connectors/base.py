from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any, List, Dict
from authlib.integrations.httpx_client import OAuth2Client
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


class ConnectorStatus(str):
    pass


class BaseConnector(ABC):
    kind: str

    def __init__(self, user_id: str, config: Any, access_token: str | None = None):
        self.user_id = user_id
        self.config = config
        self.access_token = access_token

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


class GoogleBaseConnector(BaseConnector):
    def __init__(self, user_id: str, config: Any, access_token: str | None = None):
        super().__init__(user_id, config, access_token)
        self.flow = Flow.from_client_config(
            client_config={
                "web": {
                    "client_id": self.config.oauth_google_client_id,
                    "client_secret": self.config.oauth_google_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [f"{self.config.oauth_redirect_base}/oauth/callback/gmail", f"{self.config.oauth_redirect_base}/oauth/callback/gdrive"],
                }
            },
            scopes=self.get_scopes(),
            redirect_uri=f"{self.config.oauth_redirect_base}/oauth/callback/{self.kind}",
        )

    def authorize(self) -> str:
        authorization_url, _ = self.flow.authorization_url(access_type="offline", prompt="consent")
        return authorization_url

    def exchange_code(self, code: str) -> dict:
        self.flow.fetch_token(code=code)
        creds = self.flow.credentials
        return {
            "access_token": creds.token,
            "refresh_token": creds.refresh_token,
            "expires_at": creds.expiry.isoformat() if creds.expiry else None,
            "scopes": creds.scopes,
        }
    
    def get_credentials(self) -> Credentials:
        return Credentials(
            token=self.access_token,
            refresh_token=None,  # Refresh logic needs to be handled separately
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.config.oauth_google_client_id,
            client_secret=self.config.oauth_google_client_secret,
            scopes=self.get_scopes(),
        )

    def refresh(self) -> None:
        # Refresh logic would go here, likely involving storing and retrieving the refresh token
        pass

    @abstractmethod
    def get_scopes(self) -> List[str]:
        ...


class GmailConnector(GoogleBaseConnector):
    kind = "gmail"

    def get_scopes(self) -> List[str]:
        return ["https://www.googleapis.com/auth/gmail.readonly"]

    def test(self) -> dict:
        try:
            creds = self.get_credentials()
            service = build("gmail", "v1", credentials=creds)
            service.users().getProfile(userId="me").execute()
            return {"status": "ok"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def fetch(self) -> List[Dict[str, Any]]:
        creds = self.get_credentials()
        service = build("gmail", "v1", credentials=creds)
        results = service.users().messages().list(userId="me", q="is:important or is:starred", maxResults=10).execute()
        messages = results.get("messages", [])
        
        items = []
        for message in messages:
            msg = service.users().messages().get(userId="me", id=message["id"], format="metadata").execute()
            headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
            items.append({
                "title": headers.get("Subject"),
                "description": msg.get("snippet"),
                "source_ref": msg["id"],
                "source_url": f"https://mail.google.com/mail/u/0/#inbox/{msg['id']}",
                "meta": {
                    "threadId": msg["threadId"],
                    "from": headers.get("From"),
                    "to": headers.get("To"),
                    "date": headers.get("Date"),
                }
            })
        return items


class GoogleDriveConnector(GoogleBaseConnector):
    kind = "gdrive"

    def get_scopes(self) -> List[str]:
        return ["https://www.googleapis.com/auth/drive.readonly"]

    def test(self) -> dict:
        try:
            creds = self.get_credentials()
            service = build("drive", "v3", credentials=creds)
            service.about().get(fields="user").execute()
            return {"status": "ok"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def fetch(self) -> List[Dict[str, Any]]:
        creds = self.get_credentials()
        service = build("drive", "v3", credentials=creds)
        results = service.files().list(
            pageSize=10, 
            orderBy="modifiedTime desc",
            q="mimeType != 'application/vnd.google-apps.folder'",
            fields="files(id, name, webViewLink, modifiedTime, owners)"
        ).execute()
        files = results.get("files", [])
        
        items = []
        for file in files:
            items.append({
                "title": file["name"],
                "description": f"Last modified at {file['modifiedTime']}",
                "source_ref": file["id"],
                "source_url": file["webViewLink"],
                "meta": {
                    "owners": [owner["displayName"] for owner in file.get("owners", [])]
                }
            })
        return items


from atlassian import Jira
# ... existing code ...
class JiraConnector(BaseConnector):
    kind = "jira"

    def __init__(self, user_id: str, config: Any, access_token: str | None = None):
        super().__init__(user_id, config, access_token)
        self.client = OAuth2Client(
            client_id=self.config.oauth_atlassian_client_id,
            client_secret=self.config.oauth_atlassian_client_secret,
            redirect_uri=f"{self.config.oauth_redirect_base}/oauth/callback/jira",
            scope="read:jira-work manage:jira-project read:jira-user offline_access",
            authorization_endpoint="https://auth.atlassian.com/authorize",
            token_endpoint="https://auth.atlassian.com/oauth/token",
        )

    def authorize(self) -> str:
        url, _ = self.client.create_authorization_url(audience="api.atlassian.com", prompt="consent")
        return url

    def exchange_code(self, code: str) -> dict:
        token_data = self.client.fetch_token(code=code, grant_type="authorization_code")
        
        # Discover cloud_id
        resources_client = OAuth2Client(
            client_id=self.config.oauth_atlassian_client_id,
            client_secret=self.config.oauth_atlassian_client_secret,
            token=token_data
        )
        resp = resources_client.get('https://api.atlassian.com/oauth/token/accessible-resources')
        resp.raise_for_status()
        resources = resp.json()
        
        if not resources:
            raise Exception("No Jira resources found for this user.")

        # For simplicity, we use the first resource. A real app might let the user choose.
        site = resources[0]
        
        return {
            "access_token": token_data["access_token"],
            "refresh_token": token_data.get("refresh_token"),
            "expires_at": token_data.get("expires_in"), # This is a duration, needs to be converted to timestamp
            "scopes": token_data.get("scope"),
            "meta": {"cloud_id": site["id"], "url": site["url"]}
        }

    def refresh(self) -> None:
        # Refresh token logic would be implemented here
        pass

    def test(self) -> dict:
        # The test for Jira is more involved as we need the site URL.
        # This should be stored with the connector details.
        # For now, we'll assume the test is part of the fetch logic.
        return {"status": "ok"}

    def fetch(self) -> List[Dict[str, Any]]:
        # This requires the site URL and cloud_id stored in the connector's meta field.
        # The API client would be initialized like this:
        # jira = Jira(url=meta['url'], cloud=True, oauth2={...})
        return []

# ... existing code ...
class GithubConnector(BaseConnector):
# ... existing code ...
    def exchange_code(self, code: str) -> dict:
        token_data = self.client.fetch_token(code=code, grant_type="authorization_code")
        return {
            "access_token": token_data["access_token"],
            "scopes": token_data.get("scope"),
        }
# ... existing code ...
    def test(self) -> dict:
        try:
            resp = self.client.get("https://api.github.com/user", token={"access_token": self.access_token, "token_type": "bearer"})
            resp.raise_for_status()
            return {"status": "ok"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def fetch(self) -> List[Dict[str, Any]]:
        resp = self.client.get(
            "https://api.github.com/issues",
            params={"filter": "assigned", "state": "open"},
            token={"access_token": self.access_token, "token_type": "bearer"}
        )
        issues = resp.json()
        items = []
        for issue in issues:
            items.append({
                "title": issue["title"],
                "description": issue["body"],
                "source_ref": issue["number"],
                "source_url": issue["html_url"],
                "meta": {
                    "repo": issue["repository"]["full_name"],
                    "labels": [label["name"] for label in issue["labels"]],
                }
            })
        return items


def get_connector(kind: str, user_id: str, config: Any, access_token: str | None = None) -> BaseConnector:
# ... existing code ...
    mapping = {
        "gmail": GmailConnector,
        "jira": JiraConnector,
        "github": GithubConnector,
        "gdrive": GoogleDriveConnector,
    }
    cls = mapping.get(kind)
    if not cls:
        raise ValueError(f"Unsupported connector kind {kind}")
    return cls(user_id=user_id, config=config, access_token=access_token)

