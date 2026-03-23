// 知識庫系統 - Oren 黑輪
let allArticles = [];
let activeDate = null;
let activeTag = null;
let dateList = [];

// 格式化日期：20260323 → 2026-03-23
function formatDate(filename) {
    const y = filename.substring(0, 4);
    const m = filename.substring(4, 6);
    const d = filename.substring(6, 8);
    return `${y}-${m}-${d}`;
}

// 從 URL 讀取所有 JSON 檔案
async function loadAllData() {
    allArticles = [];
    dateList = [];
    
    try {
        // 嘗試載入最近7天的資料
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const filename = `${y}${m}${d}`;
            const dateStr = formatDate(filename);
            
            try {
                const response = await fetch(`data/${filename}.json`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.articles && Array.isArray(data.articles)) {
                        allArticles = allArticles.concat(data.articles);
                        dateList.push(dateStr);
                    }
                }
            } catch (e) {
                // 檔案不存在，忽略
            }
        }
        
        // 排序日期（最新在前）
        dateList = dateList.sort().reverse();
        
        // 預設選今天
        const todayStr = formatDate(`${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`);
        activeDate = dateList.includes(todayStr) ? todayStr : (dateList[0] || null);
        
    } catch (e) {
        console.error('載入資料失敗:', e);
    }
    
    render();
}

function getArticlesByDate(date) {
    return allArticles.filter(a => a.date === date);
}

function getTagCounts(date) {
    const counts = {};
    const articles = date ? getArticlesByDate(date) : allArticles;
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
    // 更新狀態
    document.getElementById('totalCount').textContent = allArticles.length;
    document.getElementById('todayCount').textContent = 
        getArticlesByDate(activeDate).length;
    document.getElementById('lastUpdate').textContent = 
        dateList[0] || '--';
    
    // 渲染日期頁籤
    const dateTabs = document.getElementById('dateTabs');
    dateTabs.innerHTML = dateList.map(d => {
        const label = d === activeDate ? '今日' : d.substring(5).replace('-', '/');
        return `<button class="tab ${d === activeDate ? 'active' : ''}" onclick="selectDate('${d}')">${label}</button>`;
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

function selectDate(date) {
    activeDate = date;
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
                    <span class="article-time">${a.date} ${a.time || ''}</span>
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
