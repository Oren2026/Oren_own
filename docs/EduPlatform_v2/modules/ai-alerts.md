# AI Alerts — AI 警示系統

## 設計原則

AI 在第一線過濾內容，減少心理師/輔導室的人工負擔。\
學生言論被 AI 標記後，不會被刪除，只會進入「待審」清單，由 Counselor 決定是否需要介入。

---

## 觸發時機

AI 分析在以下時間點觸發：
- **發文時**（同步分析，影響 `posts.ai_flagged`）
- **留言時**（同步分析，影響 `comments.ai_flagged`）
- **定時掃描**（每天對所有新內容跑一次風險評估）

---

## AI 分析內容

使用 LLM API 分析以下風險維度：

| 維度 | 說明 |
|------|------|
| `self_harm` | 自傷、自殺傾向 |
| `bullying` | 霸凌傾向 |
| `harassment` | 騷擾言語 |
| `abuse` | 虐待（家庭/校園） |
| `drugs` | 毒品/藥物相關 |
| `other` | 其他需要關注 |

AI 回傳：
```json
{
  "flag_type": "self_harm",
  "confidence": 0.87,
  "summary": "文字中包含『不想活了』等負面自我描述"
}
```

---

## 資料模型

```sql
ai_alerts
├── id
├── post_id        FK → posts（可為空）
├── comment_id     FK → comments（可為空）
├── user_id        被標記內容的作者
├── flag_type
├── ai_confidence  0.0 ~ 1.0
├── ai_summary     AI 分析摘要
├── status         'pending' | 'reviewed' | 'dismissed' | 'actioned'
├── reviewed_by    FK → users（Counselor）
├── reviewed_at
├── action_taken   'notified_counselor' | 'sent_resources' | 'escalated' | null
└── created_at
```

---

## 處理流程

```
內容發布
  → AI 分析（<1 秒）
  → confidence >= 0.7 → ai_alerts 表新增一筆，status='pending'
  → WebSocket 通知 Counselor（有新警示需要處理）

Counselor 登入後台
  → 看到「AI 警示列表（3 條）」
  → 點進去看到原文 + AI 分析摘要
  → 選擇：
    ├──「已處理」（status=reviewed，Counselor 知道就好）
    ├──「已介入」（status=actioned，通知導師/家長/轉介）
    └──「無需處理」（status=dismissed）
```

---

## Counselor 視角

Counselor 登入後，左側選單有「AI 警示」，裡面看到：
- 所有被標記的文章/留言
- AI 判斷的類型 + 信心度
- 被標記次數（多次被標記 = 高風險訊號）

Counselor 可以看到「全校」所有班級的內容（但有 `nda_signed_at` 限制）。

---

## API Endpoints

```
GET    /api/ai-alerts              列表（Counselor 專用）
GET    /api/ai-alerts/:id         詳情
PATCH  /api/ai-alerts/:id         處理（Counselor）
        Body: { "status": "reviewed" | "dismissed" | "actioned", "action_taken": "..." }

# 内部 API（AI Service 呼叫）
POST   /api/internal/ai/analyze   分析內容
        Body: { "type": "post" | "comment", "content": "..." }
```

---

## 法規注意

- AI 判斷僅供參考，不能當作唯一證據
- 學生的家長不會知道孩子被 AI 標記（只有 Counselor / School_Admin 知道）
- 審計日誌記錄所有 Counselor 的查看/處理行為

---

*文件版本：2026-04-25*
