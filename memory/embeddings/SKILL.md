---
name: local-embeddings
description: 本地文章 embedding 系統，用 nomic-embed-text 產生向量，實現語意搜尋。當需要分析興趣主題、找相關文章、或探索不同領域之間的連結時使用。
---

# Local Embeddings Skill

用本地 Ollama 模型（nomic-embed-text）為文章產生 embedding 向量，實現語意搜尋。

## 位置

```
~/.openclaw/workspace/memory/embeddings/
├── generate.py    # 產生 embedding
├── search.py      # 搜尋相似文章
└── YYYYMMDD.json # 向量資料
```

## 流程

### 新文章時（CRON 觸發）

每次新文章寫入 `docs/data/YYYYMMDD.json` 時：

```bash
python3 ~/.openclaw/workspace/memory/embeddings/generate.py /tmp/oren_github/docs/data/YYYYMMDD.json
```

→ 會對每篇文章產生 768 維向量，存到 `memory/embeddings/YYYYMMDD.json`

### 討論時（我主動觸發）

當我們討論某個主題，我可以自動找出相關文章：

```bash
python3 ~/.openclaw/workspace/memory/embeddings/search.py "你的問題" [top_k]
```

→ 回傳最相似的 k 篇文章

## 使用時機

- 討論到某個主題，想要連結過去蒐集的文章
- 想找「這個話題跟哪些已蒐集的文章相關」
- 探索不同領域之間的連結

## 範例

黑皮問：「氫能源現在發展怎麼樣？」

→ 我會搜尋相關文章並說：
> 「根據之前蒐集的文章，有 3 篇關於氫能源：
> 1. 氫能源綜合應用試點啟動（ID: 012）
> 2. 綠氫成本破局（ID: 013）
> 3. 氫能工業脫碳（ID: 014）」

## 技術細節

- **模型**：nomic-embed-text（768 維）
- **API**：Ollama localhost:11434
- **儲存**：JSON（無需 vector DB）
- **相似度**：關鍵詞匹配（簡單版）

## 擴展計畫

未來可以升級為真正的 embedding 相似度搜尋（需要 numpy 或其他計算庫）。
