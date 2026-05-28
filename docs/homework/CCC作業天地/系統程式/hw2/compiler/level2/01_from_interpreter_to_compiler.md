# Level 2: 從直譯器到編譯器

## 直譯器 vs 編譯器的核心差異

```
直譯器 (Interpreter):
    eval() → 直接返回計算結果
    Input: 1 + 2 → Output: 3

編譯器 (Compiler):
    emit() → 產生位元組碼指令
    Input: 1 + 2 → Bytecode: [IMM, 1, IMM, 2, ADD] → Output: 3
```

## 怎麼改造？

```c
// 直譯器: 遞迴計算
int eval(ASTNode* n) {
    int left = eval(n->left);
    int right = eval(n->right);
    return left + right;  // 直接返回結果
}

// 編譯器: 遞迴產生指令
void compile(ASTNode* n) {
    compile(n->left);      // 先編譯左子樹
    compile(n->right);     // 再編譯右子樹
    emit(ADD);             // 最後發出運算指令
}
```

## 為什麼這樣可以運作？

因為樹的遍歷順序：
- 葉子 (數字) → 發出 `IMM` 載入值
- 內部節點 (運算) → 發出 `ADD/SUB/MUL/DIV`

```
       +
      / \
     1   *
        / \
       2   3

編譯過程:
    1. 到左葉子 1 → emit(IMM, 1)
    2. 到右子樹 *
       2.1 到左葉子 2 → emit(IMM, 2)
       2.2 到右葉子 3 → emit(IMM, 3)
       2.3 離開 * → emit(MUL)
    3. 離開 + → emit(ADD)

最終 Bytecode: [IMM,1, IMM,2, IMM,3, MUL, ADD]
```

## 作業

1. 執行 level2_compiler.c
2. 觀察輸出的 Bytecode 順序
3. 對照 AST 結構，確認理解
4. 嘗試修改 input 為 "5 - 2" 或 "4 * 3"