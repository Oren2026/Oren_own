# HW_firstweb0327 — 網頁日誌系統

> 授課老師：CCC｜作業日期：2026-03-27

---

## 📋 改版日誌

| 版本 | 日期 | 類型 | 說明 | 連結 |
|------|------|------|------|------|
| **v3.0** | 2026-03-27 | 🆕 最新 | 追蹤系統 + 個人頁 + 亮/暗版主題 + Hash 路由 | [→ 說明頁](https://Oren2026.github.io/Oren_own/docs/CCC%E4%BD%9C%E6%A5%AD%E5%A4%A9%E5%9C%B0/HW_firstweb0327/v3.0/index.html) |
| **v2.1** | 2026-03-27 | 後端版 | Node.js：Morgan 日誌 + 統一錯誤處理 + Loading 狀態 | [→ 說明頁](https://Oren2026.github.io/Oren_own/docs/CCC%E4%BD%9C%E6%A5%AD%E5%A4%A9%E5%9C%B0/HW_firstweb0327/v2.1/index.html) |
| **v2.0** | 2026-03-27 | 後端版 | Node.js + SQLite 後端對照：bcrypt、JWT、REST API | [→ 說明頁](https://Oren2026.github.io/Oren_own/docs/CCC%E4%BD%9C%E6%A5%AD%E5%A4%A9%E5%9C%B0/HW_firstweb0327/v2.0/index.html) |
| **v1.3** | 2026-03-27 | 前端版 | SQLite 框架重構：DB class + 參數化查詢 + 安全性提升 | [→ 進入](https://Oren2026.github.io/Oren_own/docs/CCC%E4%BD%9C%E6%A5%AD%E5%A4%A9%E5%9C%B0/HW_firstweb0327/v1.3/index.html) |
| **v1.2** | 2026-03-27 | 前端版 | 作者過濾功能 + 預設文章內容 | [→ 進入](https://Oren2026.github.io/Oren_own/docs/CCC%E4%BD%9C%E6%A5%AD%E5%A4%A9%E5%9C%B0/HW_firstweb0327/v1.2/index.html) |
| **v1.1** | 2026-03-27 | 前端版 | 雙面板 Auth Modal + 公開日誌牆 + seed.db | [→ 進入](https://Oren2026.github.io/Oren_own/docs/CCC%E4%BD%9C%E6%A5%AD%E5%A4%A9%E5%9C%B0/HW_firstweb0327/v1.1/index.html) |
| **v1.0** | 2026-03-27 | 初版 | 基本 CRUD + 搜尋 | （已整合至後續版本） |

---

## 🏗️ 現有架構

```
HW_firstweb0327/
├── README.md              ← 本檔（改版日誌總覽）
├── index.html             ← 版本入口頁（所有版本一覽）
├── assets/                ← 共享 CSS 資源
│
├── v1.0/                  ← 初版：基本日誌
├── v1.1/                  ← 雙面板 Auth Modal + 公開日誌牆
├── v1.2/                  ← 作者過濾功能
├── v1.3/                  ← DB class 重構 + 參數化查詢
│
├── v2.0/                  ← Node.js 後端對照版
│   ├── package.json
│   ├── public/
│   │   ├── index.html
│   │   ├── journal.js
│   │   └── style.css
│   └── server/
│       ├── server.js
│       ├── db.js
│       ├── middleware/auth.js
│       └── routes/
│           ├── auth.js
│           └── entries.js
│
├── v2.1/                  ← Morgan 日誌 + 統一錯誤處理
│   ├── package.json
│   ├── public/
│   │   ├── index.html     ← 含試用模式（demo.js）
│   │   ├── journal.js
│   │   ├── style.css
│   │   ├── demo.js        ← 前端試用模式 mock
│   │   └── mock-data.json
│   └── server/
│       ├── server.js
│       ├── db.js
│       ├── middleware/
│       │   ├── auth.js
│       │   └── errorHandler.js
│       └── routes/
│           ├── auth.js
│           └── entries.js
│
└── v3.0/                  ← 🌟 最新版：追蹤系統 + 亮暗版 + Hash 路由
    ├── package.json
    ├── public/
    │   ├── index.html     ← 主頁（亮/暗版、hash 路由）
    │   ├── journal.js     ← 前端全部邏輯（26KB）
    │   ├── style.css      ← 亮/暗版主題 CSS（17KB）
    │   ├── demo.js        ← 試用模式（完整 v3.0 API mock）
    │   └── mock-data.json
    └── server/
        ├── server.js
        ├── db.js          ← 新增 follows 表
        ├── middleware/
        │   ├── auth.js
        │   └── errorHandler.js
        └── routes/
            ├── auth.js
            ├── entries.js
            └── users.js   ← 🆕 個人頁 / 追蹤 API
```

---

## 🚀 如何更新版本

1. 複製當前最高版本資料夾（例如 `v2.1/` → `v3.0/`）
2. 在新資料夾中修改程式碼
3. 更新新資料夾的 `README.md`
4. 更新本檔的改版日誌表格
5. commit 並 push

---

## 📚 各版本功能總覽

### v3.0（🌟 最新）
- **🌙 亮/暗版主題**：一鍵切換，CSS `data-theme` 變數驅動
- **🎨 自定義頭像色彩**：每個使用者可選自己喜歡的顏色
- **🖼️ 自定義背景圖**：支援 URL 設定個人頁背景
- **👥 追蹤系統**：`follows` 表，追蹤/取消追蹤按鈕
- **👤 個人頁**：獨立 URL（`/#/profile/:username`），顯示粉絲數、追蹤數、文章列表
- **🔗 Hash 路由**：前端 SPA 路由，無需後端支援
- **⚙️ 設定 Modal**：編輯 bio、色彩、背景、主題

### v2.1（Node.js 主力版）
- 🪵 **Morgan 日誌**：每次 request 在 console 清楚顯示
- 🔄 **統一錯誤處理**：`ApiError` + `asyncWrap` + `errorHandler`
- ⚡ **Loading 狀態**：按鈕 disable + ⏳，防重複點擊
- 🌿 **試用模式**：關掉後端也能跑，前端 fetch 全部 mock

### v1.3（純前端最新版）
- 🔧 **DB class 重構**：封裝 `db.get()` / `db.all()` / `db.run()` 三個方法
- 🔒 **參數化查詢**：消滅所有 SQL 字串拼接，徹底防範注入攻擊
- 🔑 **DB key 隔離**：`journal_sqlite_v3` 獨立，與舊版乾淨切分

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
