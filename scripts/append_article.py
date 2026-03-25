#!/usr/bin/env python3
"""
Append a new article to the daily JSON knowledge base.
Usage: python3 append_article.py <title> <summary> [tag1,tag2,...]
"""
import json
import sys
import os
from datetime import datetime

DATA_DIR = "/tmp/oren_github/docs/knowledges/data"

def get_today():
    return datetime.now().strftime("%Y%m%d")

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 append_article.py <title> <summary> [tag1,tag2,...]")
        sys.exit(1)

    title = sys.argv[1]
    summary = sys.argv[2]
    tags = sys.argv[3].split(",") if len(sys.argv) > 3 else []

    today = get_today()
    filepath = os.path.join(DATA_DIR, f"{today}.json")

    # Read existing or start fresh
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        data = []

    # Check for duplicate title
    existing_titles = {item.get('title', '') for item in data}
    if title in existing_titles:
        print(f"Duplicate: '{title}' already exists, skipping.")
        sys.exit(0)

    # Append new article
    new_item = {
        "title": title,
        "summary": summary,
        "tags": tags
    }
    data.append(new_item)

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"OK: appended '{title}' to {filepath} ({len(data)} total)")

if __name__ == "__main__":
    main()
