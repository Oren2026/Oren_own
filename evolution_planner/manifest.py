"""
Evolution Planner — Manifest schema and validation.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
from enum import Enum
import uuid
from datetime import datetime


class ClosureStatus(Enum):
    COMPLETE = "COMPLETE"
    NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION"
    OVER_DECOMPOSED = "OVER_DECOMPOSED"


class ExpansionMode(Enum):
    EXPANDING = "EXPANDING"
    COMPRESSING = "COMPRESSING"
    COMPRESSED = "COMPRESSED"


class RetentionRecommendation(Enum):
    KEEP = "KEEP"
    CONSIDER_DROP = "CONSIDER_DROP"
    B_PLAN = "B_PLAN"


class TaskAction(Enum):
    GEN_SKILL = "gen-skill"
    GEN_TEST = "gen-test"
    GEN_DOC = "gen-doc"


# ============================================================================
# Task Queue：Subagent 的執行單位
# ============================================================================

@dataclass
class ExecutionContext:
    """Subagent 的執行環境資訊（Portable 相對路徑的基礎）"""
    base_path: str = "."
    skills_path: str = "software/skills"      # 相對於 base_path
    output_path: str = "software/skills"     # 產出目錄，相對於 base_path
    theme: str = "glass"                      # 目前只支援 4 種：glass/modern/brutal/soft


@dataclass
class TaskInput:
    """Subagent 的輸入"""
    theme: str = "glass"
    schema: Dict[str, Any] = field(default_factory=dict)  # {entity, fields}
    slots: List[str] = field(default_factory=list)
    deps: List[str] = field(default_factory=list)


@dataclass
class TaskOutput:
    """Subagent 的產出 spec"""
    artifact: str = ""   # 檔名，如 "table-data.skill"
    path: str = ""       # 相對路徑，如 "software/skills/ui/table-data.skill"


@dataclass
class TaskConstraint:
    """Subagent 的約束"""
    spec_contract: bool = True   # 是否必須遵守 skill contract
    no_hardcode: List[str] = field(default_factory=list)  # 不能 hardcode 的項目


@dataclass
class TaskContext:
    """任務的上下文（給 subagent 參考，不影響產出）"""
    intent: str = ""
    retention: str = ""          # KEEP / CONSIDER_DROP / B_PLAN
    source: str = "manifest-v1"


@dataclass
class TaskSpec:
    """Subagent 的完整 input spec"""
    task_id: str
    module_id: str
    action: str = "gen-skill"
    execution_context: ExecutionContext = field(default_factory=ExecutionContext)
    input: TaskInput = field(default_factory=TaskInput)
    output: TaskOutput = field(default_factory=TaskOutput)
    constraint: TaskConstraint = field(default_factory=TaskConstraint)
    context: TaskContext = field(default_factory=TaskContext)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "module_id": self.module_id,
            "action": self.action,
            "execution_context": {
                "base_path": self.execution_context.base_path,
                "skills_path": self.execution_context.skills_path,
                "output_path": self.execution_context.output_path,
                "theme": self.execution_context.theme,
            },
            "input": {
                "theme": self.input.theme,
                "schema": self.input.schema,
                "slots": self.input.slots,
                "deps": self.input.deps,
            },
            "output": {
                "artifact": self.output.artifact,
                "path": self.output.path,
            },
            "constraint": {
                "spec_contract": self.constraint.spec_contract,
                "no_hardcode": self.constraint.no_hardcode,
            },
            "context": {
                "intent": self.context.intent,
                "retention": self.context.retention,
                "source": self.context.source,
            },
        }


@dataclass
class TaskQueue:
    """一個 manifest 對應的完整 task list"""
    manifest_id: str
    tasks: List[TaskSpec] = field(default_factory=list)
    execution_context: ExecutionContext = field(default_factory=ExecutionContext)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "manifest_id": self.manifest_id,
            "execution_context": {
                "base_path": self.execution_context.base_path,
                "skills_path": self.execution_context.skills_path,
                "output_path": self.execution_context.output_path,
                "theme": self.execution_context.theme,
            },
            "tasks": [t.to_dict() for t in self.tasks],
        }

    def to_json(self) -> str:
        import json
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)


class RefactorRecommendation(Enum):
    KEEP_CURRENT = "KEEP_CURRENT"
    SPLIT = "SPLIT"
    MERGE = "MERGE"


@dataclass
class ConstrainedModule:
    """被捨棄的模組記錄——另一面牆"""
    module_id: str
    original_reason: str
    removal_reason: str
    trigger: str
    removed_at: str
    restoration_conditions: List[str]


@dataclass
class EntityField:
    name: str
    label: str
    type: str
    required: bool = True
    values: Optional[List[str]] = None
    default: Optional[str] = None


@dataclass
class Entity:
    name: str
    fields: List[EntityField]
    description: str = ""


@dataclass
class Module:
    id: str
    semantic: str
    inputs: List[str]
    outputs: List[str]
    depends_on: List[str] = field(default_factory=list)
    stop_reason: str = ""
    boundary_does: List[str] = field(default_factory=list)
    boundary_does_not: List[str] = field(default_factory=list)
    retention_recommendation: RetentionRecommendation = RetentionRecommendation.KEEP
    retention_reason: str = ""
    risk_analysis: str = ""
    expansion_conditions: List[str] = field(default_factory=list)
    reason: str = ""


@dataclass
class BPlan:
    b_plan_id: str
    trigger: str
    hypothesis: str
    modules_delta: List[Dict[str, str]]
    impact_analysis: Dict[str, Any]
    recommendation: str
    recommendation_reason: str
    retention_recommendation: RetentionRecommendation = RetentionRecommendation.B_PLAN
    risk_analysis: str = ""
    expansion_conditions: List[str] = field(default_factory=list)


@dataclass
class RefactorOption:
    refactor_id: str
    current_structure: List[str]
    proposed_structure: List[str]
    trade_offs: Dict[str, Any]
    recommendation: RefactorRecommendation
    recommendation_reason: str


@dataclass
class UnresolvedQuestion:
    question_id: str
    question: str
    related_modules: List[str]
    b_plan: Optional[BPlan] = None
    answered: bool = False
    user_response: Optional[str] = None


@dataclass
class Manifest:
    intent: str
    plan_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    entities: List[Entity] = field(default_factory=list)
    modules: List[Module] = field(default_factory=list)
    root_module: str = ""
    composition: Dict[str, Any] = field(default_factory=dict)
    closure_status: ClosureStatus = ClosureStatus.NEEDS_CLARIFICATION
    expansion_status: ExpansionMode = ExpansionMode.EXPANDING
    unresolved_questions: List[UnresolvedQuestion] = field(default_factory=list)
    b_plans: List[BPlan] = field(default_factory=list)
    refactor_options: List[RefactorOption] = field(default_factory=list)
    constraints_wall: List[ConstrainedModule] = field(default_factory=list)
    compression_history: List[Dict] = field(default_factory=list)

    def _module_to_dict(self, m: Module) -> Dict:
        return {
            "id": m.id,
            "semantic": m.semantic,
            "inputs": m.inputs,
            "outputs": m.outputs,
            "depends_on": m.depends_on,
            "stop_reason": m.stop_reason,
            "boundary_does": m.boundary_does,
            "boundary_does_not": m.boundary_does_not,
            "retention_recommendation": m.retention_recommendation.value,
            "retention_reason": m.retention_reason,
            "risk_analysis": m.risk_analysis,
            "expansion_conditions": m.expansion_conditions,
            "reason": m.reason,
        }

    def _bp_to_dict(self, b: BPlan) -> Dict:
        return {
            "b_plan_id": b.b_plan_id,
            "trigger": b.trigger,
            "hypothesis": b.hypothesis,
            "modules_delta": b.modules_delta,
            "impact_analysis": b.impact_analysis,
            "recommendation": b.recommendation,
            "recommendation_reason": b.recommendation_reason,
            "retention_recommendation": b.retention_recommendation.value,
            "risk_analysis": b.risk_analysis,
            "expansion_conditions": b.expansion_conditions,
        }

    def _ref_to_dict(self, r: RefactorOption) -> Dict:
        return {
            "refactor_id": r.refactor_id,
            "current_structure": r.current_structure,
            "proposed_structure": r.proposed_structure,
            "trade_offs": r.trade_offs,
            "recommendation": r.recommendation.value,
            "recommendation_reason": r.recommendation_reason,
        }

    def _uq_to_dict(self, u: UnresolvedQuestion) -> Dict:
        return {
            "question_id": u.question_id,
            "question": u.question,
            "related_modules": u.related_modules,
            "answered": u.answered,
            "user_response": u.user_response,
            "b_plan": self._bp_to_dict(u.b_plan) if u.b_plan else None,
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "intent": self.intent,
            "plan_id": self.plan_id,
            "created_at": self.created_at,
            "entities": [asdict(e) for e in self.entities],
            "modules": [self._module_to_dict(m) for m in self.modules],
            "root_module": self.root_module,
            "composition": self.composition,
            "closure_status": self.closure_status.value,
            "expansion_status": self.expansion_status.value,
            "unresolved_questions": [self._uq_to_dict(u) for u in self.unresolved_questions],
            "b_plans": [self._bp_to_dict(b) for b in self.b_plans],
            "refactor_options": [self._ref_to_dict(r) for r in self.refactor_options],
            "constraints_wall": [asdict(c) for c in self.constraints_wall],
            "compression_history": self.compression_history,
        }

    def to_json(self) -> str:
        import json
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)

    def to_task_queue(
        self,
        base_path: str = ".",
        skills_path: str = "software/skills",
        theme: str = "glass",
    ) -> TaskQueue:
        """
        將 Manifest 轉換為 TaskQueue。

        只會為 retention == KEEP 的 modules 生成 tasks。
        CONSIDER_DROP / B_PLAN 的 modules 留在 constraints_wall / b_plans，不生成 task。
        """
        ctx = ExecutionContext(
            base_path=base_path,
            skills_path=skills_path,
            output_path=skills_path,
            theme=theme,
        )

        # 取第一個 entity 的 schema（目前假設單一 entity）
        schema: Dict[str, Any] = {}
        if self.entities:
            e = self.entities[0]
            schema = {
                "entity": e.name,
                "fields": [
                    {
                        "name": f.name,
                        "type": f.type,
                        "label": f.label,
                    }
                    for f in e.fields
                ],
            }

        # skill 副檔名映射（從 module_id 推斷 output path）
        def _skill_path(module_id: str) -> str:
            """根據 module_id 推斷 skill 檔案路徑"""
            # UI module → software/skills/ui/
            ui_modules = [
                "layout-page", "layout-header", "table-data", "modal-form",
                "toast-notify", "confirm-dialog", "search-bar", "sort-control",
                "badge-status", "alert-banner", "card-stat", "pagination",
            ]
            style_modules = [
                "theme-glass", "theme-modern", "theme-brutal", "theme-soft",
            ]
            if module_id in ui_modules:
                subdir = "ui"
            elif module_id in style_modules:
                subdir = "styles"
            elif module_id.startswith("algorithm-"):
                subdir = "algorithms"
            else:
                subdir = "core"
            return f"{skills_path}/{subdir}/{module_id}.skill"

        tasks: List[TaskSpec] = []
        for i, m in enumerate(self.modules):
            # 只為 KEEP 的 modules 生成 task
            if m.retention_recommendation != RetentionRecommendation.KEEP:
                continue

            task_id = f"t-{i+1:03d}-{m.id}"
            slots = m.boundary_does if m.boundary_does else []

            task = TaskSpec(
                task_id=task_id,
                module_id=m.id,
                action="gen-skill",
                execution_context=ctx,
                input=TaskInput(
                    theme=theme,
                    schema=schema,
                    slots=slots,
                    deps=m.depends_on,
                ),
                output=TaskOutput(
                    artifact=f"{m.id}.skill",
                    path=_skill_path(m.id),
                ),
                constraint=TaskConstraint(
                    spec_contract=True,
                    no_hardcode=["entity-name", "theme-color"],
                ),
                context=TaskContext(
                    intent=self.intent,
                    retention=m.retention_recommendation.value,
                    source="manifest-v1",
                ),
            )
            tasks.append(task)

        return TaskQueue(
            manifest_id=self.plan_id,
            tasks=tasks,
            execution_context=ctx,
        )


def new_manifest(intent: str) -> Manifest:
    return Manifest(intent=intent)
