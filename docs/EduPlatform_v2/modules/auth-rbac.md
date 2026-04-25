# Auth & RBAC — 身份驗證與授權

## 身份認證（Authentication）

### 登入流程
```
使用者輸入 email + 密碼
→ 伺服器驗證 bcrypt hash
→ 產生 JWT（包含 user_id, school_id, role list）
→ JWT 存入 HTTP-only Cookie（防 XSS）
→ 回傳使用者資料（含 role array + locale + timezone）
```

### JWT Payload 結構
```json
{
  "sub": "user_id",
  "school_id": 1,
  "roles": [
    { "scope": "school", "role": "school_admin", "department_id": null, "class_id": null },
    { "scope": "class", "role": "teacher", "department_id": 5, "class_id": 12 }
  ],
  "locale": "zh-TW",
  "exp": 1745616000
}
```

### 未來擴充：Face ID（知名度足夠時）
```
登入 → 人臉辨識 → 確認是本人不是父母拿手機
→ 每次 session 重新驗證（間隔可設定，預設 15 秒）
→ 陌生臉孔 → 通知家長「帳號疑似被他人使用」
```
**現在的架構預留**：`users.face_id_hash` 欄位現在就留，但不做實作。

---

## 角色型別（Roles）

| Role | 說明 |
|------|------|
| `platform` | 平台開發者/系統管理員 |
| `school_admin` | 學校管理員（行政人員） |
| `counselor` | 輔導室/心理師（需 NDA） |
| `teacher` | 老師（含導師） |
| `student` | 學生 |
| `parent` | 家長/監護人 |

---

## 角色賦予（user_roles 表）

一個 user 在同一個 school 裡，可以同時有多個角色：

```sql
-- 老師也是某班的導師
INSERT INTO user_roles (user_id, school_id, department_id, class_id, role)
VALUES (5, 1, 5, 12, 'teacher');

INSERT INTO user_roles (user_id, school_id, department_id, class_id, role)
VALUES (5, 1, 5, 12, 'class_admin');
```

**Scope 邏輯**：
- `scope = "platform"` → 全平台權限（只有平台管理員）
- `scope = "school"` → 整個學校
- `scope = "department"` → 系所範圍
- `scope = "class"` → 班級範圍

---

## 權限檢查流程（Middleware）

```
Request 進入
→ 解析 JWT Cookie
→ 取出 roles array
→ 檢查：此 request 需要的 permission 是否存在於任何一個 role

例如：POST /api/posts
→ 需要 permission: 'post:create'
→ 檢查 user 的所有 roles
→ 如果任何一個 role 有 'post:create' → 允許
→ 如果需要 scope = 'class'，則額外檢查 class_id 是否在 user 的 class 範圍內
```

---

## 家長權限（特殊設計）

家長登入後看到的是「自己小孩」的視角，不是學生視角。

```sql
-- student_guardians 建立關聯
INSERT INTO student_guardians (student_id, guardian_user_id, relationship, is_primary)
VALUES (100, 200, 'parent', true);
```

家長的權限：
- **只看**：自己小孩所在班級的公開討論（visibility=class + 自己是guardian）
- **不做**：不能留言、不能發文
- **只能**：報名活動、對行政事項點確認
- **不能**：看到跨系、跨校、學生私人討論串

---

## NDA 與保密協議

心理師/輔導室角色需要額外授權：

```sql
users.nda_signed_at   -- NULL = 尚未簽署
users.nda_file_url    -- 已簽署的 NDA 文件 URL
```

Counselor 角色的 user 必須 `nda_signed_at IS NOT NULL` 才能使用功能。

---

## 跨校身份原則：Fresh Start（已確認）

學生升學後，**預設舊記錄封存，不帶到新學校**。每個學校的 user 記錄是獨立的，不存在跨校追蹤的全局 ID。

**為什麼不做跨校 identity：**
- 減少系統負擔（不需要建立跨校資料關聯）
- 教育理念：讓青少年有不被過去定義的權利
- 法律風險：跨校資料庫外洩責任更重
- 實務上：多數老師不會真的去看，效益低

**例外通道：受控的歷史調閱（Counselor 專用）**

當 counselor 評估有必要了解學生過去時：

```
Counselor 發起「索取過去記錄」請求
  → 必填理由（進 audit_log）
  → 系統通知：學生本人 + 家長（雙方都要同意）
  → 雙方在平台內電子同意
  → 索取內容：只給「摘要」（高風險事件、特殊需求標記、AI 警示摘要）
  → 所有存取行為記錄進 audit_log（誰、何時、看了什麼）
  → 索取方可看到，但不可下載或轉發
```

實作細節：
- `student_uuid`（全局唯一 ID）：**不做**。users 表靠 `school_id` 隔離，不需要全局身份。
- 升學時：舊 record `status = 'graduated'`，新學校建立全新 record，**兩者不關聯**。
- 要調舊記錄，只能透過例外通道，且需留下 audit_log。

---

## Permission Matrix（精簡版）

| Permission | platform | school_admin | counselor | teacher | student | parent |
|-----------|----------|-------------|-----------|---------|---------|--------|
| post:read:public | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| post:read:school | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| post:read:class | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| post:create | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ |
| post:delete:own | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ |
| post:delete:any | ✓ | ✓(校內) | ✗ | ✗ | ✗ | ✗ |
| comment:create | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| confirmation:respond | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| ai_alert:read | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| user:manage | ✓ | ✓(校內) | ✗ | ✗ | ✗ | ✗ |
| audit_log:read | ✓ | ✓(校內) | ✗ | ✗ | ✗ | ✗ |

---

## API Endpoints

```
POST   /api/auth/register    註冊（需 school_id）
POST   /api/auth/login       登入
POST   /api/auth/logout      登出
GET    /api/auth/me          取得當前使用者資訊
PATCH  /api/auth/me          更新個人資料（密碼改、display_name、locale）

GET    /api/users/:id        取得使用者資料（權限檢查）
GET    /api/schools/:id/members  取得學校成員列表

GET    /api/roles            取得自己的所有角色
POST   /api/roles            管理員指派角色（school_admin 以上）
DELETE /api/roles/:id        移除角色
```

---

*文件版本：2026-04-25*
