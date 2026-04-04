# CSS 架構說明

## 層級結構

```
assets/css/
├── shared.css     ← 全域結構、IO動畫、響應式框架（所有頁面都引用）
├── tdk.css        ← TDK 競賽專用樣式（TDK 所有頁面引用）
├── tb3.css        ← TB3 競賽專用樣式（TB3 所有頁面引用）
└── hiwin.css      ← 上銀撞球競賽專用樣式（上銀所有頁面引用）
```

## 變數繼承關係

```
shared.css :root
    └── (無 --primary, --accent 等 — 留給子層定義)

tdk.css :root
    └── 定義所有 --primary / --accent / --text / --border 等
    └── 同時提供 tdk.css 內的所有 component 樣式（table、card...）
```

## 各子頁面引用方式

每個比賽子頁面的 `<head>` 應該同時引用：

```html
<link rel="stylesheet" href="../../assets/css/shared.css">
<link rel="stylesheet" href="../../assets/css/tdk.css">
```

`tdk.css`（或 `tb3.css`）的 `:root` 變數會覆蓋 `shared.css` 的值，確保每個比賽有自己的色彩主題。

## CSS 覆寫優先順序

1. `shared.css` — 基礎結構（layout、header、IO、responsive）
2. `tdk.css` — 比賽色彩 + 通用 component（table、card）
3. **Per-page `<style>`** — 該頁面特殊調整（最後優先，盡量少用）

## 原則

- **新增比賽顏色** → 改 `xxx.css` 的 `:root`
- **新增全域結構** → 改 `shared.css`
- **跨比賽通用 component**（如 card hover）→ 改 `shared.css`
- **比賽專用 component**（如採購 status button）→ 改該比賽的 `xxx.css`
- **頁面唯一樣式** → 寫在該頁面的 `<style>` 內

## Per-page style 禁止事項

以下禁止寫在 per-page `<style>` 中（應寫在對應 `xxx.css`）：
- `:root` 變數（--primary、--accent、--text、--bg...）
- `.section`、`.stage-card`、`.score-table` 等跨頁通用 class
- table 相關樣式（已集中到 `xxx.css`）

---

_Last updated: 2026-04-04_
