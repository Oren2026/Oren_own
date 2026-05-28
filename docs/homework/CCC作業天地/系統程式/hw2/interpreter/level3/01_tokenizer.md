# Level 3: Tokenizer - 把文字拆成零件

## 核心問題：如何理解 "1 + 2 * 3"？

```
人類看到的:  "1 + 2 * 3"
電腦看到的:  '1' ' ' '+' ' ' '2' ' ' '*' ' ' '3'

變成零件 (Token):
    NUMBER(1)
    PLUS
    NUMBER(2)
    MUL
    NUMBER(3)
```

## 為什麼要拆？

因為電腦需要知道「+」和「*」是不同的東西：
- "+" 是運算子 (operator)
- "1" 是數字 (operand)

## Tokenizer 實作

```c
#include <stdio.h>
#include <ctype.h>
#include <string.h>
#include <stdlib.h>

typedef enum {
    TOKEN_NUMBER,
    TOKEN_PLUS,
    TOKEN_MINUS,
    TOKEN_MUL,
    TOKEN_DIV,
    TOKEN_EOF
} TokenType;

typedef struct {
    TokenType type;
    int value;  // 只有數字才用這個
} Token;

Token tokens[100];
int token_count = 0;

void tokenize(const char* input) {
    while (*input) {
        while (isspace(*input)) input++;  // 跳過空白

        if (isdigit(*input)) {
            int value = 0;
            while (isdigit(*input)) {
                value = value * 10 + (*input - '0');
                input++;
            }
            tokens[token_count].type = TOKEN_NUMBER;
            tokens[token_count].value = value;
            token_count++;
        } else if (*input == '+') {
            tokens[token_count++].type = TOKEN_PLUS;
            input++;
        } else if (*input == '-') {
            tokens[token_count++].type = TOKEN_MINUS;
            input++;
        } else if (*input == '*') {
            tokens[token_count++].type = TOKEN_MUL;
            input++;
        } else if (*input == '/') {
            tokens[token_count++].type = TOKEN_DIV;
            input++;
        }
    }
    tokens[token_count++].type = TOKEN_EOF;
}

int main() {
    const char* input = "1 + 2 * 3";
    tokenize(input);

    printf("Tokens:\n");
    for (int i = 0; i < token_count; i++) {
        if (tokens[i].type == TOKEN_NUMBER)
            printf("  NUMBER(%d)\n", tokens[i].value);
        else if (tokens[i].type == TOKEN_PLUS)
            printf("  PLUS\n");
        else if (tokens[i].type == TOKEN_MUL)
            printf("  MUL\n");
        else if (tokens[i].type == TOKEN_EOF)
            printf("  EOF\n");
    }

    return 0;
}
```

執行：
```bash
gcc level3_tokenizer.c -o tokenizer
./tokenizer
```

輸出：
```
Tokens:
  NUMBER(1)
  PLUS
  NUMBER(2)
  MUL
  NUMBER(3)
  EOF
```

## Level 3 作業

1. 執行 tokenizer
2. 嘗試輸入 "123 + 456"
3. 嘗試輸入 "100 - 37"
4. 思考：如何支援負數？