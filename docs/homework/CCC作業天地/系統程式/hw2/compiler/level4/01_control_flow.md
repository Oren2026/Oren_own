# Level 4-Compiler: 支援流程控制 (if / while)

## 目標：讓編譯器能處理條件判斷和迴圈

## 跳轉指令

```
JMP label    - 無條件跳躍
JMP_FALSE   - 若堆疊頂為 0，則跳躍
```

## 簡化版：只實作 while

```
while (x < 3) {
    x = x + 1;
}

Bytecode:
L_start:
  LOAD x
  IMM 3
  CMP_LT
  JMP_FALSE L_end
  LOAD x
  IMM 1
  ADD
  STORE x
  JMP L_start
L_end:
```