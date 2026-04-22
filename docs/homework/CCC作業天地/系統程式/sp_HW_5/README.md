# sp_HW_5 系統程式作業

## 主題：Thread 執行緒與同步機制

---

## 四大主題文件

| 主題 | 說明 | 文件 |
|------|------|------|
| Thread | 執行緒基本概念、Process 與 Thread 差異 | [thread.html](thread.html) |
| Race Condition | 競態條件、Read-Modify-Write 問題 | [race_condition.html](race_condition.html) |
| Mutex | 互斥鎖、Lock/Unlock、臨界區保護 | [mutex.html](mutex.html) |
| Deadlock | 死結四條件、循環等待、解決策略 | [deadlock.html](deadlock.html) |

---

## 互動式模擬

| 模擬 | 說明 | 連結 |
|------|------|------|
| 🏦 銀行存提款 | 執行緒 A 存 $2、執行緒 B 存 $1，各 100,000 次，可單步或快速執行，驗證 Race Condition 與 Mutex 效果 | [bank_simulation/](https://oren2026.github.io/Oren_own/docs/homework/CCC%E4%BD%9C%E6%A5%AD%E5%A4%A9%E5%9C%B0/%E7%B3%BB%E7%B5%B1%E7%A8%8B%E5%BC%8F/sp_HW_5/bank_simulation/index.html) |
| 🍜 哲學家用餐 | 5位哲學家圓桌，演示 Deadlock 形成與打破循環等待的解法 | [dining_philosophers/](https://oren2026.github.io/Oren_own/docs/homework/CCC%E4%BD%9C%E6%A5%AD%E5%A4%A9%E5%9C%B0/%E7%B3%BB%E7%B5%B1%E7%A8%8B%E5%BC%8F/sp_HW_5/dining_philosophers/index.html) |
| 📦 生產者消費者 | 緩衝區放入/取出，同步與互斥條件可視化 | [producer_consumer/](https://oren2026.github.io/Oren_own/docs/homework/CCC%E4%BD%9C%E6%A5%AD%E5%A4%A9%E5%9C%B0/%E7%B3%BB%E7%B5%B1%E7%A8%8B%E5%BC%8F/sp_HW_5/producer_consumer/index.html) |

---

## 實作文件

- [implementation.html](implementation.html) — 三個程式的實作解說與程式碼說明
- [ai_collab.html](ai_collab.html) — 與 AI 協作的對話精華（方法論記錄）
- [index.html](index.html) — 主題式入口網頁（推薦从这里开始）

---

## 交付物一覽

```
sp_HW_5/
├── index.html              # 登陸頁
├── thread.html             # Thread 概念
├── race_condition.html     # Race Condition 說明
├── mutex.html              # Mutex 說明
├── deadlock.html           # Deadlock 說明
├── implementation.html     # 實作說明
├── ai_collab.html          # AI 協作方法論
├── bank_simulation/
│   └── index.html          # 銀行存提款模擬
├── dining_philosophers/
│   └── index.html          # 哲學家用餐
└── producer_consumer/
    └── index.html          # 生產者消費者
```
