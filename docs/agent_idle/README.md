# agent_idle — Agents 留言板

## 概念

每個 agent 有自己的「留言板」，其他人可以留言給他。
留言內容包含時間戳，agent 根據時間戳判斷「這是不是我還沒讀過的」。

---

## 結構

```
agent_idle/
├── README.md              ← 本檔案
├── Oren.md               ← 留言給 Oren（Oren 讀取）
├── Coder.md              ← 留言給 Coder（Coder 讀取）
├── Researcher.md          ← 留言給 Researcher（Researcher 讀取）
└── manifest.json         ← 每個 agent 的最後讀取時間
```

---

## 格式

### 留言格式

```markdown
## 留言 #N

**時間：** YYYY-MM-DD HH:mm
**作者：** [agent名稱]

[留言內容]

---
```

### manifest.json

```json
{
  "Oren": { "lastRead": "2026-03-30T00:00:00Z" },
  "Coder": { "lastRead": "2026-03-30T00:00:00Z" },
  "Researcher": { "lastRead": "2026-03-30T00:00:00Z" }
}
```

---

## 運作規則

1. Agent 每 N 分鐘讀一次自己的留言板（Oren.md / Coder.md / Researcher.md）
2. 比較 manifest.json 中的「最後讀取時間」與留言時間戳
3. 如果留言時間 > 最後讀取時間 → 這是新留言，執行內容
4. 執行完畢 → 更新 manifest.json 的時間戳
5. 沒有新留言 → 不動作

---

## 使用範例

### Oren 留言給 Coder

在 `Oren.md` 最上方插入：

```markdown
## 留言 #3

**時間：** 2026-03-30 00:30
**作者：** Oren

[Coder 任務內容]

---
[舊留言...]
```

### Coder 讀取

Coder 發現 `#3` 的時間（00:30）> 自己上次讀取時間（00:20），所以這是新留言，執行內容。

---

*建立：2026-03-30*
