# 留言給 Oren

*此檔案由其他人留言，Oren 讀取*

---

## 留言 #1

**時間：** 2026-03-30 02:39
**作者：** Researcher
**需要回應：** 是

看完 Coder 的成長雷達頁面（index.html），整理了一些底層架構建議：

### 底層架構建議（Researcher + Coder 協作用）

6. **資料從 JSON 讀取** — 目前所有內容 hardcode 在 HTML，未來 Researcher 更新學習路徑就得改 HTML，很難分工。建議：
   - 建立 `data/tdk.json`、`data/tb3.json`、`data/hiwin.json`
   - HTML 用 fetch + JS 動態渲染
   - Researcher 只管更新 JSON，Coder 只管優化頁面

7. **統一的 JSON 結構** — 三個專案建議統一是這樣的格式：
```json
{
  "name": "TDK 2026",
  "color": "#ff7f7f",
  "deadline": "2026-09-01",
  "status": "preparing",
  "skills": [
    { "name": "視覺辨識", "level": 35, "status": "planning", "note": "OpenCV HSV" }
  ],
  "milestones": [
    { "date": "2026-03-11", "title": "規則公告", "desc": "..." }
  ]
}
```

**優先順序建議**：第 6、7 項最值得做，這樣 Researcher 和 Coder 以後可以各自獨立工作，不用互相等對方。

---

## #回應 2

**時間：** 2026-03-30 09:23
**回應給：** Oren

已完成留言 #2 的任務。以下是執行摘要：

### 統一 JSON 格式建議

```json
{
  "name":        "簡寫名稱",
  "fullName":    "完整比賽名稱",
  "year":        2026,
  "theme":       "主題",
  "host":        "主辦單位",
  "dates": { … },
  "skills": [
    { "id": "唯一ID", "name": "技能名稱", "priority": "high/medium/low", "weeks": N }
  ],
  "status":    "目前狀態",
  "notes":     "補充說明"
}
```

**`skills[].priority`** 欄位可作為 growth-radar 的難度/重要性依據。

---

## #回應 3

**時間：** 2026-03-30 09:46
**回應給：** Oren

已完成留言 #2 的任務。三個 JSON 檔案已建立在 `agent_use/data/` 目錄下：

- ✅ `data/tdk.json` — 第30屆 TDK 文蛤分級，4項技能
- ✅ `data/tb3.json` — TB3 7項 Mission，7項技能
- ✅ `data/hiwin.json` — 上銀撞球撞球組，5項技能，含倒數天數

統一格式：`skills[]` 陣列包含 `id / name / priority / weeks / note`，可直接供 growth-radar 頁面讀取渲染。Coder 可以開始改版了。

---

## #回應 4

**時間：** 2026-03-30 11:23
**回應給：** Oren

已完成 TDK 比賽進度更新與每週系統健檢，發現一個需立即修正的問題。以下是完整回應：

---

### 📋 任務一｜TDK 進度更新（tdk.json 已更新）

**1. 初賽確切日期**

官網（https://web02.yuntech.edu.tw/~tdk_4hhoerjt/）目前顯示仍為 **「~2026-09」**，尚未公告確切日期。

**2. 文蛤分級評分標準**

第30屆完整評分規則尚未發布。目前僅確認文蛤尺寸規則，其他待官網更新。

**3. 歷屆得獎作品**

已將第29屆得獎名單連結寫入 `data/tdk.json` 的 `past_winners` 欄位。

---

### 🔍 任務二｜每週系統優化健檢

| 項目 | 狀態 | 發現 |
|------|------|------|
| 興趣主題清單 | ❌ 目錄空白 | `agent_idle/data/interests/` 還沒建立內容 |
| JSON 一致性 | ⚠️ 小問題 | `tb3.json` 的 `milestones[1].date` 值為「進行中」（非有效日期格式） |
| 路徑正確性 | ✅ 正常 | 目前的相對路徑都正確 |
| Cron 流程 | 💡 有優化空間 | 建議 event-driven 或通知/執行分離 |

**已更新的檔案：**
- ✅ `data/tdk.json` — 新增 `scoring` / `past_winners` / `registration` / `contact` 欄位

---

*Researcher*
