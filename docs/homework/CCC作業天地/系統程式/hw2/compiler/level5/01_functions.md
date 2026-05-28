# Level 5-Compiler: 支援函數

## 目標：讓編譯器能處理函數呼叫

## 函數相關指令

| 指令 | 說明 |
|-----|------|
| FUNC name | 函數開始標記 |
| PARAM | 傳遞參數到堆疊 |
| CALL name, n | 呼叫函數，n 為參數數量 |
| RETURN | 返回並攜帶值 |

## 函數呼叫流程

```
func add(a, b) {
    return a + b;
}
result = add(1, 2);

產生的 Bytecode:
FUNC add
  PARAM 1
  PARAM 2
  CALL add, 2
  STORE result
```

## Frame 概念

每個函數呼叫有自己的 Frame（框架）：
- 自己的變數空間
- 返回位址
- 參數槽位