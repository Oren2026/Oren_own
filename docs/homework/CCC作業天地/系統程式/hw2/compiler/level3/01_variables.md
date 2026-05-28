# Level 3-Compiler: 支援變數

## 目標：讓編譯器能處理「x = 5; x + 3」

## 新增指令

```
之前:  IMM 5      - 把數字 5 載入堆疊
現在:  LOAD x     - 把變數 x 的值載入堆疊
      STORE x    - 把堆疊頂端的值存到變數 x
```

## 指令集擴充

| 指令 | 說明 | 範例 |
|-----|------|------|
| IMM n | 載入立即值 | IMM 5 → [5] |
| LOAD name | 載入變數 | LOAD x → [x的值] |
| STORE name | 存入變數 | STORE x → 把 stack.pop() 存到 x |
| ADD/SUB/MUL/DIV | 運算 | 彈出兩個值，運算後 push |

## 編譯流程

```
x = 5
y = 3
x + y

1. 看到 x = 5 → compile(5), emit(STORE, "x")
2. 看到 y = 3 → compile(3), emit(STORE, "y")
3. 看到 x + y → compile(x), compile(y), emit(ADD)
```

## Bytecode 產生

```
[IMM 5, STORE x, IMM 3, STORE y, LOAD x, LOAD y, ADD]
```

## VM 執行

```
stack: []
vars: {}

IMM 5     → stack: [5]
STORE x   → vars: {x:5}, stack: []
IMM 3     → stack: [3]
STORE y   → vars: {x:5, y:3}, stack: []
LOAD x    → stack: [5]
LOAD y    → stack: [5, 3]
ADD       → stack: [8]
```