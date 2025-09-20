from __future__ import annotations
from typing import List, Dict, Any
import chromadb  # type: ignore
from chromadb.utils import embedding_functions  # type: ignore
from app.config import settings
import uuid

_client = None


def get_client():
    global _client
    if _client is not None:
        return _client
    if settings.chroma_path:
        _client = chromadb.PersistentClient(path=settings.chroma_path)  # type: ignore[attr-defined]
    else:
        # In-memory fallback
        _client = chromadb.Client()  # type: ignore
    return _client


def _collection_name(user_id: str) -> str:
    return f"user_{user_id}".replace("-", "")


def ensure_collection(user_id: str):
    client = get_client()
    name = _collection_name(user_id)
    try:
        col = client.get_collection(name)
    except Exception:
        col = client.create_collection(name)
    return col


def _get_embedding_fn():
    # Placeholder: use sentence-transformers default from chromadb if litellm not configured
    if settings.litellm_provider:
        # For now just fallback; real integration would call litellm embedding endpoint
        pass
    return embedding_functions.DefaultEmbeddingFunction()


def embed_texts(texts: List[str], meta: Dict[str, Any]) -> list[str]:
    """Embed a list of texts for a single user and source-kind context.

    meta requires: user_id, kind
    """
    user_id = meta.get("user_id")
    if not user_id:
        raise ValueError("user_id required in meta for embedding")
    col = ensure_collection(user_id)
    emb_fn = _get_embedding_fn()
    vectors = emb_fn(texts)  # type: ignore
    ids = [str(uuid.uuid4()) for _ in texts]
    metadatas = [{"kind": meta.get("kind"), "source": meta.get("source"), "version": 1}] * len(texts)
    col.add(ids=ids, documents=texts, embeddings=vectors, metadatas=metadatas)
    return ids


def find_similar(user_id: str, text: str, top_k: int = 3) -> List[Dict[str, Any]]:
    col = ensure_collection(user_id)
    try:
        res = col.query(query_texts=[text], n_results=top_k)
        out: List[Dict[str, Any]] = []
        for i in range(len(res.get("ids", [[]])[0])):
            out.append({
                "id": res["ids"][0][i],
                "distance": res.get("distances", [[None]])[0][i],
                "metadata": res.get("metadatas", [[{}]])[0][i],
            })
        return out
    except Exception:
        return []

