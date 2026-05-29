# HW3 — Solang 強化編譯器
# 系統程式 · Part 3

> 基於 HW2 CalcLang 延伸，加入 fork/exec/print/file/time/rand 等 16 個新 Bytecode 指令（Opcode 13-28）。從計算機升級成腳本語言，可做程序控制、檔案 I/O、時間與亂數。

---

## 視覺化演示

[index.html](index.html) 包含完整的 HW3 展示頁，主要內容：

### 對話記錄
- 黑皮與黑輪的協作對話，記錄從「為什麼要強化 CalcLang」到「從計算機升級成腳本語言」的決策過程

### HW3 新功能總覽
| 功能類別 | 說明 |
|---------|------|
| 程序控制 | FORK（程序複製）、EXIT（結束程式）、EXEC（執行外部命令） |
| 標準 I/O | PRINT / PRINTLN（輸出）、READ（讀取 stdin） |
| 檔案 I/O | FOPEN / FREAD / FWRITE / FCLOSE |
| 時間與亂數 | TIME（時間戳）、SLEEP（睡眠）、RAND（亂數） |
| 字串操作 | STRLEN、STRCMP、INT_TO_STR |

---

## 課程內容

### 新增 Bytecode 指令（Opcode 13-28）

| Opcode | 名稱 | 功能 |
|--------|------|------|
| 13 | FORK | fork() 程序複製 |
| 14 | EXIT | 結束程式並返回 exit code |
| 15 | EXEC | 執行外部命令 |
| 16 | PRINT | 輸出字串（不換行） |
| 17 | PRINTLN | 輸出字串（換行） |
| 18 | READ | 讀取一行 stdin |
| 19 | FOPEN | 開啟檔案 |
| 20 | FREAD | 讀取檔案內容 |
| 21 | FWRITE | 寫入檔案 |
| 22 | FCLOSE | 關閉檔案 |
| 23 | TIME | 取得目前時間戳 |
| 24 | SLEEP | 暫停執行（毫秒） |
| 25 | RAND | 產生亂數 |
| 26 | STRLEN | 回傳字串長度 |
| 27 | STRCMP | 比較兩字串 |
| 28 | INT_TO_STR | 整數轉字串 |

### HW2 vs HW3 對比

| 層面 | HW2 CalcLang | HW3 Solang |
|------|-------------|------------|
| 定位 | 計算機 | 腳本語言 |
| 資料型態 | 整數、布林值 | 整數、布林值、字串 |
| 程序控制 | 無 | FORK、EXIT、EXEC |
| 檔案 I/O | 無 | FOPEN/FREAD/FWRITE/FCLOSE |
| 時間/亂數 | 無 | TIME、SLEEP、RAND |
| 字串操作 | 無 | STRLEN、STRCMP、INT_TO_STR |

---

## 作業規格

- GitHub：[Oren2026/Oren_own — hw3](https://github.com/Oren2026/Oren_own/tree/main/docs/homework/CCC%E4%BD%9C%E6%A5%AD%E5%A4%A9%E5%9C%B0/%E7%B3%BB%E7%B5%B1%E7%A8%8B%E5%BC%8F/hw3)
- VM 實作：[hw3/vm/vm.c](https://github.com/Oren2026/Oren_own/blob/main/docs/homework/CCC%E4%BD%9C%E6%A5%AD%E5%A4%A9%E5%9C%B0/%E7%B3%BB%E7%B5%B1%E7%A8%8B%E5%BC%8F/hw3/vm/vm.c)
- 展示：[hw3/index.html](index.html)
