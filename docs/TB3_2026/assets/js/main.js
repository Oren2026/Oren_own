/**
 * TB3 2026 Dashboard JavaScript
 *  - Mission grid rendered from data/*.json
 */

const MISSION_IDS = [
  'traffic_light', 'intersection', 'construction',
  'parking', 'level_crossing', 's_curve', 'tunnel', 'lane'
];

const MISSION_ICONS = {
  traffic_light: '🚦',
  intersection: '↩️',
  construction: '🚧',
  parking: '🅿️',
  level_crossing: '🚞',
  s_curve: '〰️',
  tunnel: '🚇',
  lane: '🚗'
};

// ── Mission Data ──────────────────────────────────────

async function fetchAllMissions() {
  const results = await Promise.allSettled(
    MISSION_IDS.map(id =>
      fetch(`data/${id}.json`).then(r => r.json()).catch(() => null)
    )
  );
  return results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);
}

function computeMissionStatus(mission) {
  if (!mission.subConcepts || mission.subConcepts.length === 0) {
    return mission.status || 'todo';
  }
  const allDone = mission.subConcepts.every(s => s.status === 'done');
  return allDone ? 'done' : 'todo';
}

// ── Render Mission Grid ────────────────────────────────

function renderMissionGrid(missions) {
  const grid = document.getElementById('mission-grid');
  if (!grid) return;

  const allDone = missions.filter(m => m.category !== 'base').every(m => computeMissionStatus(m) === 'done');
  const doneCount = missions.filter(m => m.category !== 'base' && computeMissionStatus(m) === 'done').length;
  const totalCount = missions.filter(m => m.category !== 'base').length;

  grid.innerHTML = missions
    .filter(m => m.category !== 'base')
    .sort((a, b) => MISSION_IDS.indexOf(a.id) - MISSION_IDS.indexOf(b.id))
    .map(m => {
      const status = computeMissionStatus(m);
      const icon = MISSION_ICONS[m.id] || '❓';
      const label = status === 'done' ? '✅ 已完成' : '🚧 施工中';
      const cls = status === 'done' ? 'completed' : 'active';
      return `
        <div class="mission-card ${cls}" onclick="openModal('${m.id}')" style="cursor:pointer;">
          <div class="mission-icon">${icon}</div>
          <div class="mission-name">${m.name.zh}</div>
          <div class="mission-status">${label}</div>
        </div>`;
    }).join('');

  // Update progress bar
  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  if (fill && text) {
    const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    fill.style.width = pct + '%';
    text.textContent = allDone ? `✅ 全部完成（${doneCount}/${totalCount}）` : `🚧 施工中（${doneCount}/${totalCount} 關卡完成）`;
  }
}

// ── Modal ─────────────────────────────────────────────

function openModal(id) {
  const mission = window._tb3_missions ? window._tb3_missions[id] : null;
  if (!mission) return;

  document.getElementById('modal-title').textContent = `${MISSION_ICONS[id] || ''} ${mission.name.zh}`;

  const status = computeMissionStatus(mission);
  const body = document.getElementById('modal-body');

  if (status === 'todo') {
    body.innerHTML = `
      <p><span class="modal-status todo">🚧 施工中</span></p>
      <p style="margin-top:1rem; color:var(--text-light);">此關卡尚未完成，請持續開發。</p>`;
  } else {
    let html = `<p><span class="modal-status done">✅ 已完成</span></p>`;
    if (mission.description) {
      html += `<p style="margin-top:0.75rem;">${mission.description}</p>`;
    }
    if (mission.subConcepts) {
      html += `<div class="modal-section"><h3>子概念</h3><ul>`;
      mission.subConcepts.forEach(s => {
        const sDone = s.status === 'done' ? '✅' : '⬜';
        html += `<li>${sDone} <strong>${s.name.zh}</strong>：${s.description || '—'}</li>`;
      });
      html += `</ul></div>`;
    }
    if (mission.outputs) {
      html += `<div class="modal-section"><h3>輸出 Topic</h3><ul>`;
      mission.outputs.forEach(o => {
        html += `<li><code>${o.topic}</code>（${o.type}）— ${o.note}</li>`;
      });
      html += `</ul></div>`;
    }
    body.innerHTML = html;
  }

  document.getElementById('mission-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('mission-modal').classList.remove('open');
}

document.getElementById('mission-modal')?.addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ── Init ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  initLastUpdated();
  initRefreshButton();

  try {
    const missions = await fetchAllMissions();
    const map = {};
    missions.forEach(m => { map[m.id] = m; });
    window._tb3_missions = map;
    renderMissionGrid(missions);
  } catch (err) {
    console.error('Failed to load missions:', err);
    const grid = document.getElementById('mission-grid');
    if (grid) grid.innerHTML = '<p style="color:var(--danger);padding:1rem;">載入失敗，請稍後重試。</p>';
  }
});

function initLastUpdated() {
  const el = document.getElementById('last-updated');
  if (el) {
    const now = new Date();
    el.textContent = now.toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
  const footerEl = document.getElementById('footer-updated');
  if (footerEl && el) footerEl.textContent = el.textContent;
}

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
