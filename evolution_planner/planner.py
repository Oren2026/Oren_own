"""
Evolution Planner — Planner Entry Point

整合所有 nodes，提供單一入口：
- `plan(intent: str) -> InteractiveResponse`
- `respond(user_input: str, manifest: Manifest) -> InteractiveResponse`
"""

import json
import uuid
from typing import Optional, List

from manifest import (
    Manifest, ClosureStatus, ExpansionMode,
    UnresolvedQuestion, Module, BPlan, Entity, EntityField,
    RetentionRecommendation, ConstrainedModule
)
from nodes.decomposer import decompose_intent, build_key_entities, identify_missing_info
from nodes.module_planner import (
    map_operations_to_modules, generate_b_plans, analyze_refactor_options,
    build_composition, create_module, compress_modules
)
from nodes.interactor import build_interactive_response, to_markdown
from nodes.closure_validator import analyze_closure, force_close, mark_question_answered


def _build_initial_manifest(intent: str) -> tuple[Manifest, List]:
    """
    將用戶意圖分解為初始 Manifest（擴展模式）
    """
    manifest = Manifest(intent=intent)
    decomposed = decompose_intent(intent)

    # 1. 實體識別
    key_entities = build_key_entities(decomposed.domain_type, decomposed.entities)
    manifest.entities = [
        Entity(name=e["name"], fields=[EntityField(**f) for f in e["fields"]])
        for e in key_entities
    ]

    # 2. 模組識別 + Retention Recommendation
    candidates, covered = map_operations_to_modules(
        decomposed.operations,
        decomposed.implied_operations
    )

    module_objs = []
    for cand in candidates:
        mod = create_module(
            module_id=cand.module_id,
            semantic=cand.semantic,
            reason=cand.reason,
            retention=cand.retention,
            retention_reason=cand.retention_reason,
            risk_analysis=cand.risk_analysis,
            expansion_conditions=cand.expansion_conditions,
        )
        module_objs.append(mod)

    # 加入 layout-page
    if "layout-page" not in [m.id for m in module_objs]:
        lp = create_module("layout-page")
        module_objs.insert(0, lp)

    manifest.modules = module_objs

    # 3. composition
    all_ids = [m.id for m in module_objs]
    manifest.composition = build_composition(all_ids, decomposed.domain_type)
    manifest.root_module = "layout-page"

    # 4. B plans
    manifest.b_plans = generate_b_plans(
        decomposed.implied_operations,
        decomposed.domain_type,
        all_ids
    )

    # 5. 重構選項
    manifest.refactor_options = analyze_refactor_options(module_objs)

    # 6. 未解決問題
    missing = identify_missing_info(decomposed)
    manifest.unresolved_questions = []
    for i, m in enumerate(missing):
        manifest.unresolved_questions.append(UnresolvedQuestion(
            question_id=f"q-{i+1:02d}",
            question=m,
            related_modules=all_ids,
        ))

    # 7. 收斂判斷
    closure = analyze_closure(manifest)
    manifest.closure_status = closure.status
    manifest.expansion_status = ExpansionMode.EXPANDING

    return manifest, [decomposed]


def _build_response(manifest: Manifest, decomposed_list: List) -> tuple[Manifest, str]:
    """根據當前 Manifest 產生互動式回應"""
    decomposed = decomposed_list[-1]
    candidates, _ = map_operations_to_modules(
        decomposed.operations,
        decomposed.implied_operations
    )

    response = build_interactive_response(
        manifest=manifest,
        decomposed=decomposed,
        candidates=candidates,
    )
    return manifest, to_markdown(response)


# ============================================================================
# 公開 API
# ============================================================================

def plan(intent: str) -> tuple[Manifest, str]:
    """
    第一次呼叫：輸入用戶意圖，返回互動式回應（擴展模式）
    """
    manifest, decomposed_list = _build_initial_manifest(intent)
    return _build_response(manifest, decomposed_list)


def respond(user_input: str, manifest: Manifest) -> tuple[Manifest, str]:
    """
    持續對話

    用戶可以：
    - 回答問題
    - 選擇 B 方案（"加 B-001" / "不要 B-001"）
    - 增減模組（"拿掉 XXX" / "加 XXX"）
    - 觸發壓縮（"就這個範圍" / "就這樣"）
    """
    user_lower = user_input.lower().strip()

    # ====================================================================
    # Case: 觸發壓縮
    # ====================================================================
    compress_phrases = [
        "就這個範圍", "就這樣開始", "範圍就這樣", "壓縮",
        "就這樣做", "就這樣吧", "就這樣", "就這樣的了",
        "確認範圍", "範圍確認",
    ]
    if any(p in user_lower for p in compress_phrases):
        # 根據 Retention Recommendation 自動裁決
        decisions = {}
        for m in manifest.modules:
            if m.retention_recommendation == RetentionRecommendation.KEEP:
                decisions[m.id] = "KEEP"
            elif m.retention_recommendation == RetentionRecommendation.CONSIDER_DROP:
                decisions[m.id] = "DROP"
            elif m.retention_recommendation == RetentionRecommendation.B_PLAN:
                # B_PLAN 預設 DROP，除非用戶已確認
                decisions[m.id] = "DROP"

        # 對 B-plans 做裁決
        for bp in manifest.b_plans:
            if bp.recommendation == "SKIP":
                # 建議 SKIP → 維持 DROP
                pass
            else:
                # 建議 ADD → 如果還沒被加入（用戶未主動確認）→ DROP
                # 只有用戶明確說「加 B-XXX」才保留
                pass

        manifest = compress_modules(manifest, user_input, decisions)
        manifest.expansion_status = ExpansionMode.COMPRESSED
        manifest.closure_status = ClosureStatus.COMPLETE

        decomposed = decompose_intent(manifest.intent)
        return _build_response(manifest, [decomposed])

    # ====================================================================
    # Case: 明確增減模組
    # ====================================================================
    add_keywords = ["加", "加上", "新增", "我要加", "需要加"]
    drop_keywords = ["拿掉", "移除", "刪掉", "不要", "不需要", "拿掉"]

    added_module = None
    for kw in add_keywords:
        if kw in user_lower:
            # 簡單解析：「加 XXX」
            words = user_input.split()
            for w in words:
                if w not in add_keywords and len(w) > 2:
                    added_module = w.strip('`').strip()
                    break

    dropped_modules = []
    for kw in drop_keywords:
        if kw in user_lower:
            words = user_input.split()
            for w in words:
                if w not in drop_keywords and len(w) > 2:
                    dropped_modules.append(w.strip('`').strip())

    if added_module or dropped_modules:
        # 加入模組（從另一面牆還原或新增）
        for mod_id in dropped_modules:
            # 從 modules 移到 constraints_wall
            kept = [m for m in manifest.modules if m.id != mod_id]
            removed = next((m for m in manifest.modules if m.id == mod_id), None)
            if removed:
                from datetime import datetime
                constrained = ConstrainedModule(
                    module_id=mod_id,
                    original_reason=getattr(removed, 'reason', '') if hasattr(removed, 'reason') else removed.semantic,
                    removal_reason=f"用戶主動移除：「{user_input}」",
                    trigger=user_input,
                    removed_at=datetime.now().isoformat(),
                    restoration_conditions=getattr(removed, 'expansion_conditions', []),
                )
                manifest.constraints_wall.append(constrained)
            manifest.modules = kept

        if added_module:
            # 檢查是否在 constraints_wall（還原）
            wall = [c for c in manifest.constraints_wall if c.module_id == added_module]
            if wall:
                # 從牆上還原
                from nodes.module_planner import create_module
                restored = create_module(added_module)
                manifest.modules.append(restored)
                manifest.constraints_wall = [c for c in manifest.constraints_wall if c.module_id != added_module]

        decomposed = decompose_intent(manifest.intent)
        return _build_response(manifest, [decomposed])

    # ====================================================================
    # Case: B 方案選擇
    # ====================================================================
    b_add_phrases = ["加 b-", "採用 b-", "用 b-", "我要 b-"]
    b_drop_phrases = ["不要 b-", "不用 b-", "拿掉 b-", "刪掉 b-", "skip b-"]

    b_decision = None
    for kw in b_add_phrases:
        if kw in user_lower:
            parts = user_lower.split(kw)
            if len(parts) > 1:
                b_id = "b-" + parts[1].strip().split()[0]
                b_decision = (b_id, "ADD")

    for kw in b_drop_phrases:
        if kw in user_lower:
            parts = user_lower.split(kw)
            if len(parts) > 1:
                b_id = "b-" + parts[1].strip().split()[0]
                b_decision = (b_id, "DROP")
                break

    if b_decision:
        bp_id, decision = b_decision
        bp = next((b for b in manifest.b_plans if b.b_plan_id == bp_id), None)
        if bp:
            for delta in bp.modules_delta:
                mod_id = delta["module"]
                if decision == "ADD":
                    # 加入 module，清除 constraints_wall 中的記錄
                    from nodes.module_planner import create_module
                    new_mod = create_module(
                        mod_id,
                        retention=RetentionRecommendation.KEEP,
                        retention_reason=f"用戶選擇 B 方案 {bp_id}：{bp.trigger}",
                        risk_analysis=bp.risk_analysis,
                    )
                    manifest.modules.append(new_mod)
                    manifest.constraints_wall = [c for c in manifest.constraints_wall if c.module_id != mod_id]
                else:
                    # DROP：檢查是否在 modules 裡
                    manifest.modules = [m for m in manifest.modules if m.id != mod_id]
                    if mod_id not in [c.module_id for c in manifest.constraints_wall]:
                        from datetime import datetime
                        from nodes.module_planner import _MODULE_SEMANTICS
                        info = _MODULE_SEMANTICS.get(mod_id, {})
                        manifest.constraints_wall.append(ConstrainedModule(
                            module_id=mod_id,
                            original_reason=bp.trigger,
                            removal_reason=f"用戶拒絕 B 方案 {bp_id}",
                            trigger=user_input,
                            removed_at=datetime.now().isoformat(),
                            restoration_conditions=info.get("expansion_conditions", []),
                        ))

        manifest.closure_status = ClosureStatus.COMPLETE
        decomposed = decompose_intent(manifest.intent)
        return _build_response(manifest, [decomposed])

    # ====================================================================
    # Case: 回答問題
    # ====================================================================
    if ":" in user_input and user_input.split(":")[0].startswith("q-"):
        parts = user_input.split(":", 1)
        q_id = parts[0].strip()
        answer = parts[1].strip() if len(parts) > 1 else user_input
        manifest = mark_question_answered(manifest, q_id, answer)
        decomposed = decompose_intent(manifest.intent)
        return _build_response(manifest, [decomposed])

    # ====================================================================
    # Case: 直接說需求（涵蓋關鍵字）
    # ====================================================================
    need_keywords = ["需要", "要", "加上", "加入", "有"]
    if any(kw in user_lower for kw in need_keywords):
        decomposed = decompose_intent(manifest.intent)
        # 簡單重新分析：用戶可能在說新的 implied operation
        # 根據 implied knowledge 看看有沒有匹配的
        from nodes.module_planner import IMPLIED_TO_BPLAN
        for imp_op, bp_info in IMPLIED_TO_BPLAN.items():
            if imp_op in user_input:
                for delta in bp_info["modules_delta"]:
                    if delta["action"] == "ADD":
                        mod_id = delta["module"]
                        if not any(m.id == mod_id for m in manifest.modules):
                            from nodes.module_planner import create_module
                            new_mod = create_module(
                                mod_id,
                                retention=RetentionRecommendation.KEEP,
                                retention_reason=f"用戶明確需求：{imp_op}",
                            )
                            manifest.modules.append(new_mod)
        manifest.closure_status = ClosureStatus.COMPLETE
        return _build_response(manifest, [decomposed])

    # ====================================================================
    # Case: 「另一面牆」查詢
    # ====================================================================
    wall_queries = ["另一面牆", "constraints wall", "有哪些被拿掉", "排除的"]
    if any(q in user_lower for q in wall_queries):
        decomposed = decompose_intent(manifest.intent)
        return _build_response(manifest, [decomposed])

    # ====================================================================
    # Case: 無法解析
    # ====================================================================
    return manifest, (
        "我沒有完全理解。你可以：\n\n"
        "1. **觸發壓縮**：說「就這個範圍，開始壓縮」\n"
        "2. **B 方案**：說「加 B-XXX」或「不要 B-XXX」\n"
        "3. **模組增減**：說「拿掉 `XXX`」或「加 `XXX`」\n"
        "4. **直接說需求**：說「需要 XXX」，Planner 會自動對應模組\n"
        "5. **就這樣做**：說「就這樣，開始做」，直接進入 Compiler\n"
    )


# ============================================================================
# CLI / 測試入口
# ============================================================================

def main():
    print("=== Evolution Planner ===")
    print("輸入需求，按 Enter 開始規劃。支援：")
    print("  - 直接說需求")
    print("  - 說「就這個範圍」觸發壓縮")
    print("  - 說「加 B-XXX」選擇 B 方案")
    print("  說「退出」結束。\n")

    manifest = None

    while True:
        try:
            user_input = input("👤 你：").strip()
        except EOFError:
            break

        if not user_input:
            continue

        if user_input in ["退出", "exit", "quit"]:
            print("\n👋 再見！")
            break

        if manifest is None:
            manifest, markdown = plan(user_input)
        else:
            manifest, markdown = respond(user_input, manifest)

        print("\n" + "=" * 50)
        print("🤖 Planner：")
        print(markdown)
        print("=" * 50 + "\n")


if __name__ == "__main__":
    main()
