# Notifications — 訊息與通知系統

## 設計原則

兩種推送方式混合：
- **WebSocket（Socket.IO）** — 用戶有開網頁時，即時推送
- **資料庫 + Badge** — 用戶不在線時，留記錄，回來後看到「你有 3 條未讀」

---

## 觸發時機

| 事件 | 通知誰 | 類型 |
|------|--------|------|
| 有人回覆我的文章 | 文章作者 | `reply` |
| 有人回覆我的留言 | 留言作者 | `reply` |
| 老師發行政確認 | 班級成員 | `confirmation` |
| 有人按讚我的文章 | 文章作者 | `like` |
| AI 標記新文章 | 輔導室/Counselor | `ai_alert` |
| 帳號被刪除/內容被刪 | 被影響者 | `system` |
| 報名成功/失敗 | 報名者 | `activity` |
| 跨校公告（所屬org有新帖）| 組織成員校的所有人 | `announcement` |

---

## 通知儲存

```sql
notifications
├── id
├── user_id          通知擁有者
├── type             'reply' | 'like' | 'confirmation' | 'ai_alert' | 'system' | 'announcement'
├── title            通知標題
├── body             通知內容（可含 HTML）
├── data             JSON — 攜帶 link / action 所需的額外資料
│   └── 例如：{ "post_id": 123, "comment_id": 456, "action": "open_post" }
├── is_read          boolean
└── created_at       UTC
```

前端收到 WebSocket 通知後，直接 append 到通知列表，不需要刷新。

---

## WebSocket 事件

```
Client → Server
  handshake（JWT 驗證）
  join_room(user_id)

Server → Client（觸發後即時推）
  'notification:new'    → 新通知
  'notification:read'   → 已讀更新
  'post:new'            → 自己的看板有新文章（可選擇開啟）
  'activity:update'     → 報名狀態變更
```

---

## 推播設定（Push Notification）

```sql
devices
├── id
├── user_id
├── platform    'ios' | 'android' | 'web'
├── push_token  APNs / FCM / Web Push token
├── is_active
└── last_active_at
```

Counselor 的 `ai_alert` 通知：預設開啟。\
一般使用者可以自行關閉特定通知類型（存在 user.settings 裡）。

---

## 未讀 Badge 計算

```sql
SELECT COUNT(*) FROM notifications
WHERE user_id = ? AND is_read = false;
```

---

## API Endpoints

```
GET    /api/notifications           取得通知列表（分頁，含未讀數）
PATCH  /api/notifications/:id/read  標記已讀
PATCH  /api/notifications/read-all  全部已讀
DELETE /api/notifications/:id       刪除通知
GET    /api/notifications/unread-count  未讀數
WebSocket: /socket.io               Socket.IO endpoint
```

---

## 效能優化

- 每 user 只留最近 100 條通知，舊的 archive 到 `notifications_archive`
- 大型學校（10000+ users）通知用 Redis queue 批次處理
- AI alert 单独 queue，不跟一般通知搶資源

---

*文件版本：2026-04-25*
