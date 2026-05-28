# 260311compiler - 編譯器教學專案

## 架構

```
260311compiler/
├── interpreter/     # 直譯器教學 (Level 1-5)
│   └── level{1,2,3,4,5}/
└── compiler/       # 編譯器教學 (Level 1-5)
    └── level{1,2,3,4,5}/
```

## 快速開始

```bash
# 直譯器 Level 5
gcc interpreter/level5/level5_calc.c -o calc && ./calc

# 編譯器
gcc compiler/level2/level2_compiler.c -o level2 && ./level2
gcc compiler/level3/level3_variables.c -o level3 && ./level3
gcc compiler/level4/level4_control_flow.c -o level4 && ./level4
gcc compiler/level5/level5_functions.c -o level5 && ./level5
```

## 編譯器教學進度

| Level | 功能 | 測試 |
|-------|------|------|
| Level 2 | 基本運算 (+ - * /) | 1 + 2 * 3 = 7 ✓ |
| Level 3 | 變數支援 | x=5, y=3, x+y ✓ |
| Level 4 | while 迴圈 | x=0; while(x<3){x=x+1;} → x=3 ✓ |
| Level 5 | VM/位元組碼展示 | 5 + 3 = 8 ✓ |

## 教學重點

### 直譯器 → 編譯器的改造

```c
// 直譯器: 直接計算
int eval(ASTNode* n) {
    if (n->type == NODE_NUM) return n->value;
    return eval(n->left) + eval(n->right);
}

// 編譯器: 產生位元組碼
void compile(ASTNode* n) {
    if (n->type == NODE_NUM) emit(OP_IMM, n->value);
    else {
        compile(n->left);
        compile(n->right);
        emit(OP_ADD, 0);
    }
}
```

### Bytecode 指令集

| Opcode | 說明 |
|--------|------|
| IMM n | 載入立即值 n |
| ADD | 彈出兩個值相加 |
| STORE idx | 存入變數陣列 |
| LOAD idx | 載入變數值 |
| JMP addr | 跳躍到指定位置 |
| JMP_FALSE | 堆疊頂為 0 則跳躍 |

## 下一步

- 完整函數呼叫 (CALL/RETURN)
- if/else 條件判斷
- 字串與指標類型