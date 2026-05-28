# Level 1: 直譯器 vs 編譯器

## 核心問題：兩種翻譯方式

```
直譯器 (Interpreter):
    原始碼 → [邊翻譯邊執行] → 結果
    像是同聲傳譯：說一句翻一句

編譯器 (Compiler):
    原始碼 → [先全部翻譯好] → 位元組碼 → [VM執行] → 結果
    像是翻譯書：先把整本翻完，再讓人閱讀
```

## 比較

| 特性 | 直譯器 | 編譯器 |
|-----|--------|--------|
| 執行方式 | 邊翻譯邊執行 | 先翻譯再執行 |
| 速度 | 啟動快，但執行慢 | 啟動慢，但執行快 |
| 跨平台 | 需要直譯器 | 只需要 VM |
| 範例 | Python, Ruby | C, Rust, Java |

## 我們的計劃

```
Level 1-5: 直譯器 (已完成)
    ↓
Level 1-5: 編譯器 (即將開始)
    - 使用相同的Tokenizer
    - 使用相同的Parser
    - 但產生位元組碼而不是直接執行
```

## Level 1-Compiler: 把直譯器變成編譯器

```c
// 直譯器: eval() 直接算出結果
int eval(ASTNode* n) {
    if (n->type == NODE_NUM) return n->value;
    int left = eval(n->left);
    int right = eval(n->right);
    return left + right;  // 直接計算
}

// 編譯器: emit() 產生位元組碼指令
void emit(int opcode, int arg1, int arg2) {
    bytecode[pc++] = opcode;
    // ...
}

int compile(ASTNode* n) {
    if (n->type == NODE_NUM) emit(IMM, n->value);  // 載入立即值
    else {
        compile(n->left);
        compile(n->right);
        emit(ADD);  // 產生加法指令
    }
}
```

## VM 執行位元組碼

```
Bytecode: [IMM 1, IMM 2, ADD]
    ↓
VM 讀取並執行:
    - IMM 1: 把 1 放進堆疊 → [1]
    - IMM 2: 把 2 放進堆疊 → [1, 2]
    - ADD: 彈出兩個值相加，放回堆疊 → [3]
```

## 作業

1. 查看 interpreter/level5 的程式碼
2. 了解「直譯」和「編譯」輸出結果的不同之處
3. 準備進入 Level 2-Compiler