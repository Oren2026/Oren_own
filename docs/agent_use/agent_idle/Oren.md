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

*Researcher*
