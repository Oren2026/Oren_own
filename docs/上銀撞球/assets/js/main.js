/**
 * TDK 2026 Dashboard JavaScript
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
 * Calculate and animate progress
 */
function animateProgress() {
  const tasks = document.querySelectorAll('.task-item');
  const totalTasks = tasks.length;
  const completedTasks = document.querySelectorAll('.task-item .check.done').length;
  
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const progressFill = document.getElementById('progress-fill');
  const progressPercent = document.getElementById('progress-percent');
  
  if (progressFill) {
    setTimeout(() => {
      progressFill.style.width = progress + '%';
    }, 300);
  }
  
  if (progressPercent) {
    progressPercent.textContent = Math.round(progress) + '%';
  }
}

/**
 * Get GitHub edit URL for a file
 */
function getGitHubEditUrl(filePath) {
  const baseUrl = 'https://github.com/Oren2026/Oren_own/edit/main/docs/';
  return baseUrl + filePath;
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

// Initialize progress animation
animateProgress();
