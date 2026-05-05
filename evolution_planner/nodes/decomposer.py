"""
Evolution Planner — Intent Decomposer

負責分析自然語言輸入，識別：
1. 目標系統類型（庫存系統？部落格？遊戲？）
2. 涉及的實體（庫存品項、文章、使用者）
3. 隱含的操作集合（CRUD、搜尋、通知？）
4. 可能的擴展方向（是否需要登入、多人協作？）
"""

from dataclasses import dataclass
from typing import List, Set, Dict


# ============================================================================
# 領域知識庫：已知系統類型 → 典型實體 → 典型操作
# 維護方式：每發現新領域類型，在此新增條目
# ============================================================================
DOMAIN_KNOWLEDGE: Dict[str, Dict] = {
    "inventory": {
        "entities": ["品項", "項目", "商品", "庫存品項"],
        "fields": {
            "品項": ["name", "category", "quantity", "status", "minStock", "note"],
        },
        "operations": ["新增", "編輯", "刪除", "查詢", "列表", "搜尋", "分類過濾", "庫存警示", "匯出"],
        "implies_business_logic": ["低庫存警示", "庫存不足自動通知"],
    },
    "task": {
        "entities": ["任務", "待辦", "代辦", "工作"],
        "fields": {
            "任務": ["title", "description", "priority", "status", "dueDate", "assignee"],
        },
        "operations": ["新增", "編輯", "刪除", "完成", "列表", "搜尋", "優先排序", "截止提醒"],
        "implies_business_logic": ["優先權排序", "截止日期提醒", "完成通知"],
    },
    "blog": {
        "entities": ["文章", "帖子", "內容", "分類", "標籤"],
        "fields": {
            "文章": ["title", "content", "author", "category", "tags", "createdAt", "views"],
        },
        "operations": ["新增", "編輯", "刪除", "發布", "列表", "搜尋", "分類", "標籤過濾", "閱讀統計"],
        "implies_business_logic": ["Markdown 渲染", "SEO 優化", "閱讀量統計", "作者管理"],
    },
    "library": {
        "entities": ["書籍", "館藏", "借閱記錄", "讀者"],
        "fields": {
            "書籍": ["title", "author", "isbn", "category", "status"],
            "借閱記錄": ["bookId", "readerId", "borrowDate", "returnDate"],
        },
        "operations": ["新增書籍", "借閱", "歸還", "預約", "列表", "搜尋", "逾期提醒"],
        "implies_business_logic": ["借閱狀態追蹤", "逾期罰款", "預約排隊"],
    },
    "meeting": {
        "entities": ["會議", "議程", "參與者", "時間"],
        "fields": {
            "會議": ["title", "date", "time", "location", "participants", "agenda"],
        },
        "operations": ["建立會議", "修改", "取消", "發送通知", "列出會議", "議程管理"],
        "implies_business_logic": ["時間衝突檢測", "參與者通知", "議程投票"],
    },
}

# 別名 → 標準 domain（比關鍵詞匹配更精確）
DOMAIN_ALIASES: Dict[str, str] = {
    "庫存": "inventory", "庫存管理": "inventory", "庫存系統": "inventory",
    "庫存管理系統": "inventory", "商品": "inventory", "商品管理": "inventory",
    "任務": "task", "待辦": "task", "代辦": "task", "工作": "task",
    "部落格": "blog", "部落格系統": "blog", "文章": "blog", "內容管理": "blog",
    "圖書館": "library", "圖書管理": "library", "書籍": "library",
    "會議": "meeting", "會議管理": "meeting", "議程": "meeting",
}

# 當 domain 已確認但實體未匹配到，用這些預設實體
DEFAULT_ENTITIES_BY_DOMAIN: Dict[str, List[str]] = {
    "inventory": ["品項"],
    "task": ["任務"],
    "blog": ["文章"],
    "library": ["書籍"],
    "meeting": ["會議"],
}

# 當 domain 已確認但沒有明確操作時，給預設 implied operations
IMPLIED_BY_DOMAIN: Dict[str, List[str]] = {
    "inventory": ["低庫存警示", "庫存狀態追蹤"],
    "task": ["優先權排序", "截止日期提醒"],
    "blog": ["閱讀量統計", "分類管理"],
    "library": ["借閱狀態追蹤", "逾期提醒"],
    "meeting": ["時間衝突檢測", "參與者通知"],
}

# 當 domain 已確認但沒有明確操作時，給預設 CRUD 操作
DEFAULT_OPS_BY_DOMAIN: Dict[str, List[str]] = {
    "inventory": ["列表", "新增", "編輯", "刪除", "搜尋"],
    "task": ["列表", "新增", "編輯", "刪除", "完成"],
    "blog": ["列表", "新增", "編輯", "刪除", "發布"],
    "library": ["列表", "新增書籍", "借閱", "歸還", "預約"],
    "meeting": ["列出會議", "建立會議", "修改", "取消", "發送通知"],
}


@dataclass
class DecomposedIntent:
    """Intent 分解結果"""
    domain_type: str                    # 領域類型（"inventory", "blog" 等）
    confidence: float                   # 領域識別信心度 0.0-1.0
    entities: List[str]                 # 識別出的實體名稱列表
    operations: List[str]               # 明確提到的操作列表
    implied_operations: List[str]       # 推斷出的額外操作（可能未被提及）
    user_mentioned_special: List[str]  # 用戶明確提到的特殊需求
    is_crud_centric: bool               # 是否以 CRUD 為核心
    has_ui: bool                        # 是否需要 UI


def detect_domain(intent: str) -> tuple[str, float]:
    """偵測輸入所屬領域"""
    intent_lower = intent.lower()

    # 先檢查別名（最精確匹配）
    for alias, domain in DOMAIN_ALIASES.items():
        if alias in intent_lower:
            return domain, 0.95

    # 關鍵詞匹配（備援）
    for domain, keywords in {
        "inventory": ["庫存", "商品", "品項"],
        "task": ["任務", "待辦", "代辦"],
        "blog": ["文章", "部落"],
        "library": ["圖書", "書籍", "借閱"],
        "meeting": ["會議", "議程"],
    }.items():
        if any(kw in intent_lower for kw in keywords):
            return domain, 0.6

    return "generic", 0.3


def detect_entities(intent: str, domain: str) -> List[str]:
    """識別實體"""
    intent_lower = intent.lower()
    known_entities = DOMAIN_KNOWLEDGE.get(domain, {}).get("entities", [])

    # 直接匹配
    found = [e for e in known_entities if e in intent_lower]

    # domain 已確認但實體未匹配 → 用預設實體
    if not found and domain != "generic":
        found = DEFAULT_ENTITIES_BY_DOMAIN.get(domain, [])

    return found


def detect_operations(intent: str, domain: str) -> tuple[List[str], List[str]]:
    """識別操作集合"""
    intent_lower = intent.lower()
    known_ops = DOMAIN_KNOWLEDGE.get(domain, {}).get("operations", [])

    # 直接匹配
    mentioned = [op for op in known_ops if op in intent_lower]

    # domain 已確認但沒有明確操作 → 給預設 CRUD + implied
    if not mentioned and domain != "generic":
        mentioned = DEFAULT_OPS_BY_DOMAIN.get(domain, [])
        implied = IMPLIED_BY_DOMAIN.get(domain, [])
    else:
        implied = DOMAIN_KNOWLEDGE.get(domain, {}).get("implies_business_logic", [])

    # implied 但未提及
    implied_but_not_mentioned = [op for op in implied if op not in intent_lower]

    return mentioned, implied_but_not_mentioned


def detect_special_requirements(intent: str) -> List[str]:
    """識別用戶明確提到的特殊需求"""
    intent_lower = intent.lower()
    specials = []

    keywords = {
        "多人": ["多人", "協作", "共享", "團隊"],
        "登入": ["登入", "登出", "帳號", "auth", "使用者"],
        "圖表": ["圖表", "dashboard", "統計", "視覺化", "chart"],
        "匯出": ["匯出", "export", "下載", "PDF", "Excel"],
        "排程": ["排程", "定時", "cron", "scheduler"],
        "API": ["API", "REST", "endpoint", "後端"],
        "即時": ["即時", "即時通知", "websocket", "realtime"],
        "無UI": ["CLI", "command", "console", "script", "背景執行"],
    }

    for category, words in keywords.items():
        if any(w in intent_lower for w in words):
            specials.append(category)

    return specials


def infer_has_ui(intent: str) -> bool:
    """推斷是否需要 UI"""
    intent_lower = intent.lower()
    no_ui_keywords = ["CLI", "command", "console", "script", "background",
                      "daemon", "service", "API only", "headless"]
    has_ui_keywords = ["網頁", "web", "介面", "UI", "介面",
                       "表單", "列表", "dashboard", "視覺化"]

    if any(kw in intent_lower for kw in no_ui_keywords):
        return False
    if any(kw in intent_lower for kw in has_ui_keywords):
        return True
    return True  # 預設為需要 UI


def is_crud_centric(operations: List[str]) -> bool:
    """判斷是否為 CRUD 核心系統"""
    crud_ops = {"新增", "編輯", "刪除", "列表", "查詢", "修改"}
    return len([op for op in operations if op in crud_ops]) >= 2


def decompose_intent(intent: str) -> DecomposedIntent:
    """
    主入口：分析自然語言意圖，返回分解結果
    """
    domain, confidence = detect_domain(intent)
    entities = detect_entities(intent, domain)
    mentioned_ops, implied_ops = detect_operations(intent, domain)
    specials = detect_special_requirements(intent)
    has_ui = infer_has_ui(intent)
    crud_centric = is_crud_centric(mentioned_ops)

    return DecomposedIntent(
        domain_type=domain,
        confidence=confidence,
        entities=entities,
        operations=mentioned_ops,
        implied_operations=implied_ops,
        user_mentioned_special=specials,
        is_crud_centric=crud_centric,
        has_ui=has_ui,
    )


def build_key_entities(domain: str, entities: List[str]) -> List[Dict]:
    """根據領域和實體生成標準欄位定義"""
    result = []
    domain_info = DOMAIN_KNOWLEDGE.get(domain, {})
    fields_map = domain_info.get("fields", {})

    if not entities:
        # fallback：嘗試用 DEFAULT_ENTITIES_BY_DOMAIN
        entities = DEFAULT_ENTITIES_BY_DOMAIN.get(domain, [])

    for entity_name in entities:
        canonical_fields = fields_map.get(entity_name, ["title", "description"])
        fields = []
        for fname in canonical_fields:
            ftype = "text"
            if any(kw in fname for kw in ["quantity", "stock", "count"]):
                ftype = "number"
            elif any(kw in fname for kw in ["date", "time", "At"]):
                ftype = "date"
            elif "status" in fname:
                ftype = "enum"
            elif "priority" in fname:
                ftype = "enum"
            fields.append({
                "name": fname,
                "label": fname.capitalize(),
                "type": ftype,
            })
        result.append({"name": entity_name, "fields": fields})

    return result


def identify_missing_info(decomposed: DecomposedIntent) -> List[str]:
    """識別需要進一步確認的事項"""
    missing = []

    if not decomposed.entities:
        missing.append(f"沒有識別到實體。這個系統要管理的核心資料是什麼？")

    if not decomposed.operations:
        missing.append("沒有識別到具體操作。系統需要支援哪些功能？")

    return missing
