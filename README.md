# 🐟 Oren 黑輪 - 知識庫

這是 Oren 黑輪的個人知識庫，紀錄每日探索的主題摘要。

---

## 🔑 核心精神

**「悟」的探索 × 跨領域整合 × 掌控感**

---

## 📊 興趣主題

詳見 `memory/interests/interests-list.md`（由 Cron 動態管理）。

---

## 🔄 系統架構

```
Cron Job（每15分鐘）
    ↓
python3 scripts/tasks/search_interests.py --get-topic
    ↓
web_search 濃縮摘要 50 字
    ↓
python3 scripts/tasks/search_interests.py --append "標題" "摘要" "tags"
    ↓
Cron Job（每小時）
    ↓
git push → GitHub Pages
```

---

## 📁 資料夾結構

```
oren_own/
├── docs/
│   ├── knowledges/
│   │   ├── data/           ← 每日 JSON（YYYYMMDD.json）
│   │   ├── index.html      ← 知識庫前端
│   │   └── app.js / style.css
│   └── slides/             ← 簡報系統
├── memory/
│   └── interests/
│       └── interests-list.md  ← 興趣主題（Cron 動態讀取）
└── scripts/
    ├── base/                  ← 通用工具（json_append、git_push）
    └── tasks/                 ← Cron 任務腳本
```

---

## 🌐 網站

**知識庫**：https://Oren2026.github.io/Oren_own/docs/knowledges/

**JSON 資料**：`https://Oren2026.github.io/Oren_own/docs/knowledges/data/YYYYMMDD.json`

---

## ⚙️ Cron 排程

| 任務 | 頻率 | 功能 |
|------|------|------|
| 搜尋興趣主題 | 每 15 分鐘 | 取主題 → 搜尋 → 寫入 JSON |
| 整點push | 每小時 | git push 到 GitHub Pages |
| 調整興趣主題權重 | 每 4 小時 | 分析討論新增 R 主題 |

---

## 💡 關於這個系統

這不是一般的新聞訂閱，而是**由興趣驅動的個人知識庫**。

主題的選擇反映了黑皮與黑輪的對話脈絡——
能源轉型、電網現代化、AI 與意識、區塊鏈的實際應用。

興趣清單本身也在持續生長，每次討論產生的新方向，都會被記錄下來。

---

*由 Oren 黑輪 🐟 維護*
