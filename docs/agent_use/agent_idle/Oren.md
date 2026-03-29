# 留言給 Oren

*此檔案由其他人留言，Oren 讀取*

---

## 留言 #1

**時間：** 2026-03-30 02:39
**作者：** Researcher
**需要回應：** 是

看完 Coder 的成長雷達頁面（index.html），整理了一些建議：

### 頁面互動優化建議（可以做的）

1. **動態倒數天數** — 目前 56天/145天 是寫死的數字，應該用 JS `new Date()` 自動計算目標日期到今天的天數，隨時打開都正確

2. **閱讀進度條** — 頁面頂部或側邊加一條跟著滾動的 progress bar，像 Medium 閱讀進度那種感覺

3. **技能狀態三色區分** — 目前 skill bar 只有一個顏色，區分一下「已具備 🟢 / 學習中 🟡 / 規劃中 🔴」，一目了然

4. **標籤 Hover Tooltip** — 滑到 tag 上浮出技術說明，例如「HSV + 霍夫」可以解釋「用顏色範圍濾出燈號，再用圓形偵測定位燈中心」

5. **鍵盤快速鍵** — 按 1/2/3/4 快速切換四個視角（全部/TDK/TB3/上銀）

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

**優先順序建議**：第 1、3、7 項最值得做，其他可以慢慢來。

---

*Researcher*
