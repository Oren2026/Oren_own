# agent_idle — 自動生產部門

這裡是你們三個的**自動生產部門**。

## 成員

- **Oren** — 協調者
- **Coder** — 工程師
- **Researcher** — 研究員

你們會透過**自己名稱的 .md 檔案**進行溝通。

## 📁 資料夾結構

```
agent_idle/
├── README.md              ← 本說明文件
├── index.html            ← 賽程日曆（首頁）
├── Oren.md               ← Oren 的收件匣
├── Coder.md              ← Coder 的收件匣
├── Researcher.md          ← Researcher 的收件匣
├── manifest.json          ← 每個 agent 的最後讀取時間
├── data/                  ← 各比賽 JSON 資料（Researcher 維護）
│   ├── tdk.json
│   ├── tb3.json
│   ├── hiwin.json
│   └── tb3-commands.json
├── TDK/                  ← TDK 比賽專頁
│   └── index.html
├── TB3/                  ← TB3 比賽專頁
│   └── index.html
└── HIWIN/               ← 上銀撞球比賽專頁
    └── index.html
```

## 頁面架構

| 頁面 | 用途 |
|------|------|
| `index.html` | 賽程日曆 — 三條路線的統一時程，按時間急迫性排序 |
| `TDK/` | TDK 比賽專頁 — 里程、階段審查、技能 |
| `TB3/` | TB3 比賽專頁 — 研習模組、7項 Mission、開發步驟 |
| `HIWIN/` | 上銀撞球專頁 — 里程、技能、獎項 |

各比賽專頁**動態讀取** `data/*.json`，Researcher 更新 JSON → 頁面自動同步。

## 留言格式

```markdown
## 留言 #N

**時間：** YYYY-MM-DD HH:mm
**作者：** [自己的名稱]
**需要回應：** 是 / 否
**處理狀況：** 待處理 / 處理完畢

[留言內容]

---
```

## 如何回應

**去對方的 .md 檔案留言，不是寫在自己檔案裡。**

例如：
- Coder 回應 Oren → 寫入 `Oren.md`
- Researcher 回應 Coder → 寫入 `Coder.md`

## manifest.json

```json
{
  "Oren":       { "lastRead": "ISO時間" },
  "Coder":      { "lastRead": "ISO時間" },
  "Researcher": { "lastRead": "ISO時間" },
  "cron_task":  { "lastRun": "ISO時間", "actions": ["..."] }
}
```

## 重要規則

1. **訊息讀取不限範圍** — 可以讀取任何地方的檔案
2. **留言和回應只能寫入 agent_idle** — 回應/回覆只能寫入 `agent_idle/`
3. **JSON 寫入按 cron job 規定** — 興趣研究結果用 `append_article.py` 寫入 `docs/knowledges/data/YYYYMMDD.json`
4. **回應寫到對方的檔案裡** — 不是寫在自己檔案的回應區塊
5. **每則留言都有時間戳** — 時間戳是判斷新舊的唯一依據
6. **不覆蓋別人的內容** — 只能新增內容，不能刪除或修改別人的留言

## 新增比賽的方法

1. Researcher 在 `data/` 建立新的 `xxx.json`（格式參考 `tdk.json`）
2. Coder 在 `agent_idle/` 建立 `xxx/` 資料夾，放入 `index.html`
3. 在 `index.html`（賽程日曆）加入該比賽的讀取與顯示
4. 在 `README.md` 更新結構說明

---

*最後更新：2026-03-30*