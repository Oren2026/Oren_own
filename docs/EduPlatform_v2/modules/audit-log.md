# Audit Log — 審計日誌

## 設計原則

所有涉及資料存取、修改的動作都需要記錄。\
主要用途：
1. **法規遵循**：家長刪除孩子資料，需要上傳雲端留存
2. **霸凌/騷擾調查**：保全證據
3. **系統安全**：誰在何時看了哪些內容
4. **平台運營**：了解用戶行為

---

## 資料模型

```sql
audit_log
├── id
├── school_id       發生的學校（可為空，全域操作時）
├── user_id         被操作的對象（可為空）
├── actor_id        執行操作的人（可為空，系統自動觸發時）
├── action          'view' | 'create' | 'update' | 'delete' | 'export' | 'login' | 'logout'
├── resource_type   'post' | 'comment' | 'user' | 'activity' | 'confirmation' ...
├── resource_id     具體資源 ID
├── old_value       JSON（修改前的值，delete/update 時）
├── new_value       JSON（修改後的值，create/update 時）
├── ip_address
├── user_agent
├── country_code    IP 國別
└── created_at      UTC（精確到毫秒）
```

---

## 記錄時機

| 情境 | action | 記錄內容 |
|------|--------|---------|
| 任何人看了一篇私人文章 | `view` | user_id（誰看）+ resource |
| 老師刪除學生文章 | `delete` | actor（老師）+ 被刪內容（old_value） |
| 家長要求刪除孩子帳號 | `delete` | actor + user_id（孩子）+ 刪除原因 |
| Counselor 看 AI 警示 | `view` | actor（C港澳selor）+ alert |
| 匯出班上成績 | `export` | actor + 資料範圍 |
| 登入/登出 | `login` / `logout` | user_id |

---

## 法規需求：刪除資料上傳

當家長要求刪除孩子帳號（依個資法）時：

```sql
-- 1. 查詢該使用者的所有資料
SELECT * FROM audit_log WHERE user_id = ?;

-- 2. 產生法規報告 JSON
{
  "student_name": "王小明",
  "deleted_at": "2026-04-25T10:30:00Z",
  "deleted_by": "parent_guardian_id",
  "data_export_url": "https://cloud-storage/...",
  "school_name": "金門高中",
  "data_categories": ["posts", "comments", "activities"]
}

-- 3. 上傳至法律機構儲存（WebDAV / S3）
-- 4. 學校簽署刪除同意書（未來鉤稽）
```

---

## API Endpoints

```
GET    /api/audit-log                    列表（School_Admin 以上）
       ?school_id=1&user_id=5&action=delete&from=2026-01-01&to=2026-04-25
GET    /api/audit-log/:id               詳情
POST   /api/audit-log/export            匯出（CSV/JSON，School_Admin）
       Body: { "filters": {...}, "format": "csv" }

# 內部 API
POST   /api/internal/audit/log          記錄新動作（Core 內部呼叫）
```

---

## 保留期限

根據 `schools.data_retention_days` 和當地法規：

```sql
-- 自動刪除過期日誌（每週跑一次 cron）
DELETE FROM audit_log
WHERE school_id = ?
  AND created_at < NOW() - INTERVAL '1 year'
  AND data_residency = 'tw';
```

EU 學校的 `gdpr_compliant = true` 時，縮短保留期限並啟用「被遺忘的權利」（帳號刪除後相關日誌也需處理）。

---

*文件版本：2026-04-25*
