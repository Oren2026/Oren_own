# 貪吃蛇 PWA — Snake PWA

> iOS/Android PWA，滑動控制，5 種皮膚解鎖。

**線上體驗：**
https://Oren2026.github.io/Oren_own/docs/homework/柯的tryit/snake-pwa/index.html

**加入主畫面（iPhone）：** Safari 開連結 → 分享 → 加入主畫面

---

## 功能

| 功能 | 說明 |
|------|------|
| 核心遊戲 | 20×20 格，無限模式，撞自己結束 |
| 滑動控制 | 支援連續滑動（手指不需抬起） |
| 道具 | 🍎 食物（+10分）、🪙 金幣（×2分）、⚡ 加速果（15 秒 2 倍速） |
| 造型系統 | 5 種皮膚，50/150/300/500 分解鎖 |
| PWA | Service Worker 快取、離線可用、可安裝到主畫面 |
| 牆壁 | 可穿透（wrap-around） |

---

## 造型解鎖條件

| 造型 | 名稱 | 解鎖分數 |
|------|------|---------|
| 🐍 經典綠 | 預設 | 0 |
| 🐍 霓虹紫 | 霓虹紫 | 50 |
| 🐍 熔岩橙 | 熔岩橙 | 150 |
| 🐍 冰晶藍 | 冰晶藍 | 300 |
| 🐍 黃金龍 | 黃金龍 | 500 |

---

## 技術規格

詳見 [SPEC.md](./SPEC.md)

- **平台**：iOS Safari / Android Chrome（桌面亦可）
- **Framework**：原生 HTML + CSS + JavaScript，無任何框架
- **儲存**：localStorage（分數、已解鎖造型）
- **PWA**：`manifest.json` + `sw.js`（快取策略：CacheFirst）

---

## 檔案結構

```
snake-pwa/
├── index.html       # 主遊戲（所有邏輯在同檔案）
├── manifest.json    # PWA manifest
├── sw.js           # Service Worker
├── icon-192.png    # App icon 192×192
├── icon-512.png    # App icon 512×512
├── SPEC.md         # 詳細規格文件
└── README.md       # 本文件
```

---

## 開發紀錄

### 2026-05-12

- **iPhone Safari 空白問題**：iOS Safari `window.innerWidth/Height` 不穩定，改用 `document.documentElement.clientWidth/clientHeight`
- **cellSize=0 防呆**：加入 `sz < 1 ? 1 : sz` fallback，避免 canvas 0×0
- **造型眼睛**：classic-green、golden-dragon 原有眼睛；neon-purple、lava-orange、ice-blue 補上方向感眼睛
- **連續滑動**：`touchmove` 即時偵測方向，滑完 origin 重置，支援手指不抬起連續轉彎
- **牆壁穿透**：移除 wall collision，改為 wrap-around
- **移除 duplicate `showStartScreen()`**：消滅 JS error

---

## 控制方式

| 平台 | 控制 |
|------|------|
| iOS / Android | 滑動螢幕（支援手指不抬起連續轉向） |
| 桌面 | 鍵盤方向鍵 / WASD |

---

## 本地端執行

```bash
# 直接用瀏覽器開啟 index.html 即可
open index.html
# 或架簡單 HTTP server
python3 -m http.server 8080
# 然後開 http://localhost:8080
```
