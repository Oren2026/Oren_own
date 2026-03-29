# 🐟 Oren 黑輪 - 知識庫

這是黑皮的個人知識庫，由黑皮團隊（Oren、Researcher、Coder）共同維護。

---

## 🔑 核心精神

**「悟」的探索 × 跨領域整合 × 掌控感**

---

## 🔄 自動生產部門（agent_idle）

詳見 `docs/agent_idle/README.md`

透過留言板机制，agents 可以自動協作：
- Researcher → 研究學習路徑
- Coder → 製作展示頁面
- Oren → 協調與審核

---

## 📁 專案一覽

| 專案 | 說明 | 網頁 | 原始碼 |
|------|------|------|--------|
| **TDK_2026** | 第30屆 TDK 機器人大賽 | [🌐](https://Oren2026.github.io/Oren_own/docs/TDK_2026/) | [📂](https://github.com/Oren2026/Oren_own/tree/main/docs/TDK_2026) |
| **TB3_2026** | FIRA AutoRace × TurtleBot 3 | [🌐](https://Oren2026.github.io/Oren_own/docs/TB3_2026/) | [📂](https://github.com/Oren2026/Oren_own/tree/main/docs/TB3_2026) |
| **上銀撞球** | 上銀撞球比賽相關 | [🌐](https://Oren2026.github.io/Oren_own/docs/%E4%B8%8A%E9%8A%88%E6%92%9E%E7%90%83/) | [📂](https://github.com/Oren2026/Oren_own/tree/main/docs/%E4%B8%8A%E9%8A%88%E6%92%9E%E7%90%83) |
| **knowledges** | 每日知識文章（JSON） | [🌐](https://Oren2026.github.io/Oren_own/docs/knowledges/) | [📂](https://github.com/Oren2026/Oren_own/tree/main/docs/knowledges) |
| **slides** | 簡報相關 | [🌐](https://Oren2026.github.io/Oren_own/docs/slides/) | [📂](https://github.com/Oren2026/Oren_own/tree/main/docs/slides) |
| **agentidea** | 創意實驗室（CSS 展示） | [🌐](https://Oren2026.github.io/Oren_own/docs/agentidea/) | [📂](https://github.com/Oren2026/Oren_own/tree/main/docs/agentidea) |
| **Orenbook** | 《機器的喃喃》— AI 程式哲學 | [🌐](https://Oren2026.github.io/Oren_own/docs/Orenbook/) | [📂](https://github.com/Oren2026/Oren_own/tree/main/docs/Orenbook) |

---

## ⚙️ Cron 排程

| 任務 | Agent | 頻率 | 功能 |
|------|-------|------|------|
| 更新加密貨幣價格 | Coder | 每 10 分鐘 | TAO/FET → price.json |
| 搜尋興趣主題 | Researcher-test | 每 15 分鐘 | 取主題 → 搜尋 → 寫入 JSON |
| 新增興趣主題 | Researcher-test | 每 4 小時 | 低於 20 條則新增 R 主題 |
| 檢驗JSON內容 | Inspector | 每小時 | 檢查格式正確性 |
| Coder檢查訊息 | Coder | 每小時 | 讀取 agent_idle |
| Researcher檢查訊息 | Researcher | 每小時 | 讀取 agent_idle |

---

## 📂 資料夾結構

```
Oren_own/
├── README.md
├── docs/                   ← 所有專案文件
│   ├── agent_idle/         ← 自動生產部門
│   ├── agentidea/           ← 創意實驗室
│   ├── knowledges/          ← JSON 知識庫
│   ├── TDK_2026/
│   ├── TB3_2026/
│   ├── 上銀撞球/
│   └── ...
├── memory/                 ← 興趣主題列表
└── scripts/               ← Cron 用脚本
```

---

## 💡 關於這個系統

這不是一般的新聞訂閱，而是**由興趣驅動的個人知識庫**。

主題的選擇反映了黑皮與黑輪的對話脈絡——
能源轉型、電網現代化、AI 與意識、機器人比賽。

透過 multi-agent 協作，系統可以自動研究、實作、展示。

---

*由 Oren 黑輪 🐟 與團隊維護*
