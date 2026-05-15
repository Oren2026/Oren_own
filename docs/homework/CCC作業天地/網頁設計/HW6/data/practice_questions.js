const PRACTICE_QUESTIONS = [
  {
    id: 1,
    title: "1. Callback 基礎實作",
    desc: "建立一個名為 mathTool 的函數，接受 num1、num2 以及一個 action（回呼函數）。呼叫 mathTool 時，傳入不同匿名函數來達成「相加」與「相減」。",
    code: `function mathTool(num1, num2, action) {
  return action(num1, num2);
}

// 試試看：
mathTool(__A__, __B__, (a, b) => a + b);  // 相加結果
mathTool(__A__, __B__, (a, b) => a - b);  // 相減結果`,
    variables: [
      { key: "A", default: 10, label: "第一個數字 (A)" },
      { key: "B", default: 5,  label: "第二個數字 (B)" }
    ],
    run(vars) {
      const result1 = vars.A + vars.B;
      const result2 = vars.A - vars.B;
      return `相加：${result1}\n相減：${result2}`;
    }
  },
  {
    id: 2,
    title: "2. 匿名函數與 IIFE",
    desc: "立即執行函式(IIFE)可以在建立後立即執行，常用於建立封閉作用域。count 是函式內的區域變數，外部無法存取。",
    code: `(function() {
  const count = __VAL__;
  // 立即執行並印出結果
  return "Count is: " + count;
})();`,
    variables: [
      { key: "VAL", default: 100, label: "count 的值" }
    ],
    run(vars) {
      return "Count is: " + vars.VAL;
    }
  },
  {
    id: 3,
    title: "3. 箭頭函數與陣列轉換",
    desc: "使用 map 搭配箭頭函數，將價格陣列每個元素打 8 折，產生新陣列。",
    code: `const prices = [100, 200, 300, 400];

const discounted = prices.map(price => price * __RATE__);

discounted;  // 結果`,
    variables: [
      { key: "RATE", default: 0.8, label: "折扣率（例如 0.8 = 8折）" }
    ],
    run(vars) {
      const prices = [100, 200, 300, 400];
      const discounted = prices.map(price => price * vars.RATE);
      return JSON.stringify(discounted);
    }
  },
  {
    id: 4,
    title: "4. 陣列的破壞性修改",
    desc: "JavaScript 傳址特性：直接修改傳入的陣列會影響原始資料。let myData = [1, 2, 3]，執行 cleanData(myData) 後，myData 會被改變。",
    code: `function cleanData(arr) {
  arr.pop();        // 移除最後一個
  arr.unshift("Start"); // 加入開頭
  return arr;
}

let myData = [__A__, __B__, __C__];
cleanData(myData);
myData;  // 結果是？`,
    variables: [
      { key: "A", default: 1, label: "第一個元素" },
      { key: "B", default: 2, label: "第二個元素" },
      { key: "C", default: 3, label: "第三個元素" }
    ],
    run(vars) {
      const arr = [vars.A, vars.B, vars.C];
      arr.pop();
      arr.unshift("Start");
      return JSON.stringify(arr);
    }
  },
  {
    id: 5,
    title: "5. 函式回傳函式 (Higher-Order Function)",
    desc: "multiplier(factor) 回傳一個新函式，這個新函式會把傳入的數字乘上 factor。const double = multiplier(2) 等同於 const double = n => n * 2。",
    code: `function multiplier(factor) {
  return n => n * factor;
}

const double  = multiplier(__NUM1__);
const triple  = multiplier(__NUM2__);

double(10);   // 結果
triple(10);   // 結果`,
    variables: [
      { key: "NUM1", default: 2, label: "double 的倍數" },
      { key: "NUM2", default: 3, label: "triple 的倍數" }
    ],
    run(vars) {
      const multiplier = factor => n => n * factor;
      const double = multiplier(vars.NUM1);
      const triple = multiplier(vars.NUM2);
      return `double(10) = ${double(10)}\ntriple(10) = ${triple(10)}`;
    }
  },
  {
    id: 6,
    title: "6. 手寫 myFilter",
    desc: "myFilter 遍歷每個元素，callback 回傳 true 才保留。手寫類似 Array.prototype.filter 的功能。",
    code: `function myFilter(arr, callback) {
  const result = [];
  for (let item of arr) {
    if (callback(item)) result.push(item);
  }
  return result;
}

// 篩選大於 __THRESHOLD__ 的數字
myFilter([1, 5, 8, 12], n => n > __THRESHOLD__);`,
    variables: [
      { key: "THRESHOLD", default: 7, label: "門檻值（threshold）" }
    ],
    run(vars) {
      function myFilter(arr, callback) {
        const result = [];
        for (let item of arr) {
          if (callback(item)) result.push(item);
        }
        return result;
      }
      const r = myFilter([1, 5, 8, 12], n => n > vars.THRESHOLD);
      return JSON.stringify(r);
    }
  },
  {
    id: 7,
    title: "7. 箭頭函數處理物件陣列",
    desc: "結合 filter 與箭頭函數，從物件陣列中篩出符合條件的年齡。filter 的箭頭函數可以對每個物件屬性做條件判斷。",
    code: `const users = [
  { name: "Alice", age: __AGE1__ },
  { name: "Bob",   age: __AGE2__ },
  { name: "Carol", age: __AGE3__ }
];

users.filter(u => u.age >= __THRESHOLD__);`,
    variables: [
      { key: "AGE1",     default: 25, label: "Alice 年齡" },
      { key: "AGE2",     default: 17, label: "Bob 年齡" },
      { key: "AGE3",     default: 30, label: "Carol 年齡" },
      { key: "THRESHOLD", default: 18, label: "年齡門檻" }
    ],
    run(vars) {
      const users = [
        { name: "Alice", age: vars.AGE1 },
        { name: "Bob",   age: vars.AGE2 },
        { name: "Carol", age: vars.AGE3 }
      ];
      const r = users.filter(u => u.age >= vars.THRESHOLD);
      return JSON.stringify(r);
    }
  },
  {
    id: 8,
    title: "8. 傳址 vs 重新賦值",
    desc: "函式內 push 會修改原陣列（傳址），但 b = [...] 只是讓參數指向新陣列，不影響外部。",
    code: `let listA = [__A__, __B__];
let listB = [__C__, __D__];

function process(a, b) {
  a.push(99);   // 修改原陣列
  b = [100];    // 重新賦值，不影響外部
}

process(listA, listB);

listA;  // 是什麼？
listB;  // 是什麼？`,
    variables: [
      { key: "A", default: 1, label: "listA[0]" },
      { key: "B", default: 2, label: "listA[1]" },
      { key: "C", default: 3, label: "listB[0]" },
      { key: "D", default: 4, label: "listB[1]" }
    ],
    run(vars) {
      let listA = [vars.A, vars.B];
      let listB = [vars.C, vars.D];
      function process(a, b) {
        a.push(99);
        b = [100];
      }
      process(listA, listB);
      return `listA = ${JSON.stringify(listA)}\nlistB = ${JSON.stringify(listB)}`;
    }
  },
  {
    id: 9,
    title: "9. setTimeout 延遲執行",
    desc: "setTimeout 延遲執行傳入的回呼函式，延遲時間單位為毫秒。按下執行後等 2 秒才會看到輸出。",
    code: `setTimeout(() => {
  const arr = ["Task", "Completed"];
  return arr.join(" ");
}, __MS__);  // 毫秒

// 等待中...`,
    variables: [
      { key: "MS", default: 2000, label: "延遲時間（毫秒）" }
    ],
    run(vars) {
      return `(等待 ${vars.MS}ms 後执行...)\n[2秒後] Task Completed`;
    }
  },
  {
    id: 10,
    title: "10. 綜合應用：計算總價",
    desc: "calculateTotal 先加總 cart 金額，再傳入 discountFunc 處理折扣。練習組合兩種函式操作。",
    code: `function calculateTotal(cart, discountFunc) {
  const sum = cart.reduce((acc, p) => acc + p, 0);
  return discountFunc(sum);
}

const cart = [__P1__, __P2__, __P3__];
calculateTotal(cart, total => total - __DISCOUNT__);`,
    variables: [
      { key: "P1",      default: 100, label: "商品1價格" },
      { key: "P2",      default: 200, label: "商品2價格" },
      { key: "P3",      default: 300, label: "商品3價格" },
      { key: "DISCOUNT", default: 50, label: "折扣金額" }
    ],
    run(vars) {
      function calculateTotal(cart, discountFunc) {
        const sum = cart.reduce((acc, p) => acc + p, 0);
        return discountFunc(sum);
      }
      const cart = [vars.P1, vars.P2, vars.P3];
      const r = calculateTotal(cart, total => total - vars.DISCOUNT);
      return `總價 = ${vars.P1 + vars.P2 + vars.P3}\n折抵後 = ${r}`;
    }
  }
];
