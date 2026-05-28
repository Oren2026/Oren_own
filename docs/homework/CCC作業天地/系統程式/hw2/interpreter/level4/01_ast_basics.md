# Level 4: AST - 把 Token 組裝成樹

## 核心問題：如何處理優先順序？

```
"1 + 2 * 3" 應該怎麼算？
數學告訴我們: 先乘法後加法，所以是 1 + (2*3) = 7

但我們的 tokenizer 只輸出:
    NUMBER(1), PLUS, NUMBER(2), MUL, NUMBER(3)

要讓電腦知道 "2 * 3" 要先算，需要把變成樹狀結構：

        +
       / \
      1   *
         / \
        2   3
```

## 什麼是 AST（抽象語法樹）？

```
AST = Abstract Syntax Tree
     抽象 = 我們只關心語法結構，不關心空白、分號等細節
     語法樹 = 把程式變成樹狀結構
```

## AST 實作

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef enum {
    NODE_NUMBER,
    NODE_ADD,
    NODE_SUB,
    NODE_MUL,
    NODE_DIV
} NodeType;

typedef struct ASTNode {
    NodeType type;
    int value;  // for NUMBER
    struct ASTNode* left;   // for binary ops
    struct ASTNode* right;  // for binary ops
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

// 手動建一棵樹: 1 + (2 * 3)
int main() {
    //      +
    //     / \
    //    1   *
    //       / \
    //      2   3
    ASTNode* tree = make_binop(NODE_ADD,
        make_number(1),
        make_binop(NODE_MUL,
            make_number(2),
            make_number(3)
        )
    );

    printf("Tree built: 1 + 2 * 3\n");
    printf("Evaluation will be done in Level 5\n");

    return 0;
}
```

## Level 4 作業

1. 執行上面的程式
2. 畫出 "10 - 2 * 3" 的 AST 樹狀圖
3. 挑戰：畫出 "(10 - 2) * 3" 的 AST