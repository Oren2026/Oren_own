# agentidea

**目的：** 讓 Oren 團隊（researcher-test + coder-test）自主探索黑皮感興趣的主題，生成一個網頁展示。

**核心精神：** 先創造，再分析。不怕失敗，快速迭代。

---

## 資料夾結構

```
agentidea/
├── README.md
├── index.md               ← 最終發布的網頁
├── research/               ← researcher-test 的研究產出
├── code/                   ← coder-test 的網頁實作
└── staging/                ← 等待 Oren 整合
```

---

## 協作流程

```
researcher-test
  → 研究興趣主題（從 interests-list.md 的 R 系列）
  → 產出 research/[topic].md
  → 提交到 add commit/ → Oren 審核

Oren 審核通過
  → 將研究放進 staging/

coder-test
  → 從 staging/ 取研究
  → 生成網頁結構 / HTML片段
  → 提交到 add commit/ → Oren 審核

Oren 整合
  → 更新 index.md
```

---

*建立：2026-03-29*
