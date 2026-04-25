# Confirmation — 行政確認流程

## 設計原則

老師發一個確認事項（明日戶外教學、疫苗施打通知、期末家長會），家長和學生在期限前回覆「確認」或「不同意」。老師可以看到誰還沒回覆。

---

## 資料模型

```sql
confirmations
├── id
├── school_id
├── class_id
├── confirmation_type   'consent' | 'announcement_read' | 'attendance'
├── title              確認事項標題
├── content            詳細內容（TEXT，可含 HTML）
├── deadline           回覆期限（UTC）
├── target_roles       'student' | 'parent' | 'teacher'（多選，用 JSON array）
├── created_by         FK → users
└── created_at

confirmation_responses
├── id
├── confirmation_id
├── user_id
├── status             'pending' | 'confirmed' | 'rejected'
├── responded_at
└── note               使用者補充（可選）
```

---

## 典型流程

```
老師建立確認事項（戶外教學家長同意書）
  → target_roles: ['parent']
  → deadline: 明日 18:00

家長收到通知（push + WebSocket）
  → 看到標題：「明日戶外教學家長確認」
  → 點進去 → 顯示詳情
  → 選擇「確認」或「不同意（附原因）」
  → 提交

老師後台看到：
  ✅ 王小明家長 - 確認
  ✅ 陳小華家長 - 確認
  ⏳ 李小美家長 - 尚未回覆（落後兩天了）
  ❌ 張大家長 - 不同意（原因：小孩過敏）
```

---

## 即時進度追蹤

老師的班級後台：顯示「已回覆 18/25，6 人待回」。\
透過 WebSocket 即時更新，老師不需要刷新頁面。

---

## API Endpoints

```
GET    /api/confirmations                    列表（自己被通知的）
POST   /api/confirmations                   老師發起確認事項
GET    /api/confirmations/:id               詳情（含回覆進度）
PATCH  /api/confirmations/:id               更新（老師可編輯期限）
DELETE /api/confirmations/:id               刪除（老師可移除）

GET    /api/confirmations/:id/responses     所有回覆（老師用）
POST   /api/confirmations/:id/respond       回覆（家長/學生）
        Body: { "status": "confirmed" | "rejected", "note": "..." }

GET    /api/confirmations/:id/stats         統計（已確認/未回覆/拒絕）
```

---

*文件版本：2026-04-25*
