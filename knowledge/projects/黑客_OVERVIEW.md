# 黑客 OVERVIEW

> 建立時間：2026-04-30
> 更新時間：2026-05-02
> 負責人：Hermes SOUL（黑皮）

---

## 框架決策紀錄（Constraints Wall）

### Evolution — Compression Logic（2026-05-02）
- **Decision**: Option 3 — Planner 推薦，用戶確認
- **Rejected**: Option 1（自動感知）、Option 2（用戶主導）
- **Trigger**: 「就這樣」即觸發 compression（`"就這樣"`, `"就這樣吧"`, `"就這個範圍"` 等 10 種變體）
- **Effect**: CONSIDER_DROP modules 移入 Constraints Wall，附 `restoration_conditions`
- **Restoration**: 用戶說「我要加 XX」可從牆上還原

### Evolution — Planner / Compiler 分離（2026-05-02）
- **Decision**: Planner 和 Compiler 分開，各自有明確邊界
- **Planner**: 理解意圖、收斂範圍、互動式對話
- **Compiler**: 執行生成、產出程式碼、離線批次
- **Rejected**: 合併成單一系統

### Evolution — LLM-based Intent Parsing 已廢棄（2026-05-02）
- **Decision**: 不使用 LLM 做 intent parsing
- **Why**: 封閉領域（已知 component keywords）→ keyword matching 更穩定、更快
- **Current**: Skill-based composition，deps graph 解析

### Subagent 使用原則（2026-05-02）
- **Threshold**: 複雜度 > 10 iterations 才用 `delegate_task`
- **Path workaround**: 永遠給絕對路徑，且一次只交代一個 repo
- **Problem**: subagent 無法繼承對話歷史，路徑混淆常見

---

## Skills Retention Audit（2026-05-02）

### KEEP — 核心，必用
| Skill | 原因 |
|-------|------|
| `v1-chatrank-debug-patterns` | v1 實用 bug pattern，15 個已修 bug 的追蹤 |
| `apple-notes/reminders/imessage/findmy` | Apple 生態系整合，Naro 用 Mac |
| `hermes-agent` / `hermes-subprocess-integration` | Hermes 框架核心工具 |
| `eduplatform-v2-architecture` | EduPlatform 架構總覽 |
| `evolution-compiler` | Overview，Evolution framework 入口 |
| `evolution-compiler-development` | Dev workflow + key pitfalls（路徑問題、f-string corruption 等） |
| `evolution-compiler-debug-notes` | Bug 追蹤（SKILL_INDEX 對齊、slot parser、tbody selector 等） |
| `evolution-compiler-testing-loop` | L1 測試流程 |
| `evolution-ui-theme-system` | Theme 系統仍是 Compiler 的一部分 |
| `chatrank-like-bug-patterns` | v1 實用 bug pattern |

### CONSIDER — 視情況使用
| Skill | 原因 |
|-------|------|
| `eduplatform-plugin-system` | Plugin 機制，尚未真正落地 |
| `autonomous-ai-agents` 全系列 | Claude Code/Codex/OpenCode，原則上複雜 coding 才用 |

### STALE — 暫存，禁用或刪除
| Skill | 原因 |
|-------|------|
| `eduplatform-phase2-frontend` | Phase 2 已完成，內容過時 |
| `eduplatform-activity/confirmation/auth-rbac/notifications/posts-comments/audit-log/ai-alerts/school-structure` | Phase 0 或未實現，內容可能過時 |
| `v1-chatrank-debug-patterns` vs `chatrank-like-bug-patterns` | 兩者重疊，考慮合併刪除其中一個 |
| `spec-driven-skill-migration` | 舊系統遷移，已被 Evolution 框架取代 |
| `evolution-ui-generation` | LLM-based 方案已停用 |
| `xitter` / `xurl` | 兩者功能重疊，Twitter API 穩定性有疑慮 |
| `godmode` | 紅隊工具，不適合放在日常框架 |
| `llm-wiki` | Karpathy LLM Wiki 從未真正建立 |
| `research-paper-writing` | Naro 目前不需要 |

---

## Evolution Planner

> 位置：`~/Desktop/Oren_own/evolution_planner/`
> Repo：無（本地）
> 測試：9/9 ✅（Planner: 7 tests + TaskExecutor structural: 1 + CrossAgent checker demo: 1）

### 完整執行流程（兩次派遣 + 矛盾檢查）

```
Intent → Decomposer → Module Planner → Closure Validator → Interactor
                                                          ↓
                                                    Compression（用戶說「就這樣」）
                                                          ↓
TaskQueue ──→ [Pass 1: 並行 dispatch] ──→ [矛盾檢查 I：單一 skill 合約]
                                                    ↓
                              [矛盾檢查 II：跨 Agent 矛盾] ← ★停在這裡等人類
                                                    ↓（有矛盾則停）
                              [Issue List + Suggested Fix] → 人類決策
                                                    ↓
                        [Pass 2: 只修有問題的 tasks] ──→ Final QA
```

### 矛盾檢查的兩個層次

**矛盾檢查 I — 單一 skill 內（Intra-agent）**
在 Pass 1 的同時檢查，Pass 2 前修復：
1. `spec_contract` — slot 宣告有沒有遵守
2. `slot_injection` — `data-slot` 標記是否存在
3. `schema_binding` — `<field>` / `item.field` 是否與 schema 一致
4. `hardcode` — `no_hardcode` 清單內的項目是否被寫死
5. `deps` — 依賴的 skill 是否存在

**矛盾檢查 II — 跨 Agent 彙整（Cross-agent）**
Pass 1 完成後自動觸發，**停在這裡等人類決策**：
| 矛盾類型 | 說明 |
|---------|------|
| `slot_ownership_conflict` | 多個 agent 聲稱擁有同一個 slot |
| `schema_inconsistency` | agent A 用到某 field，但 agent B 的 schema 裡沒有 |
| `deps_mismatch` | agent A 說依賴某 slot，但沒有任何 agent 產生它 |
| `duplicate_id` | 多個 agent 產出相同 `id` 的 HTML 元素 |
| `css_conflict` | 多個 agent 對同一個 CSS class 給了不同的 style |

**人類決策流程**：
```
Executor.stop()
→ 呈現 [矛盾類型, 涉及 tasks, 描述, 建議修復方向]
→ 人類說「就這樣修」或「選方案 A」
→ resolve_cross_agent_issues_and_retry(result, task_queue, dispatch_fn)
→ Pass 2 恢復執行
```

### TaskExecutor（task_executor.py）
| 元件 | 職責 |
|------|------|
| `TaskStatus` enum | `PENDING / DONE / FAILED / FIXED` |
| `TaskResult` | 單一 task 的執行結果 + issues 列表 |
| `CrossAgentIssue` | 跨 agent 矛盾問題，包含 `suggested_fix` 供人類決策 |
| `ExecutionResult` | 全部結果彙整，含 `cross_agent_issues` |
| `ContradictionChecker` | 矛盾檢查 I（5 維度 intra-agent） |
| `CrossAgentContradictionChecker` | 矛盾檢查 II（5 類型 cross-agent，停在等人類決策） |
| `execute_task_queue()` | 兩次派遣主邏輯，cross-agent 有矛盾時 return with `cross_agent_issues` |
| `resolve_cross_agent_issues_and_retry()` | 人類決策後恢復 Pass 2 |

### Retention Recommendation（每個 Module 的標記）
- `KEEP` — 核心必要
- `CONSIDER_DROP` — 可選，預設壓縮
- `B_PLAN` — B 方案，需用戶選擇

### Compression 流程
```
用戶說「就這樣」
→ Planner 根據 Retention 自動裁決
→ CONSIDER_DROP 模組進 Constraints Wall
→ 附還原條件（restoration_conditions）
→ expansion_status: COMPRESSED
```

### 關鍵檔案
| 檔案 | 用途 |
|------|------|
| `manifest.py` | `Manifest` / `TaskSpec` / `TaskAction` / `to_task_queue()` |
| `planner.py` | `plan()` / `respond()`（處理「就這樣」compression） |
| `task_executor.py` | 兩次派遣 + 矛盾檢查 |
| `nodes/module_planner.py` | Module 生成，含 retention + risk_analysis |
| `nodes/interactor.py` | Markdown 輸出，含 Retention 區塊 |

### 測試案例
| 輸入 | 模組數 | Retention |
|------|--------|-----------|
| 庫存管理系統 | 9（KEEP:7, CONSIDER_DROP:2） | COMPLETE |
| 任務管理系統 | 7 | COMPLETE |
| 部落格系統 | 7 | COMPLETE |
| 做網站（太模糊） | 0 | NEEDS_CLARIFICATION |
| TaskQueue 生成 | 7 tasks（base_path + theme propagation） | COMPLETE |
| Compression trigger | 6 種觸發語（就這樣、就這樣吧...） | COMPLETE |

---

## Evolution Compiler

> 位置：`~/Desktop/funnytest/`（SSH: `git@github.com:Oren2026/funnytest.git`）
> L1 測試：✅ PASS（零 warning）

### 核心架構
```
Intent → Intent Classifier → Schema Inferrer → Skill Router → Dependency Resolver → Composer → QA Checker
```

### SKILL_INDEX 對齊（2026-05-02）
- 從 25 個 fantasy skills → 40 個磁碟真實技能
- 移除 11 個 fantasy skills（api-router、auth-jwt、chart-*、game-* 等磁碟不存在的）
- 新增 18 個磁碟有但未列入索引的 skills

### Spec 化進度：42/42 ✅ 全部完成（2026-05-02）

### Composer's Dynamic Slot Resolution（2026-05-02）
- 廢除 `slot_map` hardcoded list
- 改為從 `layout-page.skill` HTML 的 `data-slot` 屬性動態推斷 slot 清單
- Composer's expected slots：`search` / `content` / `modal` / `header` / `confirm` / `toast`

### Slot Parser Bug（已修）
- 舊 regex：`\*\*slot:(\w+)\*\*` — 無法從 `slot:search` 解析
- 新 regex：`\*?\*?slot:(\w+)\*?\*?` — 任何文本上下文都支援

### 執行測試
```bash
cd ~/Desktop/funnytest

# L1 測試（主 repo）
python3 software/test_runner.py

# Mini framework L1 測試
python3 mini/test_runner.py

# Mini framework --gen 模式（自然語法生成）
python3 mini/test_runner.py --gen "我要一個庫存管理系統"
```

### 關鍵檔案
| 檔案 | 用途 |
|------|------|
| `software/nodes/composer.py` | 動態 slot 解析核心 |
| `software/skills/ui/layout-page.skill` | 頁面佈局骨架，定義 `data-slot` |
| `software/test_runner.py` | L1 測試執行器 |
| `mini/` | 精簡版框架（7 nodes + 11 skills） |

---

## 尬殿 v1（聊天啊！尬殿）

### 基本資訊
| 項目 | 值 |
|------|-----|
| Backend | `~/Desktop/Private/backend/`（PORT 3001）|
| Frontend | `~/Desktop/Oren_own/docs/homework/CCC作業天地/網頁設計/midterm-project/` |
| DB | SQLite（`chatrank.db`）|
| 部署 | ngrok: angelfish-observant-modified.ngrok-free.dev |
| Admin 判斷 | `role === 'admin' \|\| username === 'admin'` |

### 已處理 Bug（15 個）
1. `likedSet` key type 導致 like 失效 ✅
2. race condition 導致 like 數異常 ✅
3. 活動時區 UTC 轉換錯誤 ✅
4. Admin delete 無法作用（靠 role 不靠 username） ✅
5. `renderPostDetail` 缺少 `isAdmin`/`canDelete` ✅
6. 頭像/作者名稱點擊無反應（router 缺 `user` case） ✅
7. Banner 顯示帳號而非暱稱 ✅
8. 刷新頁面後愛心/刪文 403（CSRF token 未 refresh） ✅
9. 刪文成功後畫面不更新 ✅
10. ngrok 多用戶共用 IP → rate limit 被瓜分 ✅
11. getServerLikeState 讀 localStorage 而非 DOM ✅
12. applyLikeUi scope 選到 hidden feed 按鈕 ✅
13. renderPostDetail 無 loading 提示 + race 防護 ✅
14. detail 頁 avatar 漏 `data-username` ✅
15. feed 進入時未清除舊 feedAuthor 導致殘留 ✅

### 待處理
- `app.js:1063-1065`：編輯模式只顯示「編輯功能準備中」（啞巴程式碼）

---

## EduPlatform v2

### 基本資訊
| 項目 | 值 |
|------|-----|
| Backend | `~/Desktop/Private/EduPlatform_v2/backend/`（PORT 3000） |
| Frontend | `~/Desktop/Private/EduPlatform_v2/frontend/`（Phase 2 完成） |
| 測試 | 190 題全 PASS（2026-04-28） |

### 測試
```bash
cd ~/Desktop/Private/EduPlatform_v2/backend
node node_modules/mocha/bin/mocha.js tests/*.test.js --timeout 20000 --exit
```

完整 Bug 追蹤：`~/Desktop/Private/EduPlatform_v2/backend/ISSUES.md`

---

## 最後更新

2026-05-03：Evolution Planner CrossAgentContradictionChecker 實作完成（兩次派遣 + 兩層矛盾檢查，9/9 測試 ✅）
