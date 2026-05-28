# Level 5: 完整計算機 - 把所有環節連起來

## 終極目標：做出真的能跑的計算機

```
輸入: "1 + 2 * 3"
輸出: 7
```

## 完整流程

```
原始文字: "1 + 2 * 3"
    ↓
Tokenizer: [NUM(1), PLUS, NUM(2), MUL, NUM(3)]
    ↓
Parser:    建立 AST (看到先後順序)
            +
           / \
          1   *
             / \
            2   3
    ↓
Evaluator: 從葉子開始算，結果往上傳
           2*3=6, 1+6=7
    ↓
輸出: 7
```

## 完整實作

```c
#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include <string.h>

typedef enum {
    TOKEN_NUMBER, TOKEN_PLUS, TOKEN_MINUS,
    TOKEN_MUL, TOKEN_DIV, TOKEN_EOF
} TokenType;

typedef enum {
    NODE_NUM, NODE_ADD, NODE_SUB, NODE_MUL, NODE_DIV
} NodeType;

typedef struct Token {
    TokenType type;
    int value;
} Token;

typedef struct ASTNode {
    NodeType type;
    int value;
    struct ASTNode* left;
    struct ASTNode* right;
} ASTNode;

// ============ TOKENIZER ============
Token tokens[100];
int pos = 0;

void tokenize(const char* s) {
    int count = 0;
    while (*s) {
        while (isspace(*s)) s++;
        if (isdigit(*s)) {
            int v = 0;
            while (isdigit(*s)) v = v * 10 + (*s++ - '0');
            tokens[count].type = TOKEN_NUMBER;
            tokens[count++].value = v;
        } else if (*s == '+') {
            tokens[count++].type = TOKEN_PLUS; s++;
        } else if (*s == '-') {
            tokens[count++].type = TOKEN_MINUS; s++;
        } else if (*s == '*') {
            tokens[count++].type = TOKEN_MUL; s++;
        } else if (*s == '/') {
            tokens[count++].type = TOKEN_DIV; s++;
        }
    }
    tokens[count++].type = TOKEN_EOF;
}

Token get_next() { return tokens[pos++]; }
void put_back() { pos--; }

// ============ PARSER ============
ASTNode* parse_expr();
ASTNode* parse_term();
ASTNode* parse_factor();

ASTNode* parse_factor() {
    Token t = get_next();
    if (t.type == TOKEN_NUMBER) {
        ASTNode* n = malloc(sizeof(ASTNode));
        n->type = NODE_NUM;
        n->value = t.value;
        n->left = n->right = NULL;
        return n;
    }
    return NULL;
}

ASTNode* parse_term() {
    ASTNode* left = parse_factor();
    Token t = get_next();
    while (t.type == TOKEN_MUL || t.type == TOKEN_DIV) {
        ASTNode* right = parse_factor();
        ASTNode* parent = malloc(sizeof(ASTNode));
        parent->type = (t.type == TOKEN_MUL) ? NODE_MUL : NODE_DIV;
        parent->left = left;
        parent->right = right;
        left = parent;
        t = get_next();
    }
    put_back();
    return left;
}

ASTNode* parse_expr() {
    ASTNode* left = parse_term();
    Token t = get_next();
    while (t.type == TOKEN_PLUS || t.type == TOKEN_MINUS) {
        ASTNode* right = parse_term();
        ASTNode* parent = malloc(sizeof(ASTNode));
        parent->type = (t.type == TOKEN_PLUS) ? NODE_ADD : NODE_SUB;
        parent->left = left;
        parent->right = right;
        left = parent;
        t = get_next();
    }
    put_back();
    return left;
}

// ============ EVALUATOR ============
int eval(ASTNode* n) {
    if (n->type == NODE_NUM) return n->value;
    int left = eval(n->left);
    int right = eval(n->right);
    if (n->type == NODE_ADD) return left + right;
    if (n->type == NODE_SUB) return left - right;
    if (n->type == NODE_MUL) return left * right;
    if (n->type == NODE_DIV) return left / right;
    return 0;
}

// ============ MAIN ============
int main() {
    const char* input = "1 + 2 * 3";
    printf("Input: %s\n", input);

    tokenize(input);
    ASTNode* tree = parse_expr();
    int result = eval(tree);

    printf("Output: %d\n", result);  // 7
    return 0;
}
```

執行：
```bash
gcc level5_calc.c -o calc
./calc
```

輸出：
```
Input: 1 + 2 * 3
Output: 7
```

## 恭喜完成！

你現在有了一個完整的「直譯器」：
1. Tokenizer - 拆解文字
2. Parser - 建立 AST
3. Evaluator - 執行樹

## Level 5 挑戰

1. 支援括號: `(1 + 2) * 3` = 9
2. 支援變數: `x = 5; x + 3` = 8
3. 支援函數: `f(x) = x * 2; f(3)` = 6

要挑戰嗎？