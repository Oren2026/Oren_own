#!/usr/bin/env python3
"""
Generate embeddings for articles using Ollama API (nomic-embed-text)
Usage: python3 generate.py [article_json]
"""

import json
import sys
import os
import requests
from datetime import datetime

OLLAMA_URL = "http://localhost:11434/api/embed"
MODEL = "nomic-embed-text"
STORE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_embedding(text: str) -> list:
    """Get embedding vector from Ollama"""
    try:
        response = requests.post(
            OLLAMA_URL,
            json={"model": MODEL, "input": text},
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        return data.get("embeddings", [[]])[0] if data.get("embeddings") else []
    except Exception as e:
        print(f"Error getting embedding: {e}")
        return []

def load_articles(json_path: str) -> list:
    """Load articles from JSON file"""
    with open(json_path, 'r') as f:
        return json.load(f)

def save_embeddings(article_id: str, title: str, text: str, embedding: list, date: str):
    """Save embedding to store file"""
    store_file = os.path.join(STORE_DIR, f"{date}.json")
    
    if os.path.exists(store_file):
        with open(store_file, 'r') as f:
            store = json.load(f)
    else:
        store = {"articles": [], "updated": date}
    
    # Check if already exists
    for item in store["articles"]:
        if item["id"] == article_id:
            print(f"Article {article_id} already embedded, skipping")
            return
    
    # Add new embedding
    store["articles"].append({
        "id": article_id,
        "title": title,
        "text": text,  # Full text for reference
        "embedding": embedding,
        "embedded_at": datetime.now().isoformat()
    })
    store["updated"] = datetime.now().strftime("%Y-%m-%d")
    
    with open(store_file, 'w') as f:
        json.dump(store, f, ensure_ascii=False, indent=2)
    
    print(f"Saved embedding for article {article_id}: {title[:30]}...")

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 generate.py <article_json_file>")
        print("Example: python3 generate.py /tmp/oren_github/docs/data/20260323.json")
        sys.exit(1)
    
    json_path = sys.argv[1]
    articles = load_articles(json_path)
    
    # Get date from filename (e.g., 20260323)
    date = os.path.basename(json_path).replace(".json", "")
    
    if isinstance(articles, dict):
        article_list = articles.get("articles", [])
    else:
        article_list = articles
    
    print(f"Found {len(article_list)} articles in {json_path}")
    
    for article in article_list:
        article_id = article.get("id", "")
        title = article.get("title", "")
        summary = article.get("summary", "")
        
        # Combine title + summary for embedding
        text = f"{title}. {summary}"
        
        print(f"Generating embedding for {article_id}: {title[:30]}...")
        
        embedding = get_embedding(text)
        
        if embedding:
            save_embeddings(article_id, title, text, embedding, date)
        else:
            print(f"Failed to get embedding for {article_id}")
    
    print("Done!")

if __name__ == "__main__":
    main()
