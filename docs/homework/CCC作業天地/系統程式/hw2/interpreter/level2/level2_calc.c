# Level 2: 直譯器 - 計算機

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    char input[100];
    printf("> ");
    fgets(input, 100, stdin);

    int a, b;
    char op;
    sscanf(input, "%d %c %d", &a, &op, &b);

    if (op == '+') printf("%d\n", a + b);
    else if (op == '-') printf("%d\n", a - b);
    else if (op == '*') printf("%d\n", a * b);
    else if (op == '/') printf("%d\n", a / b);

    return 0;
}
```

```bash
gcc level2_calc.c -o calc
./calc
> 5 + 3
8
```