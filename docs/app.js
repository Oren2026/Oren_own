// 知識庫系統 - Oren 黑輪
let allArticles = [];
let activeDate = null;  // YYYYMMDD 格式
let activeTag = null;
let dateList = [];      // YYYYMMDD 陣列

// 格式化：20260323 → "2026-03-23"
function formatDate(filename) {
    return `${filename.substring(0,4)}-${filename.substring(4,6)}-${filename.substring(6,8)}`;
}

// 從 URL 讀取所有 JSON 檔案
async function loadAllData() {
    allArticles = [];
    dateList = [];
    
    try {
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const filename = `${y}${m}${day}`;  // YYYYMMDD
            
            try {
                const response = await fetch(`data/${filename}.json`);
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        allArticles = allArticles.concat(data);
                        dateList.push(filename);
                    }
                }
            } catch (e) {
                // 檔案不存在，忽略
            }
        }
        
        // 排序（最新在前）
        dateList = dateList.sort().reverse();
        
        // 預設選今天
        const todayFile = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
        activeDate = dateList.includes(todayFile) ? todayFile : (dateList[0] || null);
        
    } catch (e) {
        console.error('載入資料失敗:', e);
    }
    
    render();
}

function getArticlesByDate(dateFile) {
    // dateFile 是 YYYYMMDD，拿 JSON 的 date 或 filename 來比
    return allArticles.filter(a => {
        const articleDate = a.date || '';
        // a.date 可能是 YYYYMMDD 或 YYYY-MM-DD
        const normalized = articleDate.replace(/-/g, '');
        return normalized === dateFile;
    });
}

function getTagCounts(dateFile) {
    const counts = {};
    const articles = dateFile ? getArticlesByDate(dateFile) : allArticles;
    articles.forEach(a => {
        if (a.tags && Array.isArray(a.tags)) {
            a.tags.forEach(t => {
                counts[t] = (counts[t] || 0) + 1;
            });
        }
    });
    return counts;
}

function render() {
    const todayFile = `${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}`;
    
    // 更新狀態
    document.getElementById('totalCount').textContent = allArticles.length;
    document.getElementById('todayCount').textContent = getArticlesByDate(todayFile).length;
    document.getElementById('lastUpdate').textContent = dateList[0] ? formatDate(dateList[0]) : '--';
    
    // 渲染日期頁籤（用 YYYYMMDD 判斷是否為今日）
    const dateTabs = document.getElementById('dateTabs');
    dateTabs.innerHTML = dateList.map(f => {
        const isToday = f === todayFile;
        const label = isToday ? '今日' : `${f.substring(4,6)}/${f.substring(6,8)}`;
        return `<button class="tab ${f === activeDate ? 'active' : ''}" onclick="selectDate('${f}')">${label}</button>`;
    }).join('');
    
    // 渲染標籤雲（只顯示超過3篇文章的標籤）
    const counts = getTagCounts(activeDate);
    const tagCloud = document.getElementById('tagCloud');
    tagCloud.innerHTML = Object.entries(counts)
        .filter(([tag, count]) => count >= 3)
        .sort((a,b) => b[1] - a[1])
        .map(([tag, count]) => 
            `<span class="tag ${tag === activeTag ? 'active' : ''}" onclick="selectTag('${tag}')">
                ${tag}<span class="count">${count}</span>
            </span>`
        ).join('');
    
    // 渲染文章
    let articles = getArticlesByDate(activeDate);
    if (activeTag) {
        articles = articles.filter(a => a.tags && a.tags.includes(activeTag));
    }
    
    const articlesDiv = document.getElementById('articles');
    if (articles.length === 0) {
        articlesDiv.innerHTML = '<div class="empty">目前沒有文章</div>';
    } else {
        articlesDiv.innerHTML = articles.map(a => `
            <div class="article">
                <div class="article-header">
                    <span class="article-title">${a.title}</span>
                    <span class="article-time">${a.time || ''}</span>
                </div>
                <div class="article-tags">
                    ${(a.tags || []).map(t => `<span class="article-tag">${t}</span>`).join('')}
                </div>
                <div class="article-summary">${a.summary || ''}</div>
            </div>
        `).join('');
    }
}

function selectDate(dateFile) {
    activeDate = dateFile;
    activeTag = null;
    render();
}

function selectTag(tag) {
    activeTag = activeTag === tag ? null : tag;
    render();
}

function search() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!query) {
        render();
        return;
    }
    
    const results = allArticles.filter(a => 
        (a.title && a.title.toLowerCase().includes(query)) || 
        (a.summary && a.summary.toLowerCase().includes(query))
    );
    
    const articlesDiv = document.getElementById('articles');
    if (results.length === 0) {
        articlesDiv.innerHTML = '<div class="empty">找不到符合的文章</div>';
    } else {
        articlesDiv.innerHTML = results.map(a => `
            <div class="article">
                <div class="article-header">
                    <span class="article-title">${a.title}</span>
                    <span class="article-time">${a.date || ''} ${a.time || ''}</span>
                </div>
                <div class="article-tags">
                    ${(a.tags || []).map(t => `<span class="article-tag">${t}</span>`).join('')}
                </div>
                <div class="article-summary">${a.summary || ''}</div>
            </div>
        `).join('');
    }
}

// 鍵盤 Enter 搜尋
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('searchInput');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') search();
        });
    }
    loadAllData();
});
