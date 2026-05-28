# Level 4: AST - 抽象語法樹

```c
#include <stdio.h>
#include <stdlib.h>

typedef enum {
    NODE_NUMBER,
    NODE_ADD,
    NODE_SUB,
    NODE_MUL,
    NODE_DIV
} NodeType;

typedef struct ASTNode {
    NodeType type;
    int value;
    struct ASTNode* left;
    struct ASTNode* right;
} ASTNode;

ASTNode* make_number(int value) {
    ASTNode* node = malloc(sizeof(ASTNode));
    node->type = NODE_NUMBER;
    node->value = value;
    node->left = node->right = NULL;
    return node;
}

ASTNode* make_binop(NodeType type, ASTNode* left, ASTNode* right) {
    ASTNode* node = malloc(sizeof(ASTNode));
    node->type = type;
    node->left = left;
    node->right = right;
    return node;
}

int main() {
    // Build: 1 + (2 * 3)
    ASTNode* tree = make_binop(NODE_ADD,
        make_number(1),
        make_binop(NODE_MUL,
            make_number(2),
            make_number(3)
        )
    );

    printf("Tree built: 1 + 2 * 3\n");
    printf("Evaluation in Level 5\n");

    return 0;
}
```

```bash
gcc level4_ast.c -o ast
./ast
```