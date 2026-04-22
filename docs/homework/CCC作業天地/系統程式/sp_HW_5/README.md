# sp_HW_5 系統程式作業

## 主題：Thread 執行緒與同步機制

---

## 作業項目

### 1. Race Condition（競態條件）
當多個執行緒同時存取並修改共享資料，結果取決於執行順序，稱為 Race Condition。
- 📖 說明文件：`race_condition.md`
- 🔗 銀行模擬：`bank_simulation/index.html`

### 2. Mutex（互斥鎖）
用於保護共享資源，確保同一時間只有一個執行緒能進入臨界區。
- 🔗 銀行模擬（有用到）：`bank_simulation/index.html`

### 3. Deadlock（死結）
兩個以上執行緒互相等待對方釋放資源，導致全部卡死。
- 📖 說明文件：`deadlock.md`
- 🔗 哲學家用餐：`dining_philosophers/index.html`

### 4. Producer-Consumer Problem（生產者消費者問題）
經典的同步問題，考驗如何同時處理「互斥」與「同步」。
- 🔗 互動模擬：`producer_consumer/index.html`

---

## 互動式模擬列表

| 模擬 | 說明 |
|------|------|
| 銀行存提款 | 同一帳戶多人同時存提，驗證 mutex 保護效果 |
| 生產者消費者 | 緩衝區的放入/取出，排程可視化 |
| 哲學家用餐 | 演示死結形成與解決方式 |

---

## 實作說明
- `doc.md` — 各程式的實作細節與解說
