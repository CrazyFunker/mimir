from fastapi import APIRouter

router = APIRouter(prefix="/oauth", tags=["oauth"])


@router.get("/callback/{kind}")
def oauth_callback(kind: str, code: str | None = None):
    return {"status": "ok", "kind": kind, "code": code}
