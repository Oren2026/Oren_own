# wp_HW_6-javascrip練習 — 開發紀錄

> 這份練習由黑皮與 AI（Hermes）協作開發，記錄從需求對話到實作的完整過程。

---

## 📋 專案概覽

這是 CCC 課堂的 JavaScript 進階練習，分為兩部分：

| 部分 | 類型 | 題目數 | 特色 |
|------|------|--------|------|
| 第一部分 | 選擇題 | 20題庫→每次10題 | 選項亂序、進度跳題、一次結算 |
| 第二部分 | 互動實作題 | 10題 | 變數可控、即時輸出、Syntax Highlight |

---

## 🏗️ 檔案結構

```
wp_HW_6-javascrip練習/
├── index.html              ← 首頁，三張卡片入口
├── quiz.html               ← 第一部分：選擇題
├── practice.html           ← 第二部分：互動實作題
├── README.md               ← 本文件
├── css/
│   └── style.css           ← 共用樣式（亮暗主題）
└── data/
    ├── quiz_questions.js   ← 選擇題題庫（維護在此）
    └── practice_questions.js ← 應用題資料（維護在此）
```

---

## 💬 開發對話紀錄

以下為實作過程中的關鍵決策與迭代。

---

### 第一階段：需求確認

**黑皮提出：**
- 20題選擇題，每次抽10題
- 一次一題，而非一次顯示全部
- 需要進度條且可點擊跳題
- 選完最後一題才對答案，不是每題即時對答案
- 最後顯示「8/10」+「你答對了8題」
- 選項要有動畫（選中變色）
- 可重新測驗

**AI 初始實作：** 用單一 HTML，題目hardcode在JS中。

---

### 第二階段：架構重構（黑皮提出）

黑皮認為：如果未來要增加題目，不會很難維護嗎？如果拆分 JS 跟 JSON 的話會不會更好？

**AI 回應：** 完全正確，題目和邏輯應該分開。

**重構結果：**
- 建立 `data/quiz_questions.js` 放置所有選擇題
- 建立 `data/practice_questions.js` 放置應用題
- `css/style.css` 共用樣式，亮暗主題一體化

---

### 第三階段：第二部分——應用題

**黑皮提出：**
- 第二部分要是「應用題」，不是選擇題
- 每個 JavaScript 做成圖卡，不只顯示程式碼
- 使用者可以調整**變數**觀察函式輸出的變化
- 可以切換亮暗主題

**實作細節：**
- 每張圖卡：題目說明 → 預設程式碼（Syntax Highlight）→ 變數調整區 → 執行輸出
- 使用者可改變變數並即時觀察輸出結果
- 提供「恢復預設」按鈕

---

### 第四階段：Bug 修復

**問題1：選擇題 flicker**
- 原因：每次 `render()` 都 `innerHTML` 重新生成，瀏覽器每次都重跑 `slideIn` 動畫
- 修復：跳題才動畫，純粹換選項只更新 class

**問題2：應用題執行顯示 NaN**
- 原因：render() 裡 input ID 使用 `q.id`（1-10），但 `runQuestion()` 收到的是 array index（0-9），兩邊對不上，抓不到 input 值
- 修復：統一使用 array index 作為 ID

**問題3：選項引號多餘**
- 原因：題目資料中 `"'Hello'"` 會產生雙層引號
- 修復：重寫所有選項字串，只保留乾淨的內容

---

### 第五階段：題目重新設計

**黑皮提出：** 原本的選擇題太多數字運算題，想要更有深度的題目。

**重新設計後的題目類型：**
- **填空題**（6題）：看程式碼片段，填入正確的表達式
- **行為預測題**（4題）：分析程式碼，預測執行結果
- **語法/語意判斷題**（10題）：概念理解與語法判斷

---

## 🔧 技術規格

###亮暗主題
- `localStorage` 儲存使用者偏好
- CSS Variable 切換，深色模式一體化

### 選擇題機制
- Fisher-Yates 洗牌演算法亂序題目與選項
- 送出前不回傳對錯，確保猶豫空間
- 送出後一次結算並顯示分數

### 應用題機制
- `safeNum()` 防止空值導致 NaN
- `setTimeout` 模擬非同步執行
- Syntax Highlight 使用正則替換關鍵字

---

## 📌 維護指南

### 新增選擇題
編輯 `data/quiz_questions.js`，在 `window.QUIZ_QUESTIONS` 陣列中加入新物件：

```javascript
{
  q: "題目文字（可含程式碼換行）",
  opts: ["選項A", "選項B", "選項C", "選項D"],
  ans: 0  // 正確答案的 index
}
```

### 新增應用題
編輯 `data/practice_questions.js`，在 `PRACTICE_QUESTIONS` 陣列中加入：

```javascript
{
  id: 11,  // 題目編號（用於顯示）
  title: "標題",
  desc: "題目說明",
  code: "function demo() {\n  return __VAR__;\n}",
  variables: [
    { key: "VAR", default: 10, label: "變數說明" }
  ],
  run(vars) {
    return String(vars.VAR * 2);
  }
}
```

---

## 👤 維護者

由 [Oren](https://github.com/Oren2026) 與 AI 協作維護 · CCC 作業天地
