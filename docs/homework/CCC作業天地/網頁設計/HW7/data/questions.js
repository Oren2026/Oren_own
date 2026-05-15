window.BLOG_DATA = {
  posts: [
    { id: 1, title: "掌握 JavaScript 函式", content: "JavaScript 函式是現代開發的核心元件...", author: "Alice", tags: ["js", "函式"] },
    { id: 2, title: "Node.js 入門指南", content: "Node.js 讓你可以用 JS 寫後端...", author: "Bob", tags: ["node", "後端"] },
    { id: 3, title: "Express 路由設計", content: "RESTful API 的基礎在於良好的路由設計...", author: "Carol", tags: ["express", "api"] }
  ]
};

/* ─── 10 題資料 ─── */
window.QUESTIONS = [

  /* ── Q1: 物件屬性存取 ── */
  {
    id: 1,
    title: "1｜物件屬性存取 (Dot & Bracket Notation)",
    desc: "在 Express 路由中，我們從資料庫拿到的資料就是一個物件。post.title 與 post['title'] 都可以取得同一個屬性。",
    type: "blog-linked",     // 左改右更新
    vars: [
      { key: "id",      default: 1,     label: "文章 ID",          type: "number" },
      { key: "title",   default: "Hello World", label: "標題",   type: "text" },
      { key: "content", default: "這是文章內容，支援 Markdown 格式。", label: "內容", type: "text" }
    ],
    run(vars) {
      const post = { id: vars.id, title: vars.title, content: vars.content };
      const dotResult     = post.title;
      const bracketResult = post["title"];
      return { post, dotResult, bracketResult };
    }
  },

  /* ── Q2: 物件解構 ── */
  {
    id: 2,
    title: "2｜物件解構賦值 (Destructuring)",
    desc: "Express 的 app.post('/posts') 裡常見 `const { title, content } = req.body;`。解構讓你用一行取多個屬性。",
    type: "blog-linked",
    vars: [
      { key: "req_title",   default: "JS教學", label: "req.body.title",  type: "text" },
      { key: "req_content", default: "內容在此", label: "req.body.content", type: "text" },
      { key: "req_author",  default: "Gemini",  label: "req.body.author",  type: "text" }
    ],
    run(vars) {
      const req = { body: { title: vars.req_title, content: vars.req_content, author: vars.req_author } };
      const { title, content } = req.body;
      return {
        reqBody: req.body,
        destructured: { title, content }
      };
    }
  },

  /* ── Q3: forEach 與樣板字串 ── */
  {
    id: 3,
    title: "3｜陣列遍歷與 HTML 拼接 (forEach & Template Literals)",
    desc: "部落格首頁的 posts.forEach 迴圈就是這樣把每一筆資料拼成 HTML 字串，送回瀏覽器渲染列表。",
    type: "blog-linked",
    vars: [
      { key: "t1", default: "JavaScript 函式", label: "文章1標題", type: "text" },
      { key: "t2", default: "Node.js 入門",     label: "文章2標題", type: "text" },
      { key: "t3", default: "Express 路由設計", label: "文章3標題", type: "text" }
    ],
    run(vars) {
      const posts = [
        { id: 1, title: vars.t1 },
        { id: 2, title: vars.t2 },
        { id: 3, title: vars.t3 }
      ];
      let html = "";
      posts.forEach(post => {
        html += `<div class="post-item">${post.title}</div>`;
      });
      return { posts, html };
    }
  },

  /* ── Q4: URL 參數 ── */
  {
    id: 4,
    title: "4｜URL 參數與字典 (req.params)",
    desc: "`app.get('/posts/:id')` 的 :id 就是 URL 參數。req.params 是一個字典（物件），用來動態抓取 URL 中的值。",
    type: "blog-linked",
    vars: [
      { key: "id", default: 2, label: "URL 參數 id", type: "number" }
    ],
    run(vars) {
      const params = {};
      params["id"] = vars.id;          // 動態新增鍵
      const matchingPost = BLOG_DATA.posts.find(p => p.id === Number(params.id)) || null;
      return { params, matchingPost };
    }
  },

  /* ── Q5: Callback 概念 ── */
  {
    id: 5,
    title: "5｜錯誤優先回呼 (Error-First Callback)",
    desc: "Node.js 慣例：callback 第一個參數是錯誤（沒錯就傳 null），第二個參數才是資料。這讓錯誤處理可以統一在函式起點處理。",
    type: "callback",
    vars: [
      { key: "id", default: 101, label: "fetchData 的 id 參數", type: "number" }
    ],
    run(vars) {
      function fetchData(id, callback) {
        const fakeData = { id: id, status: "success" };
        callback(null, fakeData);
      }
      let result = null;
      fetchData(vars.id, (err, data) => {
        result = err ? `錯誤：${err}` : `成功取得資料：${JSON.stringify(data)}`;
      });
      return { pattern: "callback(err, data)", result };
    }
  },

  /* ── Q6: JSON 處理 ── */
  {
    id: 6,
    title: "6｜JSON 解析 (JSON.parse)",
    desc: "`express.json()` 把前端送來的 JSON body 轉成 JS 物件。JSON.parse 就是把 JSON 字串「解讀」成可用物件的步驟。",
    type: "blog-linked",
    vars: [
      { key: "tag1", default: "js",   label: "tags[0]", type: "text" },
      { key: "tag2", default: "node", label: "tags[1]", type: "text" },
      { key: "tag3", default: "api",  label: "tags[2]", type: "text" }
    ],
    run(vars) {
      const tags = [vars.tag1, vars.tag2, vars.tag3];
      const obj = { title: "Post Title", tags };
      const jsonStr = JSON.stringify(obj);
      const parsed = JSON.parse(jsonStr);
      return { jsonStr, parsed, tag2: parsed.tags[1] };
    }
  },

  /* ── Q7: 模擬資料庫查詢 ── */
  {
    id: 7,
    title: "7｜模擬 db.get 查詢 (fakeGet)",
    desc: "真實的 `db.get(sql, params, callback)` 會去資料庫查並把結果傳入 callback。fakeGet 模擬這個流程讓你練習。",
    type: "callback",
    vars: [
      { key: "sql_id", default: 1, label: "SQL WHERE id = ?", type: "number" }
    ],
    run(vars) {
      function fakeGet(sql, params, callback) {
        const fakeRow = { id: vars.sql_id, title: "掌握 JavaScript 函式", content: "函式是 JS 的核心..." };
        callback(null, fakeRow);
      }
      let result = null;
      fakeGet(`SELECT * FROM posts WHERE id = ?`, [vars.sql_id], (err, row) => {
        result = err ? `失敗：${err}` : `抓到標題：${row.title}`;
      });
      return { pattern: "fakeGet(sql, params, (err, row) => {...})", result };
    }
  },

  /* ── Q8: 樣板字串邏輯 ── */
  {
    id: 8,
    title: "8｜樣板字串邏輯運算 (三元運算)",
    desc: "Express 的 `res.send(\`<h1>Welcome, ${user}\</h1>\`)` 常搭配三元運算處理未登入的使用者。",
    type: "blog-linked",
    vars: [
      { key: "user", default: "Guest", label: "user 變數值", type: "text" },
      { key: "useTernary", default: true, label: "使用三元運算？", type: "boolean" }
    ],
    run(vars) {
      const user = vars.user || null;
      const displayName = vars.useTernary ? (user ? user : "Stranger") : (user || "Stranger");
      const html = `<h1>Welcome, ${displayName}</h1>`;
      return { user, displayName, html };
    }
  },

  /* ── Q9: 字串截斷 ── */
  {
    id: 9,
    title: "9｜內容截斷 (Substring)",
    desc: "文章列表如果內容太長，常見的做法是用 substr 或 slice 截斷並加上 \"...\"。這是「版面控制」的常見模式。",
    type: "blog-linked",
    vars: [
      { key: "limit", default: 10, label: "截斷字元數", type: "number", min: 5, max: 30 },
      { key: "c1", default: "Very long content here", label: "內容1", type: "text" },
      { key: "c2", default: "Another Very long content here", label: "內容2", type: "text" }
    ],
    run(vars) {
      const contents = [vars.c1, vars.c2];
      const truncated = contents.map(c => {
        if (c.length > vars.limit) {
          return c.slice(0, vars.limit) + "...";
        }
        return c;
      });
      return { limit: vars.limit, truncated };
    }
  },

  /* ── Q10: 錯誤優先 callback ── */
  {
    id: 10,
    title: "10｜錯誤優先 callback 實作 (checkAdmin)",
    desc: "Express 中幾乎所有 db.xxx 的用法都是 err-first callback：`db.get(..., (err, row) => { if(err) return ...; })`。",
    type: "callback",
    vars: [
      { key: "role", default: "admin", label: "role 參數", type: "text" }
    ],
    run(vars) {
      function checkAdmin(role, callback) {
        if (role !== "admin") {
          callback("Access Denied");
        } else {
          callback(null, "Welcome");
        }
      }
      let result = null;
      checkAdmin(vars.role, (err, msg) => {
        result = err ? `✗ 錯誤：${err}` : `✓ ${msg}`;
      });
      return { role: vars.role, result };
    }
  }
];
