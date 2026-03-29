let pages = [];
let currentIndex = 0;

// ── XSS 防護 ────────────────────────────────────────────

/** 將字串中的 < > & " ' 轉為 HTML entity */
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * 對 innerHTML 內容做基本 sanitization
 * 剷除 script 標籤 + 所有事件處理屬性（onclick/onerror...）
 * 保留常見格式化標籤（p, br, strong, em, ul, ol, li, h1-h6, a...）
 */
function sanitizeHtml(html) {
    if (html == null) return '';
    // 先置換注險屬性（任何 onxxx=）
    let s = html.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
    // 移除完整 <script 標籤
    s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    // 移除 <style>
    s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
    // 移除 <iframe>
    s = s.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
    // 移除 <object>（Flash 等插件）
    s = s.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '');
    // 移除 <embed>
    s = s.replace(/<embed\b[^>]*>/gi, '');
    // 移除 expression() CSS 屬性（IE 舊漏洞）
    s = s.replace(/expression\s*\([^)]*\)/gi, '');
    // 移除 javascript: 連結
    s = s.replace(/javascript\s*:/gi, '');
    // 移除 data: 連結（可能有 inline XSS）
    s = s.replace(/data\s*:/gi, '');
    return s;
}

// ── 頁面載入 ────────────────────────────────────────────

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
            <span>${escapeHtml(p.title)}</span>
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
        <div class="page-article-title">${escapeHtml(p.title)}</div>
        <div class="page-article-body">${sanitizeHtml(p.content)}</div>
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
