# CCC 作業天地

> 課堂作業存放處。從 2026-03-25 起，記錄每一份繳交的作品與演化軌跡。

---

## 📁 資料夾結構

```
CCC作業天地/
├── README.md              ← 本檔（作業總覽）
├── index.html            ← 入口首頁（所有作業一覽）
│
├── 網頁設計/             ← 網頁設計相關作業
│   ├── HW_firstweb0327/ ← 網頁日誌系統（v1.0 → v3.0 完整演化）
│   │   ├── v1.0/ ~ v1.3/ ← 純前端版（SQLite / sql.js）
│   │   ├── v2.0/        ← Node.js 後端對照版（bcrypt + JWT）
│   │   ├── v2.1/        ← Node.js + Morgan + 統一錯誤處理
│   │   └── v3.0/        ← 🌟 最新：追蹤系統 + 亮暗版 + Hash 路由
│   ├── wp_HW_6-javascrip練習/ ← JavaScript 練習（quiz + practice）
│   └── wp_HW_7-blog_js/       ← Blog JS 作業
│
└── 系統程式/             ← 系統程式相關作業
    ├── Orenbook0325/    ← 《機器的喃喃》互動式讀書報告
    └── sp_HW_5/         ← 系統程式綜合習題（race_condition、deadlock、dining_philosophers、producer_consumer、mutex、thread、bank_simulation、ai_collab）
```

---

## 📋 作業列表

| 作業 | 授課老師 | 日期 | 類型 | 狀態 |
|------|---------|------|------|------|
| [sp_HW_5](./系統程式/sp_HW_5/) | CCC | 2026-03-25 | 系統程式綜合習題 | ✅ 完成 |
| [wp_HW_7-blog_js](./網頁設計/wp_HW_7-blog_js/) | CCC | — | Blog JS 作業 | ✅ 完成 |
| [wp_HW_6-javascrip練習](./網頁設計/wp_HW_6-javascrip練習/) | CCC | — | JavaScript 練習 | ✅ 完成 |
| [HW_firstweb0327](./網頁設計/HW_firstweb0327/) | CCC | 2026-03-27 | 網頁日誌系統 | ✅ 完成 |
| [Orenbook0325](./系統程式/Orenbook0325/) | CCC | 2026-03-25 | 互動式讀書報告 | ✅ 完成 |

---

## 📋 系統程式 sp_HW_5

涵蓋以下主題：

| 主題 | 說明 |
|------|------|
| race_condition | 競爭條件說明 |
| deadlock | 死結分析 |
| dining_philosophers | 哲學家就餐問題 |
| producer_consumer | 生產者消費者問題 |
| mutex | 互斥鎖實作 |
| thread | 多線程概念 |
| bank_simulation | 銀行系統模擬 |
| ai_collab | AI 協作範例 |

---

## 📋 網頁設計 wp_HW_6-javascrip練習

JavaScript 練習，包含：
- `quiz.html` — 測驗題系統
- `practice.html` — 實作練習
- `data/quiz_questions.js` — 題庫
- `data/practice_questions.js` — 練習題

---

## 📋 網頁設計 wp_HW_7-blog_js

Blog JS 作業，涵蓋前端 JavaScript 與 DOM 操作練習。

---

## 🏆 HW_firstweb0327 — 網頁日誌系統

完整演化鏈（從基本 CRUD 到完整後端）：

| 版本 | 日期 | 類型 | 說明 |
|------|------|------|------|
| **v3.0** | 2026-03-27 | 最新 | 追蹤系統 + 亮暗版主題 + Hash 路由 + 設定 Modal |
| v2.1 | 2026-03-27 | Node.js | Morgan 日誌 + 統一錯誤處理 + 試用模式（demo.js）|
| v2.0 | 2026-03-27 | Node.js | bcrypt + JWT + REST API 後端對照 |
| v1.3 | 2026-03-27 | 前端 | DB class 重構 + 參數化查詢（防 SQL injection）|
| v1.2 | 2026-03-27 | 前端 | 作者過濾功能 + 預設文章（4人共10篇）|
| v1.1 | 2026-03-27 | 前端 | 雙面板 Auth Modal + 公開日誌牆 |
| v1.0 | 2026-03-27 | 前端 | 基本 CRUD + 搜尋 |

---

## 📖 Orenbook0325 — 機器的喃喃

互動式讀書報告。用 HTML/CSS/JS 實作一本可以翻頁的書。

**功能：** 點擊目錄跳轉章節、書頁翻頁動畫、響應式版面。

---

## 💡 維護說明

### 如何新增作業
1. 在 `網頁設計/` 或 `系統程式/` 下建立新資料夾
2. 放上 `index.html` 與 `README.md`
3. 在本 README 的「作業列表」加入一列
4. 將本頁面的 `index.html` 同步更新

### 如何更新版本（HW_firstweb0327）
1. 複製最高版本資料夾 → 命名為 `vN.M/`
2. 在新版資料夾中修改程式碼
3. 更新新版資料夾的 `README.md`
4. 在本 README 頂部的「改版日誌」表格加入新列
5. 更新 `index.html` 的版本列表
6. Commit 並 push

---

## 🔗 相關連結

| 資源 | 連結 |
|------|------|
| GitHub | [Oren_own](https://github.com/Oren2026/Oren_own) |
| GitHub Pages | [作業天地首頁](https://Oren2026.github.io/Oren_own/docs/CCC%E4%BD%9C%E6%A5%AD%E5%A4%A9%E5%9C%B0/) |

---

*由 黑皮團隊維護 · 黑皮（學生）· 黑輪（顧問）· 黑客（工程師）*
