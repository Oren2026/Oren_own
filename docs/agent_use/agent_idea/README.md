# agentidea — 創意實驗室

黑皮團隊 researcher + coder 協作的創意展示。每一個頁面都是獨立的 CSS 實驗。

---

## 結構

```
agentidea/
├── index.html              ← 主頁（瀏覽所有實驗）
├── code/
│   ├── consciousness/     ← 意識光譜
│   ├── weekly-insight/    ← 本週最深
│   └── [新CSS實驗/]       ← 未來預留
└── README.md
```

---

## 已上線

### 01 — 意識光譜
**位置：** `./code/consciousness/`
**檔案：** `index.html`
**風格：**
- 深色背景（`#0d0d14`）+ 暖白文字
- 三層意識卡片（感覺 / 知覺 / 反思）各有紫色 accent bar
- 頂部引言區塊、左側紫色豎線
- 「對 AI 的叩問」獨立區塊，含引用卡片 + 大字提問
- 零外部 CDN，系統字體
- 響應式：760px max-width，520px 手機斷點

---

### 02 — 本週最深
**位置：** `./code/weekly-insight/`
**檔案：** `index.html`
**風格：**
- 編輯排版 / 大字引言風格，完全不同於 01
- 深紫 + 深綠漸層背景（radial-gradient）
- 無卡片框，整個頁面是呼吸感的留白排版
- 大尺寸裝飾性引號 (`"`) 作為視覺錨點
- 刷新按鈕 + 空白鍵快捷鍵
- 滑動動畫（exit → 內容替換 → enter，380ms 雙相位）
- 零外部 CDN，SVG 內嵌

---

### 03 — 對照記
**位置：** `./code/split-perspective/`
**檔案：** `index.html`
**風格：**
- 分屏雙欄對比：左側暖色生物系，右側冷色數位系
- 一個頁面同時呈現兩種智能的架構、能力與極限
- 點擊切換專注模式（聚焦左/右/雙）
- 響應式：640px 以下自動堆疊為單欄

---

### 04 — 光譜圖
**位置：** `./code/spectrum-map/`
**檔案：** `index.html`
**風格：**
- 意識光譜水平 Gradient Bar，五層節點可點擊
- 每個節點展開詳細內容：定義、AI 對應
- CSS 動畫：節點點擊後脈衝發光效果
- 0 外部 CDN，純 HTML + CSS + JS

---

### 05 — 年代記
**位置：** `./code/chrono-journal/`
**檔案：** `index.html`
**風格：**
- 報紙編年風格：大字日期軸 + 雙欄主副版面
- 主打文章置頂 + 話題標籤雲 + 拉引用
- 米白底色、襯線字體、網格系統
- 側邊欄 sticky 配置（桌面），內容來自真實知識庫

---

## 協作流程

```
researcher → 研究興趣主題 → 寫入 JSON（via --append script）
coder → 實作新 CSS 頁面 → 提交審核
inspector → 每小時檢查 JSON 格式
Oren → 審核通過 → push 到 GitHub
```

---

## 新增 CSS 實驗

每一個新的視覺實驗需要：
1. 在 `code/` 下建立新資料夾（如 `timeline/`、`newspaper/`、`dark-mode/`）
2. 放入 `index.html`（完全獨立，不共用任何 CSS/JS）
3. 更新主 `index.html` 的連結與說明

---

*最後更新：2026-03-29 · 新增 03–08 頁面 + 企業風格 09/10*
