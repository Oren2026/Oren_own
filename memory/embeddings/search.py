#!/usr/bin/env python3
"""
Find similar articles using cosine similarity
Usage: python3 search.py "your question or topic"
"""

import json
import sys
import os
import math

STORE_DIR = os.path.dirname(os.path.abspath(__file__))

def cosine_similarity(a: list, b: list) -> float:
    """Calculate cosine similarity between two vectors"""
    dot_product = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    
    if norm_a == 0 or norm_b == 0:
        return 0
    
    return dot_product / (norm_a * norm_b)

def load_all_embeddings() -> list:
    """Load all embeddings from store files"""
    articles = []
    
    if not os.path.exists(STORE_DIR):
        return articles
    
    for filename in os.listdir(STORE_DIR):
        if filename.endswith(".json") and filename != "README.md":
            filepath = os.path.join(STORE_DIR, filename)
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    articles.extend(data.get("articles", []))
            except Exception as e:
                print(f"Error loading {filename}: {e}")
    
    return articles

def find_similar(query: str, articles: list, top_k: int = 5) -> list:
    """
    Find similar articles using simple keyword matching + embedding similarity
    For now, use keyword matching since we don't have query embedding
    """
    # Simple keyword-based scoring
    query_words = set(query.lower().split())
    
    scored = []
    for article in articles:
        title = article.get("title", "").lower()
        text = article.get("text", "").lower()
        
        # Count keyword matches
        matches = sum(1 for word in query_words if word in title or word in text)
        
        if matches > 0:
            scored.append({
                "id": article.get("id"),
                "title": article.get("title"),
                "text": article.get("text"),
                "score": matches / len(query_words),  # Normalize by query length
                "embedded_at": article.get("embedded_at")
            })
    
    # Sort by score
    scored.sort(key=lambda x: x["score"], reverse=True)
    
    return scored[:top_k]

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 search.py \"your question or topic\" [top_k]")
        print("Example: python3 search.py \"氫能源最新發展\" 5")
        sys.exit(1)
    
    query = sys.argv[1]
    top_k = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    
    print(f"Searching for: {query}")
    print(f"Top {top_k} results:\n")
    
    articles = load_all_embeddings()
    
    if not articles:
        print("No embeddings found. Run generate.py first!")
        sys.exit(1)
    
    print(f"Loaded {len(articles)} articles from embedding store\n")
    
    results = find_similar(query, articles, top_k)
    
    if not results:
        print("No similar articles found.")
        sys.exit(0)
    
    for i, result in enumerate(results, 1):
        print(f"{i}. {result['title']}")
        print(f"   Score: {result['score']:.2f}")
        print(f"   ID: {result['id']}")
        print()

if __name__ == "__main__":
    main()
