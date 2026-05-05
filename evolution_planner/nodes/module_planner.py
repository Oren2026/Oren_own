"""
Evolution Planner — Module Planner

負責：
1. 根據分析出的領域 + 操作，映射到需要的模組候選
2. 對每個模組給出 Retention Recommendation（KEEP / CONSIDER_DROP）
3. 生成 B 方案（Scope Alternative Plans）並附上風險分析
4. 提供重構選項
"""

from dataclasses import dataclass, field
from typing import List, Dict, Set, Optional
from manifest import (
    Manifest, Module, BPlan, RefactorOption, RefactorRecommendation,
    UnresolvedQuestion, Entity, EntityField, RetentionRecommendation,
    ConstrainedModule
)
from nodes.decomposer import DecomposedIntent
import uuid


# ============================================================================
# 模組知識庫：操作 → 必要模組映射
# ============================================================================
OPERATION_TO_MODULES: Dict[str, List[str]] = {
    "新增": ["modal-form", "toast-notify"],
    "編輯": ["modal-form", "toast-notify"],
    "刪除": ["confirm-dialog", "toast-notify"],
    "列表": ["table-data", "pagination"],
    "查詢": ["search-bar", "table-data"],
    "搜尋": ["search-bar"],
    "分類過濾": ["search-bar"],
    "排序": ["search-bar"],
    "新增書籍": ["modal-form", "toast-notify"],
    "借閱": ["modal-form", "confirm-dialog"],
    "歸還": ["modal-form", "toast-notify"],
    "預約": ["modal-form", "confirm-dialog", "toast-notify"],
    "建立會議": ["modal-form", "toast-notify"],
    "發送通知": ["toast-notify", "alert-banner"],
    "圖表": ["card-stat"],
    "統計": ["card-stat"],
    "匯出": ["tool-export"],
    "多人": ["auth-login", "layout-header"],
    "登入": ["auth-login"],
    "優先排序": ["sort-control"],
    "截止提醒": ["toast-notify"],
    "逾期提醒": ["toast-notify", "alert-banner"],
}


# ============================================================================
# 模組語義知識庫
# ============================================================================
_MODULE_SEMANTICS: Dict[str, Dict] = {
    "layout-header": {
        "semantic": "頁面頂部導航列，包含標題與操作按鈕區",
        "inputs": ["title", "actions"],
        "outputs": [],
        "does": ["顯示標題", "渲染 actions slot"],
        "does_not": ["管理按鈕邏輯", "處理點擊"],
        "retention": RetentionRecommendation.KEEP,
        "risk": "移除後系統無頂部導航，幾乎所有頁面都需要。",
        "expansion_conditions": [],
    },
    "search-bar": {
        "semantic": "搜尋輸入框 + 分類下拉選單 + 排序控制",
        "inputs": ["keyword", "category", "sortOrder"],
        "outputs": ["filteredItems"],
        "does": ["即時過濾", "更新 STATE.filter"],
        "does_not": ["直接修改資料", "網路請求"],
        "retention": RetentionRecommendation.KEEP,
        "risk": "移除後用戶無法搜尋，當品項 >20 筆時體驗極差。",
        "expansion_conditions": [],
    },
    "table-data": {
        "semantic": "資料表格，顯示列表項目並支援操作按鈕",
        "inputs": ["items", "onEdit", "onDelete"],
        "outputs": [],
        "does": ["讀取 STATE.items 渲染列表", "呼叫 onEdit / onDelete"],
        "does_not": ["修改資料", "管理生命週期"],
        "retention": RetentionRecommendation.KEEP,
        "risk": "移除後無列表視圖，系統核心功能消失。",
        "expansion_conditions": [],
    },
    "modal-form": {
        "semantic": "表單彈窗，用於新增 / 編輯資料",
        "inputs": ["isOpen", "mode", "initial", "onSave", "onClose"],
        "outputs": [],
        "does": ["根據 mode 切換標題", "觸發 onSave", "表單驗證"],
        "does_not": ["資料持久化", "API 呼叫"],
        "retention": RetentionRecommendation.KEEP,
        "risk": "移除後無新增/編輯功能，系統降級為唯讀。",
        "expansion_conditions": [],
    },
    "confirm-dialog": {
        "semantic": "危險操作的二次確認（如刪除）",
        "inputs": ["isOpen", "title", "message", "onConfirm", "onCancel"],
        "outputs": [],
        "does": ["顯示確認訊息", "觸發 onConfirm / onCancel"],
        "does_not": ["執行業務邏輯", "修改資料"],
        "retention": RetentionRecommendation.KEEP,
        "risk": "移除後刪除無二次確認，有誤刪風險。保留對資料安全有益。",
        "expansion_conditions": [],
    },
    "toast-notify": {
        "semantic": "操作結果通知（成功 / 失敗 / 警告），3秒後自動消失",
        "inputs": ["message", "type"],
        "outputs": [],
        "does": ["顯示通知", "自動消失"],
        "does_not": ["持久化", "處理點擊事件"],
        "retention": RetentionRecommendation.KEEP,
        "risk": "移除後用戶不知道操作是否成功，體驗顯著下降。",
        "expansion_conditions": [],
    },
    "pagination": {
        "semantic": "列表分頁導航（上一頁 / 下一頁 / 頁碼按鈕）",
        "inputs": ["current", "total", "onPageChange"],
        "outputs": [],
        "does": ["切換頁碼", "觸發 onPageChange"],
        "does_not": ["管理資料", "快取"],
        "retention": RetentionRecommendation.KEEP,
        "risk": "移除後所有資料一次載入，當品項 >50 筆時效能問題顯著。",
        "expansion_conditions": [],
    },
    "alert-banner": {
        "semantic": "系統級橫幅警告（低庫存、逾期等）",
        "inputs": ["message", "type", "onDismiss"],
        "outputs": [],
        "does": ["顯示警告橫幅", "可關閉"],
        "does_not": ["自動關閉計時", "管理外部狀態"],
        "retention": RetentionRecommendation.CONSIDER_DROP,
        "risk": "移除後重要警告不會主動提醒用戶，需用戶主動查看。",
        "expansion_conditions": ["當系統用於仓库/零售等有庫存管理需求時", "當品項有最低庫存警示需求時"],
    },
    "badge-status": {
        "semantic": "狀態視覺化標籤（庫存狀態、借閱狀態等）",
        "inputs": ["type", "children"],
        "outputs": [],
        "does": ["根據 type 套用顏色"],
        "does_not": ["處理點擊", "管理業務邏輯"],
        "retention": RetentionRecommendation.CONSIDER_DROP,
        "risk": "移除後狀態只能靠文字表達，視覺化程度降低。",
        "expansion_conditions": ["當實體有狀態欄位（如 status）時", "當需要區分不同狀態時"],
    },
    "sort-control": {
        "semantic": "排序選擇器（優先權、截止日期等維度）",
        "inputs": ["options", "current", "onChange"],
        "outputs": [],
        "does": ["切換排序維度", "觸發 onChange"],
        "does_not": ["直接排序資料"],
        "retention": RetentionRecommendation.CONSIDER_DROP,
        "risk": "移除後列表只能按預設維度排序。當任務/待辦有優先權需求時有必要。",
        "expansion_conditions": ["當實體有多個可排序維度時（優先權、日期等）", "當用戶需要自訂排序時"],
    },
    "card-stat": {
        "semantic": "單一指標統計卡（顯示數值與變化趨勢）",
        "inputs": ["metric", "value", "change", "trend"],
        "outputs": [],
        "does": ["顯示數值", "顯示變化趨勢"],
        "does_not": ["計算統計", "管理歷史資料"],
        "retention": RetentionRecommendation.CONSIDER_DROP,
        "risk": "移除後無統計視圖，儀表板功能缺失。",
        "expansion_conditions": ["當需要 Dashboard / 統計視圖時", "當用戶需要一目了然的全域概覽時"],
    },
    "card-group": {
        "semantic": "卡片群組（非結構化內容的呈現，如文章列表）",
        "inputs": ["items", "onClick"],
        "outputs": [],
        "does": ["渲染卡片網格", "處理點擊"],
        "does_not": ["管理業務邏輯"],
        "retention": RetentionRecommendation.CONSIDER_DROP,
        "risk": "移除後部落格/內容系統的列表只能用表格呈現，體驗較差。",
        "expansion_conditions": ["當實體為文章/書籍等非結構化內容時", "當需要圖文並茂的呈現時"],
    },
    "empty-state": {
        "semantic": "空狀態提示（列表無資料時的友好提示）",
        "inputs": ["message", "onAction"],
        "outputs": [],
        "does": ["顯示空狀態訊息", "提供操作入口"],
        "does_not": ["管理資料"],
        "retention": RetentionRecommendation.CONSIDER_DROP,
        "risk": "移除後空列表會顯示空白畫面，用戶不知道該做什麼。",
        "expansion_conditions": ["當系統預期會有空狀態時（如新建系統）"],
    },
    "layout-page": {
        "semantic": "頁面主結構，提供六個 slot injection points",
        "inputs": ["slot:header", "slot:search", "slot:content",
                   "slot:modal", "slot:confirm", "slot:toast"],
        "outputs": [],
        "does": ["組合所有子模組"],
        "does_not": ["實作任何業務邏輯"],
        "retention": RetentionRecommendation.KEEP,
        "risk": "移除後無頁面結構，所有模組無法被組織。",
        "expansion_conditions": [],
    },
}


# ============================================================================
# UI 佈局模板
# ============================================================================
UI_TEMPLATE_FOR_DOMAIN: Dict[str, Dict] = {
    "inventory": {
        "slots": {
            "header": "layout-header", "search": "search-bar",
            "content": "table-data", "modal": "modal-form",
            "confirm": "confirm-dialog", "toast": "toast-notify",
        },
        "additional": ["pagination", "alert-banner", "badge-status"],
    },
    "task": {
        "slots": {
            "header": "layout-header", "search": "search-bar",
            "content": "table-data", "modal": "modal-form",
            "confirm": "confirm-dialog", "toast": "toast-notify",
        },
        "additional": ["pagination", "sort-control"],
    },
    "blog": {
        "slots": {
            "header": "layout-header", "search": "search-bar",
            "content": "card-group", "modal": "modal-form",
            "confirm": "confirm-dialog", "toast": "toast-notify",
        },
        "additional": ["pagination", "card-stat"],
    },
    "library": {
        "slots": {
            "header": "layout-header", "search": "search-bar",
            "content": "table-data", "modal": "modal-form",
            "confirm": "confirm-dialog", "toast": "toast-notify",
        },
        "additional": ["pagination", "badge-status", "alert-banner"],
    },
    "meeting": {
        "slots": {
            "header": "layout-header", "search": None,
            "content": "table-data", "modal": "modal-form",
            "confirm": "confirm-dialog", "toast": "toast-notify",
        },
        "additional": ["pagination"],
    },
    "generic": {
        "slots": {
            "header": "layout-header", "search": "search-bar",
            "content": "table-data", "modal": "modal-form",
            "confirm": "confirm-dialog", "toast": "toast-notify",
        },
        "additional": ["pagination"],
    },
}


# ============================================================================
# B 方案知識庫（當用戶未提及 implied 操作時生成）
# ============================================================================
IMPLIED_TO_BPLAN: Dict[str, Dict] = {
    "低庫存警示": {
        "modules_delta": [
            {"action": "ADD", "module": "alert-banner"},
            {"action": "ADD", "module": "badge-status"},
        ],
        "impact": {"scope": "+2 modules", "time": "+30%", "ui_complexity": "+20%"},
        "use_cases": ["仓库", "零售", "供应链", "库存管理"],
        "recommendation": "ADD",
        "reason": "低庫存警示是庫存系統的核心業務邏輯，缺少會導致實際使用不便",
        "risk": "不加入時，低庫存需要用戶主動查詢才知道，可能延誤補貨時機",
    },
    "優先權排序": {
        "modules_delta": [
            {"action": "ADD", "module": "sort-control"},
        ],
        "impact": {"scope": "+1 module", "time": "+10%", "ui_complexity": "+5%"},
        "use_cases": ["任務管理", "待辦系統", "專案管理"],
        "recommendation": "ADD",
        "reason": "優先權是任務系統的基本維度，加上排序控制可提升使用體驗",
        "risk": "不加入時，任務只能按時間排序，優先的任務無法被優先看到",
    },
    "截止日期提醒": {
        "modules_delta": [
            {"action": "ADD", "module": "toast-notify"},
        ],
        "impact": {"scope": "+0 modules (reuse)", "time": "+5%", "ui_complexity": "+5%"},
        "use_cases": ["任務管理", "會議系統"],
        "recommendation": "SKIP",
        "reason": "toast-notify 已覆蓋此功能，無需額外模組",
        "risk": "toast 只在操作時觸發，定時提醒需要後端定時任務，超出純前端範圍",
    },
    "閱讀量統計": {
        "modules_delta": [
            {"action": "ADD", "module": "card-stat"},
        ],
        "impact": {"scope": "+1 module", "time": "+15%", "ui_complexity": "+10%"},
        "use_cases": ["部落格", "內容管理系統"],
        "recommendation": "ADD",
        "reason": "閱讀量統計是內容平台的標配功能",
        "risk": "不加入時，編輯者無法知道文章是否被閱讀",
    },
    "借閱狀態追蹤": {
        "modules_delta": [
            {"action": "ADD", "module": "badge-status"},
            {"action": "ADD", "module": "alert-banner"},
        ],
        "impact": {"scope": "+2 modules", "time": "+25%", "ui_complexity": "+15%"},
        "use_cases": ["圖書館", "租借系統"],
        "recommendation": "ADD",
        "reason": "狀態視覺化是借閱系統的必要功能",
        "risk": "不加入時，借閱者無法直觀知道書籍是否可借",
    },
    "庫存狀態追蹤": {
        "modules_delta": [
            {"action": "ADD", "module": "badge-status"},
        ],
        "impact": {"scope": "+1 module", "time": "+10%", "ui_complexity": "+5%"},
        "use_cases": ["库存管理", "零售系统"],
        "recommendation": "ADD",
        "reason": "庫存狀態 badge 是庫存系統的標準呈現方式",
        "risk": "不加入時，狀態只能用文字表示，視覺化程度低",
    },
}


# ============================================================================
# 公開函式
# ============================================================================

@dataclass
class ModuleCandidate:
    module_id: str
    semantic: str
    reason: str
    retention: RetentionRecommendation = RetentionRecommendation.KEEP
    retention_reason: str = ""
    risk_analysis: str = ""
    expansion_conditions: List[str] = field(default_factory=list)


def map_operations_to_modules(
    operations: List[str],
    implied_operations: List[str]
) -> tuple[List[ModuleCandidate], Set[str]]:
    """
    將操作集合映射到需要的模組，並給出 Retention Recommendation
    """
    candidates = []
    covered: Set[str] = set()

    for op in operations:
        modules = OPERATION_TO_MODULES.get(op, [])
        for mod_id in modules:
            if mod_id not in covered:
                covered.add(mod_id)
                info = _MODULE_SEMANTICS.get(mod_id, {})
                candidates.append(ModuleCandidate(
                    module_id=mod_id,
                    semantic=info.get("semantic", mod_id),
                    reason=f"因操作「{op}」而需要",
                    retention=info.get("retention", RetentionRecommendation.KEEP),
                    retention_reason=info.get("risk", ""),
                    risk_analysis=info.get("risk", ""),
                    expansion_conditions=info.get("expansion_conditions", []),
                ))

    # implied operations → CONSIDER_DROP 模組
    for imp_op in implied_operations:
        if imp_op in IMPLIED_TO_BPLAN:
            for delta in IMPLIED_TO_BPLAN[imp_op]["modules_delta"]:
                if delta["action"] == "ADD":
                    mod_id = delta["module"]
                    if mod_id not in covered:
                        covered.add(mod_id)
                        info = _MODULE_SEMANTICS.get(mod_id, {})
                        candidates.append(ModuleCandidate(
                            module_id=mod_id,
                            semantic=info.get("semantic", mod_id),
                            reason=f"推斷操作「{imp_op}」可能需要",
                            retention=info.get("retention", RetentionRecommendation.CONSIDER_DROP),
                            retention_reason=IMPLIED_TO_BPLAN[imp_op].get("risk", ""),
                            risk_analysis=IMPLIED_TO_BPLAN[imp_op].get("risk", ""),
                            expansion_conditions=info.get("expansion_conditions", []),
                        ))

    return candidates, covered


def generate_b_plans(
    implied_operations: List[str],
    domain: str,
    existing_modules: List[str]
) -> List[BPlan]:
    """根據 implied_operations 生成 B 方案"""
    b_plans = []
    existing_ids = set(existing_modules)

    for imp_op in implied_operations:
        if imp_op not in IMPLIED_TO_BPLAN:
            continue

        bp_info = IMPLIED_TO_BPLAN[imp_op]
        modules_delta = bp_info["modules_delta"]
        new_modules = [d["module"] for d in modules_delta if d["action"] == "ADD"]
        already_covered = all(m in existing_ids for m in new_modules)
        if already_covered:
            continue

        # 評估 retention
        if bp_info["recommendation"] == "ADD":
            retention = RetentionRecommendation.B_PLAN
        else:
            retention = RetentionRecommendation.CONSIDER_DROP

        b_plan = BPlan(
            b_plan_id=f"b-{uuid.uuid4().hex[:6]}",
            trigger=f"推斷系統可能有「{imp_op}」需求（用戶未主動提及）",
            hypothesis=f"若系統需要「{imp_op}」，則需新增 {len(new_modules)} 個模組",
            modules_delta=modules_delta,
            impact_analysis=bp_info["impact"],
            recommendation=bp_info["recommendation"],
            recommendation_reason=bp_info["reason"],
            retention_recommendation=retention,
            risk_analysis=bp_info.get("risk", ""),
            expansion_conditions=[f"當系統用於 {us} 時" for us in bp_info.get("use_cases", [])],
        )
        b_plans.append(b_plan)

    return b_plans


def create_module(
    module_id: str,
    semantic: str = "",
    reason: str = "",
    retention: RetentionRecommendation = RetentionRecommendation.KEEP,
    retention_reason: str = "",
    risk_analysis: str = "",
    expansion_conditions: Optional[List[str]] = None,
    depends_on: Optional[List[str]] = None,
) -> Module:
    """建立 Module 物件，帶有完整的 retention 資訊"""
    info = _MODULE_SEMANTICS.get(module_id, {})
    inputs = info.get("inputs", [])
    outputs = info.get("outputs", [])
    does = info.get("does", [])
    does_not = info.get("does_not", [])

    return Module(
        id=module_id,
        semantic=semantic or info.get("semantic", module_id),
        inputs=inputs,
        outputs=outputs,
        depends_on=depends_on or [],
        stop_reason="單一職責，已無法再拆" if not reason else reason,
        boundary_does=does,
        boundary_does_not=does_not,
        retention_recommendation=retention,
        retention_reason=retention_reason or info.get("risk", ""),
        risk_analysis=risk_analysis or info.get("risk", ""),
        expansion_conditions=expansion_conditions or info.get("expansion_conditions", []),
        reason=reason,
    )


def build_composition(modules: List[str], domain: str) -> Dict:
    """根據領域和模組生成 composition 結構"""
    template = UI_TEMPLATE_FOR_DOMAIN.get(domain, UI_TEMPLATE_FOR_DOMAIN["generic"])
    slots = template["slots"]

    active_slots = {}
    for slot_name, module_id in slots.items():
        if module_id and module_id in modules:
            active_slots[slot_name] = module_id
        elif module_id:
            if slot_name not in active_slots:
                active_slots[slot_name] = module_id

    return {
        "layout-page.slots": active_slots,
        "note": f"基於 {domain} 領域的預設佈局"
    }


def analyze_refactor_options(modules: List[Module]) -> List[RefactorOption]:
    """分析是否有值得重構的選項"""
    refactors = []
    module_ids = [m.id for m in modules]

    if "modal-form" in module_ids:
        modal = next((m for m in modules if m.id == "modal-form"), None)
        if modal and "新增" in modal.semantic and "編輯" in modal.semantic:
            refactors.append(RefactorOption(
                refactor_id="ref-001",
                current_structure=["modal-form (新增+編輯合併)"],
                proposed_structure=["modal-form-add (僅新增)", "modal-form-edit (僅編輯)"],
                trade_offs={
                    "pros": ["職責更乾淨", "不需要 mode 參數區分", "更容易測試"],
                    "cons": ["模組數量 +1", "composition 多一個 slot injection point"],
                },
                recommendation=RefactorRecommendation.KEEP_CURRENT,
                recommendation_reason="合併 ModalForm 是業界常見模式，MVP 階段保持合併更實際",
            ))

    if "table-data" in module_ids and "search-bar" in module_ids:
        table = next((m for m in modules if m.id == "table-data"), None)
        if table and "搜尋" in table.semantic:
            refactors.append(RefactorOption(
                refactor_id="ref-002",
                current_structure=["table-data (含搜尋結果邏輯)", "search-bar"],
                proposed_structure=["table-data (純列表)", "filter-items (過濾邏輯封裝)"],
                trade_offs={
                    "pros": ["關注點分離更清楚", "搜尋邏輯可單獨測試"],
                    "cons": ["模組數量 +1", "依賴鏈變長"],
                },
                recommendation=RefactorRecommendation.KEEP_CURRENT,
                recommendation_reason="MVP 階段搜尋邏輯寫在 table-data 裡是可接受的",
            ))

    return refactors


# ============================================================================
# 壓縮邏輯
# ============================================================================

def compress_modules(
    manifest: Manifest,
    user_input: str,
    decisions: Optional[Dict[str, str]] = None
) -> Manifest:
    """
    執行壓縮。

    decisions: {module_id: "KEEP" | "DROP", ...}
    若某模組未出現在 decisions 中，則套用 Planner 的 retention_recommendation

    被捨棄的模組寫入 constraints_wall，註記原因。
    """
    from datetime import datetime
    now = datetime.now().isoformat()

    # decisions 預設值：套用 retention_recommendation
    decisions = decisions or {}
    constrained: List[ConstrainedModule] = []
    kept: List[Module] = []

    for m in manifest.modules:
        decision = decisions.get(m.id, m.retention_recommendation.value)
        if decision == "DROP":
            constrained.append(ConstrainedModule(
                module_id=m.id,
                original_reason=m.reason if hasattr(m, 'reason') else "",
                removal_reason=_get_removal_reason(m),
                trigger=user_input,
                removed_at=now,
                restoration_conditions=m.expansion_conditions,
            ))
        else:
            kept.append(m)

    manifest.modules = kept
    manifest.constraints_wall.extend(constrained)
    manifest.compression_history.append({
        "at": now,
        "trigger": user_input,
        "decisions": decisions,
        "constrained": [c.module_id for c in constrained],
        "kept": [m.id for m in kept],
    })

    return manifest


def _get_removal_reason(m: Module) -> str:
    if m.retention_recommendation == RetentionRecommendation.CONSIDER_DROP:
        return f"Planner 建議壓縮：{m.risk_analysis}"
    elif m.retention_recommendation == RetentionRecommendation.KEEP:
        return f"用戶主動移除（Planner 建議保留）"
    else:
        return "未知原因"
