let pages = [];
let currentIndex = 0;

async function loadPages() {
    try {
        const r = await fetch('pages.json');
        pages = await r.json();
    } catch(e) {
        pages = [];
    }
    buildTOC();
    showPage(0);
}

function buildTOC() {
    const container = document.getElementById('tocSections');
    container.innerHTML = pages.map((p, i) => `
        <div class="toc-item" data-idx="${i}" onclick="jumpTo(${i})">
            <span class="item-num">${String(i + 1).padStart(2, '0')}</span>
            <span>${p.title}</span>
        </div>
    `).join('');
}

function showPage(idx, dir = 'right') {
    if (idx < 0 || idx >= pages.length) return;
    currentIndex = idx;

    const p = pages[idx];
    const content = document.getElementById('pageContent');
    content.className = `page-content page-animate-${dir}`;
    content.innerHTML = `
        <div class="page-article-title">${p.title}</div>
        <div class="page-article-body">${p.content}</div>
    `;

    const pct = ((idx + 1) / pages.length) * 100;
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('pageNumber').textContent = `${idx + 1} / ${pages.length}`;
    document.getElementById('btnPrev').disabled = idx === 0;
    document.getElementById('btnNext').disabled = idx === pages.length - 1;
    document.getElementById('navCenter').textContent = `${idx + 1} / ${pages.length}`;

    updateActiveTOC();
    content.scrollTop = 0;
}

function nextPage(animate = true) {
    if (currentIndex < pages.length - 1) {
        showPage(currentIndex + 1, animate ? 'right' : 'none');
    }
}

function prevPage(animate = true) {
    if (currentIndex > 0) {
        showPage(currentIndex - 1, animate ? 'left' : 'none');
    }
}

function jumpTo(idx) {
    const diff = idx - currentIndex;
    if (diff > 0) {
        for (let i = 0; i < diff; i++) nextPage(false);
    } else {
        for (let i = 0; i < Math.abs(diff); i++) prevPage(false);
    }
}

function updateActiveTOC() {
    document.querySelectorAll('.toc-item').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.idx) === currentIndex);
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); nextPage(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prevPage(); }
});

document.addEventListener('DOMContentLoaded', loadPages);
