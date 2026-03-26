/**
 * TB3 2026 Dashboard JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  initLastUpdated();
  initRefreshButton();
});

/**
 * Display last updated time
 */
function initLastUpdated() {
  const el = document.getElementById('last-updated');
  if (el) {
    const now = new Date();
    const formatted = now.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    el.textContent = formatted;
  }
  
  const footerEl = document.getElementById('footer-updated');
  if (footerEl) {
    footerEl.textContent = el.textContent;
  }
}

/**
 * Refresh button functionality
 */
function initRefreshButton() {
  const btn = document.getElementById('refresh-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      btn.classList.add('loading');
      btn.innerHTML = '<span class="loading"></span>';
      
      setTimeout(() => {
        location.reload();
      }, 500);
    });
  }
}

/**
 * Smooth scroll for anchor links
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
