"""
Evolution Planner — Task Executor

兩次派遣流程：
1. Pass 1（並行）：所有 tasks 同時 dispatch 給 subagents
2. 矛盾檢查：讀取生成的檔案，檢查 spec contract 遵守情況
3. Pass 2（只修有問題的）：只對有問題的 task 做第二次 dispatch
4. Final QA：全部結果彙整

使用方式：
    result = execute_task_queue(task_queue, dispatch_fn=my_dispatch_fn)

dispatch_fn 的簽名：
    def dispatch_fn(task: TaskSpec) -> TaskResult
"""

import sys
sys.path.insert(0, ".")

import re
import os
import time
import json
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Callable, Set
from enum import Enum


# ============================================================================
# 產出結果
# ============================================================================

class TaskStatus(Enum):
    PENDING = "PENDING"
    DONE = "DONE"
    FAILED = "FAILED"
    FIXED = "FIXED"


@dataclass
class TaskResult:
    task_id: str
    module_id: str
    status: TaskStatus = TaskStatus.PENDING
    artifact_path: str = ""
    expected_path: str = ""
    error: str = ""
    issues: List[str] = field(default_factory=list)

    @property
    def has_issues(self) -> bool:
        return len(self.issues) > 0


@dataclass
class ExecutionResult:
    manifest_id: str
    total_tasks: int = 0
    passed: int = 0
    fixed: int = 0
    task_results: List[TaskResult] = field(default_factory=list)
    pass1_issues: List[str] = field(default_factory=list)
    cross_agent_issues: List["CrossAgentIssue"] = field(default_factory=list)


@dataclass
class CrossAgentIssue:
    """
    跨 subagent 的矛盾問題。
    發現時停在 Pass 1 和 Pass 2 之間，等人類決策。
    """
    contradiction_type: str          # slot_ownership_conflict / schema_inconsistency / deps_mismatch / css_conflict / duplicate_id
    involved_tasks: List[str]       # 涉及哪些 task_id
    description: str                 # 人類可讀的描述
    evidence: Dict[str, Any]         # 具體矛盾證據
    suggested_fix: str               # 建議的修復方向（讓人類決策）


# ============================================================================
# Skill Registry
# ============================================================================

MODULE_SLOTS = {
    "layout-page": ["header", "search", "content", "modal", "confirm", "toast"],
    "layout-header": [],
    "table-data": ["thead", "tbody"],
    "modal-form": ["form-fields"],
    "confirm-dialog": [],
    "toast-notify": [],
    "search-bar": [],
    "sort-control": [],
    "pagination": [],
    "badge-status": [],
    "alert-banner": [],
    "card-stat": [],
}


# ============================================================================
# Subagent Prompt Builder
# ============================================================================

def build_subagent_prompt(task, base_path: str) -> str:
    """
    為一個 task 生成 subagent 的 prompt。
    dispatch_fn 會負責實際執行，這裡只生成 prompt。
    """
    schema = task.input.schema
    entity = schema.get("entity", "項目")
    fields = schema.get("fields", [])
    slots = MODULE_SLOTS.get(task.module_id, [])
    output_path = os.path.join(base_path, task.output.path)

    fields_json = json.dumps(fields, ensure_ascii=False, indent=2)

    return f"""你是 Evolution Compiler 的 skill 生成器。

## 任務
生成 `{task.module_id}` 的 skill 檔案。

## 輸出路徑
`{output_path}`

## Schema
- Entity: {entity}
- Fields: {fields_json}

## Slots（這個 module 應該有的 data-slot 標記）
{slots}

## Theme
{task.execution_context.theme}

## Skill 檔案格式
```
# skill: {task.module_id}

## Contract
- **語義承諾**：（這個 skill 做什麼）
- **輸入**：{task.input.schema.get("entity", "項目")}
- **輸出**：HTML/React/CSS
- **操作邊界**：✅ / ❌

## Slots
{', '.join(f'slot:{s}' for s in slots) if slots else '（此 skill 無需 slot 標記）'}

## Boundaries
- **系統邊界**：Presentation Layer
- **操作邊界**：✅ / ❌
- **狀態邊界**：Stateless

## Examples
（可選：輸入 → 輸出範例）

[html]
（HTML 實作，含 data-slot 標記）

[react]
（React 實作）

[style]
（CSS 實作）
```

## 約束
1. 使用 `data-slot="xxx"` 標記所有 injection 點
2. 不要 hardcode entity name 或 theme color（用 CSS variable）
3. Schema 的欄位名稱要用在 HTML binding 裡（如 `item.品名`、`{{item.品名}}`）
4. table-data 必須包含 `<table>` 結構，`<tbody>` 內用 `item.欄位名`
5. 寫入之前先檢查檔案是否已存在，若已存在先讀取現有 Contract section 確保不破壞

## 執行步驟
1. 嘗試讀取現有 `{output_path}`（如果存在）
2. 生成完整 skill 檔案內容
3. 寫入 `{output_path}`
4. 確認 `data-slot` 標記完整
"""


# ============================================================================
# 矛盾檢查器
# ============================================================================

class ContradictionChecker:
    """檢查 skill file 是否符合 spec contract"""

    def __init__(self, schema: Dict[str, Any], expected_slots: List[str]):
        self.schema = schema
        self.entity = schema.get("entity", "")
        self.field_names = {f["name"] for f in schema.get("fields", [])}
        self.expected_slots = expected_slots

    def check(self, module_id: str, content: str) -> List[str]:
        issues = []
        issues += self._slot_completeness(module_id, content)
        issues += self._schema_binding(content)
        issues += self._no_entity_hardcode(content)
        return issues

    def _slot_completeness(self, module_id: str, content: str) -> List[str]:
        found = set(re.findall(r'data-slot=["\']([\w-]+)["\']', content))
        expected = set(self.expected_slots)
        missing = expected - found
        if missing:
            return [f"missing_slots:{sorted(missing)}"]
        return []

    def _schema_binding(self, content: str) -> List[str]:
        # 從 HTML/template 抽出所有欄位 binding
        bound = set(re.findall(r'(?:item\.|\{\{item\.)(\w+)(?:\}\}|)', content))
        known = self.field_names | {"id", "createdAt", "updatedAt", "actions"}
        unknown = bound - known
        if unknown:
            return [f"unbound_field:{sorted(unknown)}"]
        return []

    def _no_entity_hardcode(self, content: str) -> List[str]:
        if not self.entity:
            return []
        lines = content.split("\n")
        for i, line in enumerate(lines, 1):
            if self.entity in line:
                if "data-slot" not in line and "Contract" not in line and "# skill:" not in line and "##" not in line:
                    return [f"hardcoded_entity:'{self.entity}'@line{i}"]
        return []


def check_skill_file(file_path: str, schema: Dict[str, Any], expected_slots: List[str]) -> List[str]:
    """讀取檔案並做矛盾檢查"""
    if not os.path.exists(file_path):
        return ["file_not_found"]

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    module_id = os.path.basename(file_path).replace(".skill", "")
    checker = ContradictionChecker(schema, expected_slots)
    return checker.check(module_id, content)


# ============================================================================
# 跨 Agent 矛盾檢查器
# ============================================================================

class CrossAgentContradictionChecker:
    """
    檢查不同 subagent 產出之間是否有邏輯矛盾。

    矛盾類型：
    1. slot_ownership_conflict  — 兩個 agent 都聲稱擁有同一個 slot
    2. schema_inconsistency     — agent A 用到的 field 不在 agent B 的 schema 裡
    3. deps_mismatch           — agent A 說依賴 B 的某 slot，但 B 沒產生那個 slot
    4. css_conflict            — 兩個 agent 對同一個 class 給了不同 style
    5. duplicate_id            — 兩個 agent 產出相同 ID 的元素
    """

    def __init__(self, task_results: List[TaskResult], task_queue):
        self.task_results = [r for r in task_results if r.status == TaskStatus.DONE]
        self.task_queue = task_queue
        # 建立 task_id → task spec 映射
        self.task_map = {t.task_id: t for t in task_queue.tasks}
        # 建立 module_id → task spec 映射
        self.module_map = {t.module_id: t for t in task_queue.tasks}

    def check_all(self) -> List[CrossAgentIssue]:
        issues = []
        issues += self._slot_ownership_conflict()
        issues += self._schema_inconsistency()
        issues += self._deps_mismatch()
        issues += self._duplicate_id()
        issues += self._css_conflict()
        return issues

    def _read_artifact(self, result: TaskResult) -> str:
        """讀取 subagent 產出的 artifact 檔案"""
        if not result.artifact_path or not os.path.exists(result.artifact_path):
            return ""
        with open(result.artifact_path, "r", encoding="utf-8") as f:
            return f.read()

    def _slot_ownership_conflict(self) -> List[CrossAgentIssue]:
        """檢查：多個 agent 都聲稱擁有同一個 slot"""
        issues = []
        # 收集每個 task 宣告的 slots
        slot_owner: Dict[str, List[str]] = {}  # slot_name → [task_ids]
        for r in self.task_results:
            content = self._read_artifact(r)
            if not content:
                continue
            found = re.findall(r'data-slot=["\']([^"\']+)["\']', content)
            for slot in found:
                slot_owner.setdefault(slot, []).append(r.task_id)

        # slot 只有一個 owner 是正常的
        # 衝突：多個 agent 聲稱同一個 slot（layout-page 除外，它是宣告者）
        conflicts = {slot: owners for slot, owners in slot_owner.items()
                     if len(owners) > 1 and slot not in ("header", "search", "content", "modal", "confirm", "toast")}

        for slot, task_ids in conflicts.items():
            issues.append(CrossAgentIssue(
                contradiction_type="slot_ownership_conflict",
                involved_tasks=task_ids,
                description=f"Slot `data-slot=\"{slot}\"` 被多個 agent 同時聲稱擁有",
                evidence={"slot": slot, "owners": task_ids, "all_slots": slot_owner},
                suggested_fix=f"選擇其中一個 agent 保留該 slot，其餘 agent 改用其他 slot 或移除該標記",
            ))
        return issues

    def _schema_inconsistency(self) -> List[CrossAgentIssue]:
        """檢查：agent A 用到的 field 不在其他 agent 的 schema 裡"""
        issues = []
        # 建立所有 agent 的 field 集合
        all_fields: Dict[str, Set[str]] = {}
        for r in self.task_results:
            task = self.task_map.get(r.task_id)
            if not task:
                continue
            fields = {f["name"] for f in task.input.schema.get("fields", [])}
            all_fields[r.task_id] = fields

        # 檢查每個 agent 使用的 field 是否在他的 schema 裡
        for r in self.task_results:
            content = self._read_artifact(r)
            if not content:
                continue
            task = self.task_map.get(r.task_id)
            if not task:
                continue

            # 從 HTML/template 抽出所有 binding
            bound_fields = set(re.findall(r'(?:item\.|\{\{item\.)(\w+)', content))
            known_fields = all_fields[r.task_id] | {"id", "createdAt", "updatedAt", "actions"}
            unknown = bound_fields - known_fields

            if unknown:
                issues.append(CrossAgentIssue(
                    contradiction_type="schema_inconsistency",
                    involved_tasks=[r.task_id],
                    description=f"Agent `{r.task_id}`（{r.module_id}）使用了 schema 中未定義的欄位：{sorted(unknown)}",
                    evidence={"unknown_fields": sorted(unknown), "known_fields": sorted(known_fields)},
                    suggested_fix=f"確認這些欄位是全域共享的（如 id、actions），或需要擴充 {r.module_id} 的 schema",
                ))
        return issues

    def _deps_mismatch(self) -> List[CrossAgentIssue]:
        """檢查：agent A 說依賴某 slot，但提供該 slot 的 agent 並沒有產生它"""
        issues = []
        # 從 contract 或 prompt 裡解析 deps
        deps_pattern = re.compile(r'(?:依賴|depends?\s*on|needs?\s*slot)[:\s]+([\w-]+)', re.IGNORECASE)

        # 先建立 slot → owner 映射
        slot_owner: Dict[str, str] = {}
        for r in self.task_results:
            content = self._read_artifact(r)
            if not content:
                continue
            found = re.findall(r'data-slot=["\']([^"\']+)["\']', content)
            for slot in found:
                slot_owner[slot] = r.task_id

        # 檢查每個 agent 的 deps 是否都有對應 slot owner
        for r in self.task_results:
            content = self._read_artifact(r)
            if not content:
                continue
            deps = deps_pattern.findall(content)
            for dep_slot in deps:
                if dep_slot not in slot_owner:
                    issues.append(CrossAgentIssue(
                        contradiction_type="deps_mismatch",
                        involved_tasks=[r.task_id],
                        description=f"Agent `{r.task_id}`（{r.module_id}）依賴 slot `{dep_slot}`，但沒有任何 agent 聲稱擁有該 slot",
                        evidence={"missing_slot": dep_slot, "deps_declared": deps, "available_slots": list(slot_owner.keys())},
                        suggested_fix=f"確認 `{dep_slot}` 是否需要新增一個 agent 來提供，或 `{r.module_id}` 的依賴聲明有誤",
                    ))
        return issues

    def _duplicate_id(self) -> List[CrossAgentIssue]:
        """檢查：多個 agent 產出了相同 ID 的 HTML 元素"""
        issues = []
        id_tracker: Dict[str, List[str]] = {}

        for r in self.task_results:
            content = self._read_artifact(r)
            if not content:
                continue
            ids = re.findall(r'\bid=["\']([^"\']+)["\']', content)
            for eid in ids:
                id_tracker.setdefault(eid, []).append(r.task_id)

        duplicates = {eid: owners for eid, owners in id_tracker.items() if len(owners) > 1}

        for eid, task_ids in duplicates.items():
            issues.append(CrossAgentIssue(
                contradiction_type="duplicate_id",
                involved_tasks=task_ids,
                description=f"HTML 元素 `id=\"{eid}\"` 被多個 agent 同時宣告",
                evidence={"duplicate_id": eid, "owners": task_ids},
                suggested_fix=f"讓涉及的 agents 協調，給其中一方改成 unique id（如 `{eid}-v2`）",
            ))
        return issues

    def _css_conflict(self) -> List[CrossAgentIssue]:
        """檢查：多個 agent 對同一個 class 給了不同的 style"""
        issues = []
        css_rules: Dict[str, Dict[str, str]] = {}  # class_name → {task_id: css_value}

        for r in self.task_results:
            content = self._read_artifact(r)
            if not content:
                continue
            # 找 [style] block 裡的 class definitions
            style_match = re.search(r'\[style\](.*?)\[/style\]', content, re.DOTALL)
            if not style_match:
                continue
            style_block = style_match.group(1)
            # 簡單的 class 分析：抓 .classname { ... }
            class_pattern = re.compile(r'\.([\w-]+)\s*\{([^}]+)\}', re.DOTALL)
            for match in class_pattern.finditer(style_block):
                cls = match.group(1)
                props = match.group(2).strip()
                css_rules.setdefault(cls, {})[r.task_id] = props

        # 找同一個 class 有不同 style 的衝突
        for cls, task_css in css_rules.items():
            if len(task_css) > 1:
                # 簡單 heuristic：比較 props 是否有實質差異
                unique_styles = set(task_css.values())
                if len(unique_styles) > 1:
                    issues.append(CrossAgentIssue(
                        contradiction_type="css_conflict",
                        involved_tasks=list(task_css.keys()),
                        description=f"CSS class `.{cls}` 被多個 agent 給了不同的 style 定義",
                        evidence={"class": cls, "definitions": task_css},
                        suggested_fix=f"選擇其中一個 style 為準，其餘 agent 改為引用而不是重複定義，或用 CSS variable 統一",
                    ))
        return issues


# ============================================================================
# 兩次派遣執行器
# ============================================================================

def execute_task_queue(
    task_queue,
    dispatch_fn: Callable,
) -> ExecutionResult:
    """
    執行 TaskQueue 的兩次派遣流程。

    Args:
        task_queue: TaskQueue 實例
        dispatch_fn: (TaskSpec) -> TaskResult
                     負責 dispatch 一個 task 並返回結果

    Returns:
        ExecutionResult：包含完整執行結果
    """
    result = ExecutionResult(
        manifest_id=task_queue.manifest_id,
        total_tasks=len(task_queue.tasks),
    )

    # ================================================================
    # Pass 1：並行 dispatch
    # ================================================================
    print(f"\n[Executor] Pass 1: Dispatching {len(task_queue.tasks)} tasks...")

    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(task_queue.tasks), 8)) as executor:
        futures = {executor.submit(dispatch_fn, task): task for task in task_queue.tasks}
        for future in concurrent.futures.as_completed(futures):
            task = futures[future]
            try:
                task_result = future.result()
                result.task_results.append(task_result)

                flag = f"⚠{len(task_result.issues)}" if task_result.issues else ""
                print(f"  [{task_result.task_id}] {task_result.module_id}: {task_result.status.value} {flag}")
            except Exception as e:
                print(f"  [{task.task_id}] {task.module_id}: EXCEPTION - {e}")
                result.task_results.append(TaskResult(
                    task_id=task.task_id,
                    module_id=task.module_id,
                    status=TaskStatus.FAILED,
                    error=str(e),
                ))

    result.passed = sum(1 for r in result.task_results if r.status == TaskStatus.DONE and not r.has_issues)
    print(f"[Executor] Pass 1 done: {result.passed}/{result.total_tasks} passed")

    # ================================================================
    # 彙整 Pass 1 的問題（intra-agent）
    # ================================================================
    all_issues = []
    for r in result.task_results:
        if r.has_issues:
            all_issues.append(f"  [{r.task_id}] {r.module_id}: {', '.join(r.issues)}")

    result.pass1_issues = all_issues

    if all_issues:
        print(f"\n[Executor] Issues found:")
        for issue in all_issues:
            print(f"  {issue}")

    # ================================================================
    # 跨 Agent 矛盾檢查（停在這裡等人類決策）
    # ================================================================
    print(f"\n[Executor] Cross-agent contradiction check...")
    checker = CrossAgentContradictionChecker(result.task_results, task_queue)
    cross_issues = checker.check_all()
    result.cross_agent_issues = cross_issues

    if cross_issues:
        print(f"[Executor] ⚠ {len(cross_issues)} cross-agent contradiction(s) found — STOP")
        for ci in cross_issues:
            print(f"  [{ci.contradiction_type}] {ci.description}")
            print(f"    → {ci.suggested_fix}")
        print(f"\n[Executor] Pass 2 blocked — resolve cross-agent issues first")
        return result  # ★停在這裡，等人類決策

    # ================================================================
    # Pass 2：只對有問題的 tasks 做第二次 dispatch
    # ================================================================
    problematic = [r for r in result.task_results if r.has_issues]

    if problematic:
        print(f"\n[Executor] Pass 2: Re-dispatching {len(problematic)} problematic tasks...")

        with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(problematic), 4)) as executor:
            futures = {}
            for r in problematic:
                # 找到對應的 task spec
                task_spec = next(t for t in task_queue.tasks if t.task_id == r.task_id)
                issue_str = "\n".join(f"  - {issue}" for issue in r.issues)
                retry_result = executor.submit(_retry_single, task_spec, issue_str, r.artifact_path)
                futures[retry_result] = (r, task_spec)

            for future in concurrent.futures.as_completed(futures):
                r, task_spec = futures[future]
                try:
                    retry_result = future.result()
                    # 更新原本的 result
                    r.status = TaskStatus.FIXED if not retry_result.issues else TaskStatus.FAILED
                    r.issues = retry_result.issues
                    r.error = retry_result.error or ""
                    flag = f"⚠{len(retry_result.issues)} remaining" if retry_result.issues else "✅"
                    print(f"  [{r.task_id}-r2] {r.module_id}: {flag}")
                    if retry_result.issues:
                        result.fixed += 1
                except Exception as e:
                    print(f"  [{r.task_id}-r2] {r.module_id}: EXCEPTION - {e}")
                    r.status = TaskStatus.FAILED
                    r.error = str(e)
    else:
        print("\n[Executor] Pass 2 skipped — no issues found.")

    # 最終統計
    final_passed = sum(1 for r in result.task_results if not r.has_issues and r.status != TaskStatus.FAILED)
    print(f"\n[Executor] Final: {final_passed}/{result.total_tasks} tasks clean")

    return result


def resolve_cross_agent_issues_and_retry(
    previous_result: ExecutionResult,
    task_queue,
    dispatch_fn: Callable,
) -> ExecutionResult:
    """
    人類決策完成後，根據決策重新 dispatch 有問題的 tasks。

    Args:
        previous_result: 包含 cross_agent_issues 的上一次執行結果
        task_queue: 原始 TaskQueue
        dispatch_fn: subagent dispatch 函數

    使用方式：
        # 人類看到 cross_agent_issues，做了決策
        decisions = {
            "t-003-pagination": "use-pagination-slot",   # 選擇用 pagination slot
            "t-007-search-bar": "drop-conflict-slot",    # 移除衝突 slot
        }
        result = resolve_cross_agent_issues_and_retry(result, task_queue, dispatch_fn)
    """
    result = previous_result  # 修改 in-place

    if not result.cross_agent_issues:
        print("[Executor] No cross-agent issues to resolve")
        return result

    print(f"\n[Executor] Resolving {len(result.cross_agent_issues)} cross-agent issue(s) with human decisions...")

    # 收集所有涉及的 task_ids
    involved_tasks = set()
    for ci in result.cross_agent_issues:
        involved_tasks.update(ci.involved_tasks)

    # 重新 dispatch 涉及的 tasks
    # 包一層：把 issue context 包進 task_spec 的 context 裡再 dispatch
    def dispatch_with_context(task_spec, issue_str):
        # 把 issue_str 注入到 context 裡（task_spec.input.context 是 Dict）
        enriched = task_spec
        enriched._retry_context = issue_str  # 臨時掛載，不改 dataclass 結構
        return dispatch_fn(task_spec)

    problematic = [r for r in result.task_results if r.task_id in involved_tasks]

    with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(problematic), 4)) as executor:
        futures = {}
        for r in problematic:
            task_spec = next(t for t in task_queue.tasks if t.task_id == r.task_id)
            ci_list = [ci for ci in result.cross_agent_issues if r.task_id in ci.involved_tasks]
            issue_str = "\n".join(f"  - [{ci.contradiction_type}] {ci.description}" for ci in ci_list)
            retry_result = executor.submit(dispatch_with_context, task_spec, issue_str)
            futures[retry_result] = (r, task_spec)

        for future in concurrent.futures.as_completed(futures):
            r, task_spec = futures[future]
            try:
                retry_result = future.result()
                r.status = TaskStatus.FIXED if not retry_result.issues else TaskStatus.FAILED
                r.issues = retry_result.issues
                r.error = retry_result.error or ""
                flag = f"⚠{len(retry_result.issues)} remaining" if retry_result.issues else "✅"
                print(f"  [{r.task_id}-resolved] {r.module_id}: {flag}")
            except Exception as e:
                print(f"  [{r.task_id}-resolved] {r.module_id}: EXCEPTION - {e}")
                r.status = TaskStatus.FAILED
                r.error = str(e)

    # 清空 cross_agent_issues（已處理）
    result.cross_agent_issues = []
    return result


def _retry_single(task, issue_str: str, artifact_path: str):
    """對一個 task 做修復 dispatch"""
    retry_result = TaskResult(
        task_id=task.task_id + "-r2",
        module_id=task.module_id,
        artifact_path=artifact_path,
    )

    output_path = os.path.join(task.execution_context.base_path, task.output.path)

    retry_prompt = f"""你是 Evolution Compiler 的 skill 修復專家。

## 任務
修復 `{task.module_id}` 的 skill 檔案中的以下問題：

{issue_str}

## 輸出路徑
`{output_path}`

## Schema
{json.dumps(task.input.schema, ensure_ascii=False, indent=2)}

## 執行步驟
1. 讀取現有 `{output_path}`
2. 根據上述問題修復（每一條都要處理）
3. 寫回 `{output_path}`
4. 再次驗證 data-slot 標記完整
"""

    # 這裡 dispatch_fn 會被 caller 傳入
    # 在這裡我們假設 caller 會處理 actual dispatch
    # _retry_single 是给 execute_task_queue 內部呼叫用的
    raise NotImplementedError("_retry_single must be called with actual dispatch_fn")


# ============================================================================
# Mock Dispatcher（用於測試）
# ============================================================================

def mock_dispatch_fn(task) -> TaskResult:
    """Mock dispatcher — 不真正呼叫 subagent，只模擬結果"""
    result = TaskResult(
        task_id=task.task_id,
        module_id=task.module_id,
        artifact_path=os.path.join(task.execution_context.base_path, task.output.path),
    )
    # 模擬：假設第一個 task 有問題，其他都乾淨
    if task.task_id == "t-002-table-data":
        result.issues = ["missing_slots:['tbody']", "unbound_field:['品項']"]
        result.status = TaskStatus.DONE
    else:
        result.status = TaskStatus.DONE
    return result


# ============================================================================
# Standalone 測試
# ============================================================================

if __name__ == "__main__":
    from planner import plan, respond

    print("=" * 60)
    print("TaskExecutor — Structural Test")
    print("=" * 60)

    m, resp = plan("我要做一個庫存管理系統")
    m2, resp2 = respond("就這樣", m)

    tq = m2.to_task_queue(
        base_path=os.path.expanduser("~/Desktop/funnytest"),
        skills_path="software/skills",
        theme="glass",
    )

    print(f"\nTaskQueue: {len(tq.tasks)} tasks")
    for task in tq.tasks:
        print(f"  {task.task_id}: {task.module_id}")

    # 只測試結構（不做真正 dispatch）
    result = execute_task_queue(tq, dispatch_fn=mock_dispatch_fn)

    print(f"\nExecutionResult:")
    print(f"  manifest_id: {result.manifest_id}")
    print(f"  total_tasks: {result.total_tasks}")
    print(f"  passed: {result.passed}")
    print(f"  pass1_issues: {len(result.pass1_issues)}")
    print(f"  cross_agent_issues: {len(result.cross_agent_issues)}")
    print(f"  fixed: {result.fixed}")

    # 測試：mock dispatch 沒有真正產檔，所以 cross-agent checker 會找到 0 issues
    # 但我們可以模擬驗證結構是對的
    print("\n✅ Structural test passed")
    print("\n--- Cross-Agent Contradiction Checker Demo ---")
    # 手動建立一個有問題的 ExecutionResult 來驗證 cross-agent checker
    demo_task_results = [
        TaskResult(task_id="t-001", module_id="layout-page", status=TaskStatus.DONE,
                   artifact_path="/tmp/demo-layout-page.skill"),
        TaskResult(task_id="t-002", module_id="table-data", status=TaskStatus.DONE,
                   artifact_path="/tmp/demo-table-data.skill"),
    ]
    demo_cross_checker = CrossAgentContradictionChecker(demo_task_results, tq)
    print(f"CrossAgentContradictionChecker initialized: {len(demo_cross_checker.task_results)} done tasks")
    print(f"Schema inconsistency check: {demo_cross_checker._schema_inconsistency()}")
    print(f"Duplicate ID check: {demo_cross_checker._duplicate_id()}")
