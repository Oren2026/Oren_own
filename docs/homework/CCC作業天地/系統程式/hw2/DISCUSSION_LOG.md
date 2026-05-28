# 與 OpenCode 討論順序 - 260311compiler 編譯器學習專案

## 討論脈絡

### 起因
- 從上一個專案 (260304while0p) 的 p0 編譯器出發
- 用戶想要理解「編譯器是什麼」以及「如何從零開始建立編譯器」

### 關鍵問題：用戶的疑惑

> 以前又沒有編譯器？如果我現在是透過這樣的方式得到編譯器，那以前的人又如何創造？總不可能雞生蛋蛋生雞吧？

這是個非常好的問題，促成了整個學習架構的設計。

---

## 討論時序

### 1. 釐清需求 (一開始)

**用戶需求：**
- 想要建立一個編譯器專案
- 但不确定从哪里开始

**我的回應：**
- 詢問要用什麼類型的編譯器（bytecode / 機械碼 / transpiler）
- 解釋「先學習再做專案」的概念

---

### 2. 歷史問題：Bootstrapping

**用戶問題：**
- 沒有編譯器的情況下，第一個編譯器是怎麼創造的？
- 雞生蛋蛋生雞的問題

**我的回答：**
```
1940s: 直接寫機器碼 (0/1)
1950s: 用機器碼寫第一個 assembler
1957: FORTRAN 第一個高階語言（用 assembly 寫）

關鍵概念: Bootstrapping
- 用機器碼手工打造第一個工具
- 然後用這個工具寫更複雜的工具
```

---

### 3. 學習規劃

**用戶說：**
> 我覺得我需要先學習，才能做到這次的專案

**我提供的架構：**
```
Level 1: 什麼是電腦/計算機
Level 2: 直譯器基礎 (文字替換)
Level 3: Tokenizer (把文字拆成 Token)
Level 4: AST (把 Token 組裝成語法樹)
Level 5: 完整直譯器 (串連所有環節)

然後擴充到編譯器:
Level 2-Compiler: eval() → emit() 改造
Level 3-Compiler: 支援變數
Level 4-Compiler: 支援 while 迴圈
Level 5-Compiler: 支援函數
```

---

### 4. 直譯器教學完成

建立了 `interpreter/level{1,2,3,4,5}/` 完整教學內容：
- Level 1: 什麼是電腦 (level1_hello.c)
- Level 2: 直譯器基礎 (level2_calc.c)
- Level 3: Tokenizer (level3_tokenizer.c)
- Level 4: AST (level4_ast.c)
- Level 5: 完整直譯器 (level5_calc.c)

---

### 5. 編譯器教學開始

建立了 `compiler/level{1,2,3,4,5}/` 教學內容

**Level 2-4 順利完成，測試結果：**
```
Level 2: 1 + 2 * 3 = 7 ✓
Level 3: x = 5; y = 3; x + y = 8 ✓
Level 4: x = 0; while (x < 3) { x = x + 1; } → x = 3 ✓
```

---

### 6. Level 4 Bug 修復

**問題：** while 迴圈只執行一次就跳出

**原因：** JMP_FALSE 跳轉位置計算錯誤

**修復方式：** 使用 `patch_jmp()` 機制，在生成 JMP 指令時先用佔位符，事後再填入正確的跳轉位置

```c
int jmp_false_pos = pc;
emit(OP_JMP_FALSE, 9999);  // 先用佔位符
// ... 編譯 while body ...
emit(OP_JMP, loop_start);
patch_jmp(jmp_false_pos, pc);  // 填入正確位置
```

---

### 7. Level 5 函數功能挑戰

**問題：** 嘗試實現完整函數呼叫 (CALL/RETURN)，但遇到無限迴圈

**複雜度分析：**
- Frame 切換（保存/恢復局部變數）
- 參數傳遞機制
- 返回位址管理

**最終做法：** 簡化為 Bytecode 展示版本，說明 VM 的運作原理

---

### 8. 整理與 Commit

**最終架構：**
```
260311compiler/
├── interpreter/     # 直譯器教學 ✅
│   └── level{1,2,3,4,5}/
├── compiler/         # 編譯器教學 ✅
│   └── level{1,2,3,4,5}/
├── README.md
└── AGENTS.md
```

**Commit 訊息：** `Add interpreter and compiler tutorial with Level 2-5`

---

## 學到的關鍵概念

### 1. Bootstrapping（自舉）
```
第一步：用機器碼寫 assembler
第二步：用 assembly 寫 compiler
第三步：用 compiler 寫更複雜的程式
```

### 2. 直譯器 → 編譯器的改造
```c
// 直譯器: 直接計算
int eval(ASTNode* n) {
    return eval(n->left) + eval(n->right);
}

// 編譯器: 產生位元組碼
void compile(ASTNode* n) {
    compile(n->left);
    compile(n->right);
    emit(OP_ADD, 0);
}
```

### 3. VM 的運作方式
- Bytecode 只是資料，VM 才是執行者
- 堆疊機 (Stack Machine) 最容易實作
- JMP 指令需要「先產生再填充」的兩階段機制

---

## 下一步建議

1. **完整函數功能：** 實現真正的 CALL/RETURN Frame 管理
2. **if/else：** 增加條件分支支援
3. **最佳化：** 在 emit 後加入最佳化 pass
4. **機械碼：** 從 bytecode 升級到真正的 x86_64 輸出

---

## 與 OpenCode 合作的技巧

1. **先問歷史：** 問「以前怎麼做的」比問「現在怎麼做」更能理解本質
2. **小步前進：** Level 1-5 逐步建立，不要一次貪心
3. **及時測試：** 每個 Level 建立完立即 ./levelX 驗證
4. **Bug 修復記錄：** 記錄 JMP_FALSE 問題的修復方式
5. **簡化複雜功能：** 函數太複雜就先用展示版本

---

## 時間線

| 日期 | 事件 |
|------|------|
| 一開始 | 用戶想要建立編譯器專案 |
| 初期 | 討論 Bootstrapping 歷史問題 |
| 中期 | 建立直譯器教學 (interpreter/) |
| 中期 | 建立編譯器教學 (compiler/) |
| 中期 | Level 4 while 迴圈 Bug 修復 |
| 後期 | Level 5 函數簡化為展示版 |
| 最終 | Commit & Push 到 main 分支 |