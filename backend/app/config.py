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
