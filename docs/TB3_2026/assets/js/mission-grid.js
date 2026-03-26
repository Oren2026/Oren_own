/**
 * TB3 2026 — MISSION GRID JS
 * index / research / architecture / tech 共用
 */

window._tb3_missions = null;

async function fetchAllMissions(prefix = '../data/') {
  const results = await Promise.allSettled(
    ['traffic_light','intersection','construction','parking','level_crossing','s_curve','tunnel','lane']
      .map(id => fetch(`${prefix}data/${id}.json`).then(r=>r.json()).catch(()=>null))
  );
  const missions = results.filter(r=>r.status==='fulfilled'&&r.value).map(r=>r.value);
  const map = {};
  missions.forEach(m=>{ map[m.id]=m; });
  window._tb3_missions = map;
  return missions;
}

function computeMissionStatus(m) {
  if (!m.subConcepts || !m.subConcepts.length) return m.status||'todo';
  return m.subConcepts.every(s=>s.status==='done')?'done':'todo';
}

function renderMissionGrid(missions, containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = missions
    .filter(m=>m.category!=='base')
    .sort((a,b)=>MISSION_IDS.indexOf(a.id)-MISSION_IDS.indexOf(b.id))
    .map(m=>{
      const s=computeMissionStatus(m);
      const icon=MISSION_ICONS[m.id]||'❓';
      const label=s==='done'?'✅ 已完成':'🚧 施工中';
      return `<div class="mission-card ${s==='done'?'completed':'active'}"
        onclick="openModal('${m.id}')" style="cursor:pointer;">
        <div class="mission-icon">${icon}</div>
        <div class="mission-name">${m.name?.zh||m.id}</div>
        <div class="mission-status">${label}</div>
      </div>`;
    }).join('');
}

async function openModal(id) {
  if (!window._tb3_missions) await fetchAllMissions();
  const m = window._tb3_missions[id];
  if (!m) return;
  const s=computeMissionStatus(m);
  document.getElementById('modal-title').textContent=`${MISSION_ICONS[id]||''} ${m.name?.zh||id}`;
  const subs=(m.subConcepts||[]).map(sub=>`<li>${sub.status==='done'?'✅':'⬜'} <strong>${sub.name?.zh||sub.id}</strong>：${sub.description||'—'}</li>`).join('');
  const outputs=(m.outputs||[]).map(o=>`<li><code>${o.topic}</code>（${o.type}）— ${o.note||'—'}</li>`).join('');
  const files=(m.files||[]).map(f=>`<li><code>${f}</code></li>`).join('');
  document.getElementById('modal-body').innerHTML=`
    <p><span class="modal-status ${s}">${s==='done'?'✅ 已完成':'🚧 施工中'}</span></p>
    ${m.description?`<p style="margin-top:0.75rem;">${m.description}</p>`:''}
    ${subs?`<div class="modal-section"><h3>實作細節</h3><ul>${subs}</ul></div>`:''}
    ${outputs?`<div class="modal-section"><h3>輸出 Topic</h3><ul>${outputs}</ul></div>`:''}
    ${files?`<div class="modal-section"><h3>對應檔案</h3><ul>${files}</ul></div>`:''}
  `;
  document.getElementById('mission-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('mission-modal').classList.remove('open');
}

document.addEventListener('click', e => {
  const modal = document.getElementById('mission-modal');
  if (modal && e.target === modal) closeModal();
});
