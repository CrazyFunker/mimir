from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, field_validator
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    environment: str = "dev"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    db_url: str
    redis_url: str
    chroma_host: str | None = None
    chroma_path: str | None = None

    # LLM / embedding provider configuration
    litellm_provider: str | None = None
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str | None = None
    aws_bedrock_role: str | None = None  # IAM role to assume for Bedrock (e.g., devops-ai-developer)

    # OAuth client settings (placeholders for now)
    oauth_redirect_base: str | None = None
    oauth_google_client_id: str | None = None
    oauth_google_client_secret: str | None = None
    oauth_github_client_id: str | None = None
    oauth_github_client_secret: str | None = None
    oauth_atlassian_client_id: str | None = None
    oauth_atlassian_client_secret: str | None = None

    encryption_key: str
    allowed_cors_origins: List[AnyHttpUrl] | List[str] = ["http://localhost:3000"]
    dev_user_id: str = "00000000-0000-0000-0000-000000000001"

    @field_validator("allowed_cors_origins", mode="before")
    @classmethod
    def split_csv(cls, v):  # type: ignore
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[arg-type]


settings = get_settings()
