/**
 * TB3 2026 — CORE JS
 * 全域共用常數 + 工具函式
 */

const MISSION_ICONS = {
  traffic_light:  '🚦',
  intersection:   '↩️',
  construction:   '🚧',
  parking:        '🅿️',
  level_crossing: '🚞',
  s_curve:        '〰️',
  tunnel:         '🚇',
  lane:           '🚗'
};

const MISSION_IDS = [
  'traffic_light', 'intersection', 'construction',
  'parking', 'level_crossing', 's_curve', 'tunnel', 'lane'
];

/** 讀取所有 mission JSON（相對路徑需傳入 prefix） */
async function fetchAllMissions(prefix = '../data/') {
  const results = await Promise.allSettled(
    MISSION_IDS.map(id => fetch(`${prefix}data/${id}.json`).then(r => r.json()).catch(() => null))
  );
  return results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
}

/** 計算 Mission 完成狀態 */
function computeMissionStatus(mission) {
  if (!mission.subConcepts || !mission.subConcepts.length) return mission.status || 'todo';
  return mission.subConcepts.every(s => s.status === 'done') ? 'done' : 'todo';
}

/** lastUpdated 初始化 */
function initLastUpdated() {
  const el = document.getElementById('last-updated');
  if (el) {
    el.textContent = new Date().toLocaleString('zh-TW', {
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', second:'2-digit'
    });
  }
  const footer = document.getElementById('footer-updated');
  if (footer && el) footer.textContent = el.textContent;
}

/** refresh 按鈕 */
function initRefreshButton() {
  const btn = document.getElementById('refresh-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      btn.classList.add('loading');
      btn.innerHTML = '<span class="loading"></span>';
      setTimeout(() => location.reload(), 500);
    });
  }
}
