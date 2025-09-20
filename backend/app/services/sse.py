from typing import Iterable
import json
import time


def sse_event(event: str | None = None, data: dict | str | None = None) -> str:
    payload = ""
    if event:
        payload += f"event: {event}\n"
    if data is not None:
        if isinstance(data, (dict, list)):
            payload += "data: " + json.dumps(data) + "\n"
        else:
            for line in str(data).splitlines():
                payload += f"data: {line}\n"
    return payload + "\n"


def demo_stream() -> Iterable[str]:
    for i in range(3):
        yield sse_event("progress", {"step": i})
        time.sleep(0.5)
    yield sse_event("done", {"status": "ok"})
