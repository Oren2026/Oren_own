#!/usr/bin/env python3
"""
早晨摘要系統 v2
每天早上根據昨天的文章，產生 3 個問題 + 洞察
並儲存到 docs/latest-summary.json 供網頁顯示
Usage: python3 morning_summary.py [date]  # date format: YYYYMMDD
"""

import json
import sys
import os
import requests
from datetime import datetime, timedelta

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3:latest"

def load_articles(date: str) -> list:
    """Load articles from JSON file"""
    json_path = f"/tmp/oren_github/docs/data/{date}.json"
    
    if not os.path.exists(json_path):
        print(f"No articles found for date: {date}")
        return []
    
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    if isinstance(data, dict):
        return data.get("articles", [])
    return data

def format_articles(articles: list) -> str:
    """Format articles for prompt"""
    formatted = []
    for a in articles:
        formatted.append(f"- [{a.get('time', '')}] {a.get('title', '')}: {a.get('summary', '')[:100]}")
    return "\n".join(formatted)

def generate_summary(articles: list) -> dict:
    """Generate morning summary using local LLM"""
    
    if not articles:
        return {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "questions": ["今天沒有文章可分析"],
            "insight": None
        }
    
    article_text = format_articles(articles)
    
    prompt = f"""你是一個好奇心驅動的思考者，專注於發現不同領域之間的連結。

以下是昨天的文章：

{article_text}

請根據這些文章，產生：

1. **3個問題**：你認為黑皮（一個對AI、能源、跨領域整合有興趣的工程系學生）可能會問的深度問題。不要問事實性問題，要問那種「如果...會怎樣」或「為什麼...」的問題。

2. **1個洞察**：找出兩篇看起來不相關但可能有連結的文章，說明它們可能的交集。

請用繁體中文回答。"""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.8,
                    "num_predict": 500
                }
            },
            timeout=120
        )
        response.raise_for_status()
        data = response.json()
        
        # Parse the response into structured format
        response_text = data.get("response", "")
        
        # Simple parsing - look for numbered questions and insight section
        questions = []
        insight = None
        
        lines = response_text.split('\n')
        current_section = None
        for line in lines:
            line = line.strip()
            if line.startswith('1.') or line.startswith('**1.'):
                current_section = 'questions'
                q = line.lstrip('123. *').strip('*')
                if q:
                    questions.append(q)
            elif line.startswith('2.') or line.startswith('**2.'):
                q = line.lstrip('123. *').strip('*')
                if q and len(questions) < 2:
                    questions.append(q)
            elif line.startswith('3.') or line.startswith('**3.'):
                q = line.lstrip('123. *').strip('*')
                if q and len(questions) < 3:
                    questions.append(q)
            elif '洞察' in line or '連結' in line or '交集' in line:
                current_section = 'insight'
                insight = line
        
        # If parsing didn't work well, just store the whole text
        if len(questions) < 3:
            questions = [
                "文章分析的深度問題 1",
                "文章分析的深度問題 2", 
                "文章分析的深度問題 3"
            ]
            insight = response_text[:200] if len(response_text) > 200 else response_text
        
        return {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "article_date": datetime.now().strftime("%Y-%m-%d"),
            "questions": questions if questions else ["今天沒有問題"],
            "insight": insight if insight else "無法產生洞察",
            "full_response": response_text
        }
    
    except Exception as e:
        return {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "questions": [f"Error: {e}"],
            "insight": None
        }

def main():
    # Get yesterday's date by default
    if len(sys.argv) > 1:
        date = sys.argv[1]
        article_date = f"{date[:4]}-{date[4:6]}-{date[6:8]}"
    else:
        yesterday = datetime.now() - timedelta(days=1)
        date = yesterday.strftime("%Y%m%d")
        article_date = yesterday.strftime("%Y-%m-%d")
    
    print(f"=== 早晨摘要 for {date} ===\n")
    
    articles = load_articles(date)
    
    if not articles:
        print("沒有文章，摘要結束。")
        # Still save empty summary
        summary = {
            "date": article_date,
            "questions": ["今天沒有文章可分析"],
            "insight": None
        }
    else:
        print(f"載入了 {len(articles)} 篇文章\n")
        print("正在生成摘要...\n")
        summary = generate_summary(articles)
        summary["article_date"] = article_date
    
    # Save to latest-summary.json
    output_path = "/tmp/oren_github/docs/latest-summary.json"
    with open(output_path, 'w') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"Summary saved to {output_path}")
    
    # Print result
    print("\n=== 摘要結果 ===")
    print(f"日期: {summary.get('date')}")
    print(f"文章日期: {summary.get('article_date')}")
    print(f"\n問題:")
    for i, q in enumerate(summary.get('questions', []), 1):
        print(f"  {i}. {q}")
    print(f"\n洞察: {summary.get('insight', 'N/A')}")

if __name__ == "__main__":
    main()
