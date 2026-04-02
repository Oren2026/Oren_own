# v2.0 — 網頁日誌系統（Node.js + SQLite）

> 更新日期：2026-03-27｜從 v1.3 升級

---

## 🎯 版本定位

v2.0 是 v1.x 純前端的**對照組**，示範同一個功能如果用 Node.js 後端 + 真實 SQLite 會長什麼樣子。

---

## ⚡ 與 v1.x 的核心差異

| 項目 | v1.x（純前端） | v2.0（Node.js） |
|------|---------------|----------------|
| SQLite 跑在哪 | 瀏覽器（sql.js WASM） | Node.js 程序 |
| 密碼處理 | SHA-256（前端） | bcrypt（後端） |
| 資料存在哪 | IndexedDB（瀏覽器） | `database.sqlite`（硬碟檔案） |
| 認證方式 | sessionStorage | JWT + HttpOnly Cookie |
| 是否需要 server | 否（GitHub Pages 可托管） | 是（`node server.js`） |
| 可擴展性 | 有限 | 高（可加真實用戶系統） |

---

## 🚀 啟動方式

```bash
# 進入目錄
cd HW_firstweb0327/v2.0

# 安裝依賴（第一次）
npm install

# 啟動
npm start
# 访问 http://localhost:3000
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
v2.0/
├── index.html              ← 說明頁 + 啟動教學
├── package.json
├── database.sqlite           ← SQLite 資料庫實體檔案
├── server/
│   ├── server.js            ← Express 主程式
│   ├── db.js                ← SQLite 初始化
│   ├── routes/
│   │   ├── auth.js          ← 登入/註冊/登出
│   │   └── entries.js       ← 文章 CRUD
│   └── middleware/
│       └── auth.js          ← JWT 驗證中介層
└── public/                  ← 純前端對照組
    ├── index.html
    ├── journal.js           ← fetch() 呼叫 API
    ├── style.css
    └── seed.db              ← 純前端版參考
```

---

## 🌐 API Endpoints

```
POST /api/auth/register   { username, password }
POST /api/auth/login      { username, password } → Set-Cookie: jwt
POST /api/auth/logout     (clear cookie)
GET  /api/auth/me         → { user }

GET    /api/entries?author=&q=   列表
POST   /api/entries               新增（需登入）
PUT    /api/entries/:id          編輯（需登入 + 作者）
DELETE /api/entries/:id          刪除（需登入 + 作者）
```
