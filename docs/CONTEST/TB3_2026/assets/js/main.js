/**
 * TB3 2026 — 全域 JS
 * 所有頁面共用，職責：
 *   1. 常數定義（MISSION_ICONS, MISSION_IDS）
 *   2. 讀取 data/*.json（細節內容）
 *   3. 讀取 status.json（進度總覽）
 *   4. 計算 Mission 完成度
 *   5. 渲染 Mission Grid / Timeline / Updates
 *   6. Modal 互動
 *   7. 頁面通用工具（lastUpdated, refreshBtn）
 */

const MISSION_ICONS = {
  traffic_light:  '🚦', construction:   '🚧',
  parking:        '🅿️', level_crossing: '🚞',
  intersection: '🔄', tunnel:         '🚇',
  s_curve:      '〰️', lane_center:   '◉',
  lane:         '🚗', integration:   '🔗'
};

const MISSION_IDS = [
  'traffic_light','intersection','s_curve','construction',
  'parking','level_crossing','tunnel','lane_center','lane',
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

/** 讀取 status.json（進度總覽） */
async function fetchStatus(prefix = '../') {
  try {
    const res = await fetch(`${prefix}status.json`);
    const data = await res.json();
    window._status = data;
    return data;
  } catch(e) {
    return null;
  }
}

// ── 計算 ──────────────────────────────────────────────

function computeMissionStatus(m) {
  if (!m.subConcepts || !m.subConcepts.length) return m.status || 'todo';
  // 如果 top-level status 明確是 in-progress，優先尊重這個設定
  if (m.status === 'in-progress') return 'in-progress';
  return m.subConcepts.every(s => s.status === 'done') ? 'done' : 'todo';
}

// ── 渲染 ──────────────────────────────────────────────

/** 渲染進度總覽（讀取 status.json） */
async function renderStatusSummary(prefix = '../') {
  const status = await fetchStatus(prefix);
  if (!status) return;

  // 更新 progress bar
  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  const doneCount = status.doneCount || 0;
  const totalCount = status.totalMissions || 9;
  const pct = Math.round(doneCount / totalCount * 100);

  if (fill) fill.style.width = pct + '%';
  if (text) text.textContent = `${doneCount}/${totalCount} 完成`;

  // 更新 footer 日期
  const footer = document.getElementById('footer-updated');
  if (footer && status.updates && status.updates.length) {
    footer.textContent = status.updates[0].date;
  }
}

/** 渲染 Mission Grid（index / research / architecture / tech 共用）
 *  優先使用 status.json 的 doneCount，若無則 fallback 到 data/*.json
 *  @param {string|Array} missionsOrContainer - 舊：missions陣列，新：containerId
 *  @param {string} containerOrPrefix - 舊：containerId字串，新：prefix路徑 */
async function renderMissionGrid(missionsOrContainer, containerOrPrefix) {
  // 舊呼叫（index.html）：renderMissionGrid(missions, 'mission-grid')
  // 新呼叫（tech.html等）：renderMissionGrid('mission-grid', './')
  let containerId, prefix, missions;

  if (typeof missionsOrContainer === 'string') {
    // 新式：containerId, prefix
    containerId = missionsOrContainer;
    prefix = containerOrPrefix || './';
    missions = null;
  } else {
    // 舊式：missions[], containerId
    containerId = containerOrPrefix;
    prefix = './';   // index.html 固定從 ./ 讀
    missions = missionsOrContainer;
  }

  const c = document.getElementById(containerId);
  if (!c) return;

  const status = window._status || await fetchStatus(prefix);
  if (!missions) missions = window._tb3 ? Object.values(window._tb3) : await fetchAllMissions(prefix);

  if (missions.length === 0) {
    c.innerHTML = '<p style="color:var(--muted-2);padding:1rem;">暫無任務資料</p>';
    return;
  }

  c.innerHTML = missions
    .filter(m => m.category !== 'base')
    .sort((a, b) => MISSION_IDS.indexOf(a.id) - MISSION_IDS.indexOf(b.id))
    .map(m => {
      // 優先用 status.json 的 status
      let s = computeMissionStatus(m);
      if (status && status.missions) {
        const s2 = status.missions.find(sm => sm.id === m.id);
        if (s2) s = s2.status || s;
      }
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

/** 渲染 Updates 列表（讀取 status.json） */
async function renderUpdates(prefix = '../') {
  const el = document.getElementById('update-list');
  if (!el) return;

  const status = window._status || await fetchStatus(prefix);

  if (status && status.updates && status.updates.length) {
    const tagClass = (cat) => {
      if (cat === '採購' || cat === '硬體更新') return 'hw';
      if (cat === '規則更新') return 'rule';
      return 'sys';
    };
    el.innerHTML = status.updates
      .slice()
      .reverse()
      .map(e => `
        <div class="update-entry">
          <div class="update-header">
            <h2>${e.text}</h2>
            <span class="update-date">${e.date}</span>
          </div>
          <div class="update-body">
            <p class="tag ${tagClass(e.category)}">${e.category || '更新'}</p>
          </div>
        </div>`).join('');
  } else {
    // fallback 到舊的 updates.json
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
          <span class="status ${s}">${s === 'done' ? '✅ 已完成' : s === 'in-progress' ? '🔶 待精進' : '🚧 施工中'}</span>
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
  const modalStatusLabel = s === 'done' ? '✅ 已完成' : s === 'in-progress' ? '🔶 待精進' : '🚧 施工中';
  document.getElementById('modal-title').textContent = (MISSION_ICONS[id] || '❓') + ' ' + (m.name && m.name.zh ? m.name.zh : id);
  const subs = (m.subConcepts || []).map(function(sub) {
    return '<li>' + (sub.status === 'done' ? '✅' : '⬜') + ' <strong>' + (sub.name && sub.name.zh ? sub.name.zh : sub.id) + '</strong>：' + (sub.description || '—') + '</li>';
  }).join('');
  const outputs = (m.outputs || []).map(function(o) {
    return '<li><code>' + o.topic + '</code>（' + o.type + '）— ' + (o.note || '—') + '</li>';
  }).join('');
  const files = (m.files || []).map(function(f) { return '<li><code>' + f + '</code></li>'; }).join('');
  var body = '<p><span class="modal-status ' + s + '">' + modalStatusLabel + '</span></p>';
  if (m.description) body += '<p style="margin-top:0.75rem;">' + m.description + '</p>';
  if (m.video) body += '<div class="modal-section"><h3>🎬 測試影片</h3><video src="' + m.video + '" controls style="width:100%;max-height:65vh;border-radius:8px;margin-top:0.5rem;object-fit:contain;"></video></div>';
  if (m.images && m.images.length) {
    var imgs = m.images.map(function(img) { return '<a href="' + img + '" target="_blank" style="display:contents;"><img src="' + img + '" style="width:120px;height:auto;border-radius:6px;object-fit:cover;"></a>'; }).join('');
    body += '<div class="modal-section"><h3>📸 參考圖片</h3><div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.5rem;">' + imgs + '</div></div>';
  }
  if (subs) body += '<div class="modal-section"><h3>實作細節</h3><ul>' + subs + '</ul></div>';
  if (outputs) body += '<div class="modal-section"><h3>輸出 Topic</h3><ul>' + outputs + '</ul></div>';
  if (files) body += '<div class="modal-section"><h3>對應檔案</h3><ul>' + files + '</ul></div>';
  document.getElementById('modal-body').innerHTML = body;
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
