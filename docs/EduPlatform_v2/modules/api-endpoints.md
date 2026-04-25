# API Endpoints — 完整端點規劃

## 認證

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/auth/register` | 註冊 |
| POST | `/api/auth/login` | 登入 |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 當前使用者 |
| PATCH | `/api/auth/me` | 更新個人資料 |

---

## 學校 / 系所 / 班級

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/schools` | 學校列表 |
| POST | `/api/schools` | 新增學校（Platform） |
| GET | `/api/schools/:id` | 學校資訊 |
| PATCH | `/api/schools/:id` | 更新學校 |
| GET | `/api/schools/:id/departments` | 系所列表 |
| POST | `/api/schools/:id/departments` | 新增系所 |
| GET | `/api/schools/:id/classes` | 班級列表 |
| POST | `/api/departments/:id/classes` | 新增班級 |
| GET | `/api/departments/:id` | 系所資訊 |
| PATCH | `/api/classes/:id` | 更新班級 |

---

## 使用者

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/users/:id` | 使用者資料 |
| GET | `/api/users/:id/posts` | 使用者的文章 |
| GET | `/api/schools/:id/members` | 學校成員列表 |
| POST | `/api/users/invite` | 邀請成員（School_Admin） |

---

## 角色

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/roles` | 我的所有角色 |
| POST | `/api/roles` | 指派角色（School_Admin） |
| DELETE | `/api/roles/:id` | 移除角色 |
| GET | `/api/users/:id/roles` | 使用者的所有角色 |

---

## 文章（Posts）

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/posts` | 文章列表（支援過濾：school_id, class_id, tag, visibility） |
| POST | `/api/posts` | 發布文章 |
| GET | `/api/posts/:id` | 文章詳情 |
| PATCH | `/api/posts/:id` | 編輯文章 |
| DELETE | `/api/posts/:id` | 刪除文章 |
| POST | `/api/posts/:id/like` | 按讚 |
| DELETE | `/api/posts/:id/like` | 取消按讚 |
| GET | `/api/posts/:id/comments` | 留言列表 |
| POST | `/api/posts/:id/comments` | 留言 |

---

## Tags

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/tags` | 標籤列表（可過濾 type, school_id） |
| POST | `/api/tags` | 新增標籤 |
| GET | `/api/tags/:slug` | 標籤詳情（含使用統計） |

---

## 活動（Activities）

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/activities` | 活動列表 |
| POST | `/api/activities` | 建立活動 |
| GET | `/api/activities/:id` | 活動詳情 |
| PATCH | `/api/activities/:id` | 更新活動 |
| DELETE | `/api/activities/:id` | 取消活動 |
| POST | `/api/activities/:id/register` | 報名 |
| DELETE | `/api/activities/:id/register` | 取消報名 |
| PATCH | `/api/activities/:id/check-in` | 報到 |
| GET | `/api/activities/:id/registrations` | 報名列表 |
| PATCH | `/api/activities/:id/registrations/:userId` | 確認/拒絕 |

---

## 行政確認（Confirmations）

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/confirmations` | 我的確認事項列表 |
| POST | `/api/confirmations` | 發起確認事項 |
| GET | `/api/confirmations/:id` | 詳情 |
| PATCH | `/api/confirmations/:id` | 更新 |
| DELETE | `/api/confirmations/:id` | 刪除 |
| GET | `/api/confirmations/:id/responses` | 所有回覆 |
| POST | `/api/confirmations/:id/respond` | 回覆 |
| GET | `/api/confirmations/:id/stats` | 統計 |

---

## 通知（Notifications）

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/notifications` | 通知列表（分頁） |
| PATCH | `/api/notifications/:id/read` | 標記已讀 |
| PATCH | `/api/notifications/read-all` | 全部已讀 |
| DELETE | `/api/notifications/:id` | 刪除通知 |
| GET | `/api/notifications/unread-count` | 未讀數 |

---

## AI 警示

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/ai-alerts` | 警示列表（Counselor） |
| GET | `/api/ai-alerts/:id` | 詳情 |
| PATCH | `/api/ai-alerts/:id` | 處理 |
| POST | `/api/internal/ai/analyze` | 分析內容（AI Service） |

---

## 審計日誌

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/audit-log` | 日誌列表（School_Admin+） |
| GET | `/api/audit-log/:id` | 詳情 |
| POST | `/api/audit-log/export` | 匯出 |
| POST | `/api/internal/audit/log` | 記錄動作（內部） |

---

## 內部 API（系統間呼叫）

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/internal/ai/analyze` | 內容安全分析 |
| POST | `/api/internal/audit/log` | 新增審計日誌 |
| GET | `/api/internal/health` | 健康檢查 |

---

## WebSocket（Socket.IO）

| Event | Direction | 說明 |
|--------|-----------|------|
| `join` | Client→Server | 加入 user room |
| `notification:new` | Server→Client | 新通知 |
| `notification:read` | Server→Client | 已讀更新 |
| `post:new` | Server→Client | 新文章（可選訂閱） |
| `activity:update` | Server→Client | 報名狀態變更 |
| `confirmation:progress` | Server→Client | 確認進度更新 |

---

## 錯誤回應格式

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "您沒有權限執行此操作",
    "details": {}
  }
}
```

錯誤碼：`UNAUTHORIZED` / `FORBIDDEN` / `NOT_FOUND` / `VALIDATION_ERROR` / `RATE_LIMITED` / `INTERNAL_ERROR`

---

*文件版本：2026-04-25*
