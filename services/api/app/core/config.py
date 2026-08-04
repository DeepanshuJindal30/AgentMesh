"""Application settings — free/local defaults, no paid services required."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Map env vars explicitly for Docker
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    environment: str = "development"
    service_name: str = "api"
    log_level: str = "INFO"

    database_url: str = (
        "postgresql+asyncpg://agentmesh:agentmesh_dev_password@localhost:5432/agentmesh"
    )

    redis_url: str = "redis://localhost:6379/0"
    rabbitmq_url: str = "amqp://agentmesh:agentmesh_dev_password@localhost:5672//"
    celery_broker_url: str = "amqp://agentmesh:agentmesh_dev_password@localhost:5672//"

    api_cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    keycloak_url: str = "http://localhost:8080"
    keycloak_realm: str = "agentmesh"
    keycloak_client_id: str = "agentmesh-web"
    jwt_audience: str = "account"
    auth_dev_bypass: bool = True

    runtime_grpc_host: str = "localhost"
    runtime_grpc_port: int = 50051

    @property
    def keycloak_issuer(self) -> str:
        return f"{self.keycloak_url}/realms/{self.keycloak_realm}"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
