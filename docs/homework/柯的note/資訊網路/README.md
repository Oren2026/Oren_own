# 資訊網路筆記 — 維護手冊

## 框架結構

每章節頁面（`ch{n}-{slug}.html` / `ch{n}.html`）皆為靜態 HTML，使用 `shared.css` 統一樣式。

```
docs/homework/柯志亨的筆記天地/資訊網路/
├── shared.css          # 唯一樣式表，所有章節共享
├── index.html          # 課程總覽頁（章節卡 + sidebar）
├── chapters.json       # 12章設定檔（標題/檔名/標籤/描述）
├── ch1-introduction.html
├── ch2-communication.html
├── ...
├── ch7.html
└── ch8.html            # CH8（含 16 個章節，共 161 頁 OCR）
```

---

## HTML 頁面模板

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CH{N} — {標題} | 柯志亨的筆記天地</title>
  <link rel="stylesheet" href="shared.css">
</head>
<body>

  <!-- Sidebar — 注意：無 <ul>/<li>，直接 bare <a> 標籤 -->
  <nav class="sidebar">
    <div class="sidebar-course">柯志亨的筆記天地</div>
    <div class="sidebar-title">資訊網路</div>
    <div class="sidebar-divider"></div>
    <div class="sidebar-section-label">所有筆記</div>

    <a href="ch1-introduction.html" class="sidebar-link">網路初探</a>
    <a href="ch2-communication.html" class="sidebar-link">通訊與傳輸</a>
    <!-- ... 所有章節 ... -->
    <span class="sidebar-link stub">第九章（待確認）</span>
  </nav>

  <!-- Main Content -->
  <main class="content">

    <!-- 頁首：日期 / 標題 / 標籤 -->
    <header class="note-header">
      <div class="note-date">2026 年 05 月 05 日</div>
      <h1 class="note-title">CH{N} — {標題}</h1>
      <div class="note-tags">
        <span class="note-tag">CH{N}</span>
        <span class="note-tag">關鍵字</span>
      </div>
    </header>

    <!-- 大綱：2欄 grid + concept-card -->
    <h2>📋 大綱</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
      <div class="concept-card">
        <div class="concept-card-title">🔷 小節名稱</div>
        <div class="concept-card-desc">描述</div>
      </div>
      <!-- 更多章節卡片 ... -->
    </div>

    <!-- 內容區塊：section + highlight-box -->
    <section id="s1">
      <h2>📌 1｜小節標題</h2>
      <div class="highlight-box">
        第一頁 OCR 內容 ...
      </div>
      <div class="highlight-box">
        第二頁 OCR 內容 ...
      </div>
    </section>

    <!-- 更多 section ... -->

    <!-- 頁尾 -->
    <footer class="note-footer">
      <span>📖 柯志亨的筆記天地 — 資訊網路</span>
      <a href="index.html" style="color:var(--accent);">← 返回總覽</a>
    </footer>

  </main>
</body>
</html>
```

---

## 重要樣式說明

### sidebar-link 狀態
| 狀態 | 類別 |
|------|------|
| 當前章節 | `class="sidebar-link active"` |
| 其他章節 | `class="sidebar-link"` |
| 待確認章節 | `<span class="sidebar-link stub">第九章（待確認）</span>` |

### 內容區塊類別（`shared.css`）
| 類別 | 用途 | 適用時機 |
|------|------|---------|
| `.highlight-box` | 投影片內容框（💡 符號） | OCR 原文、老師口語補充、重點摘錄。可包 `<ul>/<ol>` |
| `.concept-card` | 概念卡片 | 定義、列表型內容（特點、功能、版本比較） |
| `.layer-card` | 協定/階層卡片（藍色左框） | 有編號/名稱/描述的階層結構（標頭欄位說明、MDF/IDF 系統） |
| `.compare-table` | 比較表格（表頭藍底） | A/B/C 類比較、欄位對照、規格表 |
| `.header-diagram` | 深色程式碼區塊 | IP/TCP/UDP 標頭結構圖、FQDN 分解圖。**不要**用在一般教學內容 |
| `.toc-grid` + `.toc-item` | 大綱格狀列表 | 章節開頭的閱讀地圖，每項含編號圓點 |
| `.ip-block` | 彩色小標籤 | `[IPv4]` `[IPv6]` 放在章節標題旁，標示內容類別 |
| `.ipv6-section` | 左側紫色豎線 | IPv6 專用區塊，與 IPv4 內容做視覺區隔 |
| `.two-col-grid` | 雙欄格狀佈局 | 兩個等寬並排的元素（常配合 concept-card 使用） |
| `.question-section` | 問題區（漸層底） | 章節結尾的練習題或反思問題 |
| `.formula` | 公式內嵌 | IP 運算、CIDR 計算等公式 |

### 語義對照表（什麼情況用什麼）

```
教學內容（OCR 原文、投影片摘要）  → highlight-box（可包 ul/ol）
定義 + 列表（特性說明、比較）     → concept-card
編號結構（標頭欄位、系統階層）    → layer-card
數據對照（A/B/C 類、版本差異）    → compare-table
規格文件（IP 標頭、欄位結構）     → header-diagram（深色底）
閱讀地圖（章節大綱）             → toc-grid + toc-item
內容類別標記（IPv4/IPv6）        → ip-block
大範圍內容切換（IPv4 vs IPv6）   → ipv6-section（左豎線）
雙欄並排佈局                     → two-col-grid
結語問題                        → question-section
```

### 禁止事項
- ❌ 不要在章節 HTML 裡寫 `<style>` 覆寫全域樣式
- ❌ 不要用 `<ul>/<li>` 包 sidebar 連結
- ❌ 不要用 inline `style="position:fixed"` 改變佈局
- ❌ `header-diagram` **不要**用在一般文字說明，只用在結構圖（標頭、格式）
- ✅ body 已是 `display:flex`，直接用 `.sidebar` + `.content` 雙欄
- ✅ highlight-box 可包 `<ul>/<ol>`（已還原）

---

## 處理新 PPTX 的標準流程

### 1. 擷取圖片
```bash
DOC_ID="doc_xxxxxxxx"
mkdir -p /tmp/ch{N}_slides
unzip -o "~/.hermes/cache/documents/${DOC_ID}.pptx" \
  -d /tmp/ch{N}_slides/extracted > /dev/null 2>&1
cd /tmp/ch{N}_slides/extracted/ppt/media
# 複製為 slide_001.jpg, slide_002.jpg ...
for i in $(seq 1 $TOTAL); do
  cp "image${i}.jpeg" "/tmp/ch{N}_slides/slide_$(printf '%03d' $i).jpg"
done
```

### 2. OCR（Tesseract + 繁中）
```bash
cd /tmp/ch{N}_slides
for i in $(seq -f '%03g' 1 $TOTAL); do
  /opt/homebrew/bin/tesseract "slide_${i}.jpg" stdout \
    -l chi_tra+eng --psm 6 2>/dev/null | tee "ocr_${i}.txt"
done
```

### 3. 掃描結構，規劃章節
```python
# 讀 ocr_001.txt ~ ocr_NNN.txt
# 找出標題頁（大綱、Section Header）
# 決定 major_sections 分組
```

### 4. 更新 `chapters.json`
```json
{
  "id": N,
  "title": "章節標題",
  "filename": "ch{N}.html",
  "tags": ["CH{N}", "關鍵字1", "關鍵字2"],
  "desc": "章節描述，會出現在 index.html 的 note-card"
}
```

### 5. 重建 sidebar（所有舊檔）
```python
# 用 chapters.json 重建所有章節的 sidebar
# pattern: <div class="sidebar-section-label">...</div>\n\n    <a href=...>
```

### 6. 更新 index.html
在 `note-card` grid 區塊加入新的章節卡。

---

## shared.css 變數參考

```css
:root {
  --bg: #f8f9fa;           /* 頁面背景 */
  --surface: #ffffff;      /* 卡片背景 */
  --border: rgba(49,108,244,0.12);  /* 邊框 */
  --accent: #316cf4;       /* 主色（藍）*/
  --accent-dim: rgba(49,108,244,0.08);  /* 藍底 */
  --accent-text: #1a3aad;  /* 深藍文字 */
  --text: #1a1a1a;         /* 內文 */
  --muted: #5a5a6a;        /* 次要文字 */
  --muted-2: #9090a0;      /* 輔助文字 */
  --sidebar-w: 240px;      /* 側邊欄寬度 */
  --radius: 10px;          /* 圓角 */
}
```

---

## 常見錯誤

**Q: 頁面側邊欄跑到左側但疊在內容上？**
→ 檢查 body 有沒有 `display:flex`，以及 sidebar/content 的先後順序。

**Q: 樣式跟其他章節不一致？**
→ 確認有 `<link rel="stylesheet" href="shared.css">`，且沒有本地覆寫 `<style>`。

**Q: OCR 文字有亂碼？**
→ PPTX 是全圖片投影片，Tesseract OCR 限制。重要數值表建議日後手動對照原始投影片修正。

**Q: 章節增加後 sidebar 沒更新？**
→ 手動執行 `update_sidebars.py` 或修改 `chapters.json` 後重建。
