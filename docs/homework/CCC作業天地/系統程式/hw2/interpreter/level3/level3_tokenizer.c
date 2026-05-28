# Level 3: Tokenizer

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
    int value;
} Token;

Token tokens[100];
int token_count = 0;

void tokenize(const char* input) {
    while (*input) {
        while (isspace(*input)) input++;

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
        else if (tokens[i].type == TOKEN_MINUS)
            printf("  MINUS\n");
        else if (tokens[i].type == TOKEN_MUL)
            printf("  MUL\n");
        else if (tokens[i].type == TOKEN_DIV)
            printf("  DIV\n");
        else if (tokens[i].type == TOKEN_EOF)
            printf("  EOF\n");
    }

    return 0;
}
```

```bash
gcc level3_tokenizer.c -o tokenizer
./tokenizer
```