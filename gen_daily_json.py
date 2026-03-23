#!/usr/bin/env python3
import json, re, os
from datetime import datetime, timezone

DAILY_DIR = "/Users/oren/.openclaw/workspace/daily"
OUTPUT_PATH = "/Users/oren/.openclaw/workspace/docs/data/20260323.json"

def parse_article(content):
    """Extract metadata from article content."""
    meta = {}
    lines = content.strip().split("\n")
    
    # Try frontmatter block (---...---)
    if content.strip().startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            fm_text = parts[1]
            for line in fm_text.strip().split("\n"):
                m = re.match(r"^(title|date|time|tags|summary|url|source|topic):\s*(.*)$", line.strip())
                if m:
                    key, val = m.group(1), m.group(2).strip()
                    if key == "tags":
                        meta[key] = re.findall(r'"([^"]+)"', val)
                    else:
                        meta[key] = val
            return meta
    
    # Try inline key: value at top (before first ##)
    for line in lines:
        line = line.strip()
        if line.startswith("##"):
            break
        m = re.match(r"^(title|date|time|tags|summary|url|source|topic):\s*(.*)$", line)
        if m:
            key, val = m.group(1), m.group(2).strip()
            if key == "tags":
                meta[key] = re.findall(r'"([^"]+)"', val)
            else:
                meta[key] = val
    
    # Try **key:** format inside ## 來源 section
    if not meta.get("title"):
        for line in lines:
            m = re.match(r"^\*\*title:\*\*\s*(.*)$", line.strip())
            if m:
                meta["title"] = m.group(1).strip()
                break
        for line in lines:
            m = re.match(r"^\*\*date:\*\*\s*(.*)$", line.strip())
            if m:
                meta["date"] = m.group(1).strip()
                break
        for line in lines:
            m = re.match(r"^\*\*site:\*\*\s*(.*)$", line.strip())
            if m:
                meta["source"] = m.group(1).strip()
                break
        for line in lines:
            m = re.match(r"^\*\*url:\*\*\s*(.*)$", line.strip())
            if m:
                meta["url"] = m.group(1).strip()
                break
    
    return meta

articles = []
for fname in sorted(os.listdir(DAILY_DIR)):
    if not fname.endswith(".md") or "NOTIFY" in fname:
        continue
    fpath = os.path.join(DAILY_DIR, fname)
    with open(fpath) as f:
        content = f.read()
    meta = parse_article(content)
    print(f"{fname}: title={meta.get('title', 'MISSING')}, time={meta.get('time', '')}")
    if meta.get("title"):
        art = {
            "title": meta["title"],
            "date": meta.get("date", "2026-03-23"),
            "time": meta.get("time", ""),
            "tags": meta.get("tags", []),
            "summary": meta.get("summary", ""),
        }
        if meta.get("url"):
            art["url"] = meta["url"]
        if meta.get("source"):
            art["source"] = meta["source"]
        if meta.get("topic"):
            art["topic"] = meta["topic"]
        articles.append(art)

now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
data = {
    "date": "2026-03-23",
    "lastUpdate": now_utc,
    "generated": now_utc,
    "articles": articles
}

with open(OUTPUT_PATH, "w") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"\nGenerated {len(articles)} articles → {OUTPUT_PATH}")