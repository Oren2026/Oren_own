# 聊天啊!尬殿 — 期中專案

## 功能一覽

- ✅ 帳號系統（註冊/登入/登出）
- ✅ 密碼 bcrypt hash 儲存
- ✅ JWT + HTTP-only Cookie 認證
- ✅ CSRF Token 保護（一次性，60分鐘有效）
- ✅ Rate Limiting（一般60次/分鐘，認證10次/分鐘）
- ✅ SQL Injection 防護（Parameterized Queries）
- ✅ XSS 防護（Server-side HTML Escape）
- ✅ 動態牆（發文/刪除/瀏覽）
- ✅ 按讚功能
- ✅ 文章留言
- ✅ 活動系統（建立/刪除/留言）

---

## 使用方式

### 1. 啟動 Backend（你家 Mac 上）

```bash
cd ~/Desktop/Oren_own/backend
node server.js
```

伺服器啟動在 `http://localhost:3000`

### 2. 讓同學連进来（需設定 Tailscale）

1. 安裝 Tailscale：`brew install tailscale`
2. 啟動：`brew services start tailscale`
3. 下載 Mac App：https://tailscale.com/download/macos
4. 登入並授權 System Extension
5. 你的 Tailscale IP 會顯示在選單列（如 `100.x.x.x`）
6. 同學連线：`http://100.x.x.x:3000`

### 3. 前端開發（目前靜態檔案）

直接用瀏覽器開 `index.html`（需搭配後端）或部署到 GitHub Pages。

**重要：部署前需修改 `js/api.js` 中的 `API_BASE`**

```javascript
// 改成你家 Mac 的 Tailscale IP
const API_BASE = 'http://100.x.x.x:3000/api';
```

---

## 資安防護說明

| 威脅 | 防護方式 |
|------|---------|
| 密碼盜取 | bcrypt hash（10 rounds） |
| XSS 攻擊 | Server-side HTML escape |
| SQL Injection | Parameterized queries |
| CSRF 攻擊 | CSRF Token（一次性）|
| 暴力破解 | Rate Limiting |
| Cookie 盜取 | HTTP-only + SameSite=Strict |
| Timing Attack | 登入失敗固定延遲 |

---

## 資料庫

SQLite 檔案位於 `~/Desktop/Oren_own/backend/chatrank.db`
**不 commit 到 GitHub**（已在 `.gitignore`）
