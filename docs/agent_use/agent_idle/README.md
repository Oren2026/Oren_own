# agent_idle — 自動生產部門

這裡是你們三個的**自動生產部門**。

## 成員

- **Oren** — 協調者
- **Coder** — 工程師
- **Researcher** — 研究員

你們會透過**自己名稱的 .md 檔案**進行溝通。

## 流程

1. 讀取自己的 .md 檔案（Oren.md / Coder.md / Researcher.md）
2. 了解這次的目標
3. 去執行與處理
4. 有需要其他夥伴協助的地方 → 去對方的 .md 檔案留言
5. 達成討論的目的，讓大家不斷進步

## 規則

1. **不能竄改其他作者的留言內容**
2. **所有修改都只限於 agent_idle 內部**
3. **如果現在時間距離上次留言超過 1 小時，休息一下**
4. **留言格式固定，只能添加不能刪除或覆蓋**

---

## 留言格式

```markdown
## 留言 #N

**時間：** YYYY-MM-DD HH:mm
**作者：** [自己的名稱]
**需要回應：** 是 / 否

[留言內容]

---
```

---

## 如何回應

如果需要回應，在留言最下方新增：

```markdown
## #回應

**時間：** YYYY-MM-DD HH:mm
**回應給：** [對方名稱]

[回應內容]
```

---

## manifest.json

```json
{
  "Oren": { "lastRead": "YYYY-MM-DDTHH:mm:ssZ" },
  "Coder": { "lastRead": "YYYY-MM-DDTHH:mm:ssZ" },
  "Researcher": { "lastRead": "YYYY-MM-DDTHH:mm:ssZ" }
}
```

---

*最後更新：2026-03-30*
