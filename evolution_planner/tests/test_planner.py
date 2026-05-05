"""
Evolution Planner — Test Suite

用法：
    cd ~/Desktop/Oren_own/evolution_planner
    python3 tests/test_planner.py
"""

import sys
sys.path.insert(0, ".")

from planner import plan, respond
from manifest import ClosureStatus, RetentionRecommendation, ExpansionMode


def test_inventory_system():
    """測試：庫存管理系統"""
    print("\n" + "=" * 60)
    print("TEST: 庫存管理系統")
    print("=" * 60)

    m, resp = plan("我要做一個庫存管理系統")

    assert len(m.modules) >= 7, f"Expected >=7 modules, got {len(m.modules)}"
    assert m.closure_status == ClosureStatus.COMPLETE
    assert len(m.entities) >= 1

    module_ids = [x.id for x in m.modules]
    print(f"  Entities: {[e.name for e in m.entities]}")
    print(f"  Modules: {module_ids}")
    print(f"  Closure: {m.closure_status.value}")

    # 互動測試：說「就這樣，開始做」
    m2, resp2 = respond("就這樣，開始做", m)
    assert m2.closure_status == ClosureStatus.COMPLETE
    print(f"  After '就這樣': {m2.closure_status.value}")
    print("  ✅ PASS\n")


def test_task_system():
    """測試：任務管理系統"""
    print("\n" + "=" * 60)
    print("TEST: 任務管理系統")
    print("=" * 60)

    m, resp = plan("我要做一個待辦系統")

    module_ids = [x.id for x in m.modules]
    print(f"  Entities: {[e.name for e in m.entities]}")
    print(f"  Modules: {module_ids}")
    print(f"  Closure: {m.closure_status.value}")

    # 互動測試：說「需要優先權排序」
    m2, resp2 = respond("需要優先權排序", m)
    print(f"  After '需要優先權排序': {m2.closure_status.value}")
    print("  ✅ PASS\n")


def test_too_vague():
    """測試：需求太模糊"""
    print("\n" + "=" * 60)
    print("TEST: 太模糊的需求")
    print("=" * 60)

    m, resp = plan("做一個網站")

    print(f"  Closure: {m.closure_status.value}")
    print(f"  Questions: {[q.question_id + ': ' + q.question for q in m.unresolved_questions]}")
    assert m.closure_status == ClosureStatus.NEEDS_CLARIFICATION
    print("  ✅ PASS\n")


def test_blog_system():
    """測試：部落格系統"""
    print("\n" + "=" * 60)
    print("TEST: 部落格系統")
    print("=" * 60)

    m, resp = plan("我要做一個部落格系統")

    module_ids = [x.id for x in m.modules]
    print(f"  Entities: {[e.name for e in m.entities]}")
    print(f"  Modules: {module_ids}")
    print(f"  Closure: {m.closure_status.value}")
    print("  ✅ PASS\n")


def test_retention_recommendations():
    """測試：Retention Recommendation 有被正確設定"""
    print("\n" + "=" * 60)
    print("TEST: Retention Recommendation")
    print("=" * 60)

    m, resp = plan("我要做一個庫存管理系統")

    module_ids = [x.id for x in m.modules]
    keep = [x.id for x in m.modules if x.retention_recommendation == RetentionRecommendation.KEEP]
    consider_drop = [x.id for x in m.modules if x.retention_recommendation == RetentionRecommendation.CONSIDER_DROP]

    print(f"  All modules ({len(module_ids)}): {module_ids}")
    print(f"  KEEP ({len(keep)}): {keep}")
    print(f"  CONSIDER_DROP ({len(consider_drop)}): {consider_drop}")

    assert len(keep) >= 1, "至少要有 KEEP 的模組"
    assert any(x.retention_recommendation == RetentionRecommendation.CONSIDER_DROP for x in m.modules), \
        "至少要有 CONSIDER_DROP 的模組（alert-banner / badge-status）"

    # 每個 CONSIDER_DROP 的模組要有 retention_reason
    for mod in m.modules:
        if mod.retention_recommendation == RetentionRecommendation.CONSIDER_DROP:
            assert mod.retention_reason, f"{mod.id} 缺少 retention_reason"
            assert mod.risk_analysis, f"{mod.id} 缺少 risk_analysis"

    print("  ✅ PASS\n")


def test_compression_trigger():
    """測試：壓縮觸發（就這樣）"""
    print("\n" + "=" * 60)
    print("TEST: Compression Trigger（就這樣）")
    print("=" * 60)

    m, resp = plan("我要做一個庫存管理系統")

    # 記錄壓縮前的模組數量
    before_count = len(m.modules)
    consider_drop_ids = [x.id for x in m.modules if x.retention_recommendation == RetentionRecommendation.CONSIDER_DROP]
    print(f"  Before compression: {before_count} modules, CONSIDER_DROP: {consider_drop_ids}")

    # 觸發壓縮
    m2, resp2 = respond("就這樣", m)

    print(f"  After compression: {len(m2.modules)} modules")
    print(f"  Expansion status: {m2.expansion_status.value}")
    print(f"  Constraints wall: {[c.module_id for c in m2.constraints_wall]}")

    # 壓縮後狀態應為 COMPRESSED
    assert m2.expansion_status == ExpansionMode.COMPRESSED, f"Expected COMPRESSED, got {m2.expansion_status.value}"

    # CONSIDER_DROP 的模組應該被移到 constraints_wall
    if consider_drop_ids:
        constrained_ids = [c.module_id for c in m2.constraints_wall]
        assert len(constrained_ids) >= len(consider_drop_ids), \
            f"Expected at least {len(consider_drop_ids)} constrained, got {len(constrained_ids)}"

    # compression_history 應該有記錄
    assert len(m2.compression_history) >= 1, "compression_history 應該有記錄"

    print("  ✅ PASS\n")


def test_task_queue_generation():
    """測試：Manifest → TaskQueue 轉換"""
    print("\n" + "=" * 60)
    print("TEST: Task Queue Generation")
    print("=" * 60)

    m, resp = plan("我要做一個庫存管理系統")

    # 觸發壓縮，確保 CONSIDER_DROP 的 modules 不進 task queue
    m2, resp2 = respond("就這樣", m)

    # 生成 task queue
    tq = m2.to_task_queue(
        base_path="/Users/oren/project/evolution",
        skills_path="software/skills",
        theme="glass",
    )

    print(f"  Manifest ID: {tq.manifest_id}")
    print(f"  Tasks ({len(tq.tasks)}):")
    for task in tq.tasks:
        print(f"    {task.task_id}: {task.module_id} → {task.output.path}")

    # task 數量應該等於 KEEP 的 modules 數量（壓縮後只有 7 個 KEEP）
    keep_modules = [x for x in m2.modules if x.retention_recommendation == RetentionRecommendation.KEEP]
    assert len(tq.tasks) == len(keep_modules), \
        f"Expected {len(keep_modules)} tasks, got {len(tq.tasks)}"

    # 每個 task 都要有 task_id、module_id、output.path
    for task in tq.tasks:
        assert task.task_id.startswith("t-"), f"Invalid task_id: {task.task_id}"
        assert task.module_id, "module_id is empty"
        assert task.output.path.endswith(".skill"), f"Invalid output path: {task.output.path}"
        assert task.input.schema.get("entity"), f"Schema missing entity: {task.input.schema}"

    # execution_context 正確
    assert tq.execution_context.base_path == "/Users/oren/project/evolution"
    assert tq.execution_context.theme == "glass"

    print(f"  Execution context: base={tq.execution_context.base_path}, theme={tq.execution_context.theme}")
    print(f"  ✅ PASS\n")


def test_task_queue_no_consider_drop():
    """測試：CONSIDER_DROP 的 modules 不會出現在 task queue"""
    print("\n" + "=" * 60)
    print("TEST: CONSIDER_DROP Not in Task Queue")
    print("=" * 60)

    m, resp = plan("我要做一個庫存管理系統")

    # 壓縮前
    tq_before = m.to_task_queue(theme="glass")
    consider_drop_ids = [x.id for x in m.modules if x.retention_recommendation == RetentionRecommendation.CONSIDER_DROP]
    task_module_ids = [t.module_id for t in tq_before.tasks]

    print(f"  Before compression:")
    print(f"    CONSIDER_DROP modules: {consider_drop_ids}")
    print(f"    Task queue modules: {task_module_ids}")

    # 壓縮後
    m2, resp2 = respond("就這樣", m)
    tq_after = m2.to_task_queue(theme="glass")
    task_module_ids_after = [t.module_id for t in tq_after.tasks]

    print(f"  After compression:")
    print(f"    Task queue modules: {task_module_ids_after}")

    # CONSIDER_DROP 不應該出現在 task queue
    for cid in consider_drop_ids:
        assert cid not in task_module_ids_after, f"{cid} should not be in task queue after compression"

    print("  ✅ PASS\n")


def run_all():
    test_inventory_system()
    test_task_system()
    test_too_vague()
    test_blog_system()
    test_retention_recommendations()
    test_compression_trigger()
    test_task_queue_generation()
    test_task_queue_no_consider_drop()
    print("\n" + "=" * 40)
    print("ALL TESTS PASSED ✅")
    print("=" * 40)


if __name__ == "__main__":
    run_all()
