# Activity — 活動管理模組

## 設計原則

活動是一個獨立的 Plugin，但核心的報名資料表在 Core Schema 裡。\
活動可以有：`start_at`、`end_at`、`location`、`max_participants`、`registration_deadline`。

---

## 資料模型

```sql
activities
├── id
├── post_id         FK → posts（活動說明帖，可為空）
├── school_id
├── department_id   可為空（系所範圍活動）
├── class_id        可為空（班級範圍活動）
├── organizer_id    FK → users
├── title
├── description     TEXT
├── activity_type   'workshop' | 'competition' | 'meeting' | 'trip' | 'other'
├── start_at        UTC
├── end_at          UTC
├── location
├── max_participants  人數上限（NULL = 不限）
├── registration_deadline  UTC
├── is_public       boolean（是否出現在全校/跨校列表）
├── requires_confirmation  boolean（報名後是否需要老師確認）
├── status          'draft' | 'open' | 'closed' | 'cancelled'
└── created_at

activity_registrations
├── id
├── activity_id
├── user_id
├── status          'registered' | 'waitlist' | 'cancelled' | 'attended' | 'absent'
├── confirmation_status  'pending' | 'confirmed' | 'rejected'
├── registered_at
├── confirmed_at
└── checked_in_at   報到時間（活動當天）
```

---

## 名額控管邏輯

```
報名時：
  IF max_participants IS NULL
    → 直接 registered
  ELSE
    IF 已報名人數 < max_participants
      → registered
    ELSE
      → waitlist（候補）
```

取消報名時，自動遞補：
```sql
UPDATE activity_registrations
SET status = 'registered'
WHERE activity_id = ? AND status = 'waitlist'
ORDER BY registered_at ASC
LIMIT 1;
```

---

## 跨校活動

若 `is_public = true` 且 visibility 為 `org`，則跨組織可見：
```sql
JOIN organizations ON activities.org_id = org_members.org_id
WHERE org_members.school_id = ? AND activities.is_public = true
```

---

## API Endpoints

```
GET    /api/activities              列表（過濾：school_id, department_id, class_id, type, status）
POST   /api/activities             建立活動
GET    /api/activities/:id         詳情
PATCH  /api/activities/:id        更新
DELETE /api/activities/:id        取消

POST   /api/activities/:id/register   報名
DELETE /api/activities/:id/register   取消報名
PATCH  /api/activities/:id/check-in   報到（老師/工作人員用）

GET    /api/activities/:id/registrations  報名列表
PATCH  /api/activities/:id/registrations/:user_id  確認/拒絕報名（老師）
```

---

*文件版本：2026-04-25*
