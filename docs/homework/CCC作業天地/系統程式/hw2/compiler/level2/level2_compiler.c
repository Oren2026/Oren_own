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

typedef enum { OP_IMM, OP_ADD, OP_SUB, OP_MUL, OP_DIV, OP_EOF } OpCode;

int bytecode[100];
int pc = 0;
int stack[100];
int sp = -1;

void emit(OpCode op, int arg) {
    bytecode[pc++] = op;
    if (arg >= 0) bytecode[pc++] = arg;
}

void push(int v) { stack[++sp] = v; }
int pop() { return stack[sp--]; }

void vm_run() {
    pc = 0;
    sp = -1;
    printf("VM Execution:\n");
    while (pc >= 0 && pc < 100) {
        OpCode op = bytecode[pc++];
        if (op == OP_IMM) {
            int v = bytecode[pc++];
            push(v);
            printf("  IMM %d -> stack[%d]\n", v, sp);
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
    printf("Result: %d\n", pop());
}

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

void compile_expr(ASTNode* n) {
    if (n->type == NODE_NUM) {
        emit(OP_IMM, n->value);
    } else {
        compile_expr(n->left);
        compile_expr(n->right);
        if (n->type == NODE_ADD) emit(OP_ADD, -1);
        else if (n->type == NODE_SUB) emit(OP_SUB, -1);
        else if (n->type == NODE_MUL) emit(OP_MUL, -1);
        else if (n->type == NODE_DIV) emit(OP_DIV, -1);
    }
}

int main() {
    const char* input = "1 + 2 * 3";
    printf("Compiling: %s\n", input);

    tokenize(input);
    ASTNode* tree = parse_expr();

    printf("Generating bytecode...\n");
    compile_expr(tree);
    emit(OP_EOF, -1);

    printf("\nBytecode: ");
    for (int i = 0; i < pc; i++) {
        printf("%d ", bytecode[i]);
    }
    printf("\n");

    vm_run();
    return 0;
}