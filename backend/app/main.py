from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import health, tasks, graph, connectors, oauth, dev
import uvicorn, time, uuid, json, logging
from prometheus_fastapi_instrumentator import Instrumentator

logger = logging.getLogger("mimir")
logging.basicConfig(level=logging.INFO, format='%(message)s')

app = FastAPI(title="Mimir API", version="0.1.0")

# Add Prometheus metrics
Instrumentator().instrument(app).expose(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(health.router, prefix="")
app.include_router(tasks.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(connectors.router, prefix="/api")
app.include_router(oauth.router, prefix="/api")
app.include_router(dev.router, prefix="/api")


@app.middleware("http")
async def add_request_id_logging(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start = time.time()
    response = None
    try:
        response = await call_next(request)
        return response
    finally:
        duration = (time.time() - start) * 1000
        log = {
            "ts": time.time(),
            "request_id": req_id,
            "method": request.method,
            "path": request.url.path,
            "status": getattr(response, 'status_code', 500),
            "duration_ms": round(duration, 2),
        }
        logger.info(json.dumps(log))


@app.get("/")
def root():
    return {"service": "mimir", "status": "ok"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.api_host, port=settings.api_port, reload=True)
