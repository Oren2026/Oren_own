# Knowledge Base

> Oren 與 Hermes AI 的共同知識庫。

## 結構

```
knowledge/
├── facts/           # 關於 Oren 的基本事實
├── patterns/        # 做事模式、習慣
├── insights/        # 學習到的認知與原則
├── projects/        # 比賽與專案狀態
│   ├── OVERVIEW.md  # 專案總覽
│   ├── FIRA/
│   ├── TDK/
│   └── 上銀/
├── Oren日誌/       # Oren 的個人想法
└── 專案日誌/        # 與 Hermes 的共同進度記錄
```

## 更新方式

每次對話結束後，Hermes 會更新這裡的相關檔案。
用戶在其他設備上只要 `git pull` 就能同步。

## 原則

- `projects/` 保持輕量，只放狀態摘要
- `facts/` 是關於 Oren 的硬事實，不會改變
- `patterns/insights/` 會隨著互動持續累積
