# Data 目錄說明

> 所有 Mission 狀態的唯一事實來源。
> 修改任何 Mission 狀態時，請同步更新本目錄下的 JSON 檔案。

---

## 更新原則

- 每個 JSON 為一個 Mission（同時對應一個 detect_* 節點）
- `subConcepts[].status` 全部為 `"done"` 時，該 Mission 視為完成
- 更新 JSON 後，**請同步更新** `tech/開發日誌.html` 的對應紀錄

---

## 欄位說明

| 欄位 | 說明 |
|------|------|
| `id` | Mission ID（同時是 detect_* 節點名） |
| `name.zh` / `name.en` | 中文/英文顯示名稱 |
| `category` | `mission` 或 `base` |
| `description` | 任務簡述 |
| `subConcepts` | 子項目陣列，細節完成狀態 |
| `subConcepts[].id` | 子項目 ID |
| `subConcepts[].name.zh` | 子項目中文名稱 |
| `subConcepts[].status` | `"done"` 或 `"todo"` |
| `subConcepts[].files` | 對應的程式檔案（陣列） |
| `outputs` | 該節點輸出的 ROS topic 列表 |
| `testStatus` | `"untested"` / `"passed"` / `"failed"` |

---

## 同步更新流程

```
1. 收到新 code 或測試通過
       ↓
2. 更新 data/{mission}.json（subConcepts[].status → done）
       ↓
3. 新增一筆記錄到 tech/開發日誌.html
       ↓
4. 若有重大架構變更 → 更新 research/ 比賽規則 或 architecture/ 系統架構
```

---

## 嚴重性分級

| 等級 | 條件 | 需更新 tech/ 開發日誌 |
|------|------|----------------------|
| 🔴 重大 | Mission 完成、Mission 新增 | ✅ 必要 |
| 🟡 中等 | subConcept 完成、重要程式改動 | ✅ 建議 |
| 🟢 輕微 | 錯字、格式修正、連動修正 | ❌ 可省略 |
