// 加密貨幣模組 - Oren 黑輪
// 資料由 Cron 每 10 分鐘抓取，前端只 fetch price.json（無 API key）

const SYMBOL_MAP = {
    TAO: { symbol: "TAO", tv: "COINBASE:TAOUSD", name: "Bittensor", coinId: "bittensor" },
    FET: { symbol: "FET", tv: "COINBASE:FINFETUSD", name: "Fetch.ai", coinId: "fetch-ai" },
};

// 動態抓回的資料（熱門成交量 / 市值），需要時再 fetch
let marketCache = { data: null, ts: 0 };
const MARKET_CACHE_TTL = 10 * 60 * 1000; // 10 分鐘

// 對應標籤 → 文章關鍵字
const TAG_COIN_MAP = {
    TAO: ["TAO", "Bittensor", "bittensor", "神經網路", "AI挖礦"],
    FET: ["FET", "Fetch.ai", "fetch-ai", "AI Agent"],
};

// ========================================
// 初始化：點擊頁籤後切換內容
// ========================================
async function initCrypto() {
    const tabs = document.querySelectorAll(".crypto-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".crypto-tab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            document.querySelectorAll(".crypto-content").forEach(c => c.classList.remove("active"));
            const content = document.getElementById("tab-" + tab.dataset.tab);
            content.classList.add("active");

            const key = tab.dataset.tab;
            if (key === "TOPVOL" || key === "TOPMCAP") {
                loadDynamicTab(key, content);
            } else {
                loadCoinTab(key, content);
            }
        });
    });

    // 初始載入第一個 tab
    const firstContent = document.getElementById("tab-TAO");
    await loadCoinTab("TAO", firstContent);
}

// ========================================
// 載入靜態幣種（TAO / FET）— fetch price.json
// ========================================
async function loadCoinTab(key, container) {
    container.innerHTML = `<div class="loading"><div class="loading-spinner"></div> 載入中...</div>`;
    try {
        const coin = SYMBOL_MAP[key];
        const [priceData, article] = await Promise.all([
            fetchPriceJson(),
            findRelatedArticle(key),
        ]);

        const coinData = priceData?.coins?.find(c => c.coinId === coin.coinId);
        const price = coinData?.price ? `$${Number(coinData.price).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "--";
        const change = coinData?.change_24h || 0;
        const changeClass = change >= 0 ? "up" : "down";
        const changeTxt = change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;

        container.innerHTML = `
            <div class="coin-info">
                <span class="coin-name">${coin.name}</span>
                <span class="coin-price">${price}</span>
                <span class="coin-change ${changeClass}">${changeTxt}</span>
                <span class="coin-badge">${key}</span>
            </div>
            <div class="chart-container">
                <iframe
                    src="https://s.tradingview.com/widgetembed/?frameElementId=chart&symbol=${coin.tv}&interval=240&hidesidetoolbar=0&hidetoptoolbar=0&allowto="
                    allowfullscreen
                    title="${coin.name} 4H Chart"
                ></iframe>
            </div>
            ${article ? `
                <div class="news-card">
                    <div class="news-title">📰 ${article.title}</div>
                    <div class="news-summary">${article.summary}</div>
                    <div class="news-tags">
                        ${(article.tags || []).map(t => `<span class="news-tag">${t}</span>`).join('')}
                    </div>
                </div>
            ` : `<div style="color:#666;text-align:center;padding:20px;">目前沒有相關文章</div>`}
        `;
    } catch (e) {
        container.innerHTML = `<div class="error-msg">載入失敗：${e.message}</div>`;
    }
}

// ========================================
// 載入動態幣種（熱門成交量 / 市值）
// ========================================
async function loadDynamicTab(key, container) {
    container.innerHTML = `<div class="loading"><div class="loading-spinner"></div> 抓取排名中...</div>`;
    try {
        // 用 price.json 裡的 volume / market_cap 判斷（不走額外 API）
        const priceData = await fetchPriceJson();
        if (!priceData?.coins) throw new Error("找不到價格資料");

        const sorted = [...priceData.coins];
        if (key === "TOPVOL") {
            sorted.sort((a, b) => (b.volume_24h || 0) - (a.volume_24h || 0));
        } else {
            sorted.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
        }

        const top = sorted[0];
        if (!top) throw new Error("找不到資料");

        const tvSymbol = top.symbol.toUpperCase() + "USDT";
        const change = Number(top.change_24h) || 0;
        const changeClass = change >= 0 ? "up" : "down";
        const changeTxt = change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;
        const rankLabel = key === "TOPVOL" ? "成交量龍頭" : "市值龍頭";
        const coinKey = top.symbol.toUpperCase();

        const article = await findRelatedArticle(coinKey);

        container.innerHTML = `
            <div class="coin-info">
                <span class="coin-name">${top.name}</span>
                <span class="coin-price">$${Number(top.price).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                <span class="coin-change ${changeClass}">${changeTxt}</span>
                <span class="coin-badge">${rankLabel}</span>
            </div>
            <div class="chart-container">
                <iframe
                    src="https://s.tradingview.com/widgetembed/?frameElementId=chart&symbol=BINANCE:${tvSymbol}&interval=240&hidesidetoolbar=0&hidetoptoolbar=0&allowto="
                    allowfullscreen
                    title="${top.name} 4H Chart"
                ></iframe>
            </div>
            ${article ? `
                <div class="news-card">
                    <div class="news-title">📰 ${article.title}</div>
                    <div class="news-summary">${article.summary}</div>
                    <div class="news-tags">
                        ${(article.tags || []).map(t => `<span class="news-tag">${t}</span>`).join('')}
                    </div>
                </div>
            ` : `<div style="color:#666;text-align:center;padding:20px;">目前沒有相關文章</div>`}
        `;
    } catch (e) {
        container.innerHTML = `<div class="error-msg">載入失敗：${e.message}</div>`;
    }
}

// ========================================
// fetch price.json（含 TAO / FET 價格，無 key）
// ========================================
async function fetchPriceJson() {
    try {
        const resp = await fetch("data/price.json");
        if (!resp.ok) return null;
        return await resp.json();
    } catch (e) {
        console.error("[crypto] price.json fetch error:", e);
        return null;
    }
}

// ========================================
// 從已載入的 JSON 中找相關文章
// ========================================
async function findRelatedArticle(coinKey) {
    try {
        await new Promise(resolve => {
            if (window.allArticlesLoaded) resolve();
            else {
                const check = setInterval(() => {
                    if (window.allArticlesLoaded) { clearInterval(check); resolve(); }
                }, 200);
                setTimeout(() => clearInterval(check), 5000);
            }
        });

        const keywords = TAG_COIN_MAP[coinKey] || [coinKey];
        const articles = window.allArticles || [];

        let match = articles.find(a =>
            a.title && keywords.some(k => a.title.includes(k))
        );
        if (!match) {
            match = articles.find(a =>
                a.tags && keywords.some(k => a.tags.some(t => t.toLowerCase().includes(k.toLowerCase())))
            );
        }
        if (!match) {
            match = articles[0] || null;
        }
        return match;
    } catch (e) {
        return null;
    }
}

// ========================================
// 啟動
// ========================================
window.addEventListener("DOMContentLoaded", () => {
    window.cryptoReady = true;
    initCrypto();
});
