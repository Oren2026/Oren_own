// sidebar.js — 動態產生章節側邊欄
// 讀取同目錄的 chapters.json，自動生成 sidebar link
(function () {
  var sidebar = document.getElementById('sidebar-links');
  if (!sidebar) return;

  fetch('chapters.json')
    .then(function (r) { return r.json(); })
    .then(function (chapters) {
      // 取得目前頁面檔名
      var current = window.location.pathname.split('/').pop();

      // 回到柯的note 首頁
      var back = document.createElement('a');
      back.href = '../index.html';
      back.className = 'sidebar-link sidebar-back';
      back.textContent = '📚 回到柯的note';
      sidebar.appendChild(back);

      var divider = document.createElement('div');
      divider.className = 'sidebar-divider';
      divider.style.margin = '4px 0';
      sidebar.appendChild(divider);

      chapters.forEach(function (ch) {
        var a = document.createElement('a');
        a.href = ch.file;
        a.className = 'sidebar-link' + (ch.file === current ? ' active' : '');
        a.textContent = ch.emoji + ' ' + ch.title;
        sidebar.appendChild(a);
      });
    })
    .catch(function () {
      // 若 fetch 失敗，略過
    });
})();
