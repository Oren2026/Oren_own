#!/usr/bin/env python3
"""
Find related articles across domains using embeddings
Stores results in docs/related-articles.json
"""

import json
import os
import math
import sys

def cosine_similarity(a, b):
    """Calculate cosine similarity between two vectors"""
    if not a or not b:
        return 0.0
    dot_product = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

def load_all_articles():
    """Load all articles from JSON files"""
    articles = []
    data_dir = "/tmp/oren_github/docs/data"
    
    for filename in os.listdir(data_dir):
        if filename.endswith(".json") and filename != "related-articles.json":
            filepath = os.path.join(data_dir, filename)
            with open(filepath, 'r') as f:
                data = json.load(f)
                if isinstance(data, dict) and "articles" in data:
                    articles.extend(data["articles"])
                elif isinstance(data, list):
                    articles.extend(data)
    
    return articles

def load_embeddings():
    """Load all embeddings"""
    embeddings = []
    emb_dir = os.path.expanduser("~/.openclaw/workspace/memory/embeddings")
    
    if not os.path.exists(emb_dir):
        return embeddings
    
    for filename in os.listdir(emb_dir):
        if filename.endswith(".json"):
            filepath = os.path.join(emb_dir, filename)
            with open(filepath, 'r') as f:
                try:
                    data = json.load(f)
                    if "articles" in data:
                        embeddings.extend(data["articles"])
                except:
                    pass
    
    return embeddings

def find_related(articles, embeddings, top_n=3):
    """Find related articles for each article"""
    results = {}
    
    for article in articles:
        article_id = article.get("id", "")
        if not article_id:
            continue
        
        # Find embedding for this article
        emb = None
        for e in embeddings:
            if e.get("id") == article_id:
                emb = e.get("embedding", [])
                break
        
        if not emb:
            continue
        
        # Calculate similarity with all other articles
        similarities = []
        for other in articles:
            other_id = other.get("id", "")
            if other_id == article_id:
                continue
            
            other_emb = None
            for e in embeddings:
                if e.get("id") == other_id:
                    other_emb = e.get("embedding", [])
                    break
            
            if not other_emb:
                continue
            
            sim = cosine_similarity(emb, other_emb)
            
            # Check if different domain (different primary tag)
            article_tags = set(article.get("tags", []))
            other_tags = set(other.get("tags", []))
            
            article_domain = list(article_tags)[0] if article_tags else ""
            other_domain = list(other_tags)[0] if other_tags else ""
            
            is_cross_domain = article_domain != other_domain
            
            similarities.append({
                "id": other_id,
                "title": other.get("title", ""),
                "tags": other.get("tags", []),
                "similarity": sim,
                "cross_domain": is_cross_domain,
                "time": other.get("time", ""),
                "date": other.get("date", "")
            })
        
        # Sort by similarity
        similarities.sort(key=lambda x: x["similarity"], reverse=True)
        
        # Get top cross-domain + top same-domain
        cross_domain = [s for s in similarities if s["cross_domain"]][:2]
        same_domain = [s for s in similarities if not s["cross_domain"] and s["similarity"] > 0.5][:1]
        
        related = cross_domain + same_domain
        related = sorted(related, key=lambda x: x["similarity"], reverse=True)[:top_n]
        
        if related:
            results[article_id] = related
    
    return results

def main():
    print("Loading articles...")
    articles = load_all_articles()
    print(f"Loaded {len(articles)} articles")
    
    print("Loading embeddings...")
    embeddings = load_embeddings()
    print(f"Loaded {len(embeddings)} embeddings")
    
    if not embeddings:
        print("No embeddings found. Run generate.py first!")
        sys.exit(1)
    
    print("Finding related articles...")
    related = find_related(articles, embeddings)
    print(f"Found related articles for {len(related)} articles")
    
    # Save to JSON
    output = {
        "updated": "2026-03-23",
        "total_articles_with_related": len(related),
        "related": related
    }
    
    output_path = "/tmp/oren_github/docs/related-articles.json"
    with open(output_path, 'w') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    main()
