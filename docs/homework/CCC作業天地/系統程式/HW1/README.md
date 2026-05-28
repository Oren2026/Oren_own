# HW1 — 系統程式初體驗：while 迴圈與指標

> 260304 課堂練習，熟悉系統程式基本語法與 while 迴圈、指標的應用。

---

## 實作：while 迴圈

### 測試程式 while.p0

```p0
i = 1;
sum = 0;
while (i < 11) {
    sum = sum + i;
    i = i + 1;
}
```

執行結果：`i = 11`，`sum = 55`（1+2+...+10）。

---

## while 迴圈設計原理

### 核心概念：一次掃描，雙向跳轉

while 迴圈的本質是**有條件的重複**。在四元組（Quadruple）層次，這表示需要兩個跳轉指令：

| 指令 | 行為 |
|------|------|
| `JMP_F 條件, -, ?` | 若條件為 0（false），跳到 `?`（迴圈結束位置） |
| `JMP -, -, 起始位置` | 無條件跳回條件判斷的起點 |

### 與 if 的關鍵差異

if 只需要一個 `JMP_F`（條件為 false 時跳過區塊）。while 需要**兩個**：`JMP_F` 離開迴圈 + `JMP` 回頭。

### 為什麼 loop_start 要設在 expression() 之前？

```python
loop_start = len(self.quads)  # ★ 在 expression() 之前 capture
cond = self.expression()        # 產生 CMP_LT 等條件 quads
consume(); consume()           # ), {
jmp_f_idx = len(self.quads)
emit("JMP_F", cond, "-", "?")  # 條件為0就跳出

while cur.type != RBRACE:
    statement()               # 迴圈內容
consume()                      # }
emit("JMP", "-", "-", str(loop_start))  # ★ 回頭到條件起點
```

**關鍵：** `loop_start` 必須是 `expression()` **執行之前**的 quad 數。這樣 `JMP` 回頭時，會從**條件表達式的第一個 quad** 重新執行，而不是跳到 `JMP_F` 本身。

否則，JMP 會跳到上一輪已經計算過的 `JMP_F`，而此時用來判斷的 `t4`（CMP_LT 結果）不會更新——導致無窮迴夢。

### 產生的四元組

```
000: IMM    1          -    t1      ; i = 1
001: STORE  t1         -    i
002: IMM    0          -    t2      ; sum = 0
003: STORE  t2         -    sum
004: IMM    11         -    t3      ; 條件：i < 11
005: CMP_LT i          t3    t4      ; 比較結果放 t4
006: JMP_F  t4         -    ?        ; 為0跳出（回填→013）
007: ADD    sum        i     t5      ; sum = sum + i
008: STORE  t5         -    sum
009: IMM    1          -    t6      ; i = i + 1
010: ADD    i          t6    t7
011: STORE  t7         -    i
012: JMP    -          -    4        ; 回頭到條件起點
```

---

## 與 Hermes 的討論紀錄

> 2026-05-28，黑皮說要把討論寫進 README。

**黑皮：** 作業要加上 while 語法的處理，並說明設計原理。要看懂 p0 compiler 中的函數呼叫機制是怎麼運作的。並於 README 中解釋寫 while 的邏輯。

**我（黑輪）：** 看完 compiler.py 後，發現現有 compiler 支援 `func`/`return`/`if`，但**沒有 `while`**。需要做四件事：Lexer 加 `TK_WHILE` + 關鍵字、Parser 加 while 分支、VM 加 `JMP` 指令、測試 `while.p0` 並確認結果。

**第一次實作（錯誤版本）：**

```python
# 錯誤：loop_start 設在 expression() 之後
cond = self.expression()          # 產生 CMP_LT
consume(); consume()              # ), {
loop_start = len(self.quads)     # ← 錯：這是 JMP_F 的位置
jmp_f_idx = len(self.quads)
emit("JMP_F", cond, "-", "?")    ; 為0就跳出
```

**問題：** JMP 回到 `loop_start=6`（JMP_F 的位置），但 `t4`（比較結果）是上一輪的值。`IMM 11 → CMP_LT` 不會重新執行，`t4` 永遠是 0，所以條件永遠為 false → 無窮迴圈。

**修正版本（正確）：**

```python
# 正確：loop_start 設在 expression() 之前
loop_start = len(self.quads)     # ★ 條件表達式的第一個 quad 位置
cond = self.expression()          # 產生 CMP_LT 等
consume(); consume()              # ), {
jmp_f_idx = len(self.quads)
emit("JMP_F", cond, "-", "?")    ; 為0就跳出
# ... 迴圈內容 ...
emit("JMP", "-", "-", str(loop_start))  # ★ 回頭到條件起點（重新計算）
```

**黑皮：** 可以。

---

## p0 函數呼叫機制

### 編譯階段：四元組生成

| 指令 | 意義 |
|------|------|
| `PARAM a, -, -` | 將參數值放入參數堆疊 |
| `CALL f, n, t` | 呼叫函數 f，參數 n 個，結果存入 t |
| `RET_VAL r, -, -` | 回傳值 r |

### 執行階段：呼叫堆疊（Call Stack）

VM 內部用 `Frame` 模擬每一層函數呼叫：

```
Frame {
    vars: {}           ; 區域變數
    ret_pc: int        ; 返回地址（CALL 的下一行）
    ret_var: str       ; 回傳值要寫入的目標變數
    incoming_args: []  ; 接收到的參數
    formal_idx: int    ; 參數索引
}
```

**呼叫流程：**
1. `PARAM` 將參數放入 `param_stack`（因為參數可能是複雜表達式，需先算完）
2. `CALL`：建立新 Frame（`sp++`）、儲存返回地址、搬移參數、跳轉到函數進入點
3. `FORMAL`：從 `incoming_args` 取出值，建立區域變數
4. `RET_VAL`：取出回傳值、銷毀 Frame（`sp--`）、返回到 `ret_pc`

**為什麼支援遞迴？** 每次呼叫 `sp++` 就開一個新 Frame，遞迴的每一層都有獨立的作用域和變數，不會互相干擾。

---

## 執行方式

```bash
python3 compiler.py while.p0
```

輸出：
```
全域變數結果:
>> i = 11
>> sum = 55
```
