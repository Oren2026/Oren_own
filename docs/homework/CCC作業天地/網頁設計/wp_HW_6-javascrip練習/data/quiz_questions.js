window.QUIZ_QUESTIONS = [
  // ── 填空 / 觀念 ──
  {
    q: "請利用箭頭函數作為 filter 的參數，篩選出長度大於 3 的字串：\n\nconst words = [\"apple\", \"dog\", \"cat\", \"banana\"];\nconst longWords = words.filter(________);",
    opts: ["length > 3", "w => { w.length > 3 }", "w => w > 3", "w => w.length > 3"],
    ans: 3
  },
  {
    q: "請利用 map 搭配箭頭函數，將每個價格打 8 折：\n\nconst prices = [100, 200, 300];\nconst discounted = prices.map(price => ________);",
    opts: ["price * 0.8", "price * 8", "price - 0.8", "price / 1.2"],
    ans: 0
  },
  {
    q: "請完成这个立即执行函数，在内部定义的 count 外部无法访问：\n\n(function() {\n  var count = 100;\n  ________(\"Count is: \" + count);\n})();",
    opts: ["console.log", "return", "alert", "document.write"],
    ans: 0
  },
  {
    q: "fill in the blank: multiplier(factor) 会回传一个新函数：\n\nfunction multiplier(factor) {\n  return n => n * ________;\n}",
    opts: ["factor", "n", "n * factor", "multiplier"],
    ans: 0
  },
  {
    q: "fill in the blank：手写类似 filter 的函数时，callback 返回 true 的元素才会被放入新数组：\n\nfunction myFilter(arr, callback) {\n  const result = [];\n  for (let item of arr) {\n    if (callback(item) ________) result.push(item);\n  }\n  return result;\n}",
    opts: ["=== true", "is true", "!== false", "passes"],
    ans: 0
  },
  {
    q: "fill in the blank — 試找出大於門檻 age 的使用者：\n\nconst adults = users.filter(u => u.age ________ 18);",
    opts: [">=", "=>", "==", "<="],
    ans: 0
  },

  // ── 行為預測 ──
  {
    q: "執行以下程式碼後，listA 與 listB 的內容分別是什麼？\n\nlet listA = [1, 2];\nlet listB = [3, 4];\nfunction process(a, b) {\n  a.push(99);\n  b = [100];\n}\nprocess(listA, listB);",
    opts: [
      "listA = [1,2,99], listB = [3,4]",
      "listA = [1,2], listB = [3,4,99]",
      "listA = [1,2,99], listB = [100]",
      "listA = [1,2], listB = [100]"
    ],
    ans: 0
  },
  {
    q: "執行下列程式碼後，myData 的內容是什麼？\n\nfunction cleanData(arr) {\n  arr.pop();\n  arr.unshift(\"Start\");\n  return arr;\n}\nlet myData = [1, 2, 3];\ncleanData(myData);",
    opts: [
      '[\"Start\", 1, 2]',
      '[1, 2, 3]',
      '[\"Start\", 1, 2, 3]',
      '[1, 2]'
    ],
    ans: 0
  },
  {
    q: "執行 `console.log(typeof [])` 的輸出結果是？",
    opts: ["object", "array", "undefined", "null"],
    ans: 0
  },
  {
    q: "執行以下程式碼，3 秒後控制台會印出什麼？\n\nsetTimeout(() => {\n  console.log([\"Task\", \"Completed\"].join(\" \"));\n}, 3000);",
    opts: ["Task Completed", "[\"Task\", \"Completed\"]", "Task,Completed", "undefined"],
    ans: 0
  },

  // ── 語法 / 語意判斷 ──
  {
    q: "以下哪個方式可以正確改變 let 宣告的變數值？",
    opts: ["x = 20;", "const x = 20;", "let x = 20;", "var x = 20;"],
    ans: 0
  },
  {
    q: "JavaScript 中，什麼類型的值會被 `==` 判斷為 true 但 `===` 判斷為 false？",
    opts: ["null 與 undefined", "數字與字串", "空陣列與空物件", "0 與 false"],
    ans: 0
  },
  {
    q: "以下哪個不是 JavaScript 的原始資料型態（Primitive Types）？",
    opts: ["character", "string", "number", "boolean"],
    ans: 0
  },
  {
    q: "`===` 與 `==` 最關鍵的差異是？",
    opts: ["=== 同時比較值與型別，== 只比較值", "== 用於數字，=== 用於字串", "兩者完全相同", "=== 用於物件，== 用於陣列"],
    ans: 0
  },
  {
    q: "若要保護一個陣列不被函式修改，應該使用哪个關鍵字宣告？",
    opts: ["const", "let", "var", "static"],
    ans: 0
  },
  {
    q: "Math.floor(4.7) 的執行結果是？",
    opts: ["4", "5", "4.7", "NaN"],
    ans: 0
  },
  {
    q: "哪個方法可以檢查一個值是否為 NaN？",
    opts: ["isNaN()", "typeof NaN", "NaN === NaN", "Number.isNaN()"],
    ans: 0
  },
  {
    q: "陣列的哪個方法會「破壞性」修改原陣列？",
    opts: ["pop() / push() / splice()", "map() / filter() / slice()", "concat() / join()", "find() / includes()"],
    ans: 0
  },
  {
    q: "一個 IIFE（立即執行函式）的目的是？",
    opts: ["建立封閉作用域，避免全域污染", "讓函式可以被重複呼叫", "提升程式執行速度", "定義一個可以 export 的函式"],
    ans: 0
  },
  {
    q: "`NaN` 的全名是「Not a Number」，它屬於以下哪個 JavaScript 型別？",
    opts: ["number", "string", "undefined", "object"],
    ans: 0
  }
];
