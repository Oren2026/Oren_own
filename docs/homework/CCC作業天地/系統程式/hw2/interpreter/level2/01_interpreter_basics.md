# Level 2: 直譯器 - 文字替換

## 核心概念：遇到什麼就做什麼

```
輸入: "1 + 2"
解釋器: 看到數字 → 轉成整數
        看到 +   → 知道要做加法
        看到數字 → 轉成整數
        執行 1 + 2 = 3
輸出: 3
```

## 為什麼叫「直譯器」(Interpreter)？

- 編譯器：先把整篇文章翻譯完，再執行
- 直譯器：翻譯一行，執行一行

## 實作：計算機直譯器

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    char input[100];
    printf("> ");
    fgets(input, 100, stdin);  // 讀取使用者輸入

    // 簡單的解析：支援 "num + num" 格式
    int a, b;
    char op;
    sscanf(input, "%d %c %d", &a, &op, &b);

    if (op == '+') {
        printf("%d\n", a + b);
    } else if (op == '-') {
        printf("%d\n", a - b);
    } else if (op == '*') {
        printf("%d\n", a * b);
    } else if (op == '/') {
        printf("%d\n", a / b);
    }

    return 0;
}
```

執行：
```bash
gcc level2_calc.c -o calc
./calc
> 5 + 3
8
```

## 直譯器的限制

只能做簡單的計算，無法：
- 記住變數 (x = 5)
- 條件判斷 (if x > 3)
- 迴圈 (while i < 10)

## Level 2 作業

1. 執行上面的計算機
2. 試著支援更多運算子 (*, /)
3. 思考：如何做到「輸入多個數字」例如 `1 + 2 + 3`