# School Structure — 學校 / 系所 / 班級結構

## 設計原則

三層結構讓資料天然隔離：
1. **School** — 學校是最大隔離單元（各校資料在 DB 層就分開）
2. **Department** — 系所是行政分組（跨系活動時用 tag + org 機制處理）
3. **Class** — 班級是最小的互動單位（日常討論、活動、行事曆都在這）

---

## 資料模型

```sql
schools
├── id                  主鍵
├── organization_id     隸屬跨校組織（可為空）
├── name               完整校名（例：「國立金門大學」）
├── short_name         簡稱（例：「金大」）
├── logo_url           學校 Logo
├── country_code       ISO 3166-1（TW / US / JP...）
├── system_type        'taiwan_k12' | 'taiwan_university' | 'us_k12' | 'ib' | 'other'
├── timezone           IANA timezone（Asia/Taipei / America/New_York...）
├── data_residency     資料主機位置（tw | us | eu | jp）
├── gdpr_compliant     boolean（EU 學校需要）
├── data_retention_days  法規要求保留天數
├── audit_log_enabled   boolean
├── settings            JSON（學校自訂設定）
├── is_active
└── created_at

departments
├── id
├── school_id          FK → schools
├── name               系所名（例：「資訊工程學系」）
├── college_name       學院名（例：「理工學院」，可為空）
├── short_code         簡稱（例：「資工系」）
└── is_active

classes
├── id
├── department_id      FK → departments
├── name               班級名（例：「大一不分系」、「高三A」）
├── semester           '1' | '2' | 'summer'
├── class_code         行政代碼（例：「1A」）
├── academic_year      學年度（112, 113...）
├── enrollment_year    這屆學生入學年（用來動態算年級）
├── settings            JSON
└── is_active

users
├── status             'active' | 'graduated' | 'transferred' | 'suspended'
├── enrolled_year      入學年（手動或 bulk import 填入）
├── graduated_at       nullable
└── left_reason        'graduated' | 'transferred' | 'dropped'
```

---

## 學年與年級計算（動態）

不再用靜態 `year` 欄位。`enrollment_year` 決定學生何時入學，`current_grade` 由 SQL 公式自動算出。

### SQL 視圖：計算目前年級

```sql
CREATE VIEW v_user_grades AS
SELECT
  u.id AS user_id,
  u.class_id,
  c.enrollment_year,
  c.academic_year,
  s.system_type,
  -- 大學：YEAR(NOW()) - enrollment_year + 1
  -- K12 小一入學年齡約 7 歲
  CASE
    WHEN s.system_type = 'taiwan_university'
      THEN YEAR(CURDATE()) - c.enrollment_year + 1
    WHEN s.system_type = 'taiwan_k12'
      THEN YEAR(CURDATE()) - c.enrollment_year + 7  -- 小一入學年 = 今年 - (現在年級-1)
    WHEN s.system_type = 'us_k12'
      THEN YEAR(CURDATE()) - c.enrollment_year + 5   -- Kindergarten = 5歲
    ELSE NULL
  END AS current_grade
FROM users u
JOIN classes c ON u.class_id = c.id
JOIN schools s ON u.school_id = s.id
WHERE u.status = 'active';
```

### 每年自動畢業（Cron Job）

```javascript
// 每學年 6/30 執行：把狀態改為 graduated
// 這次之後使用者不再是 active，但所有歷史 record 都保留
cron('0 0 30 6 *', async () => {
  await db.query(`
    UPDATE users
    SET status = 'graduated', graduated_at = NOW()
    WHERE class_id IN (
      SELECT id FROM classes WHERE academic_year = ?
    )
    AND status = 'active'
  `, [currentAcademicYear]);
});
```

### 新生入學流程

1. School_Admin 在後台 bulk import CSV（學號、姓名、班級）
2. `enrolled_year = 當年學年度`（自動帶入）
3. `current_grade = 1`（由公式計算）
4. 不用任何 script

---

## Visibility 與資料可見範圍

```
visibility 層級：
├── 'public'       — 全平台可見（需有對應 tag 限制）
├── 'school'      — 整個學校
├── 'department'  — 系所內
├── 'class'       — 班級內（最嚴格，私人討論）
└── 'org'         — 跨組織（自動對應 org_id）
```

實作：
```sql
-- 取一個 user 能看到的 posts
SELECT * FROM posts
WHERE school_id = ?
  AND visibility IN ('public', 'school', 'department', 'class')
  AND (
    visibility = 'class' AND class_id IN (使用者所屬班級IDs)
    OR visibility = 'department' AND department_id = 使用者所屬系ID
    OR visibility = 'school'
    OR visibility = 'public'
  )
```

---

## 跨系互動（不靠層級，靠 Tags）

> 「理工學院有共同比賽，資工系和食品系學生可以在這裡組隊」

不是靠建立跨系班級，而是靠 **visibility + tags**：

```
發文：
  visibility = 'department'（或 'school'）
  tags = ['#理工學院', '#跨系合作', '#黑客松']

資工系學生 → 看到（同一 department_id）
食品系學生 → 搜 #理工學院 → 也能找到
```

**跨系文章不走 class 層級，走的是 visibility=school + tags。**

---

## 管理操作

| 操作 | 所需角色 |
|------|---------|
| 建立學校 | Platform |
| 新增系所 | School_Admin |
| 新增班級 | School_Admin / Teacher (Class_Admin) |
| 邀請老師入校 | School_Admin |
| 邀請學生/家長 | School_Admin / Class_Admin (Teacher) |
| 修改學校設定 | School_Admin |

---

## API Endpoints

```
GET    /api/schools                  全校列表（分頁）
POST   /api/schools                  新增學校（Platform）
GET    /api/schools/:id              學校資訊
PATCH  /api/schools/:id              更新學校設定
GET    /api/schools/:id/departments 系所列表
POST   /api/schools/:id/departments 新增系所
GET    /api/schools/:id/classes      班級列表
POST   /api/departments/:id/classes  新增班級
GET    /api/departments/:id          系所資訊
PATCH  /api/classes/:id             更新班級設定
```

---

## v1 → v2 Migration 注意

v1 沒有 `school_id`/`class_id` 欄位，v2 直接加：

```sql
ALTER TABLE posts ADD COLUMN school_id INT NOT NULL DEFAULT 1;
ALTER TABLE posts ADD COLUMN class_id INT DEFAULT NULL;
-- 之後 data migration 把現有 posts 歸到預設學校
```

---

*文件版本：2026-04-25*
