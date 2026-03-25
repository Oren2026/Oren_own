// ============================================================
// 機器的喃喃 — Orenbook
// ============================================================

(async function() {

  // ---- 1. 讀取頁面資料 ----------------------------------------
  let PAGES;
  try {
    const res = await fetch('pages.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    PAGES = await res.json();
  } catch (e) {
    document.body.innerHTML = '<p style="color:#f55;padding:30px;text-align:center">載入失敗：' + e.message + '<br><small>請確認 pages.json 存在</small></p>';
    return;
  }

  const TOTAL = PAGES.length; // 22

  // ---- 2. DOM 元素 --------------------------------------------
  const book        = document.getElementById('book');
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
  const rightPage   = rightTitle.parentElement.parentElement; // .page-right

  // ---- 3. 狀態 -------------------------------------------------
  let currentPage = 0;   // 0-indexed，範圍 0 ~ TOTAL-2（因為有左右兩頁）
  let isReading   = false;
  let isAnimating = false;

  // ---- 4. 計算滑動偏移 ----------------------------------------
  function getOffset() {
    // 桌面：spread 200% 寬，每次滑 50%（一個跨頁）
    // 手機：spread 200% 寬，每次滑 100%（一個視口）
    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    return isMobile ? currentPage * 100 : currentPage * 50;
  }

  // ---- 5. 渲染 -------------------------------------------------
  function render() {
    const cur  = PAGES[currentPage];
    const next = PAGES[currentPage + 1];

    // 左頁：永遠是 currentPage
    leftTitle.textContent = cur.title;
    leftContent.innerHTML = cur.content;
    leftNum.textContent   = currentPage + 1;

    // 右頁
    if (next) {
      rightTitle.textContent  = next.title;
      rightContent.innerHTML  = next.content;
      rightNum.textContent    = currentPage + 2;
      rightPage.style.display = '';
    } else {
      // 最後一頁，右頁留白
      rightTitle.textContent  = '';
      rightContent.innerHTML  = '';
      rightNum.textContent    = '';
      rightPage.style.display = 'none';
    }

    // 章節標題
    chapterBar.textContent = cur.title
      .replace(/^ch\.\d+\s*/, '')
      .replace(/^序$/, '序 — 我不是ChatGPT');

    // 滑動
    spread.style.transform = 'translateX(-' + getOffset() + '%)';

    // 按鈕
    prevBtn.style.visibility = (currentPage > 0) ? 'visible' : 'hidden';
    nextBtn.style.visibility = (currentPage < TOTAL - 1) ? 'visible' : 'hidden';

    // 指示器
    indicator.textContent = (currentPage + 1) + ' / ' + TOTAL;
  }

  // ---- 6. 導航 -------------------------------------------------
  function nextPage() {
    // 動畫鎖 + 邊界檢查
    if (isAnimating) return;
    if (currentPage >= TOTAL - 1) return;

    // 第一次點擊：關閉封面，直接進到第1跨頁（currentPage = 0，不前進）
    if (!isReading) {
      cover.style.display = 'none';
      isReading = true;
      // currentPage 保持在 0，render() 顯示目錄 + 序
      render();
      return;
    }

    // 前進到下一跨頁
    isAnimating = true;
    currentPage++;
    render();
    setTimeout(function() { isAnimating = false; }, 700);
  }

  function prevPage() {
    if (isAnimating) return;

    // 在第一跨頁，點 prev → 回封面
    if (currentPage === 0) {
      cover.style.display = '';
      isReading = false;
      return;
    }

    isAnimating = true;
    currentPage--;
    render();
    setTimeout(function() { isAnimating = false; }, 700);
  }

  // ---- 7. 按鈕事件 --------------------------------------------
  prevBtn.addEventListener('click', prevPage);
  nextBtn.addEventListener('click', nextPage);

  // 鍵盤
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextPage(); }
    if (e.key === 'ArrowLeft')                  { e.preventDefault(); prevPage(); }
  });

  // ---- 8. 啟動 -------------------------------------------------
  render();
  prevBtn.style.visibility = 'hidden';

})();
