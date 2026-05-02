# 黑客 OVERVIEW

> 建立時間：2026-04-30
> 更新時間：2026-05-02
> 負責人：Hermes SOUL（黑皮）

---

## Evolution Compiler（進化編譯器）

### 基本資訊
| 項目 | 值 |
|------|-----|
| 口號 | 「能做軟體的軟體」 |
| 位置 | `~/Desktop/funnytest/` |
| Repo | `git@github.com:Oren2026/funnytest.git` |
| L1 測試 | ✅ PASS（零 warning） |
| Mini Framework | `~/Desktop/funnytest/mini/`（精簡展示版） |

### 核心架構
```
Intent → Intent Classifier → Schema Inferrer → Skill Router → Composer → QA Checker
                                                                 ↑
                                                        Dependency Resolver
```
- **Intent Classifier**：推斷意圖類型（CRUD / Search / Report / Tool 等）
- **Schema Inferrer**：從自然語言推斷資料結構（欄位、型別）
- **Skill Router**：根據 intent + entity 路由到相關技能
- **Dependency Resolver**：解析技能依賴圖，拓撲排序
- **Composer**：收集技能 HTML，注入 slot，生成完整頁面
- **QA Checker**：結構化 QA 檢查（語義、資料完整性）

### Composer's Dynamic Slot Resolution
- 廢除了 `slot_map` hardcoded list
- 改為從 `layout-page.skill` HTML 的 `data-slot` 屬性動態推斷 slot 清單
- 備援機制：`SLOT_FALLBACK_MAP`（module-level constant，純備援）
- Composer's expected slot names：`search` / `content` / `modal` / `header` / `confirm` / `toast`

### SKILL_INDEX 對齊（2026-05-02）
- 從 25 個 fantasy skills 精簡為 40 個磁碟真實技能
- 移除了 11 個不存在於磁碟的 fantasy skills（api-router、auth-jwt、chart-*、game-* 等）
- 新增 18 個原本在磁碟但未列入索引的 skills（UI 9 個 + code/algorithm 11 個）
- 備註：`layout-page` 由 Composer 直接依賴，不透過 Router 選擇

### Slot Parser Bug（已修）
- **舊 regex**：`\*\*slot:(\w+)\*\*` — 無法從 `slot:search` 解析
- **新 regex**：`\*?\*?slot:(\w+)\*?\*?` — 可從任何文本上下文解析 slot 注入點

### Schema Inferrer（強化版）
- 核心：從 `ENTITY_FIELD_DEFINITIONS` 目錄查詢標準實體欄位（任務/待辦/庫存/客戶/書籍/產品/報表）
- 次級：context 中的明確欄位格式「（XX、XX、XX）」解析
- 回退：基礎 title + description
- 所有 schema 末尾附加 `_NON_EDITABLE_FIELDS`（id、createdAt、updatedAt、actions）

### 技能庫（42 個 .skill，截至 2026-05-02）
| 分類 | 數量 | Spec 化 |
|------|------|---------|
| UI | 23 | ✅ 23/23 |
| Styles（Theme） | 4 | ✅ 4/4 |
| Core | 6 | ✅ 6/6 |
| Structures | 3 | ✅ 3/3 |
| Algorithms | 6 | ✅ 6/6 |
| System | 3 | ✅ 3/3 |
| C_lang | 1 | ✅ 1/1 |

**Spec 化進度：42/42 ✅ 全部完成**（2026-05-02）

### Spec 格式（技能合約標準）
```markdown
# skill: skill-name

## Contract
- **語義承諾**：（這技能做什麼）
- **輸入資料格式**：（props schema）
- **輸出語義**：（輸出格式）
- **操作邊界**：✅ 做 / ❌ 不做
- **失敗信號**：（錯誤時的 fallback 行為）

## Dependencies
- **依賴**：dependency-skill-name
- **可選依賴**：-
- **排斥**：-

## Slots
- **slot:xxx**：slot 用途說明

## Boundaries
- **系統邊界**：Presentation Layer
- **操作邊界**：✅ / ❌
- **狀態邊界**：Stateless / Stateful

## Examples
（輸入 → 輸出範例）

[html]
（HTML 實作）

[react]
（React 實作）

[style]
（CSS 實作）
```

### 如何執行測試
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

### 待處理項目
- [x] ~~Mini framework 同步更新~~ ✅ 已同步（2026-05-02）
- [x] ~~Schema Inferrer 強化~~ ✅ 強化版（ENTITY_FIELD_DEFINITIONS，2026-05-02）
- [ ] Phase 3 Data Flow — 實質檢查已實作（tbody selector、form-schema matching、seed data injection），非 stub

### Subagent 使用注意
- Subagent 傾向於建立新檔案而非覆寫現有檔
- 交付前務必 `grep "^## Contract" file.skill` 驗證
- JS syntax check：`node --check file.skill`
- 批量 subagent 時 max 3 個並發（`delegation.max_concurrent_children`）

---

## 尬殿 v1（聊天啊！尬殿）

### 基本資訊
| 項目 | 值 |
|------|-----|
| 類型 | 社群平台（期中專案） |
| Backend | `~/Desktop/Private/backend/`（PORT 3001）|
| Frontend | `~/Desktop/Oren_own/docs/homework/CCC作業天地/網頁設計/midterm-project/` |
| DB | SQLite（`chatrank.db`）|
| 部署 | ngrok: angelfish-observant-modified.ngrok-free.dev |
| Admin 判斷 | `role === 'admin' \|\| username === 'admin'` |

### 架構摘要
- **Backend**：`server.js`（559行）+ `db.js`（645行）
  - Express + better-sqlite3
  - JWT（HTTP-only Cookie）+ CSRF Token
  - Rate Limiting（全域 + strict）
  - Timing Attack 防護（login 故意延遲）
- **Frontend**：`app.js`（1123行）+ `api.js`（234行）
  - Vanilla JS，Hash Router
  - `SyncQueue`：按讚 debounce 5s + optimistic UI
  - 所有按鈕都有 `e.stopPropagation()`

### Gravity 熱門排序
- **公式**：`score = likes / POWER(hours_since_post + 2, gravity)`
- **設定**：`settings` table（`key='gravity'`），範圍 0.5~3.0（預設 1.5）

### Rate Limit Key 邏輯
- 已登入 → `rl:u:${userId}`
- 未登入 → `rl:ip:${IP}`

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
| 類型 | 教育社群平台（Plugin 架構） |
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
2026-05-02（Evolution Compiler Spec rollout 完成 — 42/42 skills 全部 Spec 化 ✅）
