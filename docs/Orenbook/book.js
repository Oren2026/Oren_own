let allArticles = [];
let sections = [];
let currentIndex = 0;
let filteredSections = [];

function fmt(dateFile) {
    if (!dateFile) return '';
    return `${dateFile.substring(0,4)}-${dateFile.substring(4,6)}-${dateFile.substring(6,8)}`;
}

async function loadData() {
    const today = new Date();
    for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const fname = `${y}${m}${day}`;
        try {
            const r = await fetch(`../knowledges/data/${fname}.json`);
            if (r.ok) {
                const arr = await r.json();
                if (Array.isArray(arr)) {
                    arr.forEach(a => allArticles.push({...a, date: fname}));
                }
            }
        } catch(e) {}
    }

    buildSections();
    renderTOC();
    showPage(0);
}

function buildSections() {
    const map = {};
    allArticles.forEach((a) => {
        const tags = a.tags || [];
        if (tags.length === 0) tags.push('未分類');
        tags.forEach(t => {
            if (!map[t]) map[t] = [];
            map[t].push(a);
        });
    });
    sections = Object.entries(map)
        .map(([tag, articles]) => ({ tag, articles }))
        .sort((a, b) => b.articles.length - a.articles.length);
    filteredSections = [...sections];
}

function renderTOC() {
    const container = document.getElementById('tocSections');
    container.innerHTML = filteredSections.map((sec, si) => `
        <div class="toc-section" data-section="${si}">
            <div class="toc-section-title" onclick="toggleSection(${si})">
                <span>${sec.tag} <span style="color:#555;font-size:0.85em">(${sec.articles.length})</span></span>
                <span class="arrow">▼</span>
            </div>
            <div class="toc-items">
                ${sec.articles.map((a, ai) => {
                    const flatIdx = allArticles.indexOf(a);
                    return `<div class="toc-item" data-idx="${flatIdx}" onclick="jumpTo(${flatIdx})">
                        <span class="item-num">${ai+1}.</span>
                        <span>${a.title}</span>
                    </div>`;
                }).join('')}
            </div>
        </div>
    `).join('');
    updateActiveTOC();
}

function toggleSection(idx) {
    const el = document.querySelector(`[data-section="${idx}"]`);
    el.classList.toggle('closed');
}

function updateActiveTOC() {
    document.querySelectorAll('.toc-item').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.idx) === currentIndex);
    });
    document.querySelectorAll('.toc-section').forEach((el) => {
        const hasActive = el.querySelector('.toc-item.active');
        if (hasActive) el.classList.remove('closed');
    });
}

function jumpTo(globalIdx) {
    const diff = globalIdx - currentIndex;
    if (diff > 0) {
        for (let i = 0; i < diff; i++) nextPage(false);
    } else {
        for (let i = 0; i < Math.abs(diff); i++) prevPage(false);
    }
}

function showPage(idx, dir = 'right') {
    if (idx < 0 || idx >= allArticles.length) return;
    currentIndex = idx;

    const a = allArticles[idx];
    const content = document.getElementById('pageContent');
    content.className = `page-content page-animate-${dir}`;
    content.innerHTML = `
        <div class="page-article-tag">${(a.tags || ['未分類'])[0]}</div>
        <div class="page-article-title">${a.title}</div>
        <div class="page-article-summary">${a.summary || ''}</div>
        <div class="page-tags">
            ${(a.tags || []).map(t => `<span class="page-tag"># ${t}</span>`).join('')}
        </div>
    `;

    const pct = ((idx + 1) / allArticles.length) * 100;
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('pageNumber').textContent = `${fmt(a.date)}`;
    document.getElementById('btnPrev').disabled = idx === 0;
    document.getElementById('btnNext').disabled = idx === allArticles.length - 1;
    document.getElementById('navCenter').textContent = `${idx + 1} / ${allArticles.length}`;

    updateActiveTOC();
    content.scrollTop = 0;
}

function nextPage(animate = true) {
    if (currentIndex < allArticles.length - 1) {
        showPage(currentIndex + 1, animate ? 'right' : 'none');
    }
}
function prevPage(animate = true) {
    if (currentIndex > 0) {
        showPage(currentIndex - 1, animate ? 'left' : 'none');
    }
}

function filterTOC(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
        filteredSections = [...sections];
    } else {
        filteredSections = sections
            .map(sec => ({
                tag: sec.tag,
                articles: sec.articles.filter(a =>
                    a.title.toLowerCase().includes(q) ||
                    (a.summary && a.summary.toLowerCase().includes(q)) ||
                    (a.tags && a.tags.some(t => t.toLowerCase().includes(q)))
                )
            }))
            .filter(sec => sec.articles.length > 0);
    }
    renderTOC();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); nextPage(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prevPage(); }
});

document.addEventListener('DOMContentLoaded', loadData);
