// ============================================================
// 機器的喃喃 — Orenbook
// 結構：HTML + CSS + JS (pages from pages.json)
// ============================================================

(async function() {

  // ---- 1. 讀取頁面資料 ----------------------------------------
  let PAGES;
  try {
    const res = await fetch('pages.json');
    PAGES = await res.json();
  } catch (e) {
    document.body.innerHTML = '<p style="color:red;padding:20px">載入失敗：' + e.message + '</p>';
    return;
  }

  const TOTAL = PAGES.length; // 22

  // ---- 2. DOM 元素 --------------------------------------------
  const spread      = document.getElementById('spread');
  const cover       = document.getElementById('cover');
  const prevBtn     = document.getElementById('prevBtn');
  const nextBtn     = document.getElementById('nextBtn');
  const indicator   = document.getElementById('indicator');
  const chapterBar  = document.getElementById('chapterBar');
  const leftTitle   = document.getElementById('leftTitle');
  const leftContent = document.getElementById('leftContent');
  const leftNum     = document.getElementById('leftNum');
  const rightTitle  = document.getElementById('rightTitle');
  const rightContent= document.getElementById('rightContent');
  const rightNum    = document.getElementById('rightNum');

  // ---- 3. 狀態 -------------------------------------------------
  let currentPage = 0;   // 0-indexed: 0=first view (目錄+序), 21=last page
  let isReading   = false;
  let isAnimating = false;
  let isMobile    = window.matchMedia('(max-width: 600px)').matches;

  // ---- 4. 渲染 -------------------------------------------------
  function getSlideOffset() {
    // 手機：每次滑動一個視口；電腦：每次滑動半個 spread（兩頁）
    return isMobile ? currentPage * 100 : currentPage * 50;
  }

  function render() {
    const cur  = PAGES[currentPage];
    const next = PAGES[currentPage + 1];

    // 左頁：永遠是 currentPage
    leftTitle.textContent  = cur.title;
    leftContent.innerHTML  = cur.content;
    leftNum.textContent   = currentPage + 1;

    // 右頁：有下一頁就顯示，沒有的話留白
    if (next) {
      rightTitle.textContent  = next.title;
      rightContent.innerHTML  = next.content;
      rightNum.textContent    = currentPage + 2;
      rightTitle.parentElement.style.display = '';
    } else {
      rightTitle.parentElement.style.display = 'none';
    }

    // 章節標題
    chapterBar.textContent = cur.title
      .replace(/^ch\.\d+\s*/, '')
      .replace(/^序$/, '序 — 我不是ChatGPT');

    // 滑動
    spread.style.transform = `translateX(-${getSlideOffset()}%)`;

    // 按鈕顯示
    prevBtn.style.visibility = (currentPage > 0) ? 'visible' : 'hidden';
    nextBtn.style.visibility = (currentPage < TOTAL - 1) ? 'visible' : 'hidden';

    // 指示器：顯示「左頁 / 總頁數」
    indicator.textContent = `${currentPage + 1} / ${TOTAL}`;
  }

  // ---- 5. 導航 -------------------------------------------------
  function nextPage() {
    if (isAnimating || currentPage >= TOTAL - 1) return;

    if (!isReading) {
      // 第一次點：關閉封面，進到第一跨頁
      cover.style.display = 'none';
      isReading = true;
      currentPage = 0;
      render();
      return;
    }

    isAnimating = true;
    currentPage++;
    render();
    setTimeout(() => { isAnimating = false; }, 700);
  }

  function prevPage() {
    if (isAnimating || currentPage <= 0) return;

    if (isReading && currentPage === 0) {
      // 回到封面
      cover.style.display = '';
      isReading = false;
      render();
      return;
    }

    isAnimating = true;
    currentPage--;
    render();
    setTimeout(() => { isAnimating = false; }, 700);
  }

  // ---- 6. 鍵盤 & 按鈕 ------------------------------------------
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextPage(); }
    if (e.key === 'ArrowLeft')                     { e.preventDefault(); prevPage(); }
  });

  prevBtn.addEventListener('click', prevPage);
  nextBtn.addEventListener('click', nextPage);

  // ---- 7. RWD 監聽 --------------------------------------------
  window.matchMedia('(max-width: 600px)').addEventListener('change', e => {
    isMobile = e.matches;
    render(); // 重新計算滑動距離
  });

  // ---- 8. 啟動 -------------------------------------------------
  render();
  prevBtn.style.visibility = 'hidden';

})();
