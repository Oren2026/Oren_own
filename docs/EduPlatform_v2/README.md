# EduPlatform v2 — 教育社群平台架構文件

> 讓學校、社群、教育者、家長在同一個平台協作。
> 以學校為基礎，以教育為核心，以模組化為擴充原則。

---

## 📐 系統分層總覽

```
┌─────────────────────────────────────────────────────────┐
│  Platform（平台層）                                      │
│   └── 跨校組織 Organizations                             │
│        └── Schools（學校）                               │
│             └── Departments（系所/學院）                 │
│                  └── Classes（班級）                    │
│                       └── Users（各角色成員）           │
│                                                         │
│  Plugins（可插拔功能）                                   │
│  Core Services（核心服務）                              │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 實體關係圖（ERD）

![ERD](./EduPlatform_v2_ERD.png)

---

## 🗃️ 資料模型（Schema）

### 核心資料表

| 資料表 | 說明 |
|--------|------|
| `platform` | 平台本身（未來多租戶時用） |
| `organizations` | 跨校組織（大學網絡、聯盟、國際組織） |
| `org_members` | 組織成員學校 |
| `schools` | 學校（第一隔離層） |
| `departments` | 系所/學院（第二隔離層） |
| `classes` | 班級（第三隔離層） |
| `users` | 使用者（角色型別：platform / school_admin / counselor / teacher / student / parent） |
| `student_guardians` | 學生與監護人關係 |
| `user_roles` | 多維度角色賦予（school / department / class 各自有角色） |
| `posts` | 發文（visibility 控制誰可見） |
| `tags` | 標籤系統（官方/校內/跨校） |
| `post_tags` | 發文與標籤關聯 |
| `comments` | 留言（支援回覆鍊） |
| `post_likes` / `comment_likes` | 按讚 |
| `activities` | 活動（報名有名額控管） |
| `activity_registrations` | 報名狀態 |
| `confirmations` | 行政確認（向上/向下） |
| `confirmation_responses` | 確認回覆 |
| `notifications` | 通知系統 |
| `devices` | 推播 token（Web / iOS / Android） |
| `ai_alerts` | AI 標記（霸凌/自傷/騷擾） |
| `audit_log` | 法規遵循審計日誌、可控的歷史調閱例外通道 |

---

## 🔑 核心設計決策（已確認）

| 決策 | 選擇 |
|------|------|
| 跨校身份 | **不做全局 ID**，升學後 Fresh Start |
| 歷史記錄例外調閱 | Counselor 發起→學生+家長雙同意→只給摘要→audit_log 全程記錄 |
| 年級計算 | 動態（`enrollment_year` + SQL 公式，不每年跑 script） |
| 畢業處理 | Cron Job 自動改 `status='graduated'`，歷史記錄全保留 |

---

## 🎭 角色權限矩陣

| 動作 | Platform | School_Admin | Counselor | Teacher | Student | Parent |
|------|----------|-------------|-----------|---------|---------|--------|
| 看全校公開帖 | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| 看班級帖 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓(自家小孩) |
| 看跨系/跨校帖 | ✓ | ✓ | ✗ | 部分 | 部分 | ✗ |
| 發文（班級） | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ |
| 發文（跨校/官方） | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 留言 | ✓ | ✓ | ✓(AI輔助) | ✓ | ✓ | ✗ |
| 刪自己文章 | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ |
| 刪他人文章 | ✓(平台) | ✓(校內) | ✗ | ✗ | ✗ | ✗ |
| 看到 AI 警示 | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| 報名活動 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 確認行政事項 | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| 管理帳號 | ✓ | ✓(校內) | ✗ | ✗ | ✗ | ✗ |
| 看審計日誌 | ✓ | ✓(校內) | ✗ | ✗ | ✗ | ✗ |

---

## 📌 標籤系統（Tags）

```
標籤類型（tag_type）：
├── official  — 平台官方（#教育部公告 #國際比賽）
├── org      — 跨校組織範圍
├── school   — 校內公告
├── department — 系所範圍
├── user     — 使用者自由建立
└── restricted — 需審核才能使用
```

visibility 組合：
- `public` → 所有人都可見（需配合 tag_type 限制）
- `school` → 校內可見
- `department` → 系所內可見
- `class` → 班級內可見
- `org` → 跨組織可見（自動對應 org_id）

---

## 🌍 國際化（i18n）框架

```
locales/
├── zh-TW.json   繁體中文（預設）
├── zh-CN.json   簡體中文
├── en.json      英文
├── ja.json      日文
└── vi.json      越南文

所有 UI 字串使用 t('key') 而非硬刻。
```

`schools.country_code`（ISO 3166-1）+ `schools.system_type` 決定：
- 預設 UI 語言
- 學制顯示（台灣 K12 / 美國 K12 / IB / 其他）
- 時區（所有時間以 UTC 儲存，展示時轉換為 school.timezone）

---

## 🔌 Plugin 系統

每個 Plugin 是獨立的：

```
plugins/plugin-calendar/
├── SKILL.md              ← plugin 規格文件
├── db.sql                ← 自己的 migrations
├── server/routes.js      ← API routes
├── client/page.html      ← 前端頁面
└── admin/panel.html      ← 管理介面
```

Plugin 裝/拔不影響 Core。Core API 保持穩定。

---

## 📋 模組文檔導覽

| 模組 | 文件 |
|------|------|
| 架構總覽 | 本文件 |
| ERD 圖 | `EduPlatform_v2_ERD.png` |
| 身份驗證與授權 | `modules/auth-rbac.md` |
| 學校/系所/班級結構 | `modules/school-structure.md` |
| 訊息與通知系統 | `modules/notifications.md` |
| 活動管理模組 | `modules/activity.md` |
| 行政確認流程 | `modules/confirmation.md` |
| AI 警示系統 | `modules/ai-alerts.md` |
| 審計日誌 | `modules/audit-log.md` |
| i18n 框架 | `modules/i18n.md` |
| Plugin 擴充機制 | `modules/plugin-system.md` |
| API Endpoints 規劃 | `modules/api-endpoints.md` |

---

## 📁 專案目錄結構

```
EduPlatform_v2/
├── backend/
│   ├── src/
│   │   ├── core/          ← 核心系統（不可動的 stable API）
│   │   │   ├── models/    ← Sequelize ORM models
│   │   │   ├── routes/    ← REST API routes
│   │   │   ├── middleware/
│   │   │   └── services/
│   │   ├── plugins/       ← 各功能 plugin
│   │   └── index.js
│   ├── migrations/        ← DB migrations
│   ├── config/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── locales/       ← i18n JSON
│   │   ├── components/   ← UI components
│   │   └── pages/        ← page modules
│   └── index.html
├── docker-compose.yml    ← 學校自架用
├── docs/
│   ├── EduPlatform_v2_ERD.png
│   └── modules/           ← 各模組詳細文件
└── README.md
```

---

## 🔗 v1 備份

- 前端備份：`../midterm-project/versions/v1_current/`
- 後端備份：`../../backend_v1/`

---

*最後更新：2026-04-25*
