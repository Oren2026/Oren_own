"""
Evolution Planner — Interactor

負責生成互動式回應，包含：
1. 需求摘要
2. 已識別模組（含 Retention Recommendation）
3. 待確認問題 + B 方案對比 + 風險分析
4. 另一面牆現況（如有）
5. 可編輯的草稿狀態
"""

from dataclasses import dataclass
from typing import List, Optional
from manifest import (
    Manifest, ClosureStatus, ExpansionMode, UnresolvedQuestion,
    BPlan, RefactorOption, Module, ConstrainedModule, RetentionRecommendation
)
from nodes.decomposer import DecomposedIntent
from nodes.module_planner import ModuleCandidate


@dataclass
class InteractiveResponse:
    summary: str
    domain: str
    confidence: float
    expansion_status: ExpansionMode

    # 模組（含 Retention Recommendation）
    modules_table: List[dict]
    total_modules: int
    retention_summary: dict       # {"KEEP": N, "CONSIDER_DROP": N}

    # B 方案
    b_plans: List[dict]

    # 重構選項
    refactor_options: List[dict]

    # 未解決問題
    questions: List[dict]

    # 另一面牆
    constraints_wall: List[dict]

    closure_status: ClosureStatus
    manifest_draft: str

    is_complete: bool

    @property
    def needs_response(self) -> bool:
        return len(self.questions) > 0 or self.expansion_status == ExpansionMode.COMPRESSING


# ============================================================================
# 渲染輔助
# ============================================================================

_RETENTION_EMOJI = {
    RetentionRecommendation.KEEP: "🟢",
    RetentionRecommendation.CONSIDER_DROP: "🟡",
    RetentionRecommendation.B_PLAN: "🔵",
}
_RETENTION_LABEL = {
    RetentionRecommendation.KEEP: "建議保留",
    RetentionRecommendation.CONSIDER_DROP: "建議壓縮",
    RetentionRecommendation.B_PLAN: "B 方案",
}


def _render_module_row(m: Module, cand: Optional[ModuleCandidate]) -> dict:
    """將 Module 轉為表格 row dict"""
    rec = m.retention_recommendation
    emoji = _RETENTION_EMOJI.get(rec, "⚪")
    label = _RETENTION_LABEL.get(rec, str(rec))

    return {
        "id": m.id,
        "semantic": m.semantic,
        "depends": ", ".join(m.depends_on) if m.depends_on else "—",
        "retention_emoji": emoji,
        "retention_label": label,
        "risk": m.risk_analysis[:60] + "..." if len(m.risk_analysis) > 60 else m.risk_analysis,
        "expansion_conditions": "; ".join(m.expansion_conditions) if m.expansion_conditions else "—",
    }


def _render_b_plan(bp: BPlan) -> dict:
    rec = bp.retention_recommendation
    emoji = _RETENTION_EMOJI.get(rec, "🔵")
    label = _RETENTION_LABEL.get(rec, str(rec))

    return {
        "id": bp.b_plan_id,
        "trigger": bp.trigger,
        "hypothesis": bp.hypothesis,
        "delta": bp.modules_delta,
        "impact": bp.impact_analysis,
        "rec_emoji": emoji,
        "rec_label": label,
        "recommendation": bp.recommendation,
        "reason": bp.recommendation_reason,
        "risk": bp.risk_analysis,
        "expansion_conditions": bp.expansion_conditions,
    }


def _render_constrained(c: ConstrainedModule) -> dict:
    return {
        "id": c.module_id,
        "removal_reason": c.removal_reason,
        "restoration_conditions": c.restoration_conditions,
        "removed_at": c.removed_at,
    }


def _render_question(q: UnresolvedQuestion) -> dict:
    return {
        "id": q.question_id,
        "question": q.question,
        "related": q.related_modules,
        "has_b_plan": q.b_plan is not None,
    }


def _render_refactor(r: RefactorOption) -> dict:
    rec_map = {
        "KEEP_CURRENT": "⏭️ 保持現狀",
        "SPLIT": "✂️ 拆分",
        "MERGE": "🔗 合併",
    }
    return {
        "id": r.refactor_id,
        "current": r.current_structure,
        "proposed": r.proposed_structure,
        "pros": r.trade_offs.get("pros", []),
        "cons": r.trade_offs.get("cons", []),
        "recommendation": rec_map.get(r.recommendation.value, r.recommendation.value),
        "reason": r.recommendation_reason,
    }


def build_interactive_response(
    manifest: Manifest,
    decomposed: DecomposedIntent,
    candidates: List[ModuleCandidate],
) -> InteractiveResponse:
    """根據當前 Manifest 狀態，生成互動式回應"""

    # 模組表格
    modules_table = [_render_module_row(m, None) for m in manifest.modules]
    total_modules = len(manifest.modules)

    retention_summary = {"KEEP": 0, "CONSIDER_DROP": 0, "B_PLAN": 0}
    for m in manifest.modules:
        key = _RETENTION_LABEL.get(m.retention_recommendation, "KEEP")
        # 映射到 summary key
        if m.retention_recommendation == RetentionRecommendation.KEEP:
            retention_summary["KEEP"] += 1
        elif m.retention_recommendation == RetentionRecommendation.CONSIDER_DROP:
            retention_summary["CONSIDER_DROP"] += 1
        elif m.retention_recommendation == RetentionRecommendation.B_PLAN:
            retention_summary["B_PLAN"] += 1

    # B 方案
    b_plans = [_render_b_plan(bp) for bp in manifest.b_plans]

    # 重構選項
    refactor_options = [_render_refactor(r) for r in manifest.refactor_options]

    # 問題
    questions = [_render_question(q) for q in manifest.unresolved_questions if not q.answered]

    # 另一面牆
    constraints_wall = [_render_constrained(c) for c in manifest.constraints_wall]

    is_complete = manifest.closure_status == ClosureStatus.COMPLETE

    summary = (
        f"我理解你要做一個「{decomposed.domain_type}」系統，"
        f"核心實體是「{', '.join(decomposed.entities)}」，"
        f"識別出 {total_modules} 個模組。"
    )

    return InteractiveResponse(
        summary=summary,
        domain=decomposed.domain_type,
        confidence=decomposed.confidence,
        expansion_status=manifest.expansion_status,
        modules_table=modules_table,
        total_modules=total_modules,
        retention_summary=retention_summary,
        b_plans=b_plans,
        refactor_options=refactor_options,
        questions=questions,
        constraints_wall=constraints_wall,
        closure_status=manifest.closure_status,
        manifest_draft=manifest.to_json(),
        is_complete=is_complete,
    )


def to_markdown(response: InteractiveResponse) -> str:
    """將 InteractiveResponse 轉換為 Markdown 格式"""
    lines = []

    # 擴展狀態標記
    if response.expansion_status == ExpansionMode.EXPANDING:
        lines.append("🌱 **擴展模式** — 列出所有可能性 + 風險分析，等待你的裁決。\n")
    elif response.expansion_status == ExpansionMode.COMPRESSING:
        lines.append("🌀 **壓縮模式** — 你已觸發壓縮，正在裁決每個模組的取捨...\n")
    elif response.expansion_status == ExpansionMode.COMPRESSED:
        lines.append("✅ **已壓縮** — 範圍已確定，另一面牆的限制已建立。\n")

    # 收斂狀態
    if response.is_complete:
        lines.append("✅ **規劃已完成**，Manifest 已收斂，可進入 Compiler 執行階段。\n")
    elif response.questions:
        lines.append(f"⏸️ **還有 {len(response.questions)} 個問題需要確認**：\n")

    # 需求摘要
    lines.append(f"## 📋 需求摘要\n\n{response.summary}")
    lines.append(f"\n- 領域識別：**{response.domain}**（{response.confidence:.0%} 信心）")
    lines.append(f"- 模組總數：**{response.total_modules}**")
    lines.append(f"- 🟢 建議保留：**{response.retention_summary['KEEP']}**")
    if response.retention_summary['CONSIDER_DROP']:
        lines.append(f"- 🟡 建議壓縮：**{response.retention_summary['CONSIDER_DROP']}**")
    if response.retention_summary['B_PLAN']:
        lines.append(f"- 🔵 B 方案待選：**{response.retention_summary['B_PLAN']}**")
    lines.append("")

    # 模組清單
    lines.append("\n## 🧩 模組清單\n\n")
    lines.append("| # | ID | 職責 | 建議 | 依賴 | 風險 |")
    lines.append("|---|---|---|---|---|---|")
    for i, row in enumerate(response.modules_table, 1):
        lines.append(
            f"| {i} | `{row['id']}` | {row['semantic']} | "
            f"{row['retention_emoji']} {row['retention_label']} | "
            f"{row['depends']} | {row['risk']} |"
        )
    lines.append("")

    # 未解決問題
    if response.questions:
        lines.append("\n## ❓ 待確認問題\n")
        for q in response.questions:
            lines.append(f"\n**[{q['id']}]** {q['question']}")
            lines.append(f"   影響：{', '.join(q['related']) if q['related'] else '整體'}")
        lines.append("")

    # B 方案分析
    if response.b_plans:
        lines.append("\n---\n\n## 💡 B 方案分析\n")
        for bp in response.b_plans:
            lines.append(f"\n### 方案 {bp['id']}")
            lines.append(f"\n**觸發**：{bp['trigger']}")
            lines.append(f"\n**推斷**：{bp['hypothesis']}")
            lines.append(f"\n**建議**：{bp['rec_emoji']} {bp['rec_label']}")
            lines.append(f"\n**影響**：{bp['impact'].get('scope','N/A')} / {bp['impact'].get('time','N/A')} / UI {bp['impact'].get('ui_complexity','N/A')}")
            lines.append(f"\n**風險（不加的代價）**：{bp['risk']}")
            lines.append(f"\n**模組變更**：")
            for delta in bp['delta']:
                emoji = "➕" if delta["action"] == "ADD" else "➖"
                lines.append(f"  {emoji} `{delta['module']}`")
            if bp['expansion_conditions']:
                lines.append(f"\n**適用情境**：{'；'.join(bp['expansion_conditions'])}")
            rec_tip = "✅ 建議採用" if bp['recommendation'] == "ADD" else "⏭️ 建議略過"
            lines.append(f"\n**{rec_tip}**：{bp['reason']}\n")

    # 重構選項
    if response.refactor_options:
        lines.append("\n---\n\n## 🔄 重構選項\n")
        for ref in response.refactor_options:
            lines.append(f"\n### {ref['id']}")
            lines.append(f"\n當前：`{' + '.join(ref['current'])}`")
            lines.append(f"\n建議：`{' + '.join(ref['proposed'])}`")
            if ref['pros']:
                lines.append(f"\n  ✅ {'；'.join(ref['pros'])}")
            if ref['cons']:
                lines.append(f"\n  ⚠️ {'；'.join(ref['cons'])}")
            lines.append(f"\n**{ref['recommendation']}**：{ref['reason']}\n")

    # 另一面牆
    if response.constraints_wall:
        lines.append("\n---\n\n## 🧱 另一面牆（已排除的方案）\n")
        lines.append("*這些模組在壓縮過程中被排除，但保留了還原條件，未來需要的時候可以回頭找。*\n")
        lines.append("| ID | 排除原因 | 還原條件 |")
        lines.append("|---|---|---|")
        for c in response.constraints_wall:
            cond = "; ".join(c['restoration_conditions']) if c['restoration_conditions'] else "—"
            lines.append(f"| `{c['id']}` | {c['removal_reason'][:50]}... | {cond} |")
        lines.append("")

    # 指引
    lines.append("\n---\n\n## ✏️ 如何回應\n")
    if response.expansion_status == ExpansionMode.EXPANDING:
        lines.append("回應時可以直接：\n")
        lines.append("1. **回答問題**：直接說需求（如「需要低庫存警示」）")
        lines.append("2. **B 方案**：說「加 B-001」或「不要 B-001」")
        lines.append("3. **模組增減**：說「把 `sort-control` 拿掉」或「加 `chart-line`」")
        lines.append("4. **觸發壓縮**：說「就這個範圍，開始壓縮」，Planner 將根據 Retention 建議裁決\n")
    elif response.expansion_status == ExpansionMode.COMPRESSING:
        lines.append("**壓縮觸發中。** Planner 正在根據 Retention 建議進行裁決...\n")
    elif response.expansion_status == ExpansionMode.COMPRESSED:
        lines.append("已壓縮完成。你可以：\n")
        lines.append("1. **直接進入 Compiler**：說「開始做」")
        lines.append("2. **修改範圍**：說「把 `XXX` 加回來」，Planner 會從另一面牆還原\n")
        lines.append("3. **查看另一面牆**：說「另一面牆有哪些」\n")

    # Manifest
    if response.is_complete and response.expansion_status == ExpansionMode.COMPRESSED:
        lines.append("\n---\n\n## 📦 最終 Manifest\n")
        lines.append("```json")
        lines.append(response.manifest_draft)
        lines.append("```\n")

    return "\n".join(lines)
