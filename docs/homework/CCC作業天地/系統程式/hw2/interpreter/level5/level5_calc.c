#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>

typedef enum {
    TOKEN_NUMBER, TOKEN_PLUS, TOKEN_MINUS,
    TOKEN_MUL, TOKEN_DIV, TOKEN_EOF
} TokenType;

typedef enum {
    NODE_NUM, NODE_ADD, NODE_SUB, NODE_MUL, NODE_DIV
} NodeType;

typedef struct Token { TokenType type; int value; } Token;
typedef struct ASTNode { NodeType type; int value; struct ASTNode* left; struct ASTNode* right; } ASTNode;

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
        } else if (*s == '+') { tokens[count++].type = TOKEN_PLUS; s++; }
        else if (*s == '-') { tokens[count++].type = TOKEN_MINUS; s++; }
        else if (*s == '*') { tokens[count++].type = TOKEN_MUL; s++; }
        else if (*s == '/') { tokens[count++].type = TOKEN_DIV; s++; }
    }
    tokens[count++].type = TOKEN_EOF;
}

Token get_next() { return tokens[pos++]; }
void put_back() { pos--; }

ASTNode* parse_factor() {
    Token t = get_next();
    if (t.type == TOKEN_NUMBER) {
        ASTNode* n = malloc(sizeof(ASTNode));
        n->type = NODE_NUM; n->value = t.value; n->left = n->right = NULL; return n;
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
        parent->left = left; parent->right = right; left = parent;
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
        parent->left = left; parent->right = right; left = parent;
        t = get_next();
    }
    put_back();
    return left;
}

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

int main() {
    const char* input = "1 + 2 * 3";
    printf("Input: %s\n", input);
    tokenize(input);
    ASTNode* tree = parse_expr();
    printf("Output: %d\n", eval(tree));
    return 0;
}