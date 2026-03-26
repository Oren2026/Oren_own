/**
 * TB3 2026 — UPDATES JS
 * 讀取 updates/updates.json 渲染更新歷史
 */

async function renderUpdates(prefix = '../') {
  const el = document.getElementById('update-list');
  if (!el) return;
  try {
    const res = await fetch(`${prefix}updates/updates.json`);
    const data = await res.json();
    if (!data || !data.length) {
      el.innerHTML = '<p style="color:var(--text-light);padding:1rem;">暫無更新記錄</p>';
      return;
    }
    el.innerHTML = data
      .sort((a,b)=>b.id.localeCompare(a.id))
      .map(entry=>`
        <div class="update-entry">
          <div class="update-header">
            <h2>${entry.title}</h2>
            <span class="update-date">${entry.date}</span>
          </div>
          <div class="update-body">
            <p class="tag ${entry.category==='硬體更新'?'hw':'sys'}">${entry.category}</p>
            <p>${entry.summary}</p>
          </div>
        </div>`).join('');
  } catch(e) {
    el.innerHTML='<p style="color:var(--danger);padding:1rem;">載入失敗</p>';
  }
}
