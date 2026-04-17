window.QUIZ_QUESTIONS = [
  {
    q: 'JavaScript 中，宣告變數 `let x = 10;`，以下哪個方式可以改變 x 的值？',
    opts: ['x = 20;', 'const x = 20;', 'let x = 20;', 'var x = 20;'],
    ans: 0
  },
  {
    q: '哪個方法可以把整數轉成字串？',
    opts: ['String(123)', 'toNumber("123")', 'parseInt(123)', 'array(123)'],
    ans: 0
  },
  {
    q: '`array.push(item)` 的用途是？',
    opts: ['刪除最後一個元素', '在陣列末尾加入新元素', '在陣列開頭加入新元素', '排序陣列'],
    ans: 1
  },
  {
    q: '`document.getElementById("id")` 回傳的型別是？',
    opts: ['字串', '數字', 'DOM 元素', '陣列'],
    ans: 2
  },
  {
    q: '以下哪個不是 JavaScript 的資料型態？',
    opts: ['string', 'number', 'boolean', 'character'],
    ans: 3
  },
  {
    q: '`===` 與 `==` 的差別在於？',
    opts: ['沒有差別', '`===` 會比較型別', '`==` 會比較型別', '`===` 只用在數字'],
    ans: 1
  },
  {
    q: '如何在函式內取用全域變數 `count`？',
    opts: ['this.count', 'global.count', 'window.count', '直接使用 count'],
    ans: 3
  },
  {
    q: '`array.length` 代表什麼？',
    opts: ['最後一個索引', '第一個索引', '陣列的元素數量', '陣列的容量'],
    ans: 2
  },
  {
    q: '哪個方法可以移除陣列最後一個元素？',
    opts: ['array.shift()', 'array.pop()', 'array.push()', 'array.slice()'],
    ans: 1
  },
  {
    q: '`console.log(typeof [])` 會輸出什麼？',
    opts: ['"array"', '"object"', '"list"', '"undefined"'],
    ans: 1
  },
  {
    q: '以下哪個敘述是正確的？',
    opts: ['let 可以重複宣告', 'const 的值可以修改', 'var 有函式作用域', 'const 不可以賦值'],
    ans: 2
  },
  {
    q: '`Math.floor(4.7)` 的結果是？',
    opts: ['4', '5', '4.7', '3'],
    ans: 0
  },
  {
    q: '哪個事件代表元素被點擊？',
    opts: ['onchange', 'onclick', 'onsubmit', 'onload'],
    ans: 1
  },
  {
    q: '"Hello".toUpperCase() 的回傳值是？',
    opts: ['"hello"', '"HELLO"', '"Hello"', 'Error'],
    ans: 1
  },
  {
    q: '`array.filter(fn)` 的用途是？',
    opts: ['對每個元素執行運算', '依照條件挑出元素組成新陣列', '搜尋元素位置', '刪除指定元素'],
    ans: 1
  },
  {
    q: '`let obj = {name: "Tom"}; obj.name` 的結果是？',
    opts: ['undefined', '"Tom"', 'name', 'Error'],
    ans: 1
  },
  {
    q: '哪個不是有效的迴圈寫法？',
    opts: ['for (let i=0; i<5; i++)', 'while (true)', 'loop (i from 0 to 5)', 'forEach'],
    ans: 2
  },
  {
    q: '`JSON.parse()` 的用途是？',
    opts: ['把物件轉成 JSON 字串', '把 JSON 字串轉成物件', '刪除 JSON 檔案', '驗證 JSON 語法'],
    ans: 1
  },
  {
    q: '在 setTimeout，延遲時間的單位是？',
    opts: ['秒', '毫秒', '微秒', '分鐘'],
    ans: 1
  },
  {
    q: '`NaN` 代表什麼意思？',
    opts: ['Null', 'Not a Number（不是數字）', '沒有賦值', '陣列為空'],
    ans: 1
  }
];
