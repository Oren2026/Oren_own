# v2.1 — 網頁日誌系統（Node.js + SQLite）

> 更新日期：2026-03-27｜從 v2.0 升級

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
POST /api/auth/register   { username, password }         → 201 { user }
POST /api/auth/login      { username, password }         → 200 { user } + Set-Cookie
POST /api/auth/logout     (clear cookie)                 → 200 { ok }
GET  /api/auth/me         (require login)                → 200 { user }

GET    /api/entries?author=&q=  列表                      → 200 { entries }
POST   /api/entries       { title, content, date }       → 201 { entry }
PUT    /api/entries/:id   { title, content, date }       → 200 { entry }
DELETE /api/entries/:id   (require login + owner)         → 204 (no body)
```

---

## vs v2.0 差異對照

| 項目 | v2.0 | v2.1 |
|------|------|------|
| HTTP 日誌 | 無 | Morgan（每個 request） |
| 錯誤處理 | 各 route 自己做 | `ApiError` + `errorHandler` |
| 非同步 | 手動 try/catch | `asyncWrap` 統一包裝 |
| Loading 狀態 | 無 | 按鈕 disable + ⏳ |
| DELETE 響應 | 200 { ok } | 204 No Content |
