# CalcLang 語言規格書 v1.0

## 1. 設計目標

一個用於教學的簡單語言，支援**解譯執行**與**編譯到 Bytecode** 兩種模式。
讓學習者從直譯器出發，理解編譯器的演變過程。

## 2. 資料型別

| 型別 | 說明 |
|------|------|
| `int` | 32 位元有號整數（預設） |

**型別策略**：強型態靜態。變數宣告後不可改變型別，未宣告的變數不可使用。

## 3. 語法特性

- **強型態靜態**：型別檢查在編譯時完成
- **遞推解析**（Recursive Descent Parser）：每個語法規則對應一個解析函數
- **運算子優先序**：由上而下遞減（乘除 > 加減 > 比較 > 賦值）

## 4. 運算子優先序（由高到低）

| 優先序 | 運算子 |
|--------|--------|
| 1 | `*` `/` `%` |
| 2 | `+` `-` |
| 3 | `<` `>` `<=` `>=` `==` `!=` |
| 4 | `=` (賦值，最低優先序) |

## 5. 控制流

```
while (condition) {
    statements
}

if (condition) {
    statements
} else {
    statements
}
```

## 6. 函數（Level 5 延伸）

```
fn name(param1, param2) {
    statements
    return expr;
}
```

- 支援參數傳遞（按值傳遞）
- 單一返回點（return）
- 區域變數 scope

## 7. 輸出

```
print(expr);
```

## 8. 執行模式

| 模式 | 流程 | 適用層級 |
|------|------|---------|
| **解譯模式** | Tokenizer → AST → Eval（直接執行） | interpreter/level5 |
| **編譯模式** | Tokenizer → AST → Bytecode → Stack VM 執行 | compiler/level2-5 |

## 9. Bytecode 指令集

| Opcode | 參數 | 說明 |
|--------|------|------|
| `IMM` | n | 載入立即值 n 到堆疊 |
| `LOAD` | idx | 從變數陣列取第 idx 個變數 push 到堆疊 |
| `STORE` | idx | pop 堆疊頂存入變數陣列第 idx 格 |
| `ADD` | - | pop 兩個值相加，push 結果 |
| `SUB` | - | pop 兩個值相減（先左後右），push 結果 |
| `MUL` | - | pop 兩個值相乘，push 結果 |
| `DIV` | - | pop 兩個值相除（先左後右），push 結果 |
| `CMP_LT` | - | pop 兩個值，若 a < b 則 push 1 否則 push 0 |
| `CMP_GT` | - | pop 兩個值，若 a > b 則 push 1 否則 push 0 |
| `CMP_EQ` | - | pop 兩個值，若 a == b 則 push 1 否則 push 0 |
| `JMP` | addr | 無條件跳躍到 addr |
| `JMP_FALSE` | addr | 若堆疊頂為 0，跳至 addr |
| `CALL` | addr | 函數呼叫（Level 5） |
| `RET` | - | 函數返回（Level 5） |
| `PRINT` | - | pop 並輸出（Level 5） |
| `EOF` | - | 程式結束 |

## 10. 記憶體管理

- **無 GC**：使用固定大小陣列管理變數與堆疊
- 變數表：`vars[20]`（最多 20 個變數）
- 堆疊：`stack[100]`（最多 100 層）
- Bytecode：`bytecode[400]`（最多 200 指令）

## 11. 錯誤處理

- 除以 0：輸出 `ERROR: Division by zero`，程式終止
- 未知變數：輸出 `ERROR: Unknown variable`，程式終止
- 堆疊溢位：輸出 `ERROR: Stack overflow`，程式終止

## 12. 測試案例

| 輸入 | 預期輸出 |
|------|---------|
| `1 + 2 * 3` | `7` |
| `x = 5; y = 3; x + y` | `8` |
| `x = 0; while (x < 3) { x = x + 1; }` | `x = 3` |
| `if (1 < 2) { x = 10; } else { x = 20; }` | `x = 10` |
| `fn add(a, b) { return a + b; } print(add(2, 3));` | `5` |