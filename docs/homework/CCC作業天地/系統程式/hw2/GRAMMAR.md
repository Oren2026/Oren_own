# CalcLang BNF 語法規格

## 完整語法（BNF）

```bnf
<program>        ::= <statement_list>

<statement_list> ::= <statement> | <statement_list> <statement>

<statement>      ::= <declaration>
                   | <assignment>
                   | <while_loop>
                   | <if_stmt>
                   | <print_stmt>
                   | <func_def>
                   | <return_stmt>

<declaration>    ::= "let" <identifier> ":" "int" "=" <expr> ";"

<assignment>     ::= <identifier> "=" <expr> ";"

<while_loop>    ::= "while" "(" <expr> ")" "{" <statement_list> "}"

<if_stmt>       ::= "if" "(" <expr> ")" "{" <statement_list> "}"
                   "else" "{" <statement_list> "}"

<print_stmt>    ::= "print" "(" <expr> ")" ";"

<return_stmt>   ::= "return" <expr> ";"

<func_def>      ::= "fn" <identifier> "(" <params> ")" "{" <statement_list> "}"

<params>        ::= ε | <identifier> ("," <identifier>)*

<expr>          ::= <or_expr>

<or_expr>       ::= <and_expr> | <or_expr> "||" <and_expr>

<and_expr>      ::= <rel_expr> | <and_expr> "&&" <rel_expr>

<rel_expr>      ::= <add_expr>
                   | <rel_expr> ("<" | ">" | "<=" | ">=" | "==" | "!=") <add_expr>

<add_expr>      ::= <mul_expr>
                   | <add_expr> ("+" | "-") <mul_expr>

<mul_expr>      ::= <primary>
                   | <mul_expr> ("*" | "/" | "%") <primary>

<primary>       ::= <number>
                   | <identifier>
                   | "(" <expr> ")"
                   | <func_call>

<func_call>     ::= <identifier> "(" <args> ")"

<args>          ::= ε | <expr> ("," <expr>)*

<identifier>    ::= [a-zA-Z_][a-zA-Z0-9_]*

<number>        ::= [0-9]+
```

## 簡化語法（用於 Level 1-4）

```bnf
<program>        ::= <statement_list>

<statement_list> ::= <statement> | <statement_list> <statement>

<statement>      ::= <assignment> | <while_loop>

<assignment>     ::= <identifier> "=" <expr> ";"

<while_loop>     ::= "while" "(" <expr> ")" "{" <statement_list> "}"

<expr>           ::= <add_expr>

<add_expr>       ::= <mul_expr> | <add_expr> ("+" | "-") <mul_expr>

<mul_expr>       ::= <primary> | <mul_expr> ("*" | "/") <primary>

<primary>        ::= <number> | <identifier> | "(" <expr> ")"

<identifier>     ::= [a-zA-Z_][a-zA-Z0-9_]*

<number>         ::= [0-9]+
```

## 詞法規則（Lexer）

### Token 類型

| Token | 正規表達式 | 說明 |
|-------|-----------|------|
| `NUMBER` | `[0-9]+` | 整數常數 |
| `ID` | `[a-zA-Z_][a-zA-Z0-9_]*` | 識別子（關鍵字優先） |
| `ASSIGN` | `=` | 賦值 |
| `EQ` | `==` | 等於比較 |
| `NE` | `!=` | 不等於比較 |
| `LT` | `<` | 小於 |
| `GT` | `>` | 大於 |
| `LE` | `<=` | 小於等於 |
| `GE` | `>=` | 大於等於 |
| `PLUS` | `+` | 加 |
| `MINUS` | `-` | 減 |
| `MUL` | `*` | 乘 |
| `DIV` | `/` | 除 |
| `LPAREN` | `(` | 左括號 |
| `RPAREN` | `)` | 右括號 |
| `LBRACE` | `{` | 左大括號 |
| `RBRACE` | `}` | 右大括號 |
| `SEMICOLON` | `;` | 分號 |
| `KW_LET` | `let` | 變數宣告關鍵字 |
| `KW_INT` | `int` | 型別關鍵字 |
| `KW_WHILE` | `while` | 迴圈關鍵字 |
| `KW_IF` | `if` | 條件關鍵字 |
| `KW_ELSE` | `else` | 否則關鍵字 |
| `KW_PRINT` | `print` | 輸出關鍵字 |
| `KW_FN` | `fn` | 函數關鍵字 |
| `KW_RETURN` | `return` | 返回關鍵字 |

### 關鍵字表

```
let, int, while, if, else, print, fn, return
```

識別子先當作 ID 讀取，之後查表確認是否為關鍵字。

## 優先序與結合性

| 運算子 | 優先序 | 結合性 |
|--------|--------|--------|
| `*` `/` `%` | 最高 | 左結合 |
| `+` `-` | 次高 | 左結合 |
| `<` `>` `<=` `>=` | 中 | 左結合 |
| `==` `!=` | 次低 | 左結合 |
| `=` | 最低 | 右結合 |

## 語法範例

### 简单赋值
```
x = 5;
y = 3;
x + y;
```

### while 迴圈
```
x = 0;
while (x < 3) {
    x = x + 1;
}
```

### if/else
```
x = 10;
if (x > 5) {
    y = 1;
} else {
    y = 2;
}
```

### 函數（Level 5）
```
fn add(a, b) {
    return a + b;
}
print(add(2, 3));
```

## 語法圖（Railroad Diagram）摘要

```
program      → statement*
statement    → assignment | while | if | print | fn
assignment   → ID "=" expr ";"
while        → "while" "(" expr ")" "{" statement* "}"
expr         → term (("+"|"-") term)*
term         → factor (("*"|"/") factor)*
factor       → NUMBER | ID | "(" expr ")"
```