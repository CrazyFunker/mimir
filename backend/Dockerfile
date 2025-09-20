FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends build-essential curl git && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml /app/

# Install uv and resolve dependencies
ENV PATH="/root/.local/bin:${PATH}"
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    uv pip compile pyproject.toml -o requirements.lock && \
    uv pip install --system -r requirements.lock

COPY . /app

EXPOSE 8000

CMD ["python", "-m", "app.main"]
