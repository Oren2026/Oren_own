# JSON Knowledge 格式定義

## 檔案位置
`/tmp/oren_github/docs/knowledges/data/YYYYMMDD.json`

## 正確格式
```json
[
  {
    "title": "標題",
    "summary": "摘要（50字以內，不含句號）",
    "tags": ["標籤1", "標籤2", "標籤3"]
  }
]
```

## 寫入規則

1. **先讀取現有檔案**，解析成 JSON 陣列
2. **生成新記錄**，嚴格符合上述格式
3. **追加到陣列末端**
4. **整個陣列寫回**（不是逐行追加）
5. **summary 嚴格 ≤ 50 字**，超過就截斷

## 錯誤範例（不要這樣做）
```
{ "title": "...", ... }  ← 直接追加成一行
第二行又是另一個物件 ← 沒有陣列包裝
```

## 正確流程
```
1. 讀取現有內容 → JSON.parse() → array
2. 新增一個物件到 array
3. JSON.stringify(array) → 完整寫回檔案
```

## 範例
```python
import json

filepath = f"/tmp/oren_github/docs/knowledges/data/20260329.json"

# 讀取現有
with open(filepath) as f:
    data = json.load(f)

# 追加新記錄
data.append({
    "title": "新主題",
    "summary": "摘要內容50字以內",
    "tags": ["標籤1", "標籤2"]
})

# 完整寫回
with open(filepath, 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
```
