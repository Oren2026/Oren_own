# CCC 作業天地

> 課堂作業存放處。從 2026-03-04 起，記錄每一份繳交的作品與演化軌跡。

---

## 📁 資料夾結構

```
CCC作業天地/
├── README.md              ← 本檔（作業總覽）
├── index.html             ← 入口首頁（所有作業一覽）
│
├── 網頁設計/              ← 網頁設計相關作業
│   ├── HW5/               ← 網頁日誌系統（v1.0 → v2.1 完整演化）
│   │   ├── v1.0/ ~ v1.3/ ← 純前端版（SQLite / sql.js）
│   │   ├── v2.0/         ← Node.js 後端對照版（bcrypt + JWT）
│   │   └── v2.1/         ← Node.js + Morgan + 統一錯誤處理
│   ├── HW6/               ← JavaScript 練習（quiz + practice）
│   ├── HW7/               ← Blog JS 作業
│   └── 期中作業-活動留言板/ ← 活動留言板（Node.js 後端）
│
└── 系統程式/              ← 系統程式相關作業
    ├── HW1/               ← while 迴圈與指標
    ├── hw2/               ← CalcLang 直譯器與編譯器
    ├── hw3/               ← Solang 強化編譯器
    ├── HW4/               ← Orenbook 互動式讀書報告
    ├── sp_HW_5/           ← Thread 執行緒與同步機制
    ├── sp_HW_6/           ← Fork 與檔案系統
    └── README.md          ← 黑皮與黑輪的協作邏輯
```

---

## 📋 作業列表

### 系統程式

| 作業 | 授課老師 | 日期 | 說明 | 狀態 |
|------|---------|------|------|------|
| [HW1](./系統程式/HW1/) | CCC | 2026-03-04 | while 迴圈與指標 | ✅ 完成 |
| [hw2](./系統程式/hw2/) | CCC | 2026-03-11 | CalcLang 直譯器與編譯器 | ✅ 完成 |
| [hw3](./系統程式/hw3/) | CCC | 2026-05-28 | Solang 強化編譯器 | ✅ 完成 |
| [HW4](./系統程式/HW4/) | CCC | 2026-03-25 | Orenbook 互動式讀書報告 | ✅ 完成 |
| [sp_HW_5](./系統程式/sp_HW_5/) | CCC | 2026-04-22 | Thread 執行緒與同步機制 | ✅ 完成 |
| [sp_HW_6](./系統程式/sp_HW_6/) | CCC | 2026-04-23 | Fork 與檔案系統 | ✅ 完成 |
| [期中 — Evolution](https://github.com/Oren2026/Evolution/tree/os) | CCC | 2026-04-08 | AI 進化與群體協作 | ✅ 完成 |

### 網頁設計

| 作業 | 授課老師 | 日期 | 說明 | 狀態 |
|------|---------|------|------|------|
| [HW5](./網頁設計/HW5/) | CCC | 2026-03-27 | 網頁日誌系統（v1.0 → v2.1） | ✅ 完成 |
| [HW6](./網頁設計/HW6/) | CCC | — | JavaScript 練習（quiz + practice） | ✅ 完成 |
| [HW7](./網頁設計/HW7/) | CCC | — | Blog JS 作業 | ✅ 完成 |
| [期中 — 活動留言板](./網頁設計/期中作業-活動留言板/) | CCC | — | 活動留言板（Node.js 後端） | ✅ 完成 |

---

## 📋 系統程式作業詳情

### HW1 — while 迴圈與指標

系統程式初體驗，熟悉基本語法與 while 迴圈、指標的應用。

### HW2 — CalcLang 直譯器與編譯器

一個強型態靜態語言的完整實作。直譯器直接執行 AST，編譯器輸出 Bytecode 由 Stack VM 執行。含 BNF 語法、Bytecode 指令集、Level 1-5 逐步教學。

```
原始碼 → Tokenizer → Token → Parser → AST → Bytecode → Stack VM → 輸出
```

### HW3 — Solang 強化編譯器

基於 HW2 CalcLang 延伸，加入 fork/exec/print/file/time/rand 等 16 個新 Bytecode 指令（Opcode 13-28）。從計算機升級成腳本語言，可做程序控制、檔案 I/O、時間與亂數。

### HW4 — Orenbook

互動式讀書報告，用 HTML/CSS/JS 做出一本可以翻頁的書。點目錄可跳轉章節，含翻頁動畫與書頁效果。

### sp_HW_5 — Thread 執行緒與同步機制

Race Condition / Mutex / Deadlock 說明文件，含三個互動模擬：銀行存提款（10萬次）、生產者消費者（Semaphore 緩衝區）、哲學家用餐（死結演示）。

### sp_HW_6 — Fork 與檔案系統

fork() 影分身、execvp() 換魂、wait() 收屍。FS 系統層（open/read/write）vs 標準層（fgets/fputs）。I/O Redirection、pipe()、mmap()、socket 完整覆蓋，含互動式 Mini Shell 終端機模擬。

### 期中 — Evolution

AI 進化與群體協作概念展示。

---

## 📋 網頁設計作業詳情

### HW5 — 網頁日誌系統（完整演化鏈）

| 版本 | 日期 | 類型 | 說明 |
|------|------|------|------|
| **v2.1** | 2026-03-27 | 最新 | Morgan 日誌 + 統一錯誤處理 + 試用模式（demo.js）|
| v2.0 | 2026-03-27 | Node.js | bcrypt + JWT + REST API 後端對照 |
| v1.3 | 2026-03-27 | 前端 | DB class 重構 + 參數化查詢（防 SQL injection）|
| v1.2 | 2026-03-27 | 前端 | 作者過濾功能 + 預設文章（4人共10篇）|
| v1.1 | 2026-03-27 | 前端 | 雙面板 Auth Modal + 公開日誌牆 |
| v1.0 | 2026-03-27 | 前端 | 基本 CRUD + 搜尋 |

### HW6 — JavaScript 練習

JavaScript 練習，包含：
- `quiz.html` — 測驗題系統
- `practice.html` — 實作練習
- `data/quiz_questions.js` — 題庫
- `data/practice_questions.js` — 練習題

### HW7 — Blog JS

Blog JS 作業，涵蓋前端 JavaScript 與 DOM 操作練習。

### 期中 — 活動留言板

Node.js 後端活動留言板，含 CRUD 功能。

---

## 💡 維護說明

### 如何新增作業

1. 在 `網頁設計/` 或 `系統程式/` 下建立新資料夾
2. 放上 `index.html` 與 `README.md`
3. 在本 README 的「作業列表」加入一列
4. 將 `index.html` 同步更新

### 如何更新版本（HW5）

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
