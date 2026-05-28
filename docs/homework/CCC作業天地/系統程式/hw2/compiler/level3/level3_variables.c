#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include <string.h>

#define MAX_TOKENS 100
#define MAX_VARS 20
#define MAX_CODE 200

typedef enum {
    TOKEN_NUMBER, TOKEN_ID, TOKEN_ASSIGN,
    TOKEN_PLUS, TOKEN_MINUS, TOKEN_MUL, TOKEN_DIV,
    TOKEN_SEMICOLON, TOKEN_EOF
} TokenType;

typedef enum {
    NODE_NUM, NODE_ID, NODE_ASSIGN,
    NODE_ADD, NODE_SUB, NODE_MUL, NODE_DIV
} NodeType;

typedef struct Token { TokenType type; char text[32]; int value; } Token;
typedef struct ASTNode { NodeType type; char name[32]; int value; struct ASTNode* left; struct ASTNode* right; } ASTNode;

Token tokens[MAX_TOKENS];
int token_count = 0;

typedef enum { OP_IMM, OP_LOAD, OP_STORE, OP_ADD, OP_SUB, OP_MUL, OP_DIV, OP_EOF } OpCode;

int bytecode[MAX_CODE];
int pc = 0;
int stack[100];
int sp = -1;
char var_names[MAX_VARS][32];
int var_values[MAX_VARS];
int var_count = 0;

int get_var_idx(const char* name) {
    for (int i = 0; i < var_count; i++)
        if (strcmp(var_names[i], name) == 0) return i;
    return -1;
}

int add_var(const char* name) {
    strcpy(var_names[var_count], name);
    return var_count++;
}

void emit(OpCode op, int arg) {
    bytecode[pc++] = op;
    bytecode[pc++] = arg;
}

void push(int v) { stack[++sp] = v; }
int pop() { return stack[sp--]; }

void vm_run() {
    pc = 0;
    sp = -1;
    printf("\nVM Execution:\n");
    while (pc < MAX_CODE) {
        OpCode op = bytecode[pc++];
        int arg = bytecode[pc++];
        if (op == OP_IMM) {
            push(arg);
            printf("  IMM %d -> stack[%d]\n", arg, sp);
        } else if (op == OP_LOAD) {
            push(var_values[arg]);
            printf("  LOAD %s -> stack[%d] = %d\n", var_names[arg], sp, var_values[arg]);
        } else if (op == OP_STORE) {
            int v = pop();
            var_values[arg] = v;
            printf("  STORE %s = %d\n", var_names[arg], v);
        } else if (op == OP_ADD) {
            int b = pop(), a = pop();
            push(a + b);
            printf("  ADD -> stack[%d] = %d\n", sp, stack[sp]);
        } else if (op == OP_SUB) {
            int b = pop(), a = pop();
            push(a - b);
        } else if (op == OP_MUL) {
            int b = pop(), a = pop();
            push(a * b);
        } else if (op == OP_DIV) {
            int b = pop(), a = pop();
            push(a / b);
        } else if (op == OP_EOF) {
            break;
        }
    }
    printf("\nVariables:\n");
    for (int i = 0; i < var_count; i++)
        printf("  %s = %d\n", var_names[i], var_values[i]);
    if (sp >= 0)
        printf("Stack top: %d\n", stack[sp]);
}

int tk_pos = 0;

void tokenize(const char* s) {
    token_count = 0;
    while (*s) {
        while (isspace(*s)) s++;
        if (!*s) break;
        if (isdigit(*s)) {
            int v = 0;
            while (isdigit(*s)) v = v * 10 + (*s++ - '0');
            tokens[token_count].type = TOKEN_NUMBER;
            tokens[token_count++].value = v;
        } else if (isalpha(*s) || *s == '_') {
            int i = 0;
            while (isalnum(*s) || *s == '_') tokens[token_count].text[i++] = *s++;
            tokens[token_count].text[i] = '\0';
            tokens[token_count++].type = TOKEN_ID;
        } else if (*s == '=') {
            tokens[token_count++].type = TOKEN_ASSIGN; s++;
        } else if (*s == '+') { tokens[token_count++].type = TOKEN_PLUS; s++; }
        else if (*s == '-') { tokens[token_count++].type = TOKEN_MINUS; s++; }
        else if (*s == '*') { tokens[token_count++].type = TOKEN_MUL; s++; }
        else if (*s == '/') { tokens[token_count++].type = TOKEN_DIV; s++; }
        else if (*s == ';') { tokens[token_count++].type = TOKEN_SEMICOLON; s++; }
    }
    tokens[token_count++].type = TOKEN_EOF;
    tk_pos = 0;
}

Token get_next() {
    if (tk_pos >= MAX_TOKENS) return tokens[MAX_TOKENS - 1];
    return tokens[tk_pos++];
}

void put_back() { if (tk_pos > 0) tk_pos--; }

ASTNode* parse_expr();

ASTNode* parse_factor() {
    if (tk_pos >= token_count) return NULL;
    Token t = get_next();
    if (t.type == TOKEN_NUMBER) {
        ASTNode* n = malloc(sizeof(ASTNode));
        n->type = NODE_NUM; n->value = t.value; n->left = n->right = NULL; return n;
    } else if (t.type == TOKEN_ID) {
        ASTNode* n = malloc(sizeof(ASTNode));
        n->type = NODE_ID; strcpy(n->name, t.text); n->left = n->right = NULL; return n;
    }
    put_back();
    return NULL;
}

ASTNode* parse_term() {
    ASTNode* left = parse_factor();
    if (!left) return NULL;
    while (tk_pos < token_count && (tokens[tk_pos].type == TOKEN_MUL || tokens[tk_pos].type == TOKEN_DIV)) {
        Token t = get_next();
        ASTNode* right = parse_factor();
        ASTNode* parent = malloc(sizeof(ASTNode));
        parent->type = (t.type == TOKEN_MUL) ? NODE_MUL : NODE_DIV;
        parent->left = left; parent->right = right; left = parent;
    }
    return left;
}

ASTNode* parse_expr() {
    ASTNode* left = parse_term();
    if (!left) return NULL;
    while (tk_pos < token_count && (tokens[tk_pos].type == TOKEN_PLUS || tokens[tk_pos].type == TOKEN_MINUS)) {
        Token t = get_next();
        ASTNode* right = parse_term();
        ASTNode* parent = malloc(sizeof(ASTNode));
        parent->type = (t.type == TOKEN_PLUS) ? NODE_ADD : NODE_SUB;
        parent->left = left; parent->right = right; left = parent;
    }
    return left;
}

void compile(ASTNode* n) {
    if (!n) return;
    if (n->type == NODE_NUM) {
        emit(OP_IMM, n->value);
    } else if (n->type == NODE_ID) {
        int idx = get_var_idx(n->name);
        if (idx < 0) idx = add_var(n->name);
        emit(OP_LOAD, idx);
    } else if (n->type == NODE_ASSIGN) {
        compile(n->left);
        int idx = get_var_idx(n->name);
        if (idx < 0) idx = add_var(n->name);
        emit(OP_STORE, idx);
    } else {
        compile(n->left);
        compile(n->right);
        if (n->type == NODE_ADD) emit(OP_ADD, 0);
        else if (n->type == NODE_SUB) emit(OP_SUB, 0);
        else if (n->type == NODE_MUL) emit(OP_MUL, 0);
        else if (n->type == NODE_DIV) emit(OP_DIV, 0);
    }
}

int main() {
    const char* input = "x = 5; y = 3; x + y";
    printf("Compiling: %s\n", input);

    tokenize(input);

    while (tk_pos < token_count && tokens[tk_pos].type != TOKEN_EOF) {
        if (tokens[tk_pos].type == TOKEN_ID) {
            char name[32];
            strcpy(name, tokens[tk_pos].text);
            tk_pos++;
            if (tk_pos < token_count && tokens[tk_pos].type == TOKEN_ASSIGN) {
                tk_pos++;
                ASTNode* expr = parse_expr();
                compile(expr);
                int idx = get_var_idx(name);
                if (idx < 0) idx = add_var(name);
                emit(OP_STORE, idx);
            }
        } else if (tokens[tk_pos].type == TOKEN_SEMICOLON) {
            tk_pos++;
        } else {
            ASTNode* expr = parse_expr();
            compile(expr);
            break;
        }
    }

    emit(OP_EOF, 0);

    printf("\nBytecode: ");
    for (int i = 0; i < pc; i += 2)
        printf("%d %d ", bytecode[i], bytecode[i + 1]);
    printf("\n");

    vm_run();
    return 0;
}