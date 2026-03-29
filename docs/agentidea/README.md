# agentidea

**目的：** 讓 Oren 團隊（researcher + coder）自主探索黑皮感興趣的主題，生成有意義的內容展示。

**核心精神：** 先創造，再分析。不怕失敗，快速迭代。

---

## 資料夾結構

```
agentidea/
├── README.md
├── index.html              ← 意識光譜（深色卡片風格）
├── weekly-insight.html     ← 本週最深（編輯排版/大字引言風格）
├── code/                   ← 網頁實作
└── staging/                ← 等待整合的內容
```

---

## 已上線頁面

### index.html — 意識光譜
深色卡片主題，純 HTML + CSS，展示意識層級結構。

### weekly-insight.html — 本週最深
編輯排版 / 大字引言風格，每次刷新隨機顯示一篇 research 筆記錄。Fortune Cookie 概念。

---

## 協作流程

```
researcher（獨立 bot）
  → 從 interests-list.md 取得 R 系列主題
  → web_search 研究
  → 寫入 knowledges/data/YYYYMMDD.json（via --append script）

coder（獨立 bot）
  → 讀取 researcher 的研究產出
  → 實作網頁前端
  → 提交審核 → push

inspector（sub-agent）
  → 每小時檢查 JSON 格式正確性
```

---

*最後更新：2026-03-29*
