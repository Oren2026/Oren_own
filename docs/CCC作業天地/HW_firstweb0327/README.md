# HW：First Web — 網頁日誌系統

## 作業說明

使用 **JavaScript + SQLite（sql.js）** 實作一個可新增、編輯、刪除、搜尋的網頁日誌系統。所有資料存在瀏覽器本地（IndexedDB），**不需要任何伺服器**。

---

## 📁 檔案結構

```
HW_firstweb0327/
├── README.md          ← 本說明檔
└── journal/
    ├── index.html      ← 日誌系統主頁
    └── journal.js      ← 所有 JS 邏輯（SQLite CRUD + IndexedDB 持久化）
```

---

## 🚀 使用方式

### 方法一：直接開啟（推薦）

1. 點進 `journal/index.html` 即可使用
2. 缺點：關閉視窗後日誌會消失（因為瀏覽器安全限制不允許本地檔案寫入 IndexedDB）

> ⚠️ 若看到 `❌ 初始化失敗`，是因為直接以 `file://` 開啟時 IndexedDB 不可用。建議使用方法二。

### 方法二：本機 HTTP 伺服器（資料可持久化）

用 Python 啟動一個簡單的 HTTP 伺服器：

```bash
# 在 journal/ 的上層資料夾執行：
python3 -m http.server 8080
# 或
python -m http.server 8080
```

然後在瀏覽器打開：
```
http://localhost:8080/journal/index.html
```

> ✅ 這樣資料會正確寫入 IndexedDB，關閉後再打開仍然存在。

### 方法三：VS Code Live Server

在 VS Code 安裝「Live Server」擴充功能 → 對 `index.html` 按右鍵 → `Open with Live Server`

---

## ✨ 功能說明

| 功能 | 說明 |
|------|------|
| ➕ 新增日誌 | 填寫標題、日期、內容後儲存 |
| ✏️ 編輯 | 點選日誌右側的編輯按鈕 |
| 🗑️ 刪除 | 點選日誌右側的刪除按鈕 |
| 🔍 搜尋 | 輸入關鍵字即時過濾標題與內容 |
| 📂 展開/收合 | 點擊日誌卡片即可展開內容 |
| 💾 匯出資料庫 | 下載 `.db` 檔備份 |
| 📂 匯入資料庫 | 上傳 `.db` 檔還原日誌 |
| 🗑️ 清除全部 | 一鍵刪除所有日誌 |

---

## 🔧 技術架構

```
┌─────────────────────────────────┐
│        Browser (JavaScript)      │
├─────────────────────────────────┤
│  journal.js                      │
│  ├── sql.js (WASM SQLite)        │  ← SQLite 引擎（WebAssembly）
│  ├── IndexedDB 持久化            │  ← 關閉視窗資料不消失
│  └── DOM 操作（Render / Event）  │
└─────────────────────────────────┘
         │
         ▼
   純前端，無需後端伺服器
```

---

## 📝 SQLite 資料表

```sql
CREATE TABLE entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  content    TEXT,
  date       TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
```

---

## ⚠️ 注意事項

- 本系統為**純前端**，所有資料存在瀏覽器的 IndexedDB 中
- 不同瀏覽器或隱私模式下的資料**不相通**
- 建議定期使用「💾 匯出資料庫」備份
- 匯出的 `.db` 檔可用任何 SQLite 工具（如 DB Browser for SQLite）開啟

---

## 📚 參考資源

- sql.js 文件：https://sql.js.org/
- sql.js CDN：https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.min.js

---

*授課老師：CCC｜作業日期：2026-03-27*
