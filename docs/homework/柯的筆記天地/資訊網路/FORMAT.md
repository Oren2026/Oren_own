# 資訊網路筆記 — 網頁撰寫格式規範

> 老師：柯志亨｜課程：資訊網路
> 所有章節 HTML 共用同一 `shared.css`，本文件定義正確使用方式。

---

## 一、HTML 頁面標準結構

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

  <!-- Sidebar：無 <ul>/<li>，直接 bare <a> 標籤 -->
  <nav class="sidebar">
    <div class="sidebar-course">柯志亨的筆記天地</div>
    <div class="sidebar-title">資訊網路</div>
    <div class="sidebar-divider"></div>
    <div class="sidebar-section-label">所有筆記</div>

    <a href="ch1-introduction.html" class="sidebar-link">網路初探</a>
    <a href="ch2-communication.html" class="sidebar-link">通訊與傳輸</a>
    <!-- ... 其他章節 ... -->
    <a href="ch{N}.html" class="sidebar-link active">本章標題</a>
    <span class="sidebar-link stub">第九章（待確認）</span>
  </nav>

  <!-- Main Content -->
  <main class="content">

    <!-- 頁首：note-header + note-date + note-title + note-tags -->
    <header class="note-header">
      <div class="note-date">2026 年 05 月 05 日</div>
      <h1 class="note-title">CH{N} — {標題}</h1>
      <div class="note-tags">
        <span class="note-tag">CH{N}</span>
        <span class="note-tag">關鍵字1</span>
        <span class="note-tag">關鍵字2</span>
      </div>
    </header>

    <!-- 大綱：2欄 grid + concept-card -->
    <h2>📋 大綱</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
      <div class="concept-card">
        <div class="concept-card-title">🔷 小節名稱</div>
        <div class="concept-card-desc">描述</div>
      </div>
    </div>

    <!-- 內容區塊：每個 major section 用 <section id="s{N}"> 包覆 -->
    <section id="s1">
      <h2>📌 1｜第一小節標題</h2>

      <div class="highlight-box">
        投影片內容（OCR 結果直接貼入）
      </div>

      <h3>子標題</h3>
      <div class="highlight-box">
        更多內容
      </div>
    </section>

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

## 二、CSS 類別速查表

### 2.1 頁面結構
| 類別 | 用途 |
|------|------|
| `.sidebar` | 側邊欄（240px，sticky） |
| `.sidebar-course` | 側邊欄頂層課程名（藍色小字） |
| `.sidebar-title` | 側邊欄標題（黑粗字） |
| `.sidebar-link` | 側邊欄連結 |
| `.sidebar-link.active` | 當前章節（藍底） |
| `.sidebar-link.stub` | 待確認章節（灰半透明） |
| `.content` | 主內容區（彈性寬度，最大 820px） |
| `.note-header` | 頁首（日期+標題+標籤） |
| `.note-footer` | 頁尾 |

### 2.2 內容元件
| 類別 | 用途 |
|------|------|
| `.highlight-box` | **預設使用**——投影片內容（黃底橘框） |
| `.concept-card` | 大綱 grid 卡片 |
| `.compare-table` | **所有表格統一用這個** |
| `.layer-card` | 協定/階層卡片（藍色左框） |
| `.stack-diagram` | 疊層示意圖 |
| `.note-tag` | 標籤（圓角藍底） |

### 2.3 文字樣式
| 類別 | 用途 |
|------|------|
| `code` | IP 位址、指令等（灰底藍字） |
| `span.formula` | 數學式、運算（等寬灰底） |
| `pre` | 多行程式碼（深色背景） |
| `strong` | 重點粗體 |

---

## 三、表格正確寫法

### ✅ 正確：用 `.compare-table`
```html
<table class="compare-table">
  <thead>
    <tr>
      <th>欄位名稱</th>
      <th>說明</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>值或內容</td>
      <td>對應說明</td>
    </tr>
  </tbody>
</table>
```

### ❌ 錯誤：裸 `<table>` + inline style
```html
<!-- 錯誤示範 -->
<table style="width:100%; border-collapse:collapse; margin-top:10px;">
  <tr style="background:#4299e1; color:white;">
    <th style="padding:6px; border:1px solid #ccc;">欄位</th>
```

### ❌ 錯誤：用 `│` pipe 字元排版
```html
<!-- 錯誤示範 -->
<p>IP 網域        │  用途說明</p>
<p>10.0.0.0/8    │  A 類私人使用</p>
```

**所有 pipe 文字對齊都應轉為 `.compare-table`。**

---

## 四、`<section>` 標籤規範

- 每個 major section（前綴 `📌 N｜` 的 `<h2>`）必須包在 `<section id="s{N}">` 裡
- `</section>` 必須關閉
- 順序：`</section>` → 空白行 → `<section id="s{N+1}">`

```html
<section id="s3">
  <h2>📌 3｜IP 位址分類</h2>
  <div class="highlight-box">...</div>
</section>

<section id="s4">
  <h2>📌 4｜網路遮罩</h2>
  <div class="highlight-box">...</div>
</section>
```

---

## 五、禁止事項

| 行為 | 後果 |
|------|------|
| 在章節 HTML 寫 `<style>` 覆寫 | 破壞 shared.css 統一性 |
| 用 `<ul>/<li>` 包 sidebar 連結 | 樣式失效 |
| 用 inline style 設定表格 | 與其他章節不一致 |
| 用 pipe `│` 字元做表格對齊 | 無響應式，視覺混亂 |
| `<h2>` 不包在 `<section>` 裡 | 章節結構不完整 |
| 遺漏 `</section>` 關閉標籤 | HTML 語意錯誤 |

---

## 六、`highlight-box` 內文規範

### 適當使用
```html
<div class="highlight-box">
  <p>▶ 重點一</p>
  <p>▶ 重點二，含 <strong>粗體強調</strong></p>
  <p>▶ 含 <code>程式碼或IP位址</code></p>
</div>
```

### 避免過度 `<br>` 換行
```html
<!-- 盡量用 <p> 標籤而非 <br> -->
<div class="highlight-box">
  <p>第一句話</p>
  <p>第二句話</p>
</div>
```

### IP 位址與指令
```html
<code>140.134.10.1</code>      <!-- 行內 -->
<span class="formula">255.255.255.0</span>  <!-- 數學式 -->
<pre><code>ping 127.0.0.1</code></pre>  <!-- 多行指令 -->
```

---

## 七、大綱（concept-card grid）規範

```html
<h2>📋 大綱</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
  <div class="concept-card">
    <div class="concept-card-title">🌐 IPv4 簡介</div>
    <div class="concept-card-desc">IP 位址結構、多版本、位址數量</div>
  </div>
</div>
```

- `grid-template-columns:1fr 1fr` 雙欄
- `gap:1rem` 卡片間距
- `concept-card-title` 放 Emoji + 標題
- `concept-card-desc` 放一句話描述

---

## 八、章節檔案命名

| 格式 | 範例 |
|------|------|
| 獨立章節 | `ch1-introduction.html` |
| 短章節 | `ch6-tia.html` |
| 長章節（多小節） | `ch8.html`（不分離） |

---

## 九、sidebar 動態產生（TODO）

目前所有 sidebar 為手動維護。未來應以 `chapters.json` 為單一事實來源，自動重建 sidebar。

---

## 十、常見錯誤快速修正

```python
# 1. 裸表格 → .compare-table
content = content.replace(
    '<table style="width:100%; border-collapse: collapse;">',
    '<table class="compare-table">'
)
# 加上 <thead>/<tbody>，移除所有 inline style

# 2. Pipe 表格 → .compare-table
# 手動轉為 <tr><td>col1</td><td>col2</td></tr> 格式

# 3. 確認所有 section 有開有關
import re
opens = len(re.findall(r'<section[^>]*>', content))
closes = len(re.findall(r'</section>', content))
print(f"Opens: {opens}, Closes: {closes}")  # 兩者必須相等
```
