"""
Evolution Planner — Closure Validator

負責判斷當前 Manifest 是否已收斂（closure）。
收斂條件：
1. 所有 unresolved_questions 都已回答
2. 每個 module 的 stop_reason 都已確認
3. 沒有矛盾的需求
"""

from dataclasses import dataclass
from typing import List
from manifest import Manifest, ClosureStatus, UnresolvedQuestion


@dataclass
class ClosureAnalysis:
    status: ClosureStatus
    blockers: List[str]          # 阻止收斂的項目
    warnings: List[str]         # 警告（非阻斷）
    ready_to_close: bool


def analyze_closure(manifest: Manifest) -> ClosureAnalysis:
    """
    分析當前 Manifest 的收斂狀態
    """
    blockers = []
    warnings = []

    # Blocker 1：仍有未回答的問題
    unanswered = [q for q in manifest.unresolved_questions if not q.answered]
    if unanswered:
        blockers.append(
            f"仍有 {len(unanswered)} 個問題未回答，Planner 不能自行猜測。\n"
            f"  未回答：{[q.question for q in unanswered]}"
        )

    # Blocker 2：沒有任何模組（空規劃）
    if not manifest.modules:
        blockers.append("沒有識別出任何模組，需求太模糊，無法規劃。")

    # Blocker 3：closure_status 強制為 NEEDS_CLARIFICATION
    if manifest.closure_status == ClosureStatus.NEEDS_CLARIFICATION and unanswered:
        # 這是預設狀態，不算 blocker
        pass

    # Warning 1：有 B 方案但用戶未表態
    if manifest.b_plans and manifest.closure_status != ClosureStatus.COMPLETE:
        # B 方案存在時，收斂前需要用戶對每個 B 方案表態
        undecided_bplans = [
            bp for bp in manifest.b_plans
            if not any(uq.b_plan and uq.b_plan.b_plan_id == bp.b_plan_id
                      and uq.answered
                      for uq in manifest.unresolved_questions)
        ]
        if undecided_bplans:
            warnings.append(
                f"有 {len(undecided_bplans)} 個 B 方案尚未表態。"
                " Planner 預設採納 recommendation，但如果用戶有不同意見可在這裡調整。"
            )

    # Warning 2：所有模組都沒有 depends_on（可能太過獨立）
    all_standalone = all(len(m.depends_on) == 0 for m in manifest.modules if m.id != "layout-page")
    if all_standalone and len(manifest.modules) > 3:
        warnings.append(
            "所有模組幾乎都沒有依賴關係，可能是規劃太過獨立。"
            " 通常列表頁依賴搜尋、編輯依賴列表，這樣的依賴鏈能讓 composition 更順暢。"
        )

    # Warning 3：implied_operations 很多但用戶只提到 CRUD
    # （這個在 builder 階段已處理，這裡只是最後把關）

    # 決定 ready_to_close
    ready_to_close = len(blockers) == 0

    if not ready_to_close:
        status = ClosureStatus.NEEDS_CLARIFICATION
    elif warnings:
        status = ClosureStatus.COMPLETE  # 仍可收斂，只是有警告
    else:
        status = ClosureStatus.COMPLETE

    return ClosureAnalysis(
        status=status,
        blockers=blockers,
        warnings=warnings,
        ready_to_close=ready_to_close,
    )


def force_close(manifest: Manifest) -> Manifest:
    """
    當用戶明確說「就這樣，開始做」時，
    強制收斂 Manifest（清除所有未回答的問題）
    """
    manifest.closure_status = ClosureStatus.COMPLETE
    manifest.unresolved_questions = []
    return manifest


def mark_question_answered(
    manifest: Manifest,
    question_id: str,
    user_response: str
) -> Manifest:
    """
    標記一個問題為已回答，並根據用戶回應更新 Manifest
    """
    for q in manifest.unresolved_questions:
        if q.question_id == question_id:
            q.answered = True
            q.user_response = user_response

            # 根據用戶回應，可能需要修改 modules
            # 這裡是簡單的邏輯，高級邏輯應該在 builder 裡處理
            if "加" in user_response or "需要" in user_response or "要" in user_response:
                # 用戶說要加入功能 → B plan 的 modules_delta 應該被採用
                if q.b_plan:
                    for delta in q.b_plan.modules_delta:
                        if delta["action"] == "ADD":
                            # 檢查是否已在 modules 裡
                            existing_ids = [m.id for m in manifest.modules]
                            if delta["module"] not in existing_ids:
                                # TODO: 動態建立 Module
                                pass

    # 重新分析收斂狀態
    closure = analyze_closure(manifest)
    manifest.closure_status = closure.status

    return manifest
