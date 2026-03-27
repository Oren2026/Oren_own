# v2.1 / v2.2 — 網頁日誌系統（Node.js + SQLite）

> v2.2 更新日期：2026-03-27｜從 v2.1 升級

---

## 🎯 v2.2 更新重點

| 功能 | 說明 |
|------|------|
| 📄 **分頁（Pagination）** | `GET /api/entries?page=1&limit=10`，回傳 `{ entries, total, page, limit, totalPages }` |
| 👤 **我的文章過濾** | 工具列「👤 我的文章」按鈕（登入後可見），使用 `?author=` 參數 |
| 🏷️ **Tags 標籤** | `entries.tags` TEXT 欄位（逗號分隔），支援新增/編輯/顯示/點擊過濾 |
| 🔍 **搜尋列** | 可輸入 `#標籤名` 進行標籤過濾，使用 `?tag=` 參數 |
| ⬅️➡️ **分頁 UI** | 工具列上方顯示「上一頁 / 下一頁」按鈕 + 「第 X 頁，共 Y 頁」 |

---

## 🎯 v2.1 更新重點

| 功能 | 說明 |
|------|------|
| 🪵 **Morgan HTTP 日誌** | 每次 request 在 server console 清楚顯示：method、path、status、response time |
| 🔄 **統一錯誤處理** | `ApiError` 類別 + `asyncWrap` + `errorHandler` 中介層，所有錯誤格式一致 |
| ⚡ **Loading 狀態** | 登入/註冊/發文/刪除按鈕送出後 disable + 顯示 ⏳，防止重複點擊 |
| 🗑️ **204 No Content** | DELETE 成功回應改為 204，api() helper 正確處理無 body 響應 |

---

## 🚀 啟動方式

### 方式一：脫機演示（不需要 server）⭐
直接用瀏覽器開啟 `public/index.html` 即可演示！

```
開啟方式：
1. https://Oren2026.github.io/Oren_own/docs/CCC作業天地/HW_firstweb0327/v2.1/public/index.html
2. 或 clone 後直接用瀏覽器打開 v2.1/public/index.html
```

- ✅ 無需 `npm install` / `node server.js`
- ✅ 內建試用模式（`demo.js`），fetch 被 mock 回傳靜態 JSON
- ✅ 可用任意帳號密碼登入（示範用：任意帳號 + 密碼）
- ⚠️ 資料為唯獨 mock，發文/編輯/刪除僅存在記憶體

### 方式二：本機 server（完整功能）

```bash
cd HW_firstweb0327/v2.1
npm install   # 第一次
npm start     # 啟動 → http://localhost:3000
```

---

## 🔑 測試帳號

| 帳號 | 密碼 |
|------|------|
| admin | 1234 |
| 小美 | 1111 |
| 阿偉 | 2222 |
| 妮妮 | 3334 |

---

## 📁 檔案結構

```
v2.1/
├── index.html              ← 說明頁 + 啟動教學
├── package.json
├── database.sqlite           ← SQLite 實體檔案
├── server/
│   ├── server.js            ← Express + Morgan + errorHandler
│   ├── db.js                ← SQLite 初始化 + 种子数据
│   ├── routes/
│   │   ├── auth.js          ← asyncWrap + ApiError
│   │   └── entries.js       ← 同上
│   └── middleware/
│       ├── auth.js          ← JWT 驗證
│       └── errorHandler.js  ← 🆕 統一錯誤處理
└── public/                  ← 純前端示範（⚠️ 需後端才能操作）
    ├── index.html           ← ⚠️ 含「預覽模式」提示 banner
    ├── journal.js            ← fetch API + Loading 狀態
    └── style.css
```

---

## 🌐 API Endpoints

```
POST /api/auth/register   { username, password }                    → 201 { user }
POST /api/auth/login      { username, password }                    → 200 { user } + Set-Cookie
POST /api/auth/logout     (clear cookie)                            → 200 { ok }
GET  /api/auth/me         (require login)                           → 200 { user }

GET    /api/entries?author=&q=&tag=&page=&limit=  列表（v2.2）        → 200 { entries, total, page, limit, totalPages }
POST   /api/entries       { title, content, date, tags }             → 201 { entry }
PUT    /api/entries/:id   { title, content, date, tags }             → 200 { entry }
DELETE /api/entries/:id   (require login + owner)                   → 204 (no body)
```

---

## vs v2.0 / v2.1 差異對照

| 項目 | v2.0 | v2.1 | v2.2 |
|------|------|------|------|
| HTTP 日誌 | 無 | Morgan | Morgan |
| 錯誤處理 | 各 route 自己做 | `ApiError` + `errorHandler` | 同左 |
| 非同步 | 手動 try/catch | `asyncWrap` | 同左 |
| Loading 狀態 | 無 | 按鈕 disable + ⏳ | 同左 |
| DELETE 響應 | 200 { ok } | 204 No Content | 同左 |
| 分頁 | 無 | 無 | `?page=&limit=` |
| 我的文章過濾 | 無 | 無 | `?author=` |
| Tags 標籤 | 無 | 無 | `tags` TEXT 欄位 |

