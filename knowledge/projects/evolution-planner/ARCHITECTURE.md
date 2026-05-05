# Evolution Planner 架構文件

**創建日期**：2026-05-02
**當前狀態**：Step A 實作中
**相依於**：無（獨立於 Evolution Compiler）

---

## 核心理念

**一句話**：輸入自然語言意圖，輸出收斂後的模組清單 + 介面合約，並透過互動式對話消除模糊之處。

Evolution Planner 不生成程式碼。它負責「想的對」——把一個模糊的需求拆解成有意義的模組邊界，在消耗殆盡之前停下來，把確定的結構交給 Compiler執行。

---

## 系統架構

```
┌─────────────────────────────────────────────────────────┐
│                   Evolution Planner                       │
│  (獨立 AI 實例，mistral/llama3，本地模型)                │
│                                                          │
│  輸入：自然語言意圖                                        │
│      ↓                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Intent       │  │ Module        │  │ Closure      │  │
│  │ Decomposer   │→ │ Planner       │→ │ Validator    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         ↓                  ↓                  ↓         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Interactor — 互動式問題 + B方案對比 + 重構選項    │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↓                               │
│                   Manifest（JSON）                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Evolution Compiler                       │
│  (獨立 AI 實例，gemma4/雲端模型，任務執行)               │
│                                                          │
│  輸入：Manifest                                          │
│  輸出：軟體構件（程式碼）                                  │
└─────────────────────────────────────────────────────────┘
```

**電網類比**：
- Planner = 變電站（高電壓推理，遠距離傳輸）
- Compiler = 配電室（降壓後執行，送到終端）
- 不同電壓做不同的事，不用大材小用

---

## Manifest 格式

```json
{
  "intent": "原始自然語言輸入",
  "plan_id": "uuid",
  "created_at": "ISO timestamp",

  "entities": [
    {
      "name": "庫存品項",
      "fields": [
        { "name": "title",    "label": "品名",    "type": "text" },
        { "name": "category", "label": "分類",    "type": "text" },
        { "name": "quantity", "label": "數量",    "type": "number" },
        { "name": "status",  "label": "狀態",    "type": "enum", "values": ["有貨", "缺貨"] }
      ]
    }
  ],

  "modules": [
    {
      "id": "search-bar",
      "semantic": "提供搜尋與分類過濾工具列",
      "inputs": ["keyword", "category"],
      "outputs": ["filteredItems"],
      "depends_on": [],
      "stop_reason": "搜尋邏輯已經封裝，subagent 不會再問『搜尋框要搜什麼』"
    },
    {
      "id": "table-data",
      "semantic": "顯示庫存品項列表，支援操作按鈕",
      "inputs": ["items", "onEdit", "onDelete"],
      "outputs": [],
      "depends_on": ["search-bar"],
      "stop_reason": "表格渲染封裝完成，點擊行為由外部 callback 處理"
    }
  ],

  "root_module": "layout-page",
  "composition": {
    "layout-page.slots": {
      "header":  "layout-header",
      "search":  "search-bar",
      "content": "table-data",
      "modal":   "modal-form",
      "confirm": "confirm-dialog",
      "toast":   "toast-notify"
    }
  },

  "closure_status": "COMPLETE | NEEDS_CLARIFICATION | OVER_DECOMPOSED",
  "unresolved_questions": [],
  "b_plans": [],
  "refactor_options": []
}
```

---

## 互動式回應格式

當 Planner 遇到需要確認的點時，回應格式：

```
✅ 我理解了你的需求。

📋 已拆解模組（4 個）：
  [1] search-bar — 搜尋 + 分類過濾
  [2] table-data — 品項列表
  [3] modal-form — 新增 / 編輯
  [4] toast-notify — 操作通知

❓ 有一個問題需要確認：
  低於安全庫存的自動警示，是必要的功能嗎？

💡 延伸分析（B 方案）：
  若加上「低庫存警示」，模組會變成 6 個：
  + [5] alert-banner — 低庫存時顯示警告橫幅
  + [6] badge-status — 列表中顯示庫存狀態標籤
  代價：UI 複雜度增加，實作時間 +50%
  適合：仓库管理、零售系统
  不適合：僅需簡單列表的內部工具

⏸️ 等待你的確認，Planner 將在封閉後輸出最終 Manifest。
```

---

## B 方案分析格式

每當Planner懷疑「用戶可能沒有想到這個選項」時，提供：

```json
{
  "b_plan_id": "b-001",
  "trigger": "user said X but did not mention Y",
  "hypothesis": "也許用戶需要 Y，但自己沒意識到",
  "modules_delta": [
    { "action": "ADD",    "module": "alert-banner" },
    { "action": "ADD",    "module": "badge-status" }
  ],
  "impact_analysis": {
    "scope_increase": "+2 modules",
    "implementation_cost": "+50% time",
    "use_cases_affected": ["仓库", "零售", "供应链"]
  },
  "recommendation": "ADD | SKIP",
  "recommendation_reason": "因為..."
}
```

---

## 重構選項格式

當 Planner 發現模組結構有更好的組織方式時：

```json
{
  "refactor_id": "ref-001",
  "current_structure": ["modal-form (新增+編輯合併)"],
  "proposed_structure": [
    "modal-form-add (僅新增)",
    "modal-form-edit (僅編輯)"
  ],
  "trade_offs": {
    "pros": ["職責更乾淨", "編輯時不需要傳 mode 參數"],
    "cons": ["模組數量 +1", "組合時多一個 injection point"]
  },
  "recommendation": "KEEP_CURRENT | SPLIT | MERGE",
  "recommendation_reason": "..."
}
```

---

## Closure Status 與 Planner 紀律

| 狀態 | 意義 | 行動 |
|------|------|------|
| `COMPLETE` | 所有模糊點已消除 | 立即輸出 Manifest |
| `NEEDS_CLARIFICATION` | 仍有未確認之處 | 輸出問題，等待回應 |
| `OVER_DECOMPOSED` | 拆太細了 | 提供合併建議 |

**Planner 的紀律**：
1. 不猜測未確認的需求
2. 每個 `unresolved_questions` 必須附帶 B 方案對比
3. 當用戶說「這個不行」時，分析原因並提供重構選項
4. 每次回應都是「可編輯的」——提供修改建議，而非只給結論

---

## 與 Evolution Compiler 的介面

```
Planner → Compiler 介面（JSON Manifest）

Compiler 收到 Manifest 後：
1. 解析 modules 清單
2. 依賴排序（DependencyResolver）
3. 派工給 subagents
4. QA 驗證每個模組輸出符合 Contract
5. Composer 組合最終產出
```

**Planner 不在乎 Compiler 用什麼語言輸出**——它只定義「需要什麼功能」，不定義「怎麼實作」。

---

## 待實作里程碑

- [ ] Manifest JSON schema 定義
- [ ] Intent Decomposer（意圖分解引擎）
- [ ] Module Planner（模組識別 + B 方案生成）
- [ ] Interactor（互動式對話 + 可編輯狀態）
- [ ] Closure Validator（收斂判斷）
- [ ] Manifest 序列化與驗證
- [ ] Planner ←→ Compiler 介面定義
