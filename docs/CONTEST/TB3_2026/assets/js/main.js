/**
 * TB3 2026 — 全域 JS
 * 所有頁面共用，職責：
 *   1. 常數定義（MISSION_ICONS, MISSION_IDS）
 *   2. 讀取 data/*.json
 *   3. 計算 Mission 完成度
 *   4. 渲染 Mission Grid / Timeline / Updates
 *   5. Modal 互動
 *   6. 頁面通用工具（lastUpdated, refreshBtn）
 */

const MISSION_ICONS = {
  traffic_light:  '🚦', construction:   '🚧',
  parking:        '🅿️', level_crossing: '🚞',
  s_curve:      '〰️', tunnel:         '🚇',
  lane_center:  '◉', lane:           '🚗',
  integration:  '🔗'
};

const MISSION_IDS = [
  'traffic_light','s_curve','construction',
  'parking','m_curve','level_crossing','tunnel','lane_center','lane',
  'integration'
];

// ── 讀取 ──────────────────────────────────────────────

/** 讀取所有 mission JSON。prefix 預設 '../' */
async function fetchAllMissions(prefix = '../') {
  const results = await Promise.allSettled(
    MISSION_IDS.map(id => fetch(`${prefix}data/${id}.json`).then(r => r.json()).catch(() => null))
  );
  const missions = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
  const map = {};
  missions.forEach(m => { map[m.id] = m; });
  window._tb3 = map;
  return missions;
}

// ── 計算 ──────────────────────────────────────────────

function computeMissionStatus(m) {
  if (!m.subConcepts || !m.subConcepts.length) return m.status || 'todo';
  return m.subConcepts.every(s => s.status === 'done') ? 'done' : 'todo';
}

// ── 渲染 ──────────────────────────────────────────────

/** 渲染 Mission Grid（index / research / architecture / tech 共用） */
function renderMissionGrid(missions, containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = missions
    .filter(m => m.category !== 'base')
    .sort((a, b) => MISSION_IDS.indexOf(a.id) - MISSION_IDS.indexOf(b.id))
    .map(m => {
      const s = computeMissionStatus(m);
      const icon = MISSION_ICONS[m.id] || '❓';
      const label = s === 'done' ? '✅ 已完成' : '🚧 施工中';
      return `<div class="mission-card ${s === 'done' ? 'completed' : 'active'}"
        onclick="openModal('${m.id}')">
        <div class="mission-icon">${icon}</div>
        <div class="mission-name">${m.name?.zh || m.id}</div>
        <div class="mission-status">${label}</div>
      </div>`;
    }).join('');
}

/** 渲染 Updates 列表 */
async function renderUpdates(prefix = '../') {
  const el = document.getElementById('update-list');
  if (!el) return;
  try {
    const res = await fetch(`${prefix}updates/updates.json`);
    const data = await res.json();
    if (!data || !data.length) { el.innerHTML = '<p style="color:var(--text-light);padding:1rem;">暫無更新記錄</p>'; return; }
    el.innerHTML = data
      .sort((a, b) => b.id.localeCompare(a.id))
      .map(e => `
        <div class="update-entry">
          <div class="update-header">
            <h2>${e.title}</h2>
            <span class="update-date">${e.date}</span>
          </div>
          <div class="update-body">
            <p class="tag ${e.category === '硬體更新' ? 'hw' : 'sys'}">${e.category}</p>
            <p>${e.summary}</p>
          </div>
        </div>`).join('');
  } catch(err) {
    el.innerHTML = '<p style="color:var(--danger);padding:1rem;">載入失敗</p>';
  }
}

/** 渲染 Timeline（tech 頁面用） */
function renderTimeline(missions, containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = missions
    .filter(m => m.category !== 'base')
    .sort((a, b) => MISSION_IDS.indexOf(a.id) - MISSION_IDS.indexOf(b.id))
    .map(m => {
      const s = computeMissionStatus(m);
      const icon = MISSION_ICONS[m.id] || '❓';
      const subDone = (m.subConcepts || []).filter(x => x.status === 'done').length;
      const subTotal = (m.subConcepts || []).length;
      const subs = (m.subConcepts || []).map(sub =>
        `<li>${sub.status === 'done' ? '✅' : '⬜'} <strong>${sub.name?.zh || sub.id}</strong>：${sub.description || '—'}</li>`
      ).join('');
      return `<div class="node-card ${s}" style="margin-bottom:1rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
          <h3>${icon} ${m.name?.zh || m.id}</h3>
          <span class="status ${s}">${s === 'done' ? '✅ 已完成' : '🚧 施工中'}</span>
        </div>
        <p style="font-size:0.9rem;color:var(--text-light);margin-bottom:0.5rem;">${m.description || ''}</p>
        <p style="font-size:0.8rem;color:var(--text-light);margin-bottom:0.5rem;">子項目：${subDone}/${subTotal}</p>
        ${subs ? `<details style="margin-top:0.5rem;"><summary style="cursor:pointer;font-size:0.85rem;">實作細節</summary><ul style="margin-top:0.5rem;padding-left:1.25rem;">${subs}</ul></details>` : ''}
      </div>`;
    }).join('');
}

// ── Modal ─────────────────────────────────────────────

async function openModal(id) {
  if (!window._tb3) await fetchAllMissions();
  const m = window._tb3[id];
  if (!m) return;
  const s = computeMissionStatus(m);
  document.getElementById('modal-title').textContent = `${MISSION_ICONS[id] || ''} ${m.name?.zh || id}`;
  const subs = (m.subConcepts || []).map(sub =>
    `<li>${sub.status === 'done' ? '✅' : '⬜'} <strong>${sub.name?.zh || sub.id}</strong>：${sub.description || '—'}</li>`
  ).join('');
  const outputs = (m.outputs || []).map(o =>
    `<li><code>${o.topic}</code>（${o.type}）— ${o.note || '—'}</li>`
  ).join('');
  const files = (m.files || []).map(f => `<li><code>${f}</code></li>`).join('');
  document.getElementById('modal-body').innerHTML = `
    <p><span class="modal-status ${s}">${s === 'done' ? '✅ 已完成' : '🚧 施工中'}</span></p>
    ${m.description ? `<p style="margin-top:0.75rem;">${m.description}</p>` : ''}
    ${m.video ? `<div class="modal-section"><h3>🎬 測試影片</h3><video src="${m.video}" controls style="width:100%;border-radius:8px;margin-top:0.5rem;"></video></div>` : ''}
    ${subs ? `<div class="modal-section"><h3>實作細節</h3><ul>${subs}</ul></div>` : ''}
    ${outputs ? `<div class="modal-section"><h3>輸出 Topic</h3><ul>${outputs}</ul></div>` : ''}
    ${files ? `<div class="modal-section"><h3>對應檔案</h3><ul>${files}</ul></div>` : ''}`;
  document.getElementById('mission-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('mission-modal').classList.remove('open');
}

document.addEventListener('click', e => {
  const modal = document.getElementById('mission-modal');
  if (modal && e.target === modal) closeModal();
});

// ── 通用工具 ──────────────────────────────────────────

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

function initRefreshButton() {
  const btn = document.getElementById('refresh-btn');
  if (btn) btn.addEventListener('click', () => {
    btn.innerHTML = '<span class="loading"></span>';
    setTimeout(() => location.reload(), 500);
  });
}
