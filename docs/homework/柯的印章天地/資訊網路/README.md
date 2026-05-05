# 資訊網路 — 模板手冊

> 老師：柯志亨（不是柯安祥）
> GitHub Pages：`https://oren2026.github.io/Oren_own/docs/homework/柯的印章天地/資訊網路/`

---

## 實測模板邏輯（ch4 為準）

### 雙欄 body 佈局

```
body (display: flex)
├── nav.sidebar (width: 240px, sticky, 不包 ul/li)
└── main.content (max-width: 820px)
```

響應式：`@media (max-width: 680px)` 側邊欄堆疊到上方。

---

### 每章 HTML 完整結構

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CH4 — 網路協定 | 柯志亨的印章天地</title>
  <link rel="stylesheet" href="shared.css">
</head>
<body>

  <!-- 側邊欄：bare <a>，不包 ul/li -->
  <nav class="sidebar">
    <div class="sidebar-course">柯志亨的印章天地</div>
    <div class="sidebar-title">資訊網路</div>
    <div class="sidebar-divider"></div>
    <div class="sidebar-section-label">所有筆記</div>

    <a href="ch1-introduction.html" class="sidebar-link">網路初探</a>
    <a href="ch2-communication.html" class="sidebar-link">通訊與傳輸</a>
    <a href="ch3-media-equipment.html" class="sidebar-link">傳輸媒介與配備</a>
    <a href="ch4-protocol.html" class="sidebar-link active">網路協定</a>
    <a href="ch5-ethernet.html" class="sidebar-link">乙太網路</a>
    <a href="ch6-tia.html" class="sidebar-link">網路規劃設計</a>
    <a href="ch7.html" class="sidebar-link">LAN 區域網路</a>
    <a href="ch8.html" class="sidebar-link">IP 協定</a>
    <a href="ch9.html" class="sidebar-link">傳輸層協定（TCP/UDP）</a>
    <span class="sidebar-link stub">第十章（待確認）</span>
    <span class="sidebar-link stub">第十一章（待確認）</span>
    <span class="sidebar-link stub">第十二章（待確認）</span>
  </nav>

  <!-- 主要內容 -->
  <main class="content">

    <!-- 頁首：日期 / 標題 / 標籤 -->
    <header class="note-header">
      <div class="note-date">2026 年 04 月 28 日</div>
      <h1 class="note-title">網路協定的制定與標準</h1>
      <div class="note-tags">
        <span class="note-tag">Protocol</span>
        <span class="note-tag">OSI</span>
        <span class="note-tag">IETF</span>
        <span class="note-tag">RFC</span>
        <span class="note-tag">TCP/IP</span>
      </div>
    </header>

    <!-- 大綱：2欄 grid + concept-card -->
    <h2>📋 大綱</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
      <div class="concept-card">
        <div class="concept-card-title">🔷 小節名稱</div>
        <div class="concept-card-desc">描述</div>
      </div>
      <!-- 更多章節卡片 -->
    </div>

    <!-- 小節：用 section#id 當錨點 -->
    <section id="why-protocol">
      <h2>為什麼需要網路協定</h2>
      <p>內文描述...</p>
      <div class="highlight-box">💡 重點摘要（橘框黃底）</div>
      <div class="layer-card">
        <div class="layer-card-num">GATEWAY（閘道器）</div>
        <div class="layer-card-name">不同標準間的轉譯設備</div>
        <div class="layer-card-desc">說明文字...</div>
      </div>
    </section>

    <!-- OSI Stack 視覺化 -->
    <div class="stack-diagram">
      <div class="stack-layer app" style="background:#7c3aed">應用層 <span class="stack-layer-label">Application (L7)</span></div>
      <div class="stack-layer app" style="background:#6366f1">展示層 <span class="stack-layer-label">Presentation (L6)</span></div>
      <div class="stack-layer app" style="background:#4f46e5">會議層 <span class="stack-layer-label">Session (L5)</span></div>
      <div class="stack-layer trans">傳輸層 <span class="stack-layer-label">Transport (L4)</span></div>
      <div class="stack-layer net">網路層 <span class="stack-layer-label">Network (L3)</span></div>
      <div class="stack-layer data">資料鏈結層 <span class="stack-layer-label">Data Link (L2)</span></div>
      <div class="stack-layer phys">實體層 <span class="stack-layer-label">Physical (L1)</span></div>
    </div>

    <!-- 比較表格 -->
    <table class="compare-table">
      <thead>
        <tr><th> OSI 層</th><th> TCP/IP </th><th> 協定 </th></tr>
      </thead>
      <tbody>
        <tr><td>應用層 (L7)</td><td>應用層</td><td>HTTP, DNS, FTP</td></tr>
      </tbody>
    </table>

    <!-- 頁尾 -->
    <footer class="note-footer">
      <span>📡 資訊網路 · 柯志亨</span>
      <span>Protocol · 2026/04/28</span>
    </footer>

  </main>
</body>
</html>
```

---

## shared.css 元件庫

| 元件 | 用途 | 視覺特徵 |
|------|------|----------|
| `.highlight-box` | 投影片摘要、重點 | 黃底 `#fffbeb`、橘框、`💡` 前綴 |
| `.concept-card` | 大綱 grid、條列內容 | 白底、灰邊、陰影 |
| `.layer-card` | 協定、專有名詞解釋 | 白底、左 4px 藍框 |
| `.compare-table` | 比較對照表 | 藍底表頭、hover 變色 |
| `.stack-diagram` | OSI 七層視覺化 | 彩色垂直堆疊方塊 |
| `.note-header` | 頁首 | 日期 + h1 + 標籤列 |
| `.note-footer` | 頁尾 | 左教材名、右日期 |
| `.note-tag` | 標籤 | 藍底圓角 |
| `.header-field` | 欄位說明 | 等寬字體 |

### sidebar-link 狀態

| 狀態 | 寫法 |
|------|------|
| 當前章 | `<a class="sidebar-link active">` |
| 其他章 | `<a class="sidebar-link">` |
| 未完成 | `<span class="sidebar-link stub">第十章（待確認）</span>` |

### OSI Stack 配色

| 層 | 顏色 |
|----|------|
| 應用層 (L7) | `#7c3aed` 紫 |
| 展示層 (L6) | `#6366f1` 靛 |
| 會議層 (L5) | `#4f46e5` 藍紫 |
| 傳輸層 (L4) | `#0891b2` 青 |
| 網路層 (L3) | `#059669` 綠 |
| 資料鏈結層 (L2) | `#64748b` 灰 |
| 實體層 (L1) | `#6b7280` 深灰 |

---

## 禁止事項

- ❌ 不要包 `<ul>/<li>` 在 sidebar
- ❌ 不要在章節 HTML 內寫 `<style>`
- ❌ 不要覆寫 `body { display:flex }` / `.sidebar` / `.content`
- ❌ footer 不要寫「柯安祥」，要寫「柯志亨」

---

## 更新 sidebar 流程

1. 開啟任意已有章節（如 ch4），複製 `<nav class="sidebar">...</nav>` 區塊
2. 只改動 `active` class 的那一行 + stub 項目
3. 不要動其他已完成的章節

---

## OCR 處理（PPTX 全圖片投影片）

```bash
# 1. 解壓 PPTX 取圖片
mkdir -p /tmp/ch{N}_slides
unzip -o "~/path/to.pptx" -d /tmp/ch{N}_slides/extracted
cd /tmp/ch{N}_slides/extracted/ppt/media

# 2. OCR（Tesseract + 繁中）
# subprocess.run 無法正確捕獲 stdout，改用 terminal + tee
cd /tmp/ch{N}_slides
for i in $(seq -f '%03g' 1 $TOTAL); do
  /opt/homebrew/bin/tesseract "image${i}.jpeg" stdout \
    -l chi_tra+eng --psm 6 2>/dev/null | tee "ocr_${i}.txt"
done
```

---

## 還原遺失章節的方法

若磁碟上的 ch1-ch9 意外刪失，但 GitHub Pages 仍有內容：

```bash
# 直接從 GitHub Pages 下載（URL encode 路徑）
BASE="https://oren2026.github.io/Oren_own/docs/homework/%E6%9F%AF%E7%9A%84%E7%AD%86%E8%A8%98%E5%A4%A9%E5%9C%B0/%E8%B3%87%E8%A8%8A%E7%B6%B2%E8%B7%AF"
curl -s "${BASE}/ch4-protocol.html" -o ch4-protocol.html
```

> 注意：GitHub Pages 的內容領先於 `main` branch，還原後記得重新 commit。
