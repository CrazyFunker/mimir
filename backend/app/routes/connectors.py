from fastapi import APIRouter

router = APIRouter(prefix="/connectors", tags=["connectors"])


@router.get("")
def list_connectors():
    return {"connectors": []}


@router.post("/{kind}/connect")
def start_connect(kind: str):
    return {"url": f"https://example.com/oauth/{kind}"}


@router.post("/{kind}/test")
def test_connector(kind: str):
    return {"status": "ok"}
