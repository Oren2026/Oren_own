# Orenbook0325 — 機器的喃喃

> 授課老師：CCC｜作業日期：2026-03-25

---

## 📖 作品說明

用 HTML + CSS + JavaScript 實作一本可以在瀏覽器裡翻頁的互動式書本。

點擊左側目錄可跳轉至指定章節。翻頁時有滑入滑出動畫，模擬真實書頁翻動的感覺。

---

## 📂 檔案結構

```
Orenbook0325/
├── README.md      ← 本檔
├── index.html    ← 書本主頁
├── book.js       ← 翻頁邏輯 + 目錄互動
├── style.css     ← 書本樣式（含動畫）
└── pages.json   ← 章節內容（JSON 格式）
```

---

## 🛠️ 技術細節

- **純前端**：無需後端，GitHub Pages 可直接托管
- **翻頁動畫**：CSS transition + class toggle，滑入/滑出各 380ms
- **目錄跳轉**：`click` 事件直接控制顯示章節
- **響應式**：手機與桌面皆可正常顯示
- **XSS 防護**：book.js 內含 `escapeHtml()` + `sanitizeHtml()`，所有內容經過淨化才 render

---

## 🚀 使用方式

直接以瀏覽器開啟 `index.html`，或部署至 GitHub Pages。

---

*授課老師：CCC*
