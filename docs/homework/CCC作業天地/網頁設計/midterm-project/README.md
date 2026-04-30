# 聊天啊!尬殿 — ChatRank

> 動態牆社群平台，包含文章、留言、活動系統。
>
> **線上體驗：** `https://angelfish-observant-modified.ngrok-free.dev`

---

## 功能一覽

| 功能 | 說明 |
|------|------|
| 動態牆 | 熱門排序（gravity 衰減）/ 最新排序 |
| 文章 | 發文、刪除、按讚（debounce 5s）、留言 |
| 活動 | 建立活動、留言、報名 |
| 標籤 | 內容中的 `#tag` 自動解析 |
| 管理員 | `role === 'admin'` 可刪除任何內容 |
| 熱門排序 | `score = likes / POWER(hours + 2, gravity)` |

---

## 快速啟動

```bash
# 1. 安裝依賴
cd backend
npm install

# 2. 複製並填寫環境變數
cp .env.example .env
# 用文字編輯器打開 .env，設定 JWT_SECRET（例如隨機長字串）

# 3. 啟動伺服器（第一次會自動建立空的資料庫）
npm start

# 4. 開啟瀏覽器
open http://localhost:3000
```

---

## 專案結構

```
midterm-project/
├── backend/                 # API Server
│   ├── server.js           # 主程式，所有 API Route 在此
│   ├── db.js               # SQLite 操作，封裝所有 SQL
│   ├── middleware/         # 中介層
│   │   ├── auth.js         # JWT 驗證（HTTP-only Cookie）
│   │   ├── csrf.js         # CSRF Token（HMAC-SHA256）
│   │   └── rateLimit.js    # 頻率限制（防止暴力破解）
│   ├── package.json
│   └── .env.example        # 環境變數範本
│
├── index.html               # 前端入口
├── js/
│   ├── app.js              # 前端主程式（Hash Router）
│   └── api.js              # API 客戶端，封裝 fetch
└── css/
    └── style.css
```

---

## 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `JWT_SECRET` | — | **必填**。JWT 簽章密鑰，長度愈長愈好 |
| `PORT` | `3000` | Server port |
| `DB_PATH` | `./chatrank.db` | SQLite 路徑 |
| `FRONTEND_PATH` | `../public` | 前端靜態檔目錄 |

---

## 程式碼架構導讀

### 前端（Vanilla JS，無框架）

- **`api.js`**：所有 HTTP 請求統一由此發出，自動附上 CSRF Token 與 Cookie
- **`app.js`**：Hash Router（`#/feed`、`#/post/:id`、`#/activities` 等），所有 UI  render 都在這裡
- **`index.html`**：純靜態，server 會在 `<head>` 注入 `window.__AUTH__` 做伺服器端渲染，加速首次載入

### 後端（Express + SQLite）

- **`server.js`**：路由定義 + 中介層順序（Rate Limit → Auth → CSRF → Handler）
- **`db.js`**：所有 SQL 操作，使用 `better-sqlite3`（同步 API），所有寫入用 parameterized queries 防 SQL Injection
- **`middleware/auth.js`**：JWT 存在 HTTP-only Cookie，JavaScript 無法讀取
- **`middleware/csrf.js`**：HMAC-SHA256 token，綁定 userId，24 小時有效
- **`middleware/rateLimit.js`**：Sliding window counter，登录注册 10 次/分鐘，其餘 60 次/分鐘

### 資料模型

```
users ──┬── posts ──── likes
        ├── comments
        ├── activities ── activity_comments
        ├── settings (key-value)
        └── blocked_words
```

---

## API 端點摘要

| Method | Path | 驗證 | 說明 |
|--------|------|------|------|
| POST | `/api/auth/register` | — | 註冊 |
| POST | `/api/auth/login` | — | 登入 |
| GET | `/api/auth/csrf` | — | 刷新 CSRF Token |
| GET | `/api/posts` | JWT | 取得文章列表（支援 `?sort=hot\|new`） |
| POST | `/api/posts` | JWT+CSRF | 發文 |
| DELETE | `/api/posts/:id` | JWT+CSRF | 刪除文章 |
| POST | `/api/posts/:id/like` | JWT+CSRF | 按讚 / 取消讚 |
| POST | `/api/posts/:id/comment` | JWT+CSRF | 留言 |
| GET | `/api/activities` | JWT | 取得活動列表 |
| POST | `/api/activities` | JWT+CSRF | 建立活動 |
| GET | `/api/settings` | — | 取得系統設定（gravity 等） |
| PUT | `/api/settings` | JWT+CSRF+Admin | 更新系統設定 |
| GET | `/api/admin/stats` | JWT+Admin | 查看 Rate Limit 統計 |

---

## 如何部署到網路（讓別人連得到你）

### 選項 A：ngrok（最簡單，免費）

```bash
# 1. 安裝 ngrok
brew install ngrok   # macOS

# 2. 啟動你的 server
cd backend && npm start

# 3. 另一個終端機開 ngrok
ngrok http 3000
# 複製出現的 https://xxx.ngrok.io 網址分享給同學
```

### 選項 B：Tailscale（私人網路，較安全）

```bash
# 1. 在你的 Mac 安裝 Tailscale
brew install tailscale
tailscale up

# 2. 把 Tailscale IP（100.x.x.x）分享給同學
# 同學連 http://100.x.x.x:3000
```

---

## 常見問題

**Q：啟動出現 `Error: listen EADDRINUSE`**
> Port 被佔用。改用其他 port：`PORT=3001 npm start`，或先 `lsof -i :3000` 找程序砍掉。

**Q：第一次進去是一片空白**
> 確認 `npm install` 有執行，且 `node_modules/better-sqlite3` 有正確編譯（需要 C++ 編譯器）。

**Q：想改成 admin 帳號**
> 用 SQLite 工具直接改資料庫：
> ```sql
> UPDATE users SET role = 'admin' WHERE username = '你的帳號';
> ```

**Q：想看資料庫內容**
> ```bash
> sqlite3 chatrank.db ".tables"
> sqlite3 chatrank.db "SELECT * FROM users;"
> ```

---

## 授權

MIT License
