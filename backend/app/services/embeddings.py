from __future__ import annotations
from typing import List, Dict, Any
import chromadb  # type: ignore
from chromadb.utils import embedding_functions  # type: ignore
from app.config import settings
from litellm import embedding as litellm_embedding  # type: ignore
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


def _default_embedding_fn():
    return embedding_functions.DefaultEmbeddingFunction()


def _bedrock_embed(texts: List[str]) -> List[List[float]]:
    # Use litellm to call bedrock embedding model; model name can be configured via litellm_provider or separate var
    # Expect settings.litellm_provider like "bedrock/amazon.titan-embed-text-v2"
    model = settings.litellm_provider.split("/", 1)[1] if settings.litellm_provider and "/" in settings.litellm_provider else "amazon.titan-embed-text-v2"
    resp = litellm_embedding(model=model, input=texts)  # type: ignore
    # litellm embedding responses unify into 'data' list with 'embedding'
    vectors: List[List[float]] = [d["embedding"] for d in resp["data"]]  # type: ignore
    return vectors


def embed_texts(texts: List[str], metadatas: List[Dict[str, Any]], ids: List[str]) -> list[str]:
    """Embed a list of texts for a single user and source-kind context.

    metadatas requires: user_id, kind in each item
    """
    if not texts:
        return []
    user_id = metadatas[0].get("user_id")
    if not user_id:
        raise ValueError("user_id required in meta for embedding")
    col = ensure_collection(user_id)
    provider = settings.litellm_provider or ""
    vectors: List[List[float]]
    meta_provider = None
    if provider.startswith("bedrock"):
        try:
            vectors = _bedrock_embed(texts)
            meta_provider = provider
        except Exception:
            # fallback
            emb_fn = _default_embedding_fn()
            vectors = emb_fn(texts)  # type: ignore
            meta_provider = "fallback_default"
    else:
        emb_fn = _default_embedding_fn()
        vectors = emb_fn(texts)  # type: ignore
        meta_provider = provider or "default"
    
    # add provider to each metadata dict
    for m in metadatas:
        m["provider"] = meta_provider

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

