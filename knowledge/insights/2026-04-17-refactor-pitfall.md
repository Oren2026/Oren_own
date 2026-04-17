# 2026-04-17 重構失誤：getter/render 不一致的教訓

## 事件
practice.html 重構時，getFormData() 殘留了上一版的 `getElementById('f-tern').checked` 讀取，
但 renderEditor() 已經移除這個元素。導致 JS 執行到一半 crash，renderEditor() 和 renderBlog() 都沒執行。

## 根因
重構時：改了 HTML 結構 + JS 邏輯，但「讀取」和「渲染」是分開改的，沒對齊。

## 預防方法
每次重構 render() 函式時，順手列出「此函式會讀取的所有 DOM ID」，確認新的 render() 都有產生這些元素。
或者：getter 和 render 同步修改，不要分開處理。

## GitHub Pages 特殊注意
- 空白頁面 99% 是 JS 語法錯誤或 DOM ID 不匹配
- `node --check` 只驗 JS 語法，抓不到「邏輯上元素不存在」的問題
- 必須實際在 browser 環境測試才能發現

---

## 2026-04-17（下午）額外發現：執行順序陷阱

## 事件
修完 f-tern 後頁面還是空白。真正原因是：
`syncAll()` 裡 getFormData() 在 renderEditor() 建立 DOM 之前就被呼叫了。
所以即使所有 f-* 元素都有定義，startup 時他們根本還沒被放進 DOM。

## 修復
區分兩種流程：
- `initFirstRender()`：直接用 BLOG_DB[0] 的值呼叫 render，不讀 DOM
- `syncAll()`：讓使用者 input 事件觸發，先 render 再讀值（這時 DOM 已存在）

## 教訓
「讀取表單」和「渲染表單」是相依的兩個步驟，startup 時必須確保 DOM 存在才能讀。
用 separate init/update 模式處理這個問題。
