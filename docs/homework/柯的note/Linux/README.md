# Linux 課程筆記

## 概覽

柯志亨老師 Linux 課程投影片整理。

## 目錄結構

```
Linux/
├── shared.css          # 全域樣式（複製自 資訊網路）
├── right-nav.css       # 右側浮動大綱樣式
├── right-nav.js        # 右側浮動大綱 JS
├── index.html          # 課程總覽頁
├── ch1-linux.html      # CH1 — Linux 基礎認識
└── _src/               # 中間層（原始 OCR + 整理文件）
    └── CH01_01_linux-intro/
        ├── ocr_*.txt   # 各頁 OCR 原始文字
        └── content.txt # 整理後的完整內容
```

## 工作流程

1. PPTX → unzip → tesseract OCR → `_src/ocr_NNN.txt`
2. OCR 文字整理進 `_src/content.txt`
3. `content.txt` → HTML 章節頁（引用 shared.css）
4. commit + push

## 圖片處理原則

本課程投影片圖片（截圖、吉祥物）**全部跳過**，以文字和排版呈現內容。

## 授課老師

柯志亨

## 現有章節

| 狀態 | CH1 |
|------|-----|
| ✅ 已完成 | CH1 Linux 基礎認識 |
