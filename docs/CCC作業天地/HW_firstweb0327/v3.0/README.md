# v3.0 — 網頁日誌系統

> 更新日期：2026-03-27｜從 v2.1 升級

---

## 🎯 v3.0 更新重點

| 功能 | 說明 |
|------|------|
| 🌙 **亮/暗版主題** | 一鍵切換亮版或暗版，CSS `data-theme` 變數驅動 |
| 🎨 **自定義頭像色彩** | 設定頁可選自己喜歡的顏色，即時套用到頭像 |
| 🖼️ **自定義背景圖** | 支援 URL 設定個人頁背景 |
| 👥 **追蹤系統** | `follows` 表，追蹤/取消追蹤作者按鈕 |
| 👤 **個人頁** | 獨立 URL（`/#/profile/:username`），顯示粉絲數、追蹤數、文章列表 |
| 🔗 **Hash SPA 路由** | 前端 hash 路由，無需後端支援即可跳轉頁面 |
| ⚙️ **設定 Modal** | 編輯 bio、色彩、背景、主題，即時預覽 |

---

## 🚀 啟動方式

### 方式一：脫機演示（不需要 server）⭐
直接用瀏覽器開啟 `public/index.html` 即可演示。

```
https://Oren2026.github.io/Oren_own/docs/CCC%E4%BD%9C%E6%A5%AD%E5%A4%A9%E5%9C%B0/HW_firstweb0327/v3.0/public/index.html
```

- ✅ 無需 `npm install` / `node server.js`
- ✅ 所有 API 請求由 `demo.js` mock，可直接操作文章、發文、追蹤
- ✅ 可用任意帳號密碼登入（示範用：admin / 1234）
- ⚠️ 脫機模式下資料僅存在記憶體，刷新後重置

### 方式二：本機 server（完整功能）

```bash
cd HW_firstweb0327/v3.0
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
v3.0/
├── index.html              ← 說明頁 + 啟動教學
├── package.json
├── server/
│   ├── server.js          ← Express 主體
│   ├── db.js              ← SQLite 初始化（含 follows 表）
│   ├── middleware/
│   │   ├── auth.js        ← JWT 驗證
│   │   └── errorHandler.js ← 統一錯誤處理
│   └── routes/
│       ├── auth.js        ← 登入/註冊/登出
│       ├── entries.js     ← 文章 CRUD
│       └── users.js       ← 個人頁/追蹤 API
└── public/                  ← 🌿 試用模式（demo.js mock 所有 API）
    ├── index.html          ← 主頁（SPA + Hash 路由）
    ├── journal.js          ← 前端全部邏輯（26KB）
    ├── style.css           ← 亮/暗版主題 CSS
    ├── demo.js             ← 前端試用模式（完整 v3.0 API mock）
    └── mock-data.json      ← 示範用資料（4 用戶 + 10 文章）
```

---

## 🌐 API Endpoints

```
會員系統
POST /api/auth/register   { username, password }           → 201 { user }
POST /api/auth/login      { username, password }            → 200 { user } + Set-Cookie
POST /api/auth/logout     (clear cookie)                   → 200 { ok }
GET  /api/auth/me        (require login)                    → 200 { user }

文章系統
GET    /api/entries?author=&q=&tag=&page=&limit=           → 200 { entries, total, page, limit, totalPages }
POST   /api/entries       { title, content, date, tags }   → 201 { entry }
PUT    /api/entries/:id  { title, content, date, tags }   → 200 { entry }
DELETE /api/entries/:id  (require login + owner)          → 204 (no body)

個人頁 / 追蹤系統
GET    /api/users/:username                                 → 200 { user } 含 followers_count, following_count, isFollowing
PUT    /api/users/me        { bio, avatar_color, background } → 200 { user }
POST   /api/users/:username/follow                          → 201 { ok }
DELETE /api/users/:username/follow                          → 204 (no body)
GET    /api/users/:username/entries?q=                     → 200 { entries }
```

---

## 🗄️ 資料庫 Schema（SQLite）

```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    UNIQUE NOT NULL,
  password_hash TEXT    NOT NULL,          -- bcrypt hash
  bio           TEXT    DEFAULT '',
  avatar_color  TEXT    DEFAULT '#0f766e', -- 頭像色彩
  background    TEXT    DEFAULT '',         -- 背景圖 URL
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  title      TEXT    NOT NULL,
  content    TEXT,
  date       TEXT,
  tags       TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE follows (                   -- v3.0 新增
  follower_id  INTEGER NOT NULL,
  following_id INTEGER NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  FOREIGN KEY (follower_id)  REFERENCES users(id),
  FOREIGN KEY (following_id) REFERENCES users(id)
);
```

---

## vs v2.1 差異對照

| 項目 | v2.1 | v3.0 |
|------|------|------|
| 主題 | 僅亮版 | 亮/暗版一鍵切換 |
| 個人化 | 無 | 頭像色彩 + 背景圖 |
| 追蹤系統 | 無 | follows 表 + API |
| 個人頁 | 無 | `/#/profile/:username` |
| Hash 路由 | 無 | SPA hash 路由 |
| 前端試用 | fetch mock | 完整功能 mock（含追蹤） |
| 密碼保護 | bcrypt | bcrypt |
