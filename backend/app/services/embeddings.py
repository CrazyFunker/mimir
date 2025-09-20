from typing import List, Dict


def embed_texts(texts: List[str], meta: List[Dict]) -> list[str]:
    # placeholder: returns fake vector ids
    return [f"vec_{i}" for i, _ in enumerate(texts)]
