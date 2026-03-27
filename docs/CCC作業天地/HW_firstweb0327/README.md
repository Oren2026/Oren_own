# HW_firstweb0327 — 網頁日誌系統

> 授課老師：CCC｜作業日期：2026-03-27

---

## 📋 改版日誌

| 版本 | 日期 | 類型 | 說明 | 連結 |
|------|------|------|------|------|
| **v2.0** | 2026-03-27 | 🆕 最新 | Node.js + SQLite 後端對照版：bcrypt、JWT、REST API、Express | [→ 說明頁](v2.0/index.html) |
| **v1.3** | 2026-03-27 | 最新版 | 重構 SQLite 框架：DB class + 參數化查詢 + 安全性提升 | [→ 進入](v1.3/index.html) |
| **v1.2** | 2026-03-27 | 功能版 | 新增作者過濾功能 + 更新預設文章內容 | [→ 進入](v1.2/index.html) |
| **v1.1** | 2026-03-27 | 正式版 | 雙面板 Auth Modal + 公開日誌牆 + seed.db | [→ 進入](v1.1/index.html) |
| **v1.0** | 2026-03-27 | 初版 | 基本 CRUD + 搜尋 | （已整合至 v1.1） |

---

## 🏗️ 現有架構

```
HW_firstweb0327/
├── README.md           ← 本檔（改版日誌總覽）
├── index.html          ← 版本入口頁
├── assets/             ← 共享 CSS 資源
├── v1.0/            ← 初版（基本日誌，無使用者系統）
├── v1.1/            ← 第一正式版
├── v1.2/            ← 作者過濾功能版
├── v1.3/            ← SQLite 框架重構（純前端最新版）
│   ├── index.html
│   ├── journal.js
│   ├── seed.db
│   └── README.md
└── v2.0/            ← 當前最新版（Node.js + SQLite 對照組）
    ├── index.html       ← 說明頁 + 啟動教學
    ├── package.json
    ├── database.sqlite  ← 真實 SQLite 檔案
    ├── server/          ← Node.js 後端
    │   ├── server.js
    │   ├── db.js
    │   ├── routes/auth.js
    │   ├── routes/entries.js
    │   └── middleware/auth.js
    └── public/          ← 純前端對照組
        ├── index.html
        └── journal.js
```

---

## 🚀 如何更新版本

1. 複製當前最高版本資料夾（例如 `v1.3/` → `v1.4/`）
2. 在新資料夾中修改程式碼
3. 更新新資料夾的 `README.md`
4. 更新本檔的改版日誌表格
5. commit 並 push

---

## 📚 各版本功能總覽

### v1.3（當前最新版）
- 🔧 **DB class 重構**：封裝 `db.get()` / `db.all()` / `db.run()` 三個方法
- 🔒 **參數化查詢**：消滅所有 SQL 字串拼接，徹底防範注入攻擊
- 🔑 **DB key 隔離**：`journal_sqlite_v3` 獨立，與舊版乾淨切分
- 👤 **作者過濾**：點擊作者名稱只看該作者，右上角 ✕ 清除

### v1.2
- 👤 作者過濾功能
- 📝 預設文章：4人共10篇，內容與雲林相關

### v1.1
- 🌍 公開日誌牆
- 🔐 雙面板 Auth Modal
- 💾 SQLite 預設資料庫
- ➕ 發文 / 🔍 搜尋 / 💾 匯出入

---

*授課老師：CCC*
