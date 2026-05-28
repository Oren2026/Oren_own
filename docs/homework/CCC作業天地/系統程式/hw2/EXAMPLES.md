# CalcLang 範例程式

## 簡單算術（Level 2）

### 基本運算
```calc
x = 1 + 2 * 3;
print(x);
```
**輸出**: `7`

### 變數宣告
```calc
let a: int = 10;
let b: int = 3;
print(a / b);
```
**輸出**: `3`

---

## 變數與賦值（Level 3）

### 链式赋值
```calc
x = 5;
y = 3;
z = x + y;
print(z);
```
**輸出**: `8`

### 變數更新
```calc
x = 10;
x = x - 3;
print(x);
```
**輸出**: `7`

---

## while 迴圈（Level 4）

### 計數器
```calc
counter = 0;
while (counter < 5) {
    counter = counter + 1;
}
print(counter);
```
**輸出**: `5`

### 累加
```calc
sum = 0;
i = 1;
while (i <= 10) {
    sum = sum + i;
    i = i + 1;
}
print(sum);
```
**輸出**: `55`

---

## 條件判斷（Level 4）

### if/else
```calc
x = 10;
if (x > 5) {
    y = 1;
} else {
    y = 2;
}
print(y);
```
**輸出**: `1`

### 嵌套條件
```calc
x = 7;
if (x > 10) {
    print(1);
} else {
    if (x > 5) {
        print(2);
    } else {
        print(3);
    }
}
```
**輸出**: `2`

---

## 比較運算

### 等於判斷
```calc
x = 5;
y = 5;
if (x == y) {
    result = 1;
} else {
    result = 0;
}
print(result);
```
**輸出**: `1`

### 不等於
```calc
x = 5;
y = 3;
if (x != y) {
    print(1);
} else {
    print(0);
}
```
**輸出**: `1`

---

## 綜合範例：費波那契

```calc
a = 0;
b = 1;
i = 0;
while (i < 10) {
    print(a);
    next = a + b;
    a = b;
    b = next;
    i = i + 1;
}
```
**輸出**: `0 1 1 2 3 5 8 13 21 34`

---

## 函數範例（Level 5）

### 簡單函數
```calc
fn add(a, b) {
    return a + b;
}
print(add(2, 3));
```
**輸出**: `5`

### 遞迴
```calc
fn factorial(n) {
    if (n <= 1) {
        return 1;
    } else {
        return n * factorial(n - 1);
    }
}
print(factorial(5));
```
**輸出**: `120`

---

## 測試案例對照表

| 範例 | 預期輸出 |
|------|---------|
| `1 + 2 * 3` | `7` |
| `x = 5; y = 3; x + y;` | `8` |
| `x = 0; while(x < 3) { x = x + 1; } print(x);` | `3` |
| `if (1 < 2) { print(10); } else { print(20); }` | `10` |