# Evolution Planner — Architecture

## 核心定位

Planner 是 Evolution 框架的「意圖理解 + 範圍收斂」層，專門處理模糊到清晰的轉換。

**輸入**：自然語言意圖（"我想做一個庫存管理系統"）
**輸出**：收斂後的模組清單 + 介面合約 + 限制牆

## Expansion / Compression 邏輯（Option 3）

### 設計原則
- Planner 自動維持「完整清單 + 各項風險分析」
- 每次回應時，Planner 給出「建議保留 / 建議壓縮」的標記
- 用戶說「就這個範圍」觸發壓縮，把「建議壓縮」的寫入限制牆
- 用戶可以隨時說「加入 XX」從限制牆還原

### Retention Recommendation
每個 Module 有 `retention_recommendation` 欄位：
- `KEEP` — 核心必要，強烈建議保留
- `CONSIDER_DROP` — 可選、非核心，預設會被壓縮
- `B_PLAN` — B 方案，需用戶選擇後決定

### 觸發方式
| 用戶輸入 | 效果 |
|---------|------|
| `就這個範圍` / `就這樣吧` | 執行壓縮：所有 `CONSIDER_DROP` 移入限制牆 |
| `加入 XX` | 從限制牆還原指定模組 |
| `我要 XX` | 觸發擴展，重新分析並給出新的 Retention |

### 限制牆（Constraints Wall）
```
另一面牆（Constraints Wall）
├── [alert-banner]  ▸ 拿掉：alert 等並非庫存管理核心，先不做
│   └── 可還原條件：「需要低庫存警示功能」時自動提示
└── [badge-status]  ▸ 拿掉：狀態 Badge 不是必要 UI，可後期再加
    └── 可還原條件：「需要一目了然的狀態顯示」時自動提示
```
- 不是刪除，是搬家
- 附「可還原條件」，方便未來擴展時回頭查

## 雙模式架構

### Expansion Mode（擴展模式）
- 列舉該領域所有可能的模組
- 每一項標注 Retention Recommendation + Risk Analysis
- 用戶可以看到「我幫你想到了這些」的完整範圍

### Compression Mode（壓縮模式）
- 用戶觸發壓縮
- Planner 根據 Retention 標記自動裁剪
- 被移除的寫入「另一面牆」並標注還原條件
- 用戶確認後 → `expansion_status: COMPRESSED`

## 資料流程

```
User Intent
    │
    ▼
Decomposer（意圖拆解）
    ├── 領域偵測（inventory / task / blog / meeting / library）
    ├── 實體識別（品項 / 待辦 / 文章）
    ├── 操作識別（CRUD + implied operations）
    └── 缺失資訊識別
    │
    ▼
Module Planner（模組規劃）
    ├── 從已知模組庫映射候選模組
    ├── 對每個模組給出 Retention Recommendation
    ├── 生成 B Plans（含觸發條件 + 風險分析）
    └── 生成 Refactor Options（如有重構可能）
    │
    ▼
Closure Validator（收斂判斷）
    ├── COMPLETE：無未回答問題，範圍明確
    ├── NEEDS_CLARIFICATION：有未回答的關鍵問題
    └── OVER_DECOMPOSED：模組過多，需要裁剪
    │
    ▼
Interactor（互動式回應）
    ├── 需求摘要（entities + operations）
    ├── 模組清單（含 Retention Recommendation）
    ├── 風險分析摘要
    ├── 待確認問題 + B-plans
    └── 限制牆現況（如有）
```

## Manifest Schema（核心資料結構）

```python
@dataclass
class Module:
    id: str
    semantic: str
    inputs: List[str]
    outputs: List[str]
    retention_recommendation: RetentionRecommendation  # KEEP / CONSIDER_DROP / B_PLAN
    retention_reason: str          # 為什麼這樣建議
    risk_analysis: str             # 風險分析
    expansion_conditions: List[str] # 在什麼條件下應該被納入
    reason: str                    # 來自哪個操作推斷

@dataclass
class ConstrainedModule:
    """被壓縮到另一面牆的模組"""
    module_id: str
    original_reason: str           # 當初為什麼列入
    removal_reason: str            # 為什麼被移除
    trigger: str                   # 觸發壓縮的用戶輸入
    removed_at: str                 # ISO timestamp
    restoration_conditions: List[str]  # 還原條件
```

## Planner vs Compiler 分工

| | Planner | Compiler |
|--|---------|---------|
| 職責 | 理解意圖、收斂範圍 | 執行生成、產出程式碼 |
| 輸入 | 自然語言 | Manifest（Planner 輸出） |
| 輸出 | 模組清單 + 限制牆 | 程式碼 + Spec Contract |
| 模式 | 對話式互動 | 離線批次執行 |
| 穩定性 | 需要用戶確認決策 | 純函數式，確定性輸出 |

## 檔案結構

```
evolution_planner/
├── ARCHITECTURE.md
├── manifest.py              # 資料結構 + JSON 序列化
├── planner.py              # 入口：plan() + respond()
├── nodes/
│   ├── decomposer.py       # 意圖拆解
│   ├── module_planner.py   # 模組映射 + retention recommendation
│   ├── interactor.py       # 回應生成
│   └── closure_validator.py # 收斂判斷
└── tests/
    └── test_planner.py     # 4 test cases
```

## 領域別名映射

```python
DOMAIN_ALIASES = {
    "庫存管理系統": "inventory",
    "庫存": "inventory",
    "任務管理系統": "task",
    "待辦": "task",
    "任務": "task",
    "代辦": "task",
    "部落格": "blog",
    "部落格系統": "blog",
    "圖書館": "library",
    "圖書管理": "library",
    "會議": "meeting",
    "會議系統": "meeting",
    "任務": "task",
    "行事曆": "calendar",
    "課程": "course",
}
```

## 已知的 Implied Operations（領域內隱含需求）

| 領域 | Implied Operation | 推斷出的 Module |
|------|-------------------|----------------|
| inventory | 低庫存警示 | alert-banner |
| inventory | 庫存狀態追蹤 | badge-status |
| task | 優先權排序 | sort-control |
| task | 截止日期提醒 | alert-banner |
| task | 任務狀態追蹤 | badge-status |
| blog | 閱讀統計 | card-stat |
| blog | 熱門文章排序 | sort-control |

## 下一步（待討論）

1. **Context 消耗追蹤**：實作 prompt token 估算，接近閾值時主動提示「建議壓縮」
2. **Compiler 整合**：Planner 輸出 → Compiler 輸入的格式對接
3. **Evolution UI Theme System**：Spec Contract + Theme 的對應（尚未討論）
