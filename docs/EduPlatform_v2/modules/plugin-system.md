# Plugin System — 模組化擴充機制

## 設計原則

Core System 保持穩定、不改動。\
新功能透過 Plugin 擴充，Plugin 可以獨立開發、測試、部署。

---

## Plugin 結構

每個 Plugin 是獨立的目錄：

```
plugins/plugin-calendar/
├── SKILL.md              ← Plugin 規格文件（入口）
├── metadata.json          ← Plugin 中繼資料
├── db/
│   └── migrations/        ← Plugin 自己的 DB migrations
│       └── 001_initial.sql
├── server/
│   ├── index.js          ← Plugin 入口，註冊 routes
│   ├── routes/
│   │   ├── calendar.js
│   │   └── events.js
│   └── services/
│       └── calendarService.js
├── client/
│   ├── page.html          ← Plugin 前端頁面
│   ├── calendar.css
│   └── calendar.js
└── admin/
    └── panel.html         ← 管理介面（學校管理員用）
```

---

## metadata.json

```json
{
  "name": "plugin-calendar",
  "version": "1.0.0",
  "display_name": "行事曆",
  "description": "班級/系所/學校行事曆，含農曆支援",
  "author": "EduPlatform Team",
  "dependencies": ["core"],
  "permissions": ["calendar:read", "calendar:write"],
  "settings_schema": {
    "show_holidays": { "type": "boolean", "default": true },
    "show_lunar_calendar": { "type": "boolean", "default": false }
  }
}
```

---

## Plugin 註冊（Core 載入）

Core 啟動時：

```javascript
// core/loader.js
const fs = require('fs');
const path = require('path');

const plugins = fs.readdirSync('./plugins')
  .filter(p => fs.statSync(`./plugins/${p}`).isDirectory());

plugins.forEach(pluginName => {
  const meta = require(`./plugins/${pluginName}/metadata.json`);
  const entry = require(`./plugins/${pluginName}/server/index.js`);

  // 註冊 routes
  app.use(`/plugins/${pluginName}`, entry.routes);

  // 註冊 admin panel
  adminPanels.push({
    name: pluginName,
    displayName: meta.display_name,
    path: `/plugins/${pluginName}/admin/panel.html`
  });

  // 執行 DB migrations（if not yet run）
  runMigrations(pluginName, meta.version);
});
```

---

## Plugin 可用擴充點

| 擴充點 | 說明 | 範例 |
|--------|------|------|
| `routes` | 新增 API routes | plugin-calendar 的 `/calendar` |
| `nav` | 左側導覽新增項目 | 行事曆出現在 nav |
| `post_detail_actions` | 文章詳情頁面的 action 按鈕 | 行程報名 |
| `notification_handler` | 處理特定 notification type | 行程提醒 |
| `admin_panel` | 學校管理員後台面板 | 行事曆設定頁面 |
| `on_post_create` | 文章建立時的 hook | 自動建立行事曆事件 |
| `on_user_login` | 使用者登入後的 hook | 個人化開團提醒 |

---

## Plugin 清單（規劃中）

| Plugin | 說明 | 優先度 |
|--------|------|--------|
| `plugin-calendar` | 行事曆，含農曆、學校假期 | 高 |
| `plugin-vote` | 投票/公投 | 中 |
| `plugin-activity` | 活動報名（加強版，含報到） | 高（核心已有） |
| `plugin-confirm` | 行政確認流程 | 高（核心已有） |
| `plugin-announcement` | 學校公告（可置頂） | 中 |
| `plugin-anonymous-report` | 匿名反映（霸凌防治） | 高 |
| `plugin-message` | 一對一私信（Line 風格） | 低 |
| `plugin-school-site` | 學校官網頁面（未來） | 低 |

---

## Plugin 間通訊

Plugin 可以依賴其他 Plugin：

```json
{
  "dependencies": ["core", "plugin-calendar"]
}
```

使用 Event Emitter：
```javascript
// core/eventBus.js
const EventEmitter = require('events');
const eventBus = new EventEmitter();

module.exports = eventBus;

// plugin-activity 發事件
eventBus.emit('activity:registered', { userId, activityId });

// plugin-calendar 監聽
eventBus.on('activity:registered', ({ userId, activityId }) => {
  // 自動加入行事曆
});
```

---

*文件版本：2026-04-25*
