# HW6 — Fork + FS
# 系統程式 · Part 6

> 從一個程序到多個程序，從記憶體到檔案、從本地到網路。

---

## 視覺化演示

[index.html](/docs/homework/CCC作業天地/系統程式/sp_HW_6/index.html) 包含五個互動視覺化模組：

### Part 1 · Fork 父子程序流程圖
- 視覺化呈現 `fork()` 後父子共享記憶體空間的狀態
- 說明 PID 分配與 `fork()` 返回值差異（父拿子 PID = 正整數，子拿 0）

### Part 2 · I/O Redirection 原理圖
- FD 0/1/2 對應 stdin/stdout/stderr 的對應關係圖
- `dup2(fd, 1)` 把 stdout 重新導向檔案的視覺化流程

### Part 3 · Mini Shell 互動終端
- 可輸入：`ls`、`cat`、`pwd`、`echo`、`cd`
- 支援 I/O Redirection：`ls > out.txt`
- 支援 Pipe：`ls | cat`
- 輸入同時顯示背後發生的 System Call

### Part 4 · Pipe 單向通道圖
- `pipe(fd[0], fd[1])` 建立管道的視覺化
- 父程序 read、子程序 write 的資料流動畫

### Part 5 · 技術階梯 Stack Flow
- process/thread → pipe/mmap → socket → epoll → 高效能伺服器
- 說明 epoll 與 select 的差異（事件驅動 vs 全量輪詢）

---

## 課程內容

### Part 1 · Process（程序）

| 函式 | 功能 | 說明 |
|------|------|------|
| `fork()` | 影分身，複製一份行程 | 呼叫一次、返回兩次 |
| `execvp()` | 換魂，变成另一個程式 | 在現有行程上替換程式映像 |
| `wait()` | 父等子，幫子收屍 | 不呼叫會產生 Zombie |
| `waitpid()` | 指定等某一個子 | 可設定 WNOHANG 不阻塞 |
| `system()` | 包好的 fork+exec+wait | 簡易但有安全風險 |

### Part 2 · File System（檔案系統）

| 函式 | 層次 | 功能 |
|------|------|------|
| `open()` | 系統層 | 開啟檔案，拿到 FD |
| `read()` | 系統層 | 用 FD 讀取資料 |
| `write()` | 系統層 | 用 FD 寫入資料 |
| `close()` | 系統層 | 關閉 FD，釋放資源 |
| `gets()/puts()` | 標準層 | 無邊界檢查（不安全） |
| `fgets()/fputs()` | 標準層 | 安全版，指定 buffer size |

### Part 3 · I/O Redirection

FD 0/1/2 是標準輸入、輸出、錯誤輸出。`dup2(fd, 1)` 把檔案描述符複製到位置 1，所有 `printf()` 就自動寫進檔案。

### Part 4 · Pipe / mmap / Socket

- **pipe()**：`fork()` 後父子各持有一端，父親讀、子寫——Unix `|` 的底層原理
- **mmap()**：檔案映射到記憶體，繞過 `read()/write()`，適合大檔案與共享記憶體
- **socket()**：網路版檔案，`bind()/listen()/accept()/connect()` + `read()/write()`

### Part 5 · 底層脈絡

```
process/thread → pipe/mmap → socket → epoll → 高效能伺服器
```

epoll 採用事件驅動，只通知「哪些 FD 有事件」，不用全量輪詢——這是 Nginx、Redis 高效能的祕密之一。

---

## 作業規格

- GitHub：[Oren2026/Oren_own — sp_HW_6](https://github.com/Oren2026/Oren_own/tree/main/docs/homework/CCC%E4%BD%9C%E6%A5%AD%E5%A4%A9%E5%9C%B0/%E7%B3%BB%E7%B5%B1%E7%A8%8B%E5%BC%8F/sp_HW_6)
- 展示：[/docs/homework/CCC作業天地/系統程式/sp_HW_6/index.html](/docs/homework/CCC作業天地/系統程式/sp_HW_6/index.html)
