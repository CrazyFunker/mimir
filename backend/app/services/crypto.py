from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os, base64
from app.config import settings


def _get_key() -> bytes:
    # Expect base64 32 bytes
    raw = settings.encryption_key
    try:
        key = base64.b64decode(raw)
    except Exception:
        # derive from raw string (NOT for production, dev fallback)
        key = (raw * 2).encode()[:32]
    if len(key) not in (16, 24, 32):
        key = (key + b"0" * 32)[:32]
    return key


def encrypt(plaintext: str) -> str:
    key = _get_key()
    aes = AESGCM(key)
    nonce = os.urandom(12)
    ct = aes.encrypt(nonce, plaintext.encode(), None)
    return base64.b64encode(nonce + ct).decode()


def decrypt(token: str) -> str:
    data = base64.b64decode(token)
    nonce, ct = data[:12], data[12:]
    aes = AESGCM(_get_key())
    pt = aes.decrypt(nonce, ct, None)
    return pt.decode()


def decrypt_token(token: str) -> dict:
    import json
    decrypted_str = decrypt(token)
    return json.loads(decrypted_str)
