# 📜 wp_HW_7 — 日誌系統 JS 實作

這是一份基於 C# WinForms 計算機開發經驗，以「互動式左右雙面板」為核心架構的 JavaScript 學習網頁。10 個 JS 概念不是零散的題目，而是被嵌在同一個部落格系統中，透過編輯器即時操控，讓抽象語法與真實資料結構同步可見。

---

## 🎯 核心理念

### 從「題目導向」到「系統導向」

傳統的 JS 練習題是「一個題目、一組變數、一個輸出」。這份作業的起點是一個問題：

> **如果把 10 個 JS 語法當成同一個系統的不同元件，而不是 10 個獨立的練習題，會長什麼樣子？**

答案是一個部落格系統。10 個語法概念在裡面各自扮演真實角色：
req.params 拿 URL 參數、forEach 渲染文章列表、JSON.parse 解讀請求體、Error-First Callback 做資料庫查詢。

---

## 🏗️ 架構決策記錄

### 為什麼是「統一日誌編輯器」而非「10 個分頁」？

一開始的設計是 10 個 tab 切換頁（Q1 是 Dot Notation、Q2 是 Destructuring...）。但和 AI 反覆討論後，我們意識到：

- **分頁的問題**：每個 tab 都是獨立個體，概念之間看不出關聯。Q3 的 forEach 迴圈和 Q1 的物件屬性，在真實系統裡是串在一起的。
- **統一的優點**：當你在左側編輯器改了一個值，右側部落格預覽連帶更新——這種「操作 → 結果」的對應關係，才是 Debug 和理解程式碼時真正的認知模式。

所以最終選擇：**一個編輯器，一個預覽，10 個 JS 概念自然嵌在部落格的技術說明區**。

---

## 🔧 技術挑戰與解決方案

### 1. GitHub Pages 空白頁 — DOM 讀取順序錯誤

**問題**：頁面載入時一片空白，Console 顯示 `Cannot read properties of null (reading 'value')`。

**根因**：
```javascript
function syncAll() {
  var d = getFormData();    // ❌ 這裡讀 DOM，但 DOM 還沒建
  renderEditor(d);           // ✅ DOM 在這裡才被建出來
  renderBlog(d);
}
syncAll(); // 頁面一載入就執行，DOM 根本還不存在的
```

**修復**：區分「初次渲染」和「讀值更新」兩個函式。

```javascript
// 初次：直接用 BLOG_DB 的值，不讀 DOM
function initFirstRender() {
  var p = BLOG_DB[0];
  var d = { id:p.id, title:p.title, ... };
  renderEditor(d);
  renderBlog(d);
}

// 之後：從 DOM 讀值（這時候 DOM 一定存在）
function syncAll() {
  var d = getFormData();
  renderEditor(d);
  renderBlog(d);
}
```

---

### 2. 打字時輸入框一直消失 — innerHTML 摧毀問題

**問題**：在標題或內容輸入框打字時，游標一直跳掉，沒辦法連續輸入。

**根因**：`oninput` → `syncAll()` → `renderEditor()` → `innerHTML` 重新渲染整個左側面板 → input 元素被摧毀重建，游標自然消失。

**修復**：區分「結構性更新」和「內容更新」。

| 事件 | 呼叫 | 左側 DOM | 右側 DOM |
|------|------|---------|---------|
| 打字 / 改數值 | `syncPreview()` | 不動 | 重建 |
| 切換文章 ID | `syncAll()` | 重建 | 重建 |
| 點重置 | `resetDefaults()` | 直接改值 | 重建 |

```javascript
// 打字時只更新右側
function syncPreview() {
  var d = getFormData();  // ✅ DOM 這時一定存在
  renderBlog(d);           // ✅ 只動右側
}

// 切換 ID 才重建左側
function syncAll() {
  var d = getFormData();
  renderEditor(d);  // 重建左側（必要的時候）
  renderBlog(d);
}
```

---

### 3. ES6 語法在 GitHub Pages 失效 — inline JS 執行環境限制

**問題**：程式碼中使用 `const`、箭頭函式、模板字串、`forEach`、`map` 等 ES6 語法時，GitHub Pages 的 inline script 無法正確執行，頁面變空白。

**修復**：全部改為 ES5 語法。

| ES6（壞） | ES5（好） |
|-----------|-----------|
| `const x = 1` | `var x = 1` |
| `arr.forEach(fn)` | `for (var i = 0; i < arr.length; i++) fn(arr[i])` |
| `` `hello ${x}` `` | `'hello ' + x` |
| `arr.map(x => x * 2)` | `for` 迴圈 + 手動建新陣列 |

**原則**：凡是要在 GitHub Pages inline script 跑的 JS，一律用最保守的寫法。

---

### 4. Callback 概念（Q5 / Q7 / Q10）的視覺化困境

**問題**：Q5（Error-First Callback）、Q7（fakeGet）、Q10（checkAdmin）這三個概念的核心是「非同步函式呼叫時機」——在同步環境下沒辦法真的展示視覺效果。

**決定**：不做假的 UI 模擬，純做概念說明。

在部落格預覽區的對應位置，給予：
- 完整的程式碼展示
- 概念說明（在哪個情境會用到）
- `concept-note-box` 樣式的「無直接視覺呈現」標註

這樣處理的優點：不強求視覺化，保留概念的原貌，學生看到的是「真實應用長什麼樣」，而不是「老師硬湊了一個動畫」。

---

## 📂 檔案結構

```
wp_HW_7-blog_js/
├── index.html          ←  landing page，概念總覽 + 操作說明
├── practice.html       ←  主要練習頁，左右雙面板
├── css/
│   └── style.css       ←  共用樣式表（light/dark 主題）
├── data/
│   └── questions.js    ←  10 題原始資料（舊版 index link 用）
└── README.md           ←  本檔案
```

---

## 🧠 涉及的 10 個 JS 概念

| # | 概念 | 在部落格系統中的角色 |
|---|------|-------------------|
| Q1 | Dot & Bracket Notation | 從資料庫物件取屬性：`post.title` |
| Q2 | Destructuring | Express req.body 解構：`const { title } = req.body` |
| Q3 | forEach + HTML 拼接 | 部落格列表渲染：`posts.forEach(...)` |
| Q4 | req.params（字典） | URL 參數取值：`req.params["id"]` |
| Q5 | Error-First Callback | 資料庫查詢慣例（純概念說明） |
| Q6 | JSON.parse / stringify | API 請求體解析：`JSON.parse(req.body)` |
| Q7 | fakeGet 模擬 | 非同步資料庫查詢（純概念說明） |
| Q8 | 三元運算 |  Welcome 訊息：`user ? user : "Stranger"` |
| Q9 | String.slice / substr | 文章預覽截斷：`content.slice(0, 30) + "..."` |
| Q10 | checkAdmin Pattern | 錯誤優先 callback 實作（純概念說明） |

---

## 💡 設計演進時間線

1. **v0**：傳統 10 tab 切換頁，每個 Q 獨立
2. **v1**：提出「統一日誌系統」的想像，開始左／右雙面板規劃
3. **v1 失敗**：GitHub Pages 空白頁 — DOM 讀取順序錯誤（getFormData 在 renderEditor 之前）
4. **v2**：加入 `initFirstRender()` 解決 startup crash
5. **v2.1**：打字時左側編輯器一直被摧毀 — 拆出 `syncPreview()`
6. **v2.2**：index 重新設計（Hero + 概念總覽網格 + 操作說明）
7. **v3**：選文章時右側標題不變 — `onIdChange()` 直接讀 BLOG_DB 而非 DOM
8. **v3.1**：精簡左側編輯器（移除 tags 輸入框，三欄並排 👍👁👤，草稿+三元同一行）
9. **v3.2**：Q8 勾選三元現在有實際差異（並排顯示 ternary vs OR 結果）
10. **v3.3**：主題切換移至左側面板 topbar，深色模式改用護眼翠綠色系
11. **v3.4**：返回首頁連結移至左側面板 topbar，與主題切換並排，解決滑動被 header 遮住的問題

---

## 🧩 技術細節

### 左側編輯器精簡後的 DOM 結構

```
editor-card
  editor-topbar    [← 返回首頁]           [🌙 深色]
  q-meta           🛠️ 日誌編輯器
  q-title          即時操控，觀察 JS 語法連動
  f-id             選擇文章（select）
  f-title          標題（input text）
  f-content         內容（textarea rows=4）
  f-user            訪客名稱（input text）
  var-row-3         👍讚數 | 👁瀏覽 | 👤作者（三欄並排）
  var-field-row-inline  [📝草稿 checkbox] [使用三元 checkbox]
  reset-btn         ↺ 重置
```

Tags 不再是輸入框，改用 JS 變數 `currentTags` 追蹤。

### 主題切換架構

- Toggle button 在左側面板 topbar（`renderEditor()` 時動態建立）
- 事件監聽用 `document.addEventListener('click')` 代理，不依賴按鈕 DOM 是否已存在
- 深色模式 accent 為護眼翠綠 `#6ee7b7`，淺色模式保留紫色 `#6c5ce7`


---

## 🔗 相關連結

- **練習頁**：https://oren2026.github.io/Oren_own/docs/homework/CCC%E4%BD%9C%E6%A5%AD%E5%A4%A9%E5%9C%B0/%E7%B6%B2%E9%A0%81%E8%A8%AD%E8%A8%88/wp_HW_7-blog_js/practice.html
- **入口頁**：https://oren2026.github.io/Oren_own/docs/homework/CCC%E4%BD%9C%E6%A5%AD%E5%A4%A9%E5%9C%B0/%E7%B6%B2%E9%A0%81%E8%A8%AD%E8%A8%88/wp_HW_7-blog_js/index.html
