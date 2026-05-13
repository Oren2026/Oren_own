# 尬殿 v1 — ChatRank 專案總覽

> 聊天啊!尬殿 — 動態牆社群平台

---

## 專案結構

```
~/Desktop/private/backend/          ← 實際運行的後端（ngrok 對外服務）
~/Desktop/private/backend_v1/       ← 備用版本（另一組資料庫）
~/Desktop/Oren_own/docs/homework/CCC作業天地/網頁設計/chatrank-web/
                                   ← 前端（展示用，給 private/backend  serving）
```

**重要**：`docs/.../chatrank-web/backend/` 內的 server.js 是**不在用的**，對外服務的後端是 `~/Desktop/private/backend/`。

---

## 對外服務

**URL**：https://angelfish-observant-modified.ngrok-free.dev

**啟動方式（每次重開機後需執行）**：

```bash
# 1. 啟動後端（port 3001）
cd ~/Desktop/private/backend
PATH=/opt/homebrew/bin:/opt/homebrew/Cellar/node/25.5.0/bin:$PATH PORT=3001 node server.js &

# 2. 開 ngrok tunnel
ngrok http 3001
```

**注意**：`node` 路徑需包含 `/opt/homebrew/Cellar/node/25.5.0/bin/`，否則 command not found。

---

## 資料庫

- 位置：`~/Desktop/private/backend/chatrank.db`
- 內容：17 users，7 posts（截至 2026-05-13）
- 狀態：正常運行中

---

## 功能

| 功能 | 狀態 |
|------|------|
| 動態牆（熱門/最新排序） | ✅ |
| 發文、刪除、按讚、留言 | ✅ |
| 活動系統 | ✅ |
| Gravity 排序（0.5~3.0 可調） | ✅ |
| Rate Limit | ✅ |
| CSRF + JWT 驗證 | ✅ |
| 皮膚解鎖系統 | ✅ |

---

## Bug 修復紀錄

| # | 問題 | 修復 |
|---|------|------|
| #1 | CSRF token 失效 | HMAC-SHA256，綁定 userId，24h 有效 |
| #2 | likedSet key type 錯誤 | 統一 `"userId:postId"` 字串格式 |
| #3 | Race condition | likedSet 檢查 + 資料庫事務隔離 |
| #4 | comment-btn 無效 | 事件監聽器 attach 時機修正 |
| #5 | router user case 未處理 | 未登入引導至登入頁 |
| #6 | 刪文後未更新畫面 | 刪除後主動移除 DOM |
| #7 | Rate limit key 誤用 IP | 改用 userId（ngrok 共用 IP 問題） |

詳見 `v1-chatrank-debug-patterns` 技能文件。

---

## FRONTEND_PATH 設定

`~/Desktop/private/backend/server.js` 內：

```js
const FRONTEND_PATH = path.join(__dirname, '..', '..', 'Oren_own', 'docs', 'homework', 'CCC作業天地', '網頁設計', 'chatrank-web');
```

若 `chatrank-web` 資料夾被改名，需同步更新此路徑。

---

*最後更新：2026-05-13*
