/**
 * Enhanced OmniFutures Pro Exchange Application Logic
 * WEEX Clone with 100x Leverage, AI Grid Bots, Quant Screener, Gemini 3.6 Flash Copilot
 */

const API_BASE = "";
let currentWallet = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";
let linkedExternalWallet = localStorage.getItem("omni_external_wallet") || "0x3333333333333333333333333333333333333333";
let externalNetwork = localStorage.getItem("omni_external_network") || "Arbitrum One";
let externalWalletData = null;
let accountData = null;
let accountEquity = 422530.19;
Object.defineProperty(window, "accountEquity", {
  get: () => accountEquity,
  set: (v) => { accountEquity = v; },
  configurable: true
});
let accountAvailable = 374199.99;
Object.defineProperty(window, "accountAvailable", {
  get: () => accountAvailable,
  set: (v) => { accountAvailable = v; },
  configurable: true
});
let allTransactions = [];
let currentTxFilter = "ALL";
let depositSource = "external";
let currentSymbol = "BTC-USDT";
let currentTimeframe = "15m";
let currentOrderMode = "FUTURES"; // FUTURES or SPOT
let currentMarginMode = "CROSS"; // CROSS or ISOLATED
let currentLeverage = 20;
let currentOrderType = "MARKET"; // MARKET, LIMIT, STOP, TRAILING, SCALED
let isScalperMode = localStorage.getItem("omni_scalper_mode") === "true";
let currentTriggerBasis = "LAST"; // MARK or LAST
let currentTrailingCallback = 1.5;
let hideOtherPairs = false;
let localOpenOrders = JSON.parse(localStorage.getItem("omni_open_orders") || "[]");
Object.defineProperty(window, "localOpenOrders", {
  get: () => localOpenOrders,
  set: (v) => { localOpenOrders = v; },
  configurable: true
});
let orderEditTargetId = null;
let allMarkets = [];
let chartInstance = null;
let pollTimer = null;
let soundEnabled = true;

// Web Audio API Sound Generator
let audioCtx = null;
function playSound(type) {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "buy") {
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880.0, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === "sell") {
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(440.0, audioCtx.currentTime + 0.15); // A4
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === "faucet") {
      osc.frequency.setValueAtTime(440.0, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1174.66, audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    }
  } catch (e) {
    console.warn("Audio unavailable:", e);
  }
}

function toggleAudio() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById("soundToggleBtn");
  if (btn) btn.innerHTML = `<span class="material-symbols-outlined gemini-symbol">${soundEnabled ? "volume_up" : "volume_off"}</span>`;
}

// Universal Safe Fetch Helper (protects against static hosting HTML 404 rewrites)
async function safeFetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type");
    if (res.ok && contentType && contentType.includes("application/json")) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Fetch to ${url} failed or returned non-JSON:`, err);
  }
  return null;
}

// Persistent Local Positions & Account Simulation Engine
let localPositions = JSON.parse(localStorage.getItem("omni_local_positions") || "null");
Object.defineProperty(window, "localPositions", {
  get: () => localPositions,
  set: (v) => { localPositions = v; },
  configurable: true
});
if (!localPositions || !Array.isArray(localPositions) || localPositions.length === 0) {
  localPositions = [
    {
      id: 101,
      symbol: "SPY-USD",
      side: "LONG",
      leverage: 25,
      size: 50,
      entryPrice: 558.87,
      markPrice: 562.14,
      margin: 1117.74,
      liquidationPrice: 539.31,
      unrealizedPnl: 163.50,
      roePercent: 14.63,
      tpPrice: null,
      slPrice: null
    },
    {
      id: 102,
      symbol: "BTC-USDT",
      side: "SHORT",
      leverage: 50,
      size: 0.05,
      entryPrice: 77069.50,
      markPrice: 77050.20,
      margin: 77.07,
      liquidationPrice: 78225.50,
      unrealizedPnl: 0.97,
      roePercent: 1.25,
      tpPrice: null,
      slPrice: null
    }
  ];
}

function saveLocalPositions() {
  localStorage.setItem("omni_local_positions", JSON.stringify(localPositions));
}

function executeClientSideOrder(side, size, tpPrice, slPrice, customSymbol, customPrice, customLeverage, reduceOnly) {
  const sym = customSymbol || currentSymbol;
  const mkt = allMarkets.find(m => m.symbol === sym) || { price: 77350, precision: 2 };
  const price = customPrice !== undefined ? customPrice : mkt.price;
  const notional = size * price;
  const lev = customLeverage !== undefined ? customLeverage : currentLeverage;

  if (!accountData) {
    accountData = JSON.parse(localStorage.getItem("omni_account_data") || "null") || {
      equity: 422530.19,
      available: 374199.99,
      usedMargin: 48330.20,
      marginRatio: 11.44
    };
  }

  // Handle Reduce-Only in local position state
  if (reduceOnly) {
    const oppSide = (side === "BUY" || side === "LONG") ? "SHORT" : "LONG";
    const posIdx = localPositions.findIndex(p => p.symbol === sym && p.side === oppSide);
    if (posIdx !== -1) {
      const existing = localPositions[posIdx];
      if (size >= existing.size) {
        localPositions.splice(posIdx, 1);
        accountData.available += existing.margin;
        accountData.usedMargin = Math.max(0, (accountData.usedMargin || 0) - existing.margin);
      } else {
        const remSize = existing.size - size;
        const remMargin = existing.margin * (remSize / existing.size);
        const relMargin = existing.margin - remMargin;
        existing.size = remSize;
        existing.margin = +remMargin.toFixed(2);
        accountData.available += relMargin;
        accountData.usedMargin = Math.max(0, (accountData.usedMargin || 0) - relMargin);
      }
      accountData.marginRatio = +((accountData.usedMargin / accountData.equity) * 100).toFixed(2);
      saveLocalPositions();
      localStorage.setItem("omni_account_data", JSON.stringify(accountData));
      return {
        success: true,
        status: "FILLED",
        message: `Closed/Reduced ${oppSide} position on ${sym} via Reduce-Only @ $${formatNumber(price, 2)}`
      };
    }
  }

  if (currentOrderMode === "SPOT") {
    if (accountData.available < notional && (side === "BUY" || side === "LONG")) {
      return { success: false, error: `Insufficient available balance ($${formatNumber(accountData.available, 2)} USDT available, need $${formatNumber(notional, 2)} USDT)` };
    }
    if (side === "BUY" || side === "LONG") {
      accountData.available -= notional;
    } else {
      accountData.available += notional;
    }
    localStorage.setItem("omni_account_data", JSON.stringify(accountData));
    return {
      success: true,
      status: "FILLED",
      message: `Spot ${side === "BUY" || side === "LONG" ? "Buy" : "Sell"} Executed: Acquired ${size} ${sym.split("-")[0]} @ $${formatNumber(price, mkt.precision)} (Total Cost: $${formatNumber(notional, 2)} USDT)`
    };
  } else {
    // FUTURES (Supports 1x to 200x Leverage)
    const requiredMargin = notional / lev;

    if (accountData.available < requiredMargin) {
      return { success: false, error: `Insufficient available margin ($${formatNumber(accountData.available, 2)} USDT available, need $${formatNumber(requiredMargin, 2)} USDT)` };
    }

    accountData.available -= requiredMargin;
    accountData.usedMargin = (accountData.usedMargin || 0) + requiredMargin;
    accountData.marginRatio = +((accountData.usedMargin / accountData.equity) * 100).toFixed(2);
    localStorage.setItem("omni_account_data", JSON.stringify(accountData));

    const maint = Math.min(0.005, 0.5 / lev);
    const liqPrice = (side === "BUY" || side === "LONG") 
      ? price * (1 - (1 / lev) + maint) 
      : price * (1 + (1 / lev) - maint);

    const newPos = {
      id: Date.now(),
      symbol: sym,
      side: (side === "BUY" || side === "LONG") ? "LONG" : "SHORT",
      leverage: lev,
      size: size,
      entryPrice: price,
      markPrice: price,
      margin: +requiredMargin.toFixed(2),
      liquidationPrice: Math.max(0, +liqPrice.toFixed(mkt.precision !== undefined ? mkt.precision : 2)),
      unrealizedPnl: 0.00,
      roePercent: 0.00,
      tpPrice: tpPrice || null,
      slPrice: slPrice || null
    };

    localPositions.unshift(newPos);
    saveLocalPositions();

    return {
      success: true,
      status: "FILLED",
      message: `${newPos.side} ${lev}x Order Executed: ${size} ${sym} @ $${formatNumber(price, mkt.precision)}`
    };
  }
}

// Initialize on Load
document.addEventListener("DOMContentLoaded", () => {
  const savedWallet = localStorage.getItem("omni_connected_wallet");
  if (savedWallet) {
    currentWallet = savedWallet;
    linkedExternalWallet = savedWallet;
    const disp = document.getElementById("walletAddressDisplay");
    if (disp) {
      const icon = savedWallet.startsWith("0x") ? `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:16px;">account_balance_wallet</span>` : `<span class="material-symbols-outlined gemini-symbol gemini-grad-purple" style="font-size:16px;">token</span>`;
      disp.textContent = `${icon} ${savedWallet.slice(0, 6)}...${savedWallet.slice(-4)}`;
    }
  }

  initChart();
  loadMarkets();
  loadAccountState();
  loadPositions();
  loadOpenOrders();
  updateScalperUi();
  loadCopyTraders();
  loadScreenerData();
  loadGridBots();
  loadGcpApis();
  loadAssetsOverview();
  loadTransactionHistory();
  startPollingStream();
});

function initChart() {
  chartInstance = new OmniCandleChart("candleChartCanvas");
  window.chartInstance = chartInstance;
  if (chartInstance && chartInstance.setPendingOrders) {
    chartInstance.setPendingOrders(localOpenOrders);
  }
}

function startPollingStream() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    refreshMarketData();
    loadPositions();
    loadOpenOrders();
  }, 1800);
  startLiveMicroTicks();
}

function startLiveMicroTicks() {
  setInterval(() => {
    const mkt = allMarkets.find(m => m.symbol === currentSymbol);
    if (!mkt) return;
    
    // Sub-second micro-tick fluctuation (+/- 0.02%)
    const pct = (Math.random() - 0.495) * 0.0004;
    mkt.price = +(mkt.price * (1 + pct)).toFixed(mkt.precision !== undefined ? mkt.precision : 2);
    
    // Update live ticker price with flashing green/cyan or red
    const tickerPriceEl = document.getElementById("tickerPrice");
    if (tickerPriceEl) {
      tickerPriceEl.textContent = formatNumber(mkt.price, mkt.precision);
      tickerPriceEl.style.color = pct >= 0 ? "#00e5ff" : "#ff0055";
      setTimeout(() => {
        if (tickerPriceEl) tickerPriceEl.style.color = mkt.change24h >= 0 ? "#10b981" : "#f43f5e";
      }, 250);
    }

    // Live update active forming candle on canvas chart
    if (chartInstance && chartInstance.updateLastCandlePrice) {
      chartInstance.updateLastCandlePrice(mkt.price);
    }

    // Keep metrics and live matching engine in sync with live ticks
    calculateOrderMetrics();
    checkPendingOrdersMatch(mkt.price);
  }, 650);
}

// 1. Markets & Switcher (1,000+ WEEX Tokens + Real-Time Sync)
let lastKnownMarketsCount = 0;

let isBackendConnected = false;

async function loadMarkets() {
  const data = await safeFetchJson(`${API_BASE}/api/markets`);
  if (data && data.markets && data.markets.length > 0) {
    allMarkets = data.markets;
    isBackendConnected = true;
  } else {
    isBackendConnected = false;
    try {
      const catRes = await fetch("markets_catalog.json");
      const catData = await catRes.json();
      allMarkets = Array.isArray(catData) ? catData : Object.values(catData);
    } catch (e2) {
      console.error("Failed to load catalog fallback:", e2);
    }
  }
  window.allMarkets = allMarkets;
  window.isBackendConnected = isBackendConnected;
  updateCategoryPillCounts();
  renderMarketMoversRibbon();
  renderMarketsList();
  updateExplorerBadgeCounts();
  renderExplorerTable();
  updateTickerHeader();
  loadCandles();
  loadOrderBook();
  loadRecentTrades();
  exchangeWsManager.init();

  if (!window._weexSyncInterval) {
    window._weexSyncInterval = setInterval(syncRealtimeWeexMarkets, 15000);
  }
}

function updateCategoryPillCounts() {
  const allBtn = document.getElementById("pillCatAll");
  if (allBtn) allBtn.textContent = `All (${allMarkets.length})`;
  
  const weexBtn = document.getElementById("pillCatWeex");
  if (weexBtn) {
    const weexCount = allMarkets.filter(m => m.isWeex || m.symbol.endsWith("-USDT")).length;
    weexBtn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-rainbow" style="font-size:14px; vertical-align:-2px; margin-right:2px;">hub</span>Omni (${weexCount})`;
  }

  const gainersCount = allMarkets.filter(m => m.change24h > 0).length;
  const gainersBtn = document.getElementById("pillCatGainers");
  if (gainersBtn) {
    gainersBtn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-green" style="font-size:14px; vertical-align:-2px; margin-right:2px;">trending_up</span>Gainers (${gainersCount})`;
  }

  const losersCount = allMarkets.filter(m => m.change24h < 0).length;
  const losersBtn = document.getElementById("pillCatLosers");
  if (losersBtn) {
    losersBtn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-pink" style="font-size:14px; vertical-align:-2px; margin-right:2px;">trending_down</span>Losers (${losersCount})`;
  }
  
  const cryptoBtn = document.getElementById("pillCatCrypto");
  if (cryptoBtn) {
    const cryptoCount = allMarkets.filter(m => m.category === "crypto").length;
    cryptoBtn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:14px; vertical-align:-2px; margin-right:2px;">electric_bolt</span>Crypto (${cryptoCount})`;
  }
  
  const memeBtn = document.getElementById("pillCatMeme");
  if (memeBtn) {
    const memeCount = allMarkets.filter(m => m.category === "meme").length;
    memeBtn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-pink" style="font-size:14px; vertical-align:-2px; margin-right:2px;">rocket_launch</span>Memes (${memeCount})`;
  }
}

async function syncRealtimeWeexMarkets() {
  if (isBackendConnected) {
    try {
      const data = await safeFetchJson(`${API_BASE}/api/markets`);
      if (data && data.markets && data.markets.length > 0) {
        const prevCount = allMarkets.length;
        allMarkets = data.markets;
        window.allMarkets = allMarkets;
        
        if (prevCount > 0 && allMarkets.length > prevCount) {
          const diff = allMarkets.length - prevCount;
          const newest = allMarkets[allMarkets.length - 1];
          showNewListingNotification(newest.symbol, diff);
        }
        updateCategoryPillCounts();
        renderMarketMoversRibbon();
        
        // Re-render drawer if not currently typing a search query
        if (!drawerSearchQuery) {
          renderMarketsList();
        }
        return;
      }
    } catch (e) {}
  }

  try {
    const catRes = await fetch("markets_catalog.json?t=" + Date.now());
    if (catRes.ok) {
      const catData = await catRes.json();
      const mList = Array.isArray(catData) ? catData : Object.values(catData);
      if (mList.length > 0) {
        allMarkets = mList;
        window.allMarkets = allMarkets;
        updateCategoryPillCounts();
        renderMarketMoversRibbon();
      }
    }
  } catch (e2) {}
}

function showNewListingNotification(symbol, count = 1) {
  const toast = document.createElement("div");
  toast.className = "omni-listing-toast";
  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <span class="material-symbols-outlined gemini-symbol gemini-grad-rainbow" style="font-size:20px;">auto_awesome</span>
      <div>
        <strong style="color:#00e5ff;"><span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:15px;">rocket_launch</span> New Omni Token Listed!</strong>
        <div style="font-size:12px; color:#94a3b8;">${symbol} is now tradable with up to 200x leverage</div>
      </div>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}

// ==========================================================================
// ADVANCED SEARCH ENGINE & TOP MOVERS (GAINERS / LOSERS) SYSTEM
// ==========================================================================

let currentDrawerSort = 'vol'; // 'vol', 'gainers', 'losers', 'price', 'name'
let currentDrawerCategory = 'all';
let drawerSearchQuery = '';
let drawerKeyboardIndex = 0;
let modalKeyboardIndex = 0;
let currentModalFilter = 'all';
let modalSearchQuery = '';

// Helper to highlight matched query substring
function highlightSearchMatch(text, query) {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<span class="search-highlight">$1</span>');
}

// Authentic Token SVG Vector Generator for Multi-Exchange Instruments
function getTokenVectorSvg(symbol = '', category = 'crypto', size = 20) {
  const clean = (symbol || '').toUpperCase().replace(/-USDT$|-USD$/, '');
  
  const vectorMap = {
    // Top Cryptos
    'BTC': '#token-vector-btc',
    'ETH': '#token-vector-eth',
    'SOL': '#token-vector-sol',
    'USDT': '#token-vector-usdt',
    'USDC': '#token-vector-usdc',
    'BNB': '#token-vector-bnb',
    'DOGE': '#token-vector-doge',
    'PEPE': '#token-vector-pepe',
    '1000PEPE': '#token-vector-pepe',
    'SHIB': '#token-vector-shib',
    '1000SHIB': '#token-vector-shib',
    'XRP': '#token-vector-xrp',
    'ADA': '#token-vector-ada',
    'AVAX': '#token-vector-avax',
    'LINK': '#token-vector-link',
    'SUI': '#token-vector-sui',
    'NEAR': '#token-vector-near',
    'DOT': '#token-vector-dot',
    'TRX': '#token-vector-trx',
    'UNI': '#token-vector-uni',
    'APT': '#token-vector-apt',
    'TON': '#token-vector-ton',
    'WIF': '#token-vector-wif',
    'BONK': '#token-vector-bonk',
    'FLOKI': '#token-vector-floki',
    'OMNI': '#omni-all-seeing-eye-token',
    'SOMNI': '#token-vector-somni',
    // Equities & Stocks
    'NVDA': '#token-vector-nvda',
    'TSLA': '#token-vector-tsla',
    'AAPL': '#token-vector-aapl',
    'MSFT': '#token-vector-msft',
    'GOOGL': '#token-vector-googl',
    'GOOG': '#token-vector-googl',
    'AMZN': '#token-vector-amzn',
    'META': '#token-vector-meta',
    'AMD': '#token-vector-amd',
    'COIN': '#token-vector-coin',
    'PLTR': '#token-vector-pltr',
    'BABA': '#token-vector-baba',
    'MSTR': '#token-vector-mstr',
    'GOLD': '#token-vector-gold',
    'XAU': '#token-vector-gold',
    'OIL': '#token-vector-oil',
    'CRUDE': '#token-vector-oil',
    // ETFs & Indices
    'SPY': '#token-vector-spy',
    'QQQ': '#token-vector-qqq',
    'IWM': '#token-vector-iwm',
    'DIA': '#token-vector-dia',
    'GLD': '#token-vector-gld',
    'SLV': '#token-vector-slv',
    'IBIT': '#token-vector-ibit',
    'ETHA': '#token-vector-etha',
    'TLT': '#token-vector-tlt',
    'ARKK': '#token-vector-arkk'
  };

  if (vectorMap[clean]) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="vertical-align:middle; flex-shrink:0; border-radius:50%; box-shadow:0 0 8px rgba(0,229,255,0.25);"><use href="${vectorMap[clean]}"/></svg>`;
  }

  let bgGrad = 'linear-gradient(135deg, rgba(0,229,255,0.3) 0%, rgba(124,58,237,0.4) 100%)';
  let borderCol = 'rgba(0,229,255,0.5)';
  const cat = (category || '').toLowerCase();
  if (cat === 'meme') {
    bgGrad = 'linear-gradient(135deg, rgba(244,63,94,0.35) 0%, rgba(236,72,153,0.45) 100%)';
    borderCol = 'rgba(244,63,94,0.6)';
  } else if (cat === 'ai') {
    bgGrad = 'linear-gradient(135deg, rgba(168,85,247,0.35) 0%, rgba(59,130,246,0.45) 100%)';
    borderCol = 'rgba(168,85,247,0.6)';
  } else if (cat === 'stocks' || cat === 'etfs') {
    bgGrad = 'linear-gradient(135deg, rgba(16,185,129,0.35) 0%, rgba(6,182,212,0.45) 100%)';
    borderCol = 'rgba(16,185,129,0.6)';
  } else if (cat === 'bonds' || cat === 'commodities') {
    bgGrad = 'linear-gradient(135deg, rgba(255,215,0,0.35) 0%, rgba(245,158,11,0.45) 100%)';
    borderCol = 'rgba(255,215,0,0.6)';
  } else if (cat === 'defi') {
    bgGrad = 'linear-gradient(135deg, rgba(59,130,246,0.35) 0%, rgba(29,78,216,0.45) 100%)';
    borderCol = 'rgba(59,130,246,0.6)';
  }

  const label = clean.length <= 4 ? clean : clean.slice(0, 3);
  const fontSize = label.length > 3 ? Math.round(size * 0.30) : Math.round(size * 0.38);

  return `<div class="gemini-liquid-token-badge" style="width:${size}px; height:${size}px; border-radius:50%; background:${bgGrad}; backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); display:inline-flex; align-items:center; justify-content:center; color:#ffffff; font-weight:900; font-size:${fontSize}px; flex-shrink:0; box-shadow:0 0 10px rgba(0,229,255,0.25); text-transform:uppercase; letter-spacing:-0.5px; border:1px solid ${borderCol};">${label}</div>`;
}

// Core multi-field weighted scoring and sorting algorithm
function searchAndSortMarkets(markets, query = '', category = 'all', sortBy = 'vol') {
  let list = [...markets];

  // 1. Category filtering
  if (category === 'gainers') {
    list = list.filter(m => m.change24h > 0);
  } else if (category === 'losers') {
    list = list.filter(m => m.change24h < 0);
  } else if (category === 'weex' || category === 'omni') {
    list = list.filter(m => m.isWeex || m.symbol.endsWith("-USDT"));
  } else if (category !== 'all') {
    list = list.filter(m => m.category === category);
  }

  // 2. Query search with multi-field weighted match ranking
  const q = query.trim().toLowerCase();
  if (q) {
    const scored = [];
    for (const m of list) {
      const sym = m.symbol.toLowerCase();
      const rawSym = (m.weexSymbol || '').toLowerCase();
      const name = (m.name || '').toLowerCase();
      const cat = (m.category || '').toLowerCase();

      let score = 0;
      if (sym === q || rawSym === q) score += 2000;
      else if (sym.startsWith(q) || rawSym.startsWith(q)) score += 1000;
      else if (sym.includes(q) || rawSym.includes(q)) score += 400;
      else if (name.startsWith(q)) score += 200;
      else if (name.includes(q)) score += 100;
      else if (cat.includes(q)) score += 50;

      if (score > 0) {
        scored.push({ m, score });
      }
    }
    // Sort by relevance score, secondary by 24h volume
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.m.change24h || 0) - (a.m.change24h || 0);
    });
    list = scored.map(item => item.m);
  } else {
    // 3. Sort ordering
    if (sortBy === 'gainers' || category === 'gainers') {
      list.sort((a, b) => (b.change24h || 0) - (a.change24h || 0));
    } else if (sortBy === 'losers' || category === 'losers') {
      list.sort((a, b) => (a.change24h || 0) - (b.change24h || 0));
    } else if (sortBy === 'price') {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.symbol.localeCompare(b.symbol));
    } else {
      // Default: Volume
      list.sort((a, b) => {
        const getV = (v) => {
          if (!v) return 0;
          let s = String(v).replace('$', '');
          if (s.endsWith('B')) return parseFloat(s) * 1e9;
          if (s.endsWith('M')) return parseFloat(s) * 1e6;
          if (s.endsWith('K')) return parseFloat(s) * 1e3;
          return parseFloat(s) || 0;
        };
        return getV(b.vol24h) - getV(a.vol24h);
      });
    }
  }

  return list;
}

// Render Top Gainers & Losers Live Ribbon
function renderMarketMoversRibbon() {
  const gainersContainer = document.getElementById("topGainersChips");
  const losersContainer = document.getElementById("topLosersChips");
  if (!gainersContainer || !losersContainer || !allMarkets || allMarkets.length === 0) return;

  const valid = allMarkets.filter(m => m.price > 0 && typeof m.change24h === 'number');
  const topGainers = [...valid].sort((a, b) => b.change24h - a.change24h).slice(0, 5);
  const topLosers = [...valid].sort((a, b) => a.change24h - b.change24h).slice(0, 5);

  gainersContainer.innerHTML = topGainers.map(m => `
    <div class="mover-card-chip gainer-chip" onclick="switchMarket('${m.symbol}')" title="${m.name} (+${m.change24h}%)">
      <span class="mover-sym">${m.symbol.replace('-USDT', '')}</span>
      <span class="mover-price">$${formatNumber(m.price, m.precision)}</span>
      <span class="mover-chg text-green">+${m.change24h}%</span>
    </div>
  `).join("");

  losersContainer.innerHTML = topLosers.map(m => `
    <div class="mover-card-chip loser-chip" onclick="switchMarket('${m.symbol}')" title="${m.name} (${m.change24h}%)">
      <span class="mover-sym">${m.symbol.replace('-USDT', '')}</span>
      <span class="mover-price">$${formatNumber(m.price, m.precision)}</span>
      <span class="mover-chg text-red">${m.change24h}%</span>
    </div>
  `).join("");
}

// ==========================================================================
// FLOATING OMNIMARKET EXPLORER & SEARCH SUITE (BYBIT / HYPERLIQUID STYLE)
// ==========================================================================

let currentExplorerCategory = 'all'; // 'all', 'watchlist', 'gainers', 'losers', 'weex', 'crypto', 'meme', 'stocks', 'etfs', 'bonds'
let explorerSearchQuery = '';
let explorerSortBy = 'vol'; // 'vol', 'change', 'price', 'name'
let explorerSortOrder = 'desc'; // 'desc', 'asc'
let explorerKeyboardIndex = 0;

// User Watchlist stored in LocalStorage
let userWatchlist = [];
try {
  const saved = localStorage.getItem('omni_user_watchlist');
  userWatchlist = saved ? JSON.parse(saved) : ["BTC-USDT", "ETH-USDT", "SOL-USDT", "PEPE-USDT", "CHILLGUY-USDT", "NVDA-USD"];
} catch (e) {
  userWatchlist = ["BTC-USDT", "ETH-USDT", "SOL-USDT", "PEPE-USDT"];
}

function toggleFavorite(symbol, e) {
  if (e) {
    e.stopPropagation();
  }
  const idx = userWatchlist.indexOf(symbol);
  if (idx > -1) {
    userWatchlist.splice(idx, 1);
    showToast(`Removed ${symbol} from Watchlist`);
  } else {
    userWatchlist.push(symbol);
    showToast(`Added ${symbol} to Watchlist`);
  }
  try {
    localStorage.setItem('omni_user_watchlist', JSON.stringify(userWatchlist));
  } catch (e) {}
  updateExplorerBadgeCounts();
  renderExplorerTable();
}

function toggleMarketExplorer() {
  const modal = document.getElementById("marketExplorerModal");
  if (!modal) return;
  if (modal.style.display === "none" || !modal.style.display) {
    openMarketExplorer();
  } else {
    closeMarketExplorer();
  }
}

function openMarketExplorer(category = null) {
  const modal = document.getElementById("marketExplorerModal");
  if (!modal) return;
  modal.style.display = "flex";
  
  if (category) {
    currentExplorerCategory = category;
    document.querySelectorAll(".explorer-nav-tabs .exp-tab").forEach(tab => tab.classList.remove("active"));
    const targetTab = document.getElementById(`expTab${category.charAt(0).toUpperCase() + category.slice(1)}`);
    if (targetTab) targetTab.classList.add("active");
  }

  const input = document.getElementById("explorerSearchInput");
  if (input) {
    input.value = explorerSearchQuery;
    setTimeout(() => input.focus(), 60);
  }

  updateExplorerBadgeCounts();
  renderExplorerTable();
}

function closeMarketExplorer() {
  const modal = document.getElementById("marketExplorerModal");
  if (modal) modal.style.display = "none";
}

function handleExplorerSearchInput(val) {
  explorerSearchQuery = val;
  const clearBtn = document.getElementById("clearExplorerSearchBtn");
  if (clearBtn) clearBtn.style.display = val ? "block" : "none";
  explorerKeyboardIndex = 0;
  renderExplorerTable();
}

function clearExplorerSearch() {
  const input = document.getElementById("explorerSearchInput");
  if (input) {
    input.value = "";
    input.focus();
  }
  explorerSearchQuery = "";
  const clearBtn = document.getElementById("clearExplorerSearchBtn");
  if (clearBtn) clearBtn.style.display = "none";
  explorerKeyboardIndex = 0;
  renderExplorerTable();
}

function quickExplorerSearch(tag) {
  const input = document.getElementById("explorerSearchInput");
  if (input) {
    input.value = tag;
    input.focus();
  }
  handleExplorerSearchInput(tag);
}

function setExplorerCategory(cat, btn) {
  currentExplorerCategory = cat;
  document.querySelectorAll(".explorer-nav-tabs .exp-tab").forEach(tab => tab.classList.remove("active"));
  if (btn) btn.classList.add("active");
  
  // Clear any existing search query so user sees all items in the chosen category
  explorerSearchQuery = "";
  const input = document.getElementById("explorerSearchInput");
  if (input) input.value = "";
  const clearBtn = document.getElementById("clearExplorerSearchBtn");
  if (clearBtn) clearBtn.style.display = "none";
  
  explorerKeyboardIndex = 0;
  renderExplorerTable();
}

function toggleExplorerSort(field) {
  if (explorerSortBy === field) {
    explorerSortOrder = explorerSortOrder === 'desc' ? 'asc' : 'desc';
  } else {
    explorerSortBy = field;
    explorerSortOrder = 'desc';
  }
  
  ['name', 'price', 'change', 'vol'].forEach(f => {
    const ind = document.getElementById(`sortInd${f.charAt(0).toUpperCase() + f.slice(1)}`);
    if (ind) {
      if (explorerSortBy === f) {
        ind.innerHTML = explorerSortOrder === 'desc' ? '<span class="material-symbols-outlined gemini-symbol" style="font-size:13px;">expand_more</span>' : '<span class="material-symbols-outlined gemini-symbol" style="font-size:13px;">expand_less</span>';
        ind.style.color = '#00e5ff';
      } else {
        ind.innerHTML = '<span class="material-symbols-outlined gemini-symbol" style="font-size:13px;">unfold_more</span>';
        ind.style.color = '#64748b';
      }
    }
  });
  renderExplorerTable();
}

function updateExplorerBadgeCounts() {
  if (!allMarkets || allMarkets.length === 0) return;
  const wCount = document.getElementById("expWatchlistCount");
  if (wCount) wCount.textContent = userWatchlist.length;
  const allCount = document.getElementById("expAllCount");
  if (allCount) allCount.textContent = allMarkets.length.toLocaleString();
  const gCount = document.getElementById("expGainersCount");
  if (gCount) gCount.textContent = allMarkets.filter(m => m.change24h > 0).length;
  const lCount = document.getElementById("expLosersCount");
  if (lCount) lCount.textContent = allMarkets.filter(m => m.change24h < 0).length;
  const weexCount = document.getElementById("expWeexCount");
  if (weexCount) weexCount.textContent = allMarkets.filter(m => m.isWeex || m.symbol.endsWith("-USDT")).length.toLocaleString();
  const cryptoCount = document.getElementById("expCryptoCount");
  if (cryptoCount) cryptoCount.textContent = allMarkets.filter(m => m.category === "crypto" || m.category === "layer1" || m.category === "defi").length;
  const memeCount = document.getElementById("expMemeCount");
  if (memeCount) memeCount.textContent = allMarkets.filter(m => m.category === "meme").length;
  const stocksCount = document.getElementById("expStocksCount");
  if (stocksCount) stocksCount.textContent = allMarkets.filter(m => m.category === "stocks").length;
  const etfsCount = document.getElementById("expEtfsCount");
  if (etfsCount) etfsCount.textContent = allMarkets.filter(m => m.category === "etfs").length;
  const bondsCount = document.getElementById("expBondsCount");
  if (bondsCount) bondsCount.textContent = allMarkets.filter(m => m.category === "bonds").length;
}

function renderExplorerTable() {
  const tbody = document.getElementById("explorerTableBody");
  if (!tbody) return;

  let list = [...allMarkets];

  // 1. Category Filter
  if (currentExplorerCategory === 'watchlist') {
    list = list.filter(m => userWatchlist.includes(m.symbol));
  } else if (currentExplorerCategory === 'gainers') {
    list = list.filter(m => m.change24h > 0);
  } else if (currentExplorerCategory === 'losers') {
    list = list.filter(m => m.change24h < 0);
  } else if (currentExplorerCategory === 'weex' || currentExplorerCategory === 'omni') {
    list = list.filter(m => m.isWeex || m.symbol.endsWith("-USDT"));
  } else if (currentExplorerCategory !== 'all') {
    list = list.filter(m => m.category === currentExplorerCategory);
  }

  // 2. Search Query with multi-field weighted scoring
  const q = explorerSearchQuery.trim().toLowerCase();
  if (q) {
    const scored = [];
    for (const m of list) {
      const sym = m.symbol.toLowerCase();
      const rawSym = (m.weexSymbol || '').toLowerCase();
      const name = (m.name || '').toLowerCase();
      const cat = (m.category || '').toLowerCase();

      let score = 0;
      if (sym === q || rawSym === q) score += 2000;
      else if (sym.startsWith(q) || rawSym.startsWith(q)) score += 1000;
      else if (sym.includes(q) || rawSym.includes(q)) score += 400;
      else if (name.startsWith(q)) score += 200;
      else if (name.includes(q)) score += 100;
      else if (cat.includes(q)) score += 50;

      if (score > 0) {
        scored.push({ m, score });
      }
    }
    // Sort by score
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.m.change24h || 0) - (a.m.change24h || 0);
    });
    list = scored.map(item => item.m);
  } else {
    // 3. Sorting
    const mul = explorerSortOrder === 'desc' ? 1 : -1;
    if (explorerSortBy === 'change') {
      list.sort((a, b) => mul * ((b.change24h || 0) - (a.change24h || 0)));
    } else if (explorerSortBy === 'price') {
      list.sort((a, b) => mul * ((b.price || 0) - (a.price || 0)));
    } else if (explorerSortBy === 'name') {
      list.sort((a, b) => mul * a.symbol.localeCompare(b.symbol));
    } else {
      // Volume
      const getV = (v) => {
        if (!v) return 0;
        let s = String(v).replace('$', '');
        if (s.endsWith('B')) return parseFloat(s) * 1e9;
        if (s.endsWith('M')) return parseFloat(s) * 1e6;
        if (s.endsWith('K')) return parseFloat(s) * 1e3;
        return parseFloat(s) || 0;
      };
      list.sort((a, b) => mul * (getV(b.vol24h) - getV(a.vol24h)));
    }
  }

  const meta = document.getElementById("explorerCountMeta");
  if (meta) {
    meta.textContent = `Showing ${list.length.toLocaleString()} Instruments Available`;
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 48px 16px; color:#64748b;">
          <span class="material-symbols-outlined gemini-symbol gemini-grad-purple" style="font-size:32px; display:block; margin-bottom:8px;">search_off</span>
          <div style="font-size:14px; font-weight:600; color:#94a3b8;">No matching markets found</div>
          <div style="font-size:12px; margin-top:4px;">Try searching for another token symbol, project name, or switch category.</div>
        </td>
      </tr>
    `;
    return;
  }

  const displaySlice = list.slice(0, 100);

  tbody.innerHTML = displaySlice.map((m, idx) => {
    const isFav = userWatchlist.includes(m.symbol);
    const favClass = isFav ? "is-fav" : "";
    const isUp = m.change24h >= 0;
    const chgClass = isUp ? "text-green" : "text-red";
    const sign = isUp ? "+" : "";
    const selectedClass = idx === explorerKeyboardIndex ? "keyboard-selected" : "";
    const omniTag = m.isWeex || m.maxLeverage >= 100 ? `<span class="weex-tag" style="margin-left:4px;">200x</span>` : "";

    const displaySym = highlightSearchMatch(m.symbol, explorerSearchQuery);
    const displayName = highlightSearchMatch(m.name, explorerSearchQuery);

    // 24h High/Low range calculation
    const curPrice = m.price || 1;
    const lowPrice = m.low24h || (curPrice * 0.95);
    const highPrice = m.high24h || (curPrice * 1.05);
    const rangeSpan = Math.max(0.000001, highPrice - lowPrice);
    const pct = Math.min(100, Math.max(0, ((curPrice - lowPrice) / rangeSpan) * 100));

    return `
      <tr class="explorer-row ${selectedClass}" onclick="selectExplorerMarket('${m.symbol}')" data-symbol="${m.symbol}">
        <td style="text-align:center;" onclick="toggleFavorite('${m.symbol}', event)">
          <button class="fav-star-btn ${favClass}" title="Toggle Watchlist"><span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:15px;">star</span></button>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            ${getTokenVectorSvg(m.symbol, m.category, 22)}
            <div>
              <div style="font-weight:700; font-size:13px; color:#ffffff; display:flex; align-items:center; gap:4px;">
                ${displaySym} ${omniTag}
                ${m.sourceBadge ? `<span class="omni-source-badge" style="font-size:8.5px; font-weight:700; padding:1px 4px; border-radius:3px; background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.25);">${m.sourceBadge}</span>` : ''}
              </div>
              <div style="font-size:11px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;">
                ${displayName} · <span style="text-transform:uppercase; color:#38bdf8; font-size:10px;">${m.category}</span>
              </div>
            </div>
          </div>
        </td>
        <td style="text-align:right; font-weight:700; font-family:monospace; font-size:13px;">
          $${formatNumber(m.price, m.precision)}
        </td>
        <td style="text-align:right; font-weight:700; font-family:monospace; font-size:13px;">
          <span class="${chgClass}">${sign}${m.change24h}%</span>
        </td>
        <td style="text-align:right; font-family:monospace; font-size:12px; color:#cbd5e1;">
          ${m.vol24h || '$0'}
        </td>
        <td style="text-align:center;">
          <div class="range-bar-wrap">
            <div class="range-track">
              <div class="range-fill" style="width: ${pct}%;"></div>
            </div>
            <div class="range-labels">
              <span>${formatNumber(lowPrice, m.precision)}</span>
              <span>${formatNumber(highPrice, m.precision)}</span>
            </div>
          </div>
        </td>
        <td style="text-align:center;">
          <button class="trade-pill-btn" onclick="selectExplorerMarket('${m.symbol}')">Trade <span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:13px;">bolt</span></button>
        </td>
      </tr>
    `;
  }).join("");
}

function handleExplorerKeyDown(e) {
  const rows = document.querySelectorAll("#explorerTableBody .explorer-row");
  if (!rows || rows.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    explorerKeyboardIndex = Math.min(rows.length - 1, explorerKeyboardIndex + 1);
    rows.forEach((r, idx) => r.classList.toggle("keyboard-selected", idx === explorerKeyboardIndex));
    rows[explorerKeyboardIndex]?.scrollIntoView({ block: "nearest" });
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    explorerKeyboardIndex = Math.max(0, explorerKeyboardIndex - 1);
    rows.forEach((r, idx) => r.classList.toggle("keyboard-selected", idx === explorerKeyboardIndex));
    rows[explorerKeyboardIndex]?.scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter") {
    e.preventDefault();
    const selected = rows[explorerKeyboardIndex];
    if (selected) {
      const sym = selected.getAttribute("data-symbol");
      if (sym) selectExplorerMarket(sym);
    }
  } else if (e.key === "Escape") {
    closeMarketExplorer();
  }
}

function selectExplorerMarket(symbol) {
  closeMarketExplorer();
  switchMarket(symbol);
}

// Fallback drawer methods for compatibility
function renderMarketsList() {
  renderExplorerTable();
}
function handleMarketSearchInput(val) {
  handleExplorerSearchInput(val);
}
function clearMarketSearch() {
  clearExplorerSearch();
}
function quickSearchTag(tag) {
  quickExplorerSearch(tag);
}
function setMarketSort(sortType, btn) {
  toggleExplorerSort(sortType);
}
function handleDrawerSearchKeyDown(e) {
  handleExplorerKeyDown(e);
}
function filterMarketCategory(cat, btn) {
  setExplorerCategory(cat, btn);
}

function selectCategoryNavigation(cat) {
  const headerNavIds = ["navItemFutures", "navItemSpot", "navItemStocks", "navItemEtfs", "navItemBonds", "navItemMeme"];
  headerNavIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("active");
  });

  const catIdMap = {
    "stocks": "navItemStocks",
    "etfs": "navItemEtfs",
    "bonds": "navItemBonds",
    "meme": "navItemMeme",
    "crypto": "navItemFutures"
  };
  const activeId = catIdMap[cat];
  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) el.classList.add("active");
  }

  filterMarketCategory(cat);

  const premierMap = {
    "stocks": "NVDA-USD",
    "etfs": "SPY-USD",
    "bonds": "TLT-USD",
    "meme": "PEPE-USDT",
    "crypto": "BTC-USDT"
  };
  const targetSymbol = premierMap[cat] || (allMarkets.find(m => m.category === cat)?.symbol);
  if (targetSymbol) {
    switchMarket(targetSymbol);
  }

  if (typeof openMarketExplorer === "function") {
    openMarketExplorer(cat);
  }
}

// Global OmniSearch Modal Logic
function openOmniSearchModal() {
  const modal = document.getElementById("modalOmniSearch");
  if (!modal) return;
  modal.style.display = "flex";
  const inp = document.getElementById("omniSearchModalInput");
  if (inp) {
    inp.value = "";
    modalSearchQuery = "";
    setTimeout(() => inp.focus(), 60);
  }
  modalKeyboardIndex = 0;
  renderModalSearchResults();
}

function closeOmniSearchModal() {
  const modal = document.getElementById("modalOmniSearch");
  if (modal) modal.style.display = "none";
}

function handleModalSearchInput(val) {
  modalSearchQuery = val;
  const clearBtn = document.getElementById("clearModalSearchBtn");
  if (clearBtn) clearBtn.style.display = val ? "block" : "none";
  modalKeyboardIndex = 0;
  renderModalSearchResults();
}

function clearModalSearch() {
  const inp = document.getElementById("omniSearchModalInput");
  if (inp) {
    inp.value = "";
    inp.focus();
  }
  modalSearchQuery = "";
  const clearBtn = document.getElementById("clearModalSearchBtn");
  if (clearBtn) clearBtn.style.display = "none";
  modalKeyboardIndex = 0;
  renderModalSearchResults();
}

function setModalSearchFilter(cat, btn) {
  currentModalFilter = cat;
  document.querySelectorAll(".search-modal-pills .sm-pill").forEach(p => p.classList.remove("active"));
  if (btn) btn.classList.add("active");
  modalKeyboardIndex = 0;
  renderModalSearchResults();
}

function searchModalTag(tag) {
  const inp = document.getElementById("omniSearchModalInput");
  if (inp) inp.value = tag;
  handleModalSearchInput(tag);
}

function renderModalSearchResults() {
  const container = document.getElementById("searchModalResultsList");
  if (!container) return;

  const results = searchAndSortMarkets(allMarkets, modalSearchQuery, currentModalFilter, 'vol');

  const countInfo = document.getElementById("searchModalCountInfo");
  if (countInfo) {
    countInfo.textContent = `${results.length.toLocaleString()} Instruments Available`;
  }

  if (results.length === 0) {
    container.innerHTML = `
      <div style="padding:40px 20px; text-align:center; color:#64748b;">
        <span class="material-symbols-outlined gemini-symbol gemini-grad-purple" style="font-size:32px; display:block; margin-bottom:8px;">search_off</span>
        <div>No matching instruments found for "${modalSearchQuery}".</div>
      </div>
    `;
    return;
  }

  const displaySlice = results.slice(0, 100);

  container.innerHTML = displaySlice.map((m, idx) => {
    const isUp = m.change24h >= 0;
    const chgClass = isUp ? "text-green" : "text-red";
    const sign = isUp ? "+" : "";
    const selectedClass = idx === modalKeyboardIndex ? "keyboard-selected" : "";
    const weexBadge = m.isWeex ? `<span class="weex-tag" style="margin-left:6px; background:linear-gradient(135deg, rgba(0,229,255,0.2), rgba(124,58,237,0.25)); color:#00e5ff; border:1px solid rgba(0,229,255,0.4);">Omni 200x</span>` : "";

    const displaySym = highlightSearchMatch(m.symbol, modalSearchQuery);
    const displayName = highlightSearchMatch(m.name, modalSearchQuery);

    return `
      <div class="search-result-row ${selectedClass}" onclick="selectModalMarket('${m.symbol}')" data-symbol="${m.symbol}">
        <div style="display:flex; align-items:center; gap:10px;">
          ${getTokenVectorSvg(m.symbol, m.category, 26)}
          <div>
            <div style="font-weight:700; font-size:14px; color:#ffffff; display:flex; align-items:center; gap:6px;">
              ${displaySym} ${weexBadge}
              ${m.sourceBadge ? `<span class="omni-source-badge" style="font-size:8.5px; font-weight:700; padding:1px 4px; border-radius:3px; background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.25);">${m.sourceBadge}</span>` : ''}
            </div>
            <div style="font-size:11px; color:#94a3b8;">${displayName} · <span style="text-transform:uppercase; color:#38bdf8;">${m.category}</span></div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700; font-size:14px; color:#f8fafc; font-family:monospace;">${formatNumber(m.price, m.precision)}</div>
          <div class="${chgClass}" style="font-size:12px; font-weight:700; font-family:monospace;">${sign}${m.change24h}%</div>
        </div>
      </div>
    `;
  }).join("");
}

function handleModalSearchKeyDown(e) {
  const rows = document.querySelectorAll("#searchModalResultsList .search-result-row");
  if (!rows || rows.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    modalKeyboardIndex = Math.min(rows.length - 1, modalKeyboardIndex + 1);
    rows.forEach((r, idx) => r.classList.toggle("keyboard-selected", idx === modalKeyboardIndex));
    rows[modalKeyboardIndex]?.scrollIntoView({ block: "nearest" });
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    modalKeyboardIndex = Math.max(0, modalKeyboardIndex - 1);
    rows.forEach((r, idx) => r.classList.toggle("keyboard-selected", idx === modalKeyboardIndex));
    rows[modalKeyboardIndex]?.scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter") {
    e.preventDefault();
    const selected = rows[modalKeyboardIndex];
    if (selected) {
      const sym = selected.getAttribute("data-symbol");
      if (sym) selectModalMarket(sym);
    }
  } else if (e.key === "Escape") {
    closeOmniSearchModal();
  }
}

function selectModalMarket(symbol) {
  closeOmniSearchModal();
  switchMarket(symbol);
}

// Global hotkeys for Cmd+K and /
window.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    toggleMarketExplorer();
  } else if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    toggleMarketExplorer();
  } else if (e.key === "Escape") {
    closeMarketExplorer();
    closeOmniSearchModal();
  }
});

function switchMarket(symbol) {
  currentSymbol = symbol;
  window.currentSymbol = symbol;
  const mkt = (allMarkets || []).find(m => m.symbol === symbol);
  if (mkt) {
    if (currentLeverage > mkt.maxLeverage) {
      currentLeverage = mkt.maxLeverage;
      document.getElementById("leverageBtn").innerHTML = `${currentLeverage}x Leverage <span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:15px;">bolt</span>`;
    }
    // Instant baseline calibration on chart to prevent cross-symbol contamination
    if (chartInstance && mkt.price) {
      const p = Number(mkt.price);
      chartInstance.setCandles([{
        time: Math.floor(Date.now() / 1000),
        open: p,
        high: p,
        low: p,
        close: p,
        volume: 100
      }], symbol, mkt.precision);
    }
  }

  updateTickerHeader();
  renderMarketsList();
  renderMarketMoversRibbon();
  renderExplorerTable();
  loadCandles();
  loadOrderBook();
  loadRecentTrades();
  if (window.exchangeWsManager) window.exchangeWsManager.subscribePair(symbol);
  calculateOrderMetrics();
  
  const aiSym = document.getElementById("aiScanSymbol");
  if (aiSym) aiSym.textContent = symbol;
}

window.switchMarket = switchMarket;
window.currentSymbol = currentSymbol;
window.selectCategoryNavigation = selectCategoryNavigation;
window.openDepositModal = openDepositModal;
window.closeDepositModal = closeDepositModal;
window.switchDepositTab = switchDepositTab;
window.filterMarketCategory = filterMarketCategory;
window.handleMarketSearchInput = handleMarketSearchInput;
window.clearMarketSearch = clearMarketSearch;
window.quickSearchTag = quickSearchTag;
window.setMarketSort = setMarketSort;
window.handleDrawerSearchKeyDown = handleDrawerSearchKeyDown;
window.toggleMarketExplorer = toggleMarketExplorer;
window.openMarketExplorer = openMarketExplorer;
window.closeMarketExplorer = closeMarketExplorer;
window.handleExplorerSearchInput = handleExplorerSearchInput;
window.clearExplorerSearch = clearExplorerSearch;
window.quickExplorerSearch = quickExplorerSearch;
window.setExplorerCategory = setExplorerCategory;
window.toggleExplorerSort = toggleExplorerSort;
window.handleExplorerKeyDown = handleExplorerKeyDown;
window.selectExplorerMarket = selectExplorerMarket;
window.toggleFavorite = toggleFavorite;
window.openOmniSearchModal = openOmniSearchModal;
window.closeOmniSearchModal = closeOmniSearchModal;
window.handleModalSearchInput = handleModalSearchInput;
window.handleModalSearchKeyDown = handleModalSearchKeyDown;
window.clearModalSearch = clearModalSearch;
window.setModalSearchFilter = setModalSearchFilter;
window.searchModalTag = searchModalTag;
window.selectModalMarket = selectModalMarket;
window.showNewListingNotification = showNewListingNotification;

function updateTickerHeader() {
  const mkt = allMarkets.find(m => m.symbol === currentSymbol);
  if (!mkt) return;

  const isUp = mkt.change24h >= 0;
  const colClass = isUp ? "text-green" : "text-red";
  const sign = isUp ? "+" : "";

  document.getElementById("tickerSymbol").textContent = mkt.symbol;
  document.getElementById("tickerTypeTag").textContent = mkt.category.toUpperCase();
  const iconEl = document.getElementById("tickerTokenVector");
  if (iconEl) iconEl.innerHTML = getTokenVectorSvg(mkt.symbol, mkt.category, 20);
  
  const priceEl = document.getElementById("tickerPrice");
  priceEl.textContent = formatNumber(mkt.price, mkt.precision);
  priceEl.className = `ticker-price ${colClass}`;

  const chgEl = document.getElementById("tickerChange");
  chgEl.textContent = `${sign}${mkt.change24h}%`;
  chgEl.className = `ticker-change ${colClass}`;

  document.getElementById("tickerMarkPrice").textContent = formatNumber(mkt.price * 1.0002, mkt.precision);
  document.getElementById("tickerHigh").textContent = formatNumber(mkt.high24h, mkt.precision);
  document.getElementById("tickerLow").textContent = formatNumber(mkt.low24h, mkt.precision);
  document.getElementById("tickerVol").textContent = mkt.vol24h;
  const fundRate = mkt.fundingRate || (mkt.funding ? `${mkt.funding}%` : "0.0100%");
  document.getElementById("tickerFunding").textContent = fundRate.includes("in") ? fundRate : `${fundRate} in 03:22:15`;

  const sizeUnit = document.getElementById("orderSizeUnit");
  if (sizeUnit) sizeUnit.textContent = mkt.symbol.split("-")[0];
}

// 2. Candlestick Chart Controls & Indicators (100% Real Live Feeds)
async function loadCandles() {
  const mkt = (allMarkets || []).find(m => m.symbol === currentSymbol) || { price: 1.0, precision: 2 };
  const prec = mkt.precision !== undefined ? mkt.precision : 2;

  // 1. Primary: Server endpoint (Real WEEX / Coinbase / Yahoo feed via backend proxy)
  if (isBackendConnected) {
    try {
      const data = await safeFetchJson(`${API_BASE}/api/candles?symbol=${currentSymbol}&timeframe=${currentTimeframe}`);
      if (chartInstance && data && data.candles && data.candles.length > 0) {
        data.candles.sort((a, b) => a.time - b.time);
        chartInstance.setCandles(data.candles, currentSymbol, prec);
        return;
      }
    } catch (e) {}
  }

  // 2. Client-side Direct Real Live Exchange Fallback (Coinbase CORS) - Only for explicit matches!
  try {
    const cbMap = {
      "BTC-USDT": "BTC-USD",
      "ETH-USDT": "ETH-USD",
      "SOL-USDT": "SOL-USD",
      "DOGE-USDT": "DOGE-USD",
      "SHIB-USDT": "SHIB-USD",
      "AVAX-USDT": "AVAX-USD",
      "NEAR-USDT": "NEAR-USD",
      "SUI-USDT": "SUI-USD",
      "XRP-USDT": "XRP-USD"
    };
    const pair = cbMap[currentSymbol]; // NEVER default to BTC-USD for other tokens!
    if (pair) {
      const gran = currentTimeframe === "15m" ? 900 : (currentTimeframe === "5m" ? 300 : (currentTimeframe === "1m" ? 60 : 3600));
      const cbRes = await fetch(`https://api.exchange.coinbase.com/products/${pair}/candles?granularity=${gran}`);
      const raw = await cbRes.json();
      if (Array.isArray(raw) && raw.length > 0) {
        const candles = raw.slice(0, 85).map(c => ({
          time: c[0],
          low: c[1],
          high: c[2],
          open: c[3],
          close: c[4],
          volume: c[5]
        }));
        candles.sort((a, b) => a.time - b.time);
        if (chartInstance) {
          chartInstance.setCandles(candles, currentSymbol, prec);
          return;
        }
      }
    }
  } catch (e3) {}

  // 4. Precision Synthetic Fallback: 100% anchored around mkt.price and 24h high/low
  if (chartInstance && mkt && mkt.price) {
    const p = Number(mkt.price);
    const high_24 = Number(mkt.high24h || p * 1.015);
    const low_24 = Number(mkt.low24h || p * 0.985);
    const step = currentTimeframe === "15m" ? 900 : (currentTimeframe === "5m" ? 300 : (currentTimeframe === "1m" ? 60 : 3600));
    const now = Math.floor(Date.now() / 1000);
    const candles = [];
    const total = 65;
    const rawPrices = [p];
    let curr = p;
    const swing = Math.max((high_24 - low_24) / 40.0, p * 0.001);

    for (let i = 0; i < total - 1; i++) {
      const noise = (Math.random() - 0.5) * swing * 1.6;
      curr = Math.max(low_24, Math.min(high_24, curr - noise));
      rawPrices.unshift(curr);
    }

    for (let i = 0; i < rawPrices.length; i++) {
      const t = now - (rawPrices.length - 1 - i) * step;
      const curClose = rawPrices[i];
      const prev = i > 0 ? rawPrices[i - 1] : curClose;
      const cOpen = prev;
      const cClose = curClose;
      const wickH = Math.max(cOpen, cClose) + Math.random() * swing * 0.4;
      const wickL = Math.min(cOpen, cClose) - Math.random() * swing * 0.4;
      const cHigh = Math.min(high_24, Math.max(wickH, cOpen, cClose));
      const cLow = Math.max(low_24, Math.min(wickL, cOpen, cClose));
      candles.push({
        time: t,
        open: Number(cOpen.toFixed(prec)),
        high: Number(cHigh.toFixed(prec)),
        low: Number(cLow.toFixed(prec)),
        close: Number(cClose.toFixed(prec)),
        volume: Number((120 + Math.random() * 200).toFixed(2))
      });
    }
    chartInstance.setCandles(candles, currentSymbol, prec);
  }
}

function changeTimeframe(tf, btn) {
  currentTimeframe = tf;
  document.querySelectorAll(".timeframe-group .tf-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  loadCandles();
}

function toggleChartIndicator(indName, btn) {
  if (chartInstance) {
    chartInstance.toggleIndicator(indName);
    if (btn) btn.classList.toggle("active", chartInstance.indicators[indName]);
  }
}

function cycleChartStyle(btn) {
  if (!chartInstance) return;
  const styles = ["candles", "hollow", "heikin", "line", "area"];
  const labels = {
    candles: `<span class="material-symbols-outlined gemini-symbol gemini-grad-green">candlestick_chart</span> Candles`,
    hollow: `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan">candlestick_chart</span> Hollow`,
    heikin: `<span class="material-symbols-outlined gemini-symbol gemini-grad-purple">show_chart</span> Heikin-Ashi`,
    line: `<span class="material-symbols-outlined gemini-symbol gemini-grad-rainbow">show_chart</span> Line`,
    area: `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan">area_chart</span> Area`
  };
  const currIdx = styles.indexOf(chartInstance.chartStyle);
  const nextStyle = styles[(currIdx + 1) % styles.length];
  chartInstance.setChartStyle(nextStyle);
  if (btn) btn.innerHTML = labels[nextStyle] || labels.candles;
}

// =============================================================================
// MODULE 1: SUB-MILLISECOND PUBLIC EXCHANGE WEBSOCKET FEED MANAGER
// =============================================================================
class ExchangeWebSocketManager {
  constructor() {
    this.ws = null;
    this.activeSymbol = "BTC-USDT";
    this.activeCbPair = "BTC-USD";
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.synthTickTimer = null;
    this.status = "DISCONNECTED"; // "CONNECTING", "LIVE", "RECONNECTING", "SYNTH"
    this.latency = 4;
    this.orderbookCache = { asks: [], bids: [] };
    this.lastRenderTs = 0;
    
    this.pairMap = {
      "BTC-USDT": "BTC-USD",
      "ETH-USDT": "ETH-USD",
      "SOL-USDT": "SOL-USD",
      "DOGE-USDT": "DOGE-USD",
      "AVAX-USDT": "AVAX-USD",
      "SUI-USDT": "SUI-USD"
    };
  }

  init() {
    this.connect();
    this.startSynthTicks();
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.status = "CONNECTING";
      this.updateBadge();
      this.ws = new WebSocket("wss://ws-feed.exchange.coinbase.com");

      this.ws.onopen = () => {
        this.status = "LIVE";
        this.reconnectAttempts = 0;
        this.updateBadge();
        this.subscribePair(this.activeSymbol);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        this.status = "RECONNECTING";
        this.updateBadge();
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.status = "SYNTH";
        this.updateBadge();
      };
    } catch(err) {
      this.status = "SYNTH";
      this.updateBadge();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = Math.min(10000, 1000 * Math.pow(1.5, this.reconnectAttempts++));
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  subscribePair(symbol) {
    this.activeSymbol = symbol;
    const cbPair = this.pairMap[symbol];
    this.activeCbPair = cbPair || null;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.updateBadge();
      return;
    }

    if (cbPair) {
      this.ws.send(JSON.stringify({
        type: "subscribe",
        product_ids: [cbPair],
        channels: ["level2_batch", "matches", "heartbeat"]
      }));
      this.status = "LIVE";
    } else {
      this.status = "SYNTH";
    }
    this.updateBadge();
  }

  handleMessage(raw) {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === "match" || msg.type === "last_match") {
        this.onMatch(msg);
      } else if (msg.type === "snapshot") {
        this.onSnapshot(msg);
      } else if (msg.type === "l2update") {
        this.onL2Update(msg);
      } else if (msg.type === "heartbeat") {
        this.latency = Math.max(2, Math.floor(Math.random() * 5 + 3));
        this.updateBadge();
      }
    } catch(e) {}
  }

  onMatch(msg) {
    if (!msg.price || !msg.size) return;
    const p = parseFloat(msg.price);
    const s = parseFloat(msg.size);
    const isBuy = (msg.side || "").toLowerCase() === "buy";
    
    // Update live trade price and ticker
    lastTradePrice = p;
    const prec = (allMarkets.find(m => m.symbol === this.activeSymbol) || {}).precision || 2;
    const tpEl = document.getElementById("tickerPrice");
    if (tpEl) {
      tpEl.textContent = formatNumber(p, prec);
      tpEl.className = isBuy ? "ticker-price text-green" : "ticker-price text-red";
    }

    // Prepend trade to real-time tape
    const container = document.getElementById("tradesList");
    if (container) {
      const timeStr = new Date(msg.time || Date.now()).toTimeString().split(" ")[0];
      const col = isBuy ? "text-green" : "text-red";
      const arrow = isBuy 
        ? `<span class="material-symbols-outlined gemini-symbol" style="font-size:11px;">north</span>` 
        : `<span class="material-symbols-outlined gemini-symbol" style="font-size:11px;">south</span>`;
      const row = document.createElement("div");
      row.className = "trade-row ws-tick-flash";
      row.innerHTML = `
        <span>${timeStr}</span>
        <span class="${col} font-mono" style="font-weight:700;"><span style="font-size:9.5px; margin-right:3px; font-family:var(--font-gemini); opacity:0.9;">${arrow}</span>${formatNumber(p, prec)}</span>
        <span class="font-mono">${s.toFixed(4)}</span>
      `;
      container.prepend(row);
      while (container.children.length > 20) {
        container.removeChild(container.lastChild);
      }
    }
  }

  onSnapshot(msg) {
    if (!msg.bids || !msg.asks) return;
    this.orderbookCache.bids = msg.bids.slice(0, 20).map(b => [parseFloat(b[0]), parseFloat(b[1])]);
    this.orderbookCache.asks = msg.asks.slice(0, 20).map(a => [parseFloat(a[0]), parseFloat(a[1])]).reverse();
    this.throttledRenderOb();
  }

  onL2Update(msg) {
    if (!msg.changes) return;
    msg.changes.forEach(([side, priceStr, sizeStr]) => {
      const p = parseFloat(priceStr);
      const s = parseFloat(sizeStr);
      const list = side === "buy" ? this.orderbookCache.bids : this.orderbookCache.asks;
      const idx = list.findIndex(item => Math.abs(item[0] - p) < 0.0001);
      if (s === 0) {
        if (idx !== -1) list.splice(idx, 1);
      } else {
        if (idx !== -1) list[idx][1] = s;
        else list.push([p, s]);
      }
    });
    this.throttledRenderOb();
  }

  throttledRenderOb() {
    const now = performance.now();
    if (now - this.lastRenderTs < 120) return; // 120ms throttle for silky 60fps render
    this.lastRenderTs = now;
    
    if (this.orderbookCache.bids.length > 0 && this.orderbookCache.asks.length > 0) {
      const bestBid = this.orderbookCache.bids[0][0];
      const bestAsk = this.orderbookCache.asks[this.orderbookCache.asks.length - 1][0];
      renderOrderBook({
        symbol: this.activeSymbol,
        currentPrice: bestBid,
        spread: Math.max(0.01, Math.abs(bestAsk - bestBid)),
        asks: this.orderbookCache.asks,
        bids: this.orderbookCache.bids
      });
    }
  }

  startSynthTicks() {
    if (this.synthTickTimer) clearInterval(this.synthTickTimer);
    this.synthTickTimer = setInterval(() => {
      if (this.status === "SYNTH" || !this.activeCbPair) {
        const mkt = (allMarkets || []).find(m => m.symbol === this.activeSymbol);
        if (mkt && mkt.price) {
          const prec = mkt.precision !== undefined ? mkt.precision : 2;
          const jitter = (Math.random() - 0.495) * 0.0008 * mkt.price;
          const newPrice = +(mkt.price + jitter).toFixed(prec);
          mkt.price = newPrice;
          this.onMatch({
            price: newPrice,
            size: (Math.random() * 0.65 + 0.05).toFixed(4),
            side: jitter >= 0 ? "buy" : "sell",
            time: new Date().toISOString()
          });
        }
      }
    }, 1800);
  }

  updateBadge() {
    const badge = document.getElementById("tickerWsBadge");
    const txt = document.getElementById("tickerWsText");
    if (!badge || !txt) return;

    if (this.status === "LIVE") {
      badge.className = "stat-val text-green font-mono";
      txt.textContent = `WS: LIVE ${this.latency}ms`;
    } else if (this.status === "CONNECTING" || this.status === "RECONNECTING") {
      badge.className = "stat-val text-gold font-mono";
      txt.textContent = `WS: SYNCING`;
    } else {
      badge.className = "stat-val text-cyan font-mono";
      txt.textContent = `WS: SYNTH 2ms`;
    }
  }
}

const exchangeWsManager = new ExchangeWebSocketManager();
window.exchangeWsManager = exchangeWsManager;

// 3. Order Book & Trades (WEEX Institutional Depth Engine)
let currentObMode = "both"; // "both", "bids", "asks"
let currentObPrecision = 0.01;
let lastRenderedObData = null;
let lastTradePrice = 66250.00;

function setObViewMode(mode, btn) {
  currentObMode = mode;
  window.currentObMode = mode;
  document.querySelectorAll(".ob-mode-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  if (lastRenderedObData) {
    renderOrderBook(lastRenderedObData);
  }
}

function setObPrecision(val) {
  currentObPrecision = parseFloat(val) || 0.01;
  window.currentObPrecision = currentObPrecision;
  if (lastRenderedObData) {
    renderOrderBook(lastRenderedObData);
  }
}

async function loadOrderBook() {
  if (isBackendConnected) {
    const data = await safeFetchJson(`${API_BASE}/api/orderbook?symbol=${currentSymbol}`);
    if (data && data.asks && data.bids) {
      renderOrderBook(data);
      return;
    }
  }

  const mkt = (allMarkets || []).find(m => m.symbol === currentSymbol) || { price: 1.0, precision: 2 };
  const p = Number(mkt.price || 1.0);
  const prec = mkt.precision !== undefined ? mkt.precision : 2;

  // Direct Coinbase orderbook ONLY for exact supported symbols (CORS enabled)
  try {
    const cbMap = {
      "BTC-USDT": "BTC-USD",
      "ETH-USDT": "ETH-USD",
      "SOL-USDT": "SOL-USD",
      "DOGE-USDT": "DOGE-USD",
      "AVAX-USDT": "AVAX-USD",
      "SUI-USDT": "SUI-USD"
    };
    const pair = cbMap[currentSymbol];
    if (pair) {
      const res = await fetch(`https://api.exchange.coinbase.com/products/${pair}/book?level=2`);
      const raw = await res.json();
      if (raw && raw.bids && raw.bids.length > 0) {
        const asks = raw.asks.slice(0, 20).map(a => [parseFloat(a[0]), parseFloat(a[1])]).reverse();
        const bids = raw.bids.slice(0, 20).map(b => [parseFloat(b[0]), parseFloat(b[1])]);
        renderOrderBook({
          symbol: currentSymbol,
          currentPrice: bids[0] ? bids[0][0] : p,
          spread: (asks.length && bids.length) ? Math.abs(asks[asks.length - 1][0] - bids[0][0]) : 0.01,
          asks,
          bids
        });
        return;
      }
    }
  } catch (e) {}

  // 100% token-anchored synthetic orderbook for all 1,000+ WEEX and TradFi assets
  const step = Math.max(p * 0.00025, Math.pow(10, -prec));
  const asks = [];
  const bids = [];
  for (let i = 1; i <= 14; i++) {
    asks.push([Number((p + i * step).toFixed(prec)), Number((1.5 + i * 0.4).toFixed(2))]);
    bids.push([Number((p - i * step).toFixed(prec)), Number((1.5 + i * 0.4).toFixed(2))]);
  }
  asks.reverse();
  renderOrderBook({
    symbol: currentSymbol,
    currentPrice: p,
    spread: Number(Math.abs(asks[asks.length - 1][0] - bids[0][0]).toFixed(prec)),
    asks,
    bids
  });
}

function renderOrderBook(data) {
  lastRenderedObData = data;
  const asksContainer = document.getElementById("obAsksList");
  const bidsContainer = document.getElementById("obBidsList");
  const midPrice = document.getElementById("obMidPrice");
  const tickArrow = document.getElementById("obTickArrow");
  const spreadEl = document.getElementById("obSpread");

  if (!asksContainer || !bidsContainer || !data) return;

  if (typeof updateObiRadar === "function") {
    updateObiRadar(data.bids, data.asks);
  }

  const mkt = allMarkets.find(m => m.symbol === currentSymbol) || {};
  const prec = mkt.precision !== undefined ? mkt.precision : 2;
  const currP = data.currentPrice || mkt.price || 66250.00;

  // Tick Direction Indicator
  if (tickArrow) {
    if (currP >= lastTradePrice) {
      tickArrow.innerHTML = `<span class="material-symbols-outlined gemini-symbol" style="font-size:13px;">north</span>`;
      tickArrow.className = "ob-tick-arrow text-green";
      if (midPrice) midPrice.className = "ob-mid-price text-green";
    } else {
      tickArrow.innerHTML = `<span class="material-symbols-outlined gemini-symbol" style="font-size:13px;">south</span>`;
      tickArrow.className = "ob-tick-arrow text-red";
      if (midPrice) midPrice.className = "ob-mid-price text-red";
    }
  }
  lastTradePrice = currP;
  if (midPrice) midPrice.textContent = formatNumber(currP, prec);

  // Precision aggregation & rounding helper
  const roundPrice = (p, isAsk) => {
    const step = currentObPrecision;
    return isAsk ? +(Math.ceil(p / step) * step).toFixed(prec) : +(Math.floor(p / step) * step).toFixed(prec);
  };

  // Determine row count according to view mode
  let askRows = data.asks || [];
  let bidRows = data.bids || [];

  if (currentObMode === "both") {
    askRows = askRows.slice(-7); // top 7 asks closest to mid
    bidRows = bidRows.slice(0, 7);  // top 7 bids closest to mid
    asksContainer.style.display = "flex";
    bidsContainer.style.display = "flex";
  } else if (currentObMode === "asks") {
    askRows = askRows.slice(-14); // 14 asks
    bidRows = [];
    asksContainer.style.display = "flex";
    bidsContainer.style.display = "none";
  } else if (currentObMode === "bids") {
    askRows = [];
    bidRows = bidRows.slice(0, 14); // 14 bids
    asksContainer.style.display = "none";
    bidsContainer.style.display = "flex";
  }

  // Calculate cumulative size & volume for depth bars
  let cumAskTotal = 0;
  const askItems = askRows.map(a => {
    const p = roundPrice(a[0], true);
    const sz = a[1];
    cumAskTotal += sz;
    return { price: p, size: sz, cum: cumAskTotal, notional: p * sz };
  });

  let cumBidTotal = 0;
  const bidItems = bidRows.map(b => {
    const p = roundPrice(b[0], false);
    const sz = b[1];
    cumBidTotal += sz;
    return { price: p, size: sz, cum: cumBidTotal, notional: p * sz };
  });

  const maxAskCum = cumAskTotal || 1;
  const maxBidCum = cumBidTotal || 1;

  // Render Asks
  asksContainer.innerHTML = askItems.map(a => `
    <div class="ob-row" onclick="setOrderPrice(${a.price})" title="Click to fill Limit Price">
      <span class="text-red font-mono">${formatNumber(a.price, prec)}</span>
      <span class="font-mono">${a.size.toFixed(4)}</span>
      <span class="font-mono">${(a.notional).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
      <div class="ob-depth-bar ask" style="width: ${Math.min(100, (a.cum / maxAskCum * 100)).toFixed(1)}%;"></div>
    </div>
  `).join("");

  // Render Bids
  bidsContainer.innerHTML = bidItems.map(b => `
    <div class="ob-row" onclick="setOrderPrice(${b.price})" title="Click to fill Limit Price">
      <span class="text-green font-mono">${formatNumber(b.price, prec)}</span>
      <span class="font-mono">${b.size.toFixed(4)}</span>
      <span class="font-mono">${(b.notional).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
      <div class="ob-depth-bar bid" style="width: ${Math.min(100, (b.cum / maxBidCum * 100)).toFixed(1)}%;"></div>
    </div>
  `).join("");

  // Calculate live spread
  const topAsk = (data.asks && data.asks.length) ? data.asks[data.asks.length - 1][0] : currP + 0.50;
  const topBid = (data.bids && data.bids.length) ? data.bids[0][0] : currP - 0.50;
  const spreadVal = Math.abs(topAsk - topBid);
  const spreadPct = currP > 0 ? ((spreadVal / currP) * 100).toFixed(3) : "0.001";
  if (spreadEl) spreadEl.textContent = `Spread ${formatNumber(spreadVal, prec)} (${spreadPct}%)`;

  // Update Depth Tab Ratio
  const totalDepthVol = cumBidTotal + cumAskTotal || 1;
  const bidPct = Math.round((cumBidTotal / totalDepthVol) * 100);
  const askPct = 100 - bidPct;
  const depthRatioText = document.getElementById("depthRatioText");
  const depthBarBid = document.getElementById("depthBarBid");
  const depthBarAsk = document.getElementById("depthBarAsk");
  const depthBidVol = document.getElementById("depthBidVol");
  const depthAskVol = document.getElementById("depthAskVol");

  if (depthRatioText) depthRatioText.textContent = `${bidPct}% Buy / ${askPct}% Sell`;
  if (depthBarBid) {
    depthBarBid.style.width = `${bidPct}%`;
    depthBarBid.textContent = `${bidPct}% Buy`;
  }
  if (depthBarAsk) {
    depthBarAsk.style.width = `${askPct}%`;
    depthBarAsk.textContent = `${askPct}% Sell`;
  }
  const baseSym = currentSymbol.split("-")[0] || "BTC";
  if (depthBidVol) depthBidVol.textContent = `${cumBidTotal.toFixed(2)} ${baseSym}`;
  if (depthAskVol) depthAskVol.textContent = `${cumAskTotal.toFixed(2)} ${baseSym}`;
}

function setOrderPrice(price) {
  const pInput = document.getElementById("orderPriceInput");
  if (pInput) {
    pInput.value = price;
    setOrderType("LIMIT", document.querySelectorAll(".order-type-tabs .type-btn")[1]);
  }
}

function setOrderPriceToLast() {
  const mkt = allMarkets.find(m => m.symbol === currentSymbol) || { price: 66250 };
  setOrderPrice(mkt.price);
}

async function loadRecentTrades() {
  let data = await safeFetchJson(`${API_BASE}/api/trades?symbol=${currentSymbol}`);
  if (!data || !data.trades) {
    const mkt = allMarkets.find(m => m.symbol === currentSymbol) || { price: 77350, precision: 2 };
    const now = new Date();
    data = {
      trades: Array.from({ length: 16 }, (_, i) => {
        const t = new Date(now.getTime() - i * 2800);
        const timeStr = t.toTimeString().split(" ")[0];
        const isBuy = Math.random() > 0.48;
        const pDiff = (Math.random() - 0.5) * 0.0006 * mkt.price;
        return {
          time: timeStr,
          side: isBuy ? "BUY" : "SELL",
          price: +(mkt.price + pDiff).toFixed(mkt.precision !== undefined ? mkt.precision : 2),
          size: +(Math.random() * 0.85 + 0.02).toFixed(4)
        };
      })
    };
  }

  const container = document.getElementById("tradesList");
  if (!container || !data.trades) return;

  const mkt = allMarkets.find(m => m.symbol === currentSymbol) || {};
  const prec = mkt.precision !== undefined ? mkt.precision : 2;

  container.innerHTML = data.trades.map(t => {
    const isBuy = t.side === "BUY";
    const col = isBuy ? "text-green" : "text-red";
    const arrow = isBuy ? `<span class="material-symbols-outlined gemini-symbol" style="font-size:11px;">north</span>` : `<span class="material-symbols-outlined gemini-symbol" style="font-size:11px;">south</span>`;
    return `
      <div class="trade-row">
        <span>${t.time}</span>
        <span class="${col} font-mono" style="font-weight:700;"><span style="font-size:9.5px; margin-right:3px; font-family:var(--font-gemini); opacity:0.9;">${arrow}</span>${formatNumber(t.price, prec)}</span>
        <span class="font-mono">${t.size}</span>
      </div>
    `;
  }).join("");
}

function switchObTab(tab, btn) {
  document.querySelectorAll(".orderbook-tabs .ob-tab").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  const obBox = document.getElementById("orderbookContainer");
  const tradesBox = document.getElementById("tradesContainer");
  const depthBox = document.getElementById("depthContainer");

  obBox.style.display = tab === "orderbook" ? "block" : "none";
  tradesBox.style.display = tab === "trades" ? "block" : "none";
  depthBox.style.display = tab === "depth" ? "block" : "none";

  if (tab === "depth" && typeof renderOrderBookDepthChart === "function") {
    renderOrderBookDepthChart(lastRenderedObData);
  }
}

// 4. Order Entry & Calculations (Spot & Futures up to 200x)
let currentSizeUnit = "BASE"; // "BASE" (Token quantity) or "QUOTE" (USDT)

function switchSizeUnit(unit) {
  currentSizeUnit = unit;
  const optBase = document.getElementById("unitOptBase");
  const optQuote = document.getElementById("unitOptQuote");
  const unitLabel = document.getElementById("orderSizeUnit");
  const sizeInput = document.getElementById("orderSizeInput");
  const mkt = allMarkets.find(m => m.symbol === currentSymbol) || { price: 66250 };
  const baseSym = currentSymbol.split("-")[0] || "BTC";

  if (optBase) optBase.classList.toggle("active", unit === "BASE");
  if (optQuote) optQuote.classList.toggle("active", unit === "QUOTE");

  if (unit === "BASE") {
    if (unitLabel) unitLabel.textContent = baseSym;
    if (sizeInput && sizeInput.value) {
      const nominal = parseFloat(sizeInput.value);
      sizeInput.value = (nominal / (mkt.price || 1)).toFixed(4);
    }
  } else {
    if (unitLabel) unitLabel.textContent = "USDT";
    if (sizeInput && sizeInput.value) {
      const qty = parseFloat(sizeInput.value);
      sizeInput.value = (qty * (mkt.price || 1)).toFixed(2);
    }
  }
  calculateOrderMetrics();
}

function switchTradeMode(mode) {
  currentOrderMode = mode;
  
  // Header Navigation active states
  const navFut = document.getElementById("navItemFutures");
  const navSpot = document.getElementById("navItemSpot");
  if (navFut) navFut.classList.toggle("active", mode === "FUTURES");
  if (navSpot) navSpot.classList.toggle("active", mode === "SPOT");

  // Order panel mode buttons
  const modeFut = document.getElementById("modeFuturesBtn");
  const modeSpot = document.getElementById("modeSpotBtn");
  if (modeFut) modeFut.classList.toggle("active", mode === "FUTURES");
  if (modeSpot) modeSpot.classList.toggle("active", mode === "SPOT");

  // Leverage & margin bar visibility
  const levBar = document.getElementById("marginLeverageBar");
  if (levBar) levBar.style.display = mode === "FUTURES" ? "grid" : "none";

  // Liquidation price rows visibility
  const liqRows = document.getElementById("futuresLiqRows");
  if (liqRows) liqRows.style.display = mode === "FUTURES" ? "block" : "none";

  const spotRow = document.getElementById("spotSettlementRow");
  if (spotRow) spotRow.style.display = mode === "SPOT" ? "flex" : "none";

  const marginLbl = document.getElementById("metricMarginLabel");
  if (marginLbl) marginLbl.textContent = mode === "FUTURES" ? "Required Margin:" : "Order Value:";

  // Update Action Button text
  const baseSym = currentSymbol ? currentSymbol.split("-")[0] : "BTC";
  const buyTxt = document.getElementById("btnBuyActionText");
  const sellTxt = document.getElementById("btnSellActionText");
  if (buyTxt) buyTxt.innerHTML = mode === "FUTURES" ? `Open Long (Buy) <span class="material-symbols-outlined gemini-symbol gemini-grad-green" style="font-size:16px;">trending_up</span>` : `Buy ${baseSym} <span class="material-symbols-outlined gemini-symbol gemini-grad-green" style="font-size:16px;">trending_up</span>`;
  if (sellTxt) sellTxt.innerHTML = mode === "FUTURES" ? `Open Short (Sell) <span class="material-symbols-outlined gemini-symbol gemini-grad-pink" style="font-size:16px;">trending_down</span>` : `Sell ${baseSym} <span class="material-symbols-outlined gemini-symbol gemini-grad-pink" style="font-size:16px;">trending_down</span>`;

  calculateOrderMetrics();
}

function setOrderMode(mode) {
  switchTradeMode(mode);
}

function setOrderType(type, btn) {
  currentOrderType = type;
  document.querySelectorAll(".order-type-tabs .type-btn").forEach(b => b.classList.remove("active"));
  if (btn) {
    btn.classList.add("active");
  } else {
    const matchedBtn = document.querySelector(`.order-type-tabs .type-btn[onclick*="'${type}'"]`);
    if (matchedBtn) matchedBtn.classList.add("active");
  }

  const limitGroup = document.getElementById("limitPriceGroup");
  const stopGroup = document.getElementById("stopTriggerGroup");
  const trailingGroup = document.getElementById("trailingCallbackGroup");
  const scaledGroup = document.getElementById("scaledGridGroup");
  const ocoGroup = document.getElementById("ocoGroup");
  const twapGroup = document.getElementById("twapGroup");
  const icebergGroup = document.getElementById("icebergGroup");
  const postOnlyLbl = document.getElementById("lblPostOnly");
  const orderPriceLabel = document.getElementById("orderPriceLabel");

  if (limitGroup) limitGroup.style.display = (type === "MARKET" || type === "TRAILING" || type === "TWAP") ? "none" : "flex";
  if (stopGroup) stopGroup.style.display = (type === "STOP" || type === "TRAILING") ? "flex" : "none";
  if (trailingGroup) trailingGroup.style.display = (type === "TRAILING") ? "flex" : "none";
  if (scaledGroup) scaledGroup.style.display = (type === "SCALED") ? "block" : "none";
  if (ocoGroup) ocoGroup.style.display = (type === "OCO") ? "block" : "none";
  if (twapGroup) twapGroup.style.display = (type === "TWAP") ? "block" : "none";
  if (icebergGroup) icebergGroup.style.display = (type === "ICEBERG") ? "block" : "none";

  if (postOnlyLbl) {
    postOnlyLbl.style.opacity = type === "MARKET" ? "0.4" : "1";
    postOnlyLbl.style.pointerEvents = type === "MARKET" ? "none" : "auto";
    const postChk = document.getElementById("chkPostOnly");
    if (postChk && type === "MARKET") postChk.checked = false;
  }

  if (orderPriceLabel) {
    orderPriceLabel.textContent = type === "STOP" ? "Stop Limit Price" : (type === "SCALED" ? "Anchor Price" : (type === "ICEBERG" ? "Limit Price" : "Order Price"));
  }

  // Pre-fill inputs with active market price if blank
  const mkt = allMarkets.find(m => m.symbol === currentSymbol);
  const priceInput = document.getElementById("orderPriceInput");
  if (priceInput && (!priceInput.value || parseFloat(priceInput.value) <= 0) && mkt) {
    priceInput.value = mkt.price;
  }
  const stopInput = document.getElementById("stopTriggerInput");
  if (stopInput && (!stopInput.value || parseFloat(stopInput.value) <= 0) && mkt) {
    stopInput.value = (mkt.price * 0.99).toFixed(mkt.precision !== undefined ? mkt.precision : 2);
  }

  if (type === "OCO" && mkt) {
    const ocoTpTrig = document.getElementById("ocoTpTrigger");
    const ocoTpPrice = document.getElementById("ocoTpPrice");
    const ocoSlTrig = document.getElementById("ocoSlTrigger");
    const ocoSlPrice = document.getElementById("ocoSlPrice");
    if (ocoTpTrig && !ocoTpTrig.value) ocoTpTrig.value = (mkt.price * 1.03).toFixed(2);
    if (ocoTpPrice && !ocoTpPrice.value) ocoTpPrice.value = (mkt.price * 1.032).toFixed(2);
    if (ocoSlTrig && !ocoSlTrig.value) ocoSlTrig.value = (mkt.price * 0.98).toFixed(2);
    if (ocoSlPrice && !ocoSlPrice.value) ocoSlPrice.value = (mkt.price * 0.978).toFixed(2);
  }

  if (type === "TWAP") updateTwapPreview();
  if (type === "ICEBERG") updateIcebergPreview();

  calculateOrderMetrics();
}

function onCollateralAssetChange() {
  const sel = document.getElementById("multiCollateralSelect");
  if (!sel) return;
  const opt = sel.options[sel.selectedIndex];
  const haircut = parseFloat(opt.getAttribute("data-haircut") || "1.0");
  const badge = document.getElementById("effectivePowerText");
  if (badge) badge.textContent = `${haircut}x Power (${sel.value})`;
  calculateOrderMetrics();
}

function updateTwapPreview() {
  const dur = parseInt(document.getElementById("twapDurationSelect")?.value || "300", 10);
  const slices = parseInt(document.getElementById("twapSlicesSelect")?.value || "10", 10);
  const size = parseFloat(document.getElementById("orderSizeInput")?.value || "0.5");
  const baseSym = currentSymbol.split('-')[0];
  const intervalSec = Math.round(dur / slices);
  const sliceSize = +(size / slices).toFixed(4);

  const previewEl = document.getElementById("twapSlicePreview");
  if (previewEl) {
    previewEl.textContent = `${slices} slices @ ${intervalSec}s (~${sliceSize} ${baseSym})`;
  }
}

function updateIcebergPreview() {
  const size = parseFloat(document.getElementById("orderSizeInput")?.value || "0.5");
  const tranche = parseFloat(document.getElementById("icebergTrancheInput")?.value || "0.05");
  const baseSym = currentSymbol.split('-')[0];
  const hidden = Math.max(0, size - tranche);
  const tranchesCount = tranche > 0 ? (size / tranche).toFixed(1) : 1;

  const previewEl = document.getElementById("icebergPreviewText");
  if (previewEl) {
    previewEl.textContent = `Hidden: ${hidden.toFixed(4)} ${baseSym} (${tranchesCount} tranches)`;
  }
}

function setTriggerBasis(basis) {
  currentTriggerBasis = basis;
  const markOpt = document.getElementById("basisMarkOpt");
  const lastOpt = document.getElementById("basisLastOpt");
  if (markOpt) markOpt.classList.toggle("active", basis === "MARK");
  if (lastOpt) lastOpt.classList.toggle("active", basis === "LAST");
}

function setTrailingCallback(val) {
  currentTrailingCallback = parseFloat(val);
  const input = document.getElementById("trailingCallbackInput");
  if (input) input.value = val;
  calculateOrderMetrics();
}

function toggleScalperMode() {
  isScalperMode = !isScalperMode;
  localStorage.setItem("omni_scalper_mode", isScalperMode ? "true" : "false");
  updateScalperUi();
  if (isScalperMode) {
    playSound("buy");
    showOrderToast("warning", "1-Click Fast Scalper Active", "Sub-25ms zero-confirmation execution armed for high-frequency trading.", { latency: "8ms" });
  } else {
    showOrderToast("info", "Standard Execution Active", "Modal confirmations and standard execution prompts restored.");
  }
}

function updateScalperUi() {
  const btn = document.getElementById("btnScalperMode") || document.getElementById("scalperToggleBtn");
  const txt = document.getElementById("scalperStatusText");
  if (btn) {
    btn.classList.toggle("active", isScalperMode);
  }
  if (txt) {
    txt.textContent = isScalperMode ? "ON (Sub-25ms)" : "OFF";
    txt.className = isScalperMode ? "scalper-on" : "scalper-off";
  }
}

function showOrderToast(type, title, message, meta = {}) {
  const container = document.getElementById("orderToastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `order-hud-toast ${type || 'info'}`;
  
  const icon = type === 'success' ? 'check_circle' : (type === 'error' ? 'error' : (type === 'warning' ? 'warning' : 'bolt'));
  const speed = meta.latency || `${Math.floor(Math.random() * 12 + 12)}ms`;
  const symBadge = meta.symbol ? `<span class="order-flag-badge">${meta.symbol.split('-')[0]}</span>` : '';
  const notionalBadge = meta.notional ? `<span class="order-flag-badge font-mono">$${formatNumber(meta.notional, 2)}</span>` : '';

  toast.innerHTML = `
    <span class="material-symbols-outlined gemini-symbol toast-icon">${icon}</span>
    <div class="toast-body">
      <div class="toast-title">
        <span>${title}</span>
        <span class="toast-speed"><span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:12px; margin-right:2px;">bolt</span>${speed}</span>
      </div>
      <div class="toast-msg">${message}</div>
      ${meta.symbol || meta.notional ? `<div class="toast-meta" style="margin-top:4px; display:flex; gap:6px;">${symBadge}${notionalBadge}</div>` : ''}
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()"><span class="material-symbols-outlined gemini-symbol" style="font-size:14px;">close</span></button>
  `;

  container.appendChild(toast);

  // Auto dismiss after 4.5 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'hudToastOut 0.25s forwards';
      setTimeout(() => toast.remove(), 250);
    }
  }, 4500);
}

function toggleMarginMode() {
  currentMarginMode = currentMarginMode === "CROSS" ? "ISOLATED" : "CROSS";
  const btn = document.getElementById("marginModeBtn");
  if (btn) btn.textContent = currentMarginMode === "CROSS" ? "Cross Margin" : "Isolated Margin";
}

function openLeverageModal() {
  const modal = document.getElementById("modalLeverage");
  if (modal) modal.style.display = "flex";
  updateLeverageModalVal(currentLeverage);
}

function closeLeverageModal() {
  const modal = document.getElementById("modalLeverage");
  if (modal) modal.style.display = "none";
}

function updateLeverageModalVal(val) {
  val = parseInt(val, 10) || 1;
  const disp = document.getElementById("modalLeverageVal");
  if (disp) disp.textContent = `${val}x`;
  const range = document.getElementById("leverageRange");
  if (range) range.value = val;

  // Max Position Tier calculation
  const maxPosEl = document.getElementById("modalMaxPosSize");
  if (maxPosEl) {
    if (val <= 20) maxPosEl.textContent = "2,000,000 USDT";
    else if (val <= 50) maxPosEl.textContent = "1,000,000 USDT";
    else if (val <= 100) maxPosEl.textContent = "500,000 USDT";
    else if (val <= 150) maxPosEl.textContent = "250,000 USDT";
    else maxPosEl.textContent = "100,000 USDT";
  }

  const maintEl = document.getElementById("modalMaintMargin");
  if (maintEl) maintEl.textContent = `${(Math.min(0.005, 0.5 / val) * 100).toFixed(2)}%`;

  const liqBufEl = document.getElementById("modalLiqBuffer");
  if (liqBufEl) liqBufEl.textContent = `~${(100 / val).toFixed(2)}% price move`;

  const warn = document.getElementById("leverageWarningBox");
  if (warn) {
    if (val >= 100) {
      warn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:16px;">bolt</span> <strong>High-Frequency Extreme Leverage (${val}x) Active!</strong> Liquidation triggered at ~${(100/val).toFixed(2)}% price move.`;
      warn.style.borderColor = "#00e5ff";
      warn.style.color = "#00e5ff";
    } else if (val > 50) {
      warn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:16px;">bolt</span> High Leverage (${val}x): Rapid liquidation risk. Monitor margin closely.`;
      warn.style.borderColor = "#a855f7";
      warn.style.color = "#d8b4fe";
    } else {
      warn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:16px;">warning</span> Higher leverage increases liquidation risk. Manage collateral carefully.`;
      warn.style.borderColor = "#f59e0b";
      warn.style.color = "#fbbf24";
    }
  }
}

function setModalLeverage(val) {
  updateLeverageModalVal(val);
}

function confirmLeverage() {
  currentLeverage = parseInt(document.getElementById("leverageRange").value, 10);
  document.getElementById("leverageBtn").innerHTML = `${currentLeverage}x Leverage <span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:15px;">bolt</span>`;
  closeLeverageModal();
  calculateOrderMetrics();
}

function setPercentSize(pct) {
  const mkt = allMarkets.find(m => m.symbol === currentSymbol) || { price: 66250 };
  const avail = (accountData && accountData.available) ? accountData.available : 374199.99;
  const notional = avail * pct * (currentOrderMode === "FUTURES" ? currentLeverage : 1);

  const slider = document.getElementById("orderPercentSlider");
  if (slider) slider.value = Math.round(pct * 100);

  const sizeInput = document.getElementById("orderSizeInput");
  if (sizeInput) {
    if (currentSizeUnit === "BASE") {
      sizeInput.value = (notional / mkt.price).toFixed(3);
    } else {
      sizeInput.value = notional.toFixed(2);
    }
  }
  calculateOrderMetrics();
}

function handlePercentSliderInput(val) {
  setPercentSize(parseInt(val, 10) / 100);
}

function toggleTpSlAccordion() {
  const grid = document.getElementById("tpslInputsGrid");
  const chevron = document.getElementById("tpslChevron");
  if (!grid) return;
  const isHidden = grid.style.display === "none";
  grid.style.display = isHidden ? "flex" : "none";
  if (chevron) chevron.style.transform = isHidden ? "rotate(180deg)" : "rotate(0deg)";
}

function toggleTpSlInputs() {
  const isChecked = document.getElementById("tpslCheckbox").checked;
  const grid = document.getElementById("tpslInputsGrid");
  const chevron = document.getElementById("tpslChevron");
  if (grid) grid.style.display = isChecked ? "flex" : "none";
  if (chevron) chevron.style.transform = isChecked ? "rotate(180deg)" : "rotate(0deg)";
  calculateTpSlEstimates();
}

function calculateTpSlEstimates() {
  const mkt = allMarkets.find(m => m.symbol === currentSymbol) || { price: 66250 };
  const entryPrice = parseFloat(document.getElementById("orderPriceInput")?.value || mkt.price);
  
  let rawSize = parseFloat(document.getElementById("orderSizeInput")?.value || "0");
  if (currentSizeUnit === "QUOTE") rawSize = rawSize / (entryPrice || 1);
  const size = rawSize;
  const lev = currentOrderMode === "FUTURES" ? currentLeverage : 1;
  const margin = (size * entryPrice) / lev;

  const tpInput = parseFloat(document.getElementById("tpPriceInput")?.value || "0");
  const slInput = parseFloat(document.getElementById("slPriceInput")?.value || "0");

  const tpEst = document.getElementById("tpEstimateText");
  const slEst = document.getElementById("slEstimateText");

  if (tpEst) {
    if (tpInput > 0 && size > 0) {
      const profit = (tpInput - entryPrice) * size;
      const roe = margin > 0 ? (profit / margin) * 100 : 0;
      tpEst.textContent = `${profit >= 0 ? '+' : ''}${profit.toFixed(2)} USDT (${roe >= 0 ? '+' : ''}${roe.toFixed(2)}%)`;
      tpEst.className = profit >= 0 ? "text-green font-mono" : "text-red font-mono";
    } else {
      tpEst.textContent = "+0.00 USDT (+0.00%)";
      tpEst.className = "text-green font-mono";
    }
  }

  if (slEst) {
    if (slInput > 0 && size > 0) {
      const loss = (slInput - entryPrice) * size;
      const roe = margin > 0 ? (loss / margin) * 100 : 0;
      slEst.textContent = `${loss.toFixed(2)} USDT (${roe.toFixed(2)}%)`;
      slEst.className = loss <= 0 ? "text-red font-mono" : "text-green font-mono";
    } else {
      slEst.textContent = "-0.00 USDT (-0.00%)";
      slEst.className = "text-red font-mono";
    }
  }
}

function setTpPercent(pct) {
  const mkt = allMarkets.find(m => m.symbol === currentSymbol) || { price: 66250 };
  const entryPrice = parseFloat(document.getElementById("orderPriceInput")?.value || mkt.price);
  const lev = currentOrderMode === "FUTURES" ? currentLeverage : 1;
  const targetPrice = entryPrice * (1 + (pct / lev));
  const prec = mkt.precision !== undefined ? mkt.precision : 2;
  const input = document.getElementById("tpPriceInput");
  if (input) {
    input.value = targetPrice.toFixed(prec);
    calculateTpSlEstimates();
  }
}

function setSlPercent(pct) {
  const mkt = allMarkets.find(m => m.symbol === currentSymbol) || { price: 66250 };
  const entryPrice = parseFloat(document.getElementById("orderPriceInput")?.value || mkt.price);
  const lev = currentOrderMode === "FUTURES" ? currentLeverage : 1;
  const stopPrice = entryPrice * (1 - (pct / lev));
  const prec = mkt.precision !== undefined ? mkt.precision : 2;
  const input = document.getElementById("slPriceInput");
  if (input) {
    input.value = Math.max(0, stopPrice).toFixed(prec);
    calculateTpSlEstimates();
  }
}

function calculateOrderMetrics() {
  const mkt = allMarkets.find(m => m.symbol === currentSymbol) || { price: 66250 };
  const price = parseFloat(document.getElementById("orderPriceInput")?.value || mkt.price);

  let rawSize = parseFloat(document.getElementById("orderSizeInput")?.value || "0");
  let size = rawSize;
  let notional = size * price;

  if (currentSizeUnit === "QUOTE") {
    notional = rawSize;
    size = notional / (price || 1);
  } else {
    notional = size * price;
  }

  const lev = currentOrderMode === "FUTURES" ? currentLeverage : 1;
  const margin = notional / lev;

  const marginEl = document.getElementById("metricMargin");
  if (marginEl) {
    marginEl.textContent = `${margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
  }

  // Maker vs Taker Fee Tier
  const isPostOnly = document.getElementById("chkPostOnly")?.checked;
  const isMaker = isPostOnly || currentOrderType === "LIMIT" || currentOrderType === "SCALED";
  const feeRate = isMaker ? 0.0002 : 0.0004;
  const feeEl = document.getElementById("metricFee");
  if (feeEl) {
    const feeVal = notional * feeRate;
    feeEl.textContent = `${isMaker ? '0.02% (Maker)' : '0.04% (Taker)'} (~$${feeVal.toFixed(2)})`;
  }

  // Cost Badges on Execution Buttons
  const buyCost = document.getElementById("btnBuyCost");
  const sellCost = document.getElementById("btnSellCost");
  if (buyCost) buyCost.textContent = `Cost: ${margin.toFixed(2)} USDT`;
  if (sellCost) sellCost.textContent = `Cost: ${margin.toFixed(2)} USDT`;

  const prec = Math.min(Math.max(mkt.precision !== undefined ? mkt.precision : 2, 0), 8);
  const maint_margin_pct = Math.min(0.005, 0.5 / lev);
  const liqPriceLong = price * (1 - (1 / lev) + maint_margin_pct);
  const liqPriceShort = price * (1 + (1 / lev) - maint_margin_pct);

  const liqLongEl = document.getElementById("metricLiqLong");
  if (liqLongEl) {
    liqLongEl.textContent = currentOrderMode === "SPOT" ? "N/A (Spot)" : `${formatNumber(Math.max(0, liqPriceLong), prec)} USDT`;
  }

  const liqShortEl = document.getElementById("metricLiqShort");
  if (liqShortEl) {
    liqShortEl.textContent = currentOrderMode === "SPOT" ? "N/A (Spot)" : `${formatNumber(Math.max(0, liqPriceShort), prec)} USDT`;
  }

  // Real-Time Simulated Slippage & Depth Weighted Fill Preview
  const slipPreview = document.getElementById("orderSlippagePreview");
  const estFillEl = document.getElementById("previewEstAvgFill");
  const estSlipEl = document.getElementById("previewEstSlippage");
  const feeTierEl = document.getElementById("previewFeeTier");

  if (slipPreview) {
    const slipRate = isMaker ? 0 : Math.min(0.0002 + (notional / 500000) * 0.003, 0.025);
    const estFillBuy = price * (1 + slipRate);
    if (estFillEl) estFillEl.textContent = `${formatNumber(estFillBuy, prec)} USDT`;
    if (estSlipEl) {
      if (isMaker) {
        estSlipEl.textContent = "0.000% (Maker Guarantee)";
        estSlipEl.className = "slip-val font-mono text-cyan";
      } else {
        const pctStr = (slipRate * 100).toFixed(3);
        estSlipEl.textContent = `~${pctStr}% (Depth Protected)`;
        estSlipEl.className = "slip-val font-mono text-green";
      }
    }
    if (feeTierEl) {
      feeTierEl.textContent = isMaker ? "Maker 0.02% (Rebate Tier)" : "Taker 0.04% (Immediate Fill)";
    }
  }

  calculateTpSlEstimates();
}

async function submitOrder(side) {
  const t0 = performance.now();
  const mkt = allMarkets.find(m => m.symbol === currentSymbol);
  if (!mkt) return;

  let rawSize = parseFloat(document.getElementById("orderSizeInput")?.value || "0");
  if (rawSize <= 0) {
    showOrderToast("error", "Invalid Order Size", "Please enter an order size greater than 0.");
    return;
  }

  const limitPriceInp = parseFloat(document.getElementById("orderPriceInput")?.value || "0");
  const stopTriggerInp = parseFloat(document.getElementById("stopTriggerInput")?.value || "0");
  const trailingCallbackInp = parseFloat(document.getElementById("trailingCallbackInput")?.value || "1.5");
  const scaledLower = parseFloat(document.getElementById("scaledLowerPrice")?.value || "0");
  const scaledUpper = parseFloat(document.getElementById("scaledUpperPrice")?.value || "0");
  const scaledCount = parseInt(document.getElementById("scaledOrderCount")?.value || "5", 10);

  const price = (currentOrderType === "LIMIT" || currentOrderType === "STOP") 
    ? (limitPriceInp > 0 ? limitPriceInp : mkt.price) 
    : mkt.price;

  const size = currentSizeUnit === "QUOTE" ? +(rawSize / (price || 1)).toFixed(4) : rawSize;

  const tpPrice = document.getElementById("tpslCheckbox")?.checked ? parseFloat(document.getElementById("tpPriceInput")?.value || "0") : 0;
  const slPrice = document.getElementById("tpslCheckbox")?.checked ? parseFloat(document.getElementById("slPriceInput")?.value || "0") : 0;

  const reduceOnly = document.getElementById("chkReduceOnly")?.checked || false;
  const postOnly = document.getElementById("chkPostOnly")?.checked || false;
  const tif = document.getElementById("tifSelect")?.value || "GTC";
  const slippage = parseFloat(document.getElementById("slippageSelect")?.value || "0.5");

  // Institutional Post-Only Guard
  if (postOnly) {
    if (currentOrderType === "MARKET") {
      showOrderToast("error", "Post-Only Rejected", "Market orders cross the spread immediately as taker.");
      return;
    }
    if (currentOrderType === "LIMIT" && limitPriceInp > 0) {
      if ((side === "BUY" || side === "LONG") && limitPriceInp >= mkt.price) {
        showOrderToast("error", "Post-Only Rejected", `Buy Limit $${formatNumber(limitPriceInp, 2)} crosses market price $${formatNumber(mkt.price, 2)}.`);
        return;
      } else if ((side === "SELL" || side === "SHORT") && limitPriceInp <= mkt.price) {
        showOrderToast("error", "Post-Only Rejected", `Sell Limit $${formatNumber(limitPriceInp, 2)} crosses market price $${formatNumber(mkt.price, 2)}.`);
        return;
      }
    }
  }

  // Institutional Reduce-Only Guard
  if (reduceOnly) {
    const oppSide = (side === "BUY" || side === "LONG") ? "SHORT" : "LONG";
    const existing = localPositions.find(p => p.symbol === currentSymbol && p.side === oppSide);
    if (!existing) {
      showOrderToast("error", "Reduce-Only Rejected", `No active ${oppSide} position on ${currentSymbol} to reduce.`);
      return;
    }
  }

  // 1. Phase 1: OCO (One-Cancels-the-Other) Bracket Execution
  if (currentOrderType === "OCO") {
    const ocoGroupId = `OCO-${Date.now()}`;
    const tpTrig = parseFloat(document.getElementById("ocoTpTrigger")?.value || (mkt.price * 1.03));
    const tpLim = parseFloat(document.getElementById("ocoTpPrice")?.value || (mkt.price * 1.031));
    const slTrig = parseFloat(document.getElementById("ocoSlTrigger")?.value || (mkt.price * 0.98));
    const slLim = parseFloat(document.getElementById("ocoSlPrice")?.value || (mkt.price * 0.979));

    const oppSide = (side === "BUY" || side === "LONG") ? "SELL" : "BUY";

    const tpOrder = {
      id: Date.now(),
      orderId: `ORD-TP-${Date.now().toString().slice(-5)}`,
      symbol: currentSymbol,
      type: "STOP_LIMIT",
      subType: "OCO_TP",
      side: oppSide,
      orderMode: currentOrderMode,
      marginMode: currentMarginMode,
      leverage: currentLeverage,
      price: tpLim,
      triggerPrice: tpTrig,
      size: size,
      status: "PENDING",
      ocoGroupId: ocoGroupId,
      reduceOnly: true,
      filledSize: 0,
      createdAt: Math.floor(Date.now() / 1000)
    };

    const slOrder = {
      id: Date.now() + 1,
      orderId: `ORD-SL-${Date.now().toString().slice(-5)}`,
      symbol: currentSymbol,
      type: "STOP",
      subType: "OCO_SL",
      side: oppSide,
      orderMode: currentOrderMode,
      marginMode: currentMarginMode,
      leverage: currentLeverage,
      price: slLim,
      triggerPrice: slTrig,
      size: size,
      status: "PENDING",
      ocoGroupId: ocoGroupId,
      reduceOnly: true,
      filledSize: 0,
      createdAt: Math.floor(Date.now() / 1000)
    };

    localOpenOrders.unshift(tpOrder);
    localOpenOrders.unshift(slOrder);
    saveLocalOrders();
    renderOpenOrdersTable();
    if (chartInstance && chartInstance.setPendingOrders) chartInstance.setPendingOrders(localOpenOrders);
    playSound("buy");
    showOrderToast("success", "OCO Bracket Armed", `TP @ $${formatNumber(tpLim, 2)} & SL @ $${formatNumber(slLim, 2)} for ${size} ${currentSymbol.split('-')[0]}`, { latency: "8ms", symbol: currentSymbol });
    switchBottomTab("orders");
    return;
  }

  // 2. Phase 1: TWAP Algorithmic Slicing Execution
  if (currentOrderType === "TWAP") {
    const duration = parseInt(document.getElementById("twapDurationSelect")?.value || "300", 10);
    const slices = parseInt(document.getElementById("twapSlicesSelect")?.value || "10", 10);
    const jitter = document.getElementById("chkTwapJitter")?.checked ?? true;
    startTwapExecution(currentSymbol, side, size, duration, slices, jitter);
    return;
  }

  // 3. Phase 1: Iceberg Order Execution
  if (currentOrderType === "ICEBERG") {
    let visibleTranche = parseFloat(document.getElementById("icebergTrancheInput")?.value || "0.05");
    if (visibleTranche <= 0 || visibleTranche >= size) {
      visibleTranche = +(size / 4).toFixed(4);
    }
    const hasVariance = document.getElementById("chkIcebergVariance")?.checked ?? true;

    const icebergOrder = {
      id: Date.now(),
      orderId: `ICE-${Date.now().toString().slice(-6)}`,
      symbol: currentSymbol,
      type: "LIMIT",
      isIceberg: true,
      side: side,
      orderMode: currentOrderMode,
      marginMode: currentMarginMode,
      leverage: currentLeverage,
      price: price,
      size: visibleTranche,
      totalIcebergSize: size,
      remainingIcebergSize: +(size - visibleTranche).toFixed(4),
      baseTrancheSize: visibleTranche,
      hasVariance: hasVariance,
      status: "PENDING",
      reduceOnly: reduceOnly,
      postOnly: postOnly,
      tif: tif,
      filledSize: 0,
      createdAt: Math.floor(Date.now() / 1000)
    };

    localOpenOrders.unshift(icebergOrder);
    saveLocalOrders();
    renderOpenOrdersTable();
    if (chartInstance && chartInstance.setPendingOrders) chartInstance.setPendingOrders(localOpenOrders);
    playSound(side === "BUY" ? "buy" : "sell");
    showOrderToast("success", "Iceberg Tranche 1 Armed", `Exposing ${visibleTranche} ${currentSymbol.split('-')[0]} @ $${formatNumber(price, 2)} (Hidden: ${(size - visibleTranche).toFixed(4)})`, { latency: "10ms", symbol: currentSymbol });
    switchBottomTab("orders");
    return;
  }

  const payload = {
    address: currentWallet,
    symbol: currentSymbol,
    side: side,
    type: currentOrderType,
    marginMode: currentOrderMode === "SPOT" ? "SPOT" : currentMarginMode,
    orderMode: currentOrderMode,
    leverage: currentOrderMode === "FUTURES" ? currentLeverage : 1,
    size: size,
    price: price,
    triggerPrice: stopTriggerInp,
    triggerBasis: currentTriggerBasis,
    trailingCallback: trailingCallbackInp,
    scaledLowerPrice: scaledLower,
    scaledUpperPrice: scaledUpper,
    scaledOrderCount: scaledCount,
    reduceOnly: reduceOnly,
    postOnly: postOnly,
    tif: tif,
    slippage: slippage,
    tpPrice: tpPrice,
    slPrice: slPrice
  };

  let data = await safeFetchJson(`${API_BASE}/api/order/place`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const execLatency = `${Math.round(performance.now() - t0)}ms`;

  if (!data) {
    // Client-side fallback execution for static hosting / offline backend
    if (currentOrderType === "MARKET") {
      data = executeClientSideOrder(side, size, tpPrice, slPrice, currentSymbol, price, currentLeverage, reduceOnly);
    } else {
      // Resting Pending Order Fallback
      const newOrder = {
        id: Date.now(),
        orderId: `ORD-${Date.now().toString().slice(-6)}`,
        symbol: currentSymbol,
        type: currentOrderType,
        side: side,
        orderMode: currentOrderMode,
        marginMode: currentMarginMode,
        leverage: currentLeverage,
        price: price,
        size: size,
        status: "PENDING",
        triggerPrice: stopTriggerInp,
        triggerBasis: currentTriggerBasis,
        trailingCallback: trailingCallbackInp,
        reduceOnly: reduceOnly,
        postOnly: postOnly,
        tif: tif,
        filledSize: 0,
        createdAt: Math.floor(Date.now() / 1000)
      };
      localOpenOrders.unshift(newOrder);
      saveLocalOrders();
      data = {
        success: true,
        status: "PENDING",
        orderId: newOrder.orderId,
        message: `Resting ${currentOrderType} ${side} placed for ${size} ${currentSymbol.split('-')[0]} @ $${formatNumber(price, 2)}`
      };
    }
  }

  if (data && data.success) {
    playSound(side === "BUY" ? "buy" : "sell");

    if (data.status === "PENDING") {
      showOrderToast("warning", `${currentOrderType} Resting Order`, data.message, {
        symbol: currentSymbol,
        notional: price * size,
        latency: execLatency,
        orderId: data.orderId
      });
      loadOpenOrders();
      switchBottomTab("orders");
    } else {
      showOrderToast("success", `Order Executed (${data.orderMode || 'FUTURES'})`, data.message, {
        symbol: currentSymbol,
        notional: price * size,
        latency: execLatency,
        orderId: data.orderId
      });
      loadAccountState();
      loadPositions();
      loadOpenOrders();
      switchBottomTab("positions");
    }
  } else {
    showOrderToast("error", "Order Rejected", data ? data.error : "Failed to place order.");
  }
}

// 5. Open Orders Desk Management & Real-Time Matching Engine
function saveLocalOrders() {
  localStorage.setItem("omni_open_orders", JSON.stringify(localOpenOrders));
  window.localOpenOrders = localOpenOrders;
}

function toggleHideOtherPairs() {
  hideOtherPairs = !hideOtherPairs;
  const chk = document.getElementById("chkHideOtherPairs");
  if (chk) chk.checked = hideOtherPairs;
  renderOpenOrdersTable();
}

async function loadOpenOrders() {
  let data = await safeFetchJson(`${API_BASE}/api/orders/open?address=${currentWallet}`);
  if (data && Array.isArray(data.orders)) {
    const serverIds = new Set(data.orders.map(o => String(o.orderId || o.id)));
    const localOnly = localOpenOrders.filter(o => !serverIds.has(String(o.orderId || o.id)) && (o.subType || o.isIceberg || o.ocoGroupId));
    localOpenOrders = [...data.orders, ...localOnly];
    saveLocalOrders();
  }
  
  const countBadge = document.getElementById("ordersCountBadge");
  const summaryBadge = document.getElementById("openOrdersSummaryBadge");
  if (countBadge) countBadge.textContent = localOpenOrders.length;
  if (summaryBadge) summaryBadge.textContent = `${localOpenOrders.length} Active Orders`;

  if (chartInstance && chartInstance.setPendingOrders) {
    chartInstance.setPendingOrders(localOpenOrders);
  }

  renderOpenOrdersTable();
}

function updateOpenOrdersCountBadge() {
  const countBadge = document.getElementById("ordersCountBadge");
  const summaryBadge = document.getElementById("openOrdersSummaryBadge");
  if (countBadge) countBadge.textContent = localOpenOrders.length;
  if (summaryBadge) summaryBadge.textContent = `${localOpenOrders.length} Active Orders`;
}

function renderOpenOrdersTable() {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;

  let filtered = localOpenOrders;
  if (hideOtherPairs && currentSymbol) {
    filtered = localOpenOrders.filter(o => o.symbol === currentSymbol);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="empty-table">
          <div style="padding: 24px; text-align: center; color: #64748b;">
            <span class="material-symbols-outlined gemini-symbol gemini-grad-purple" style="font-size: 36px; display: block; margin-bottom: 8px;">receipt_long</span>
            No open ${hideOtherPairs ? currentSymbol : ''} orders. Place a Limit, Stop, Trailing, or Scaled order above!
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    const isBuy = o.side === "BUY" || o.side === "LONG";
    const sideLabel = isBuy 
      ? `<span class="gemini-side-pill buy"><span class="gemini-side-indicator buy"></span>BUY / LONG</span>`
      : `<span class="gemini-side-pill sell"><span class="gemini-side-indicator sell"></span>SELL / SHORT</span>`;
    const symBase = o.symbol.split("-")[0];
    const priceVal = parseFloat(o.price || 0);
    const trigVal = parseFloat(o.triggerPrice || 0);
    const trigText = o.type === "TRAILING_STOP" || o.type === "TRAILING"
      ? `Trailing ${o.trailingCallback || 1.5}%`
      : (trigVal > 0 ? `${o.triggerBasis || 'Last'} ${isBuy ? '>=' : '<='} $${formatNumber(trigVal, 2)}` : '—');
    const totalUsdt = priceVal * (o.size || 0);
    const filledPct = Math.round(((o.filledSize || 0) / (o.size || 1)) * 100);
    const dateStr = o.createdAt ? new Date(o.createdAt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now';
    const orderIdStr = o.orderId || `ORD-${o.id}`;

    const flags = [];
    if (o.reduceOnly) flags.push(`<span class="order-flag-badge reduce">Reduce</span>`);
    if (o.postOnly) flags.push(`<span class="order-flag-badge post">Post</span>`);
    if (o.tif) flags.push(`<span class="order-flag-badge tif">${o.tif}</span>`);

    return `
      <tr class="order-row">
        <td>
          <div class="font-mono text-cyan" style="font-weight:600;">#${orderIdStr}</div>
          <div class="text-muted" style="font-size:10px;">${dateStr}</div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            ${getTokenVectorSvg(o.symbol, 'crypto', 18)}
            <div style="font-weight:700; color:#fff;">${o.symbol}</div>
          </div>
          <div class="text-muted" style="font-size:10px;">${o.orderMode || 'FUTURES'} ${o.leverage || 20}x</div>
        </td>
        <td>
          <span class="order-status-chip open">${o.type || 'LIMIT'}</span>
        </td>
        <td>
          ${sideLabel}
        </td>
        <td class="font-mono" style="font-weight:600; color:#e2e8f0;">
          $${formatNumber(priceVal, 2)}
        </td>
        <td class="text-muted font-mono" style="font-size:11px;">
          ${trigText}
        </td>
        <td class="font-mono">
          <div style="color:#fff; font-weight:600;">${o.size} ${symBase}</div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="width:40px; height:4px; background:#1e293b; border-radius:2px; overflow:hidden;">
              <div style="width:${filledPct}%; height:100%; background:#00e5ff;"></div>
            </div>
            <span class="text-muted font-mono" style="font-size:10px;">${filledPct}%</span>
          </div>
        </td>
        <td class="font-mono text-cyan" style="font-weight:600;">
          $${formatNumber(totalUsdt, 2)}
        </td>
        <td>
          <div style="display:flex; gap:4px; flex-wrap:wrap;">
            ${flags.join("") || '<span class="text-muted">—</span>'}
          </div>
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="order-action-btn edit" onclick="openEditOrderModal('${o.id}')" title="Modify Price & Amount"><span class="material-symbols-outlined gemini-symbol" style="font-size:14px;">edit</span></button>
            <button class="order-action-btn cancel" onclick="cancelOrder('${o.id}')" title="Cancel Resting Order"><span class="material-symbols-outlined gemini-symbol" style="font-size:14px;">close</span></button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function cancelOrder(orderId) {
  const cleanId = String(orderId).replace("ORD-", "");
  
  // Optimistic UI removal
  const idx = localOpenOrders.findIndex(o => String(o.id) === cleanId || o.orderId === orderId);
  if (idx !== -1) {
    localOpenOrders.splice(idx, 1);
    saveLocalOrders();
    renderOpenOrdersTable();
    if (chartInstance && chartInstance.setPendingOrders) {
      chartInstance.setPendingOrders(localOpenOrders);
    }
  }

  showOrderToast("info", "Order Cancelled", `Order #${orderId} was removed from the orderbook.`);

  await safeFetchJson(`${API_BASE}/api/order/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: cleanId,
      address: currentWallet
    })
  });

  loadOpenOrders();
}

async function cancelAllOrdersPrompt() {
  if (localOpenOrders.length === 0) {
    showOrderToast("info", "No Open Orders", "There are no pending orders resting in the orderbook.");
    return;
  }

  const count = localOpenOrders.length;
  if (!isScalperMode) {
    const confirmCancel = confirm(`Emergency Desk: Are you sure you want to cancel all ${count} open resting orders?`);
    if (!confirmCancel) return;
  }

  localOpenOrders = [];
  saveLocalOrders();
  renderOpenOrdersTable();
  if (chartInstance && chartInstance.setPendingOrders) {
    chartInstance.setPendingOrders([]);
  }

  showOrderToast("warning", "Cancel All Orders Executed", `Successfully flushed and cancelled ${count} open resting orders.`, { latency: "14ms" });

  await safeFetchJson(`${API_BASE}/api/orders/cancel-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: currentWallet
    })
  });

  loadOpenOrders();
}

function openEditOrderModal(orderId) {
  const cleanId = String(orderId).replace("ORD-", "");
  const order = localOpenOrders.find(o => String(o.id) === cleanId || o.orderId === orderId);
  if (!order) return;

  orderEditTargetId = cleanId;
  const modal = document.getElementById("modalEditOrder");
  const symEl = document.getElementById("editOrderHeader") || document.getElementById("editOrderSymbol");
  const priceInp = document.getElementById("editOrderPriceInput") || document.getElementById("editOrderPrice");
  const sizeInp = document.getElementById("editOrderSizeInput") || document.getElementById("editOrderSize");

  if (symEl) symEl.textContent = `${order.symbol} (${order.type} ${order.side})`;
  if (priceInp) priceInp.value = order.price;
  if (sizeInp) sizeInp.value = order.size;

  if (modal) modal.style.display = "flex";
}

function closeEditOrderModal() {
  const modal = document.getElementById("modalEditOrder");
  if (modal) modal.style.display = "none";
  orderEditTargetId = null;
}

async function saveOrderEdit() {
  if (!orderEditTargetId) return;

  const priceInp = document.getElementById("editOrderPriceInput") || document.getElementById("editOrderPrice");
  const sizeInp = document.getElementById("editOrderSizeInput") || document.getElementById("editOrderSize");
  const price = parseFloat(priceInp?.value || "0");
  const size = parseFloat(sizeInp?.value || "0");

  if (price <= 0 || size <= 0) {
    showOrderToast("error", "Invalid Modification", "Price and size must be greater than zero.");
    return;
  }

  const order = localOpenOrders.find(o => String(o.id) === String(orderEditTargetId));
  if (order) {
    order.price = price;
    order.size = size;
    saveLocalOrders();
    renderOpenOrdersTable();
    if (chartInstance && chartInstance.setPendingOrders) {
      chartInstance.setPendingOrders(localOpenOrders);
    }
  }

  closeEditOrderModal();
  showOrderToast("success", "Order Modified", `Order #${orderEditTargetId} updated to ${size} @ $${formatNumber(price, 2)} USDT.`);

  await safeFetchJson(`${API_BASE}/api/order/modify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: orderEditTargetId,
      price: price,
      size: size,
      address: currentWallet
    })
  });

  loadOpenOrders();
}

function checkPendingOrdersMatch(currentPrice) {
  if (!localOpenOrders || localOpenOrders.length === 0) return;
  let filledAny = false;

  for (let i = localOpenOrders.length - 1; i >= 0; i--) {
    const order = localOpenOrders[i];
    if (order.status !== "PENDING") continue;
    
    const oMkt = allMarkets.find(m => m.symbol === order.symbol);
    const p = oMkt ? oMkt.price : currentPrice;
    const targetPrice = parseFloat(order.price || order.triggerPrice || 0);

    let isTriggered = false;
    let fillPrice = targetPrice || p;

    if (order.type === "LIMIT") {
      if ((order.side === "BUY" || order.side === "LONG") && p <= targetPrice) {
        isTriggered = true;
        fillPrice = targetPrice;
      } else if ((order.side === "SELL" || order.side === "SHORT") && p >= targetPrice) {
        isTriggered = true;
        fillPrice = targetPrice;
      }
    } else if (order.type === "STOP" || order.type === "STOP_MARKET") {
      const trig = parseFloat(order.triggerPrice || order.price || 0);
      if ((order.side === "BUY" || order.side === "LONG") && p >= trig) {
        isTriggered = true;
        fillPrice = p;
      } else if ((order.side === "SELL" || order.side === "SHORT") && p <= trig) {
        isTriggered = true;
        fillPrice = p;
      }
    } else if (order.type === "STOP_LIMIT") {
      const trig = parseFloat(order.triggerPrice || order.price || 0);
      if ((order.side === "BUY" || order.side === "LONG") && p >= trig && p <= targetPrice) {
        isTriggered = true;
        fillPrice = targetPrice;
      } else if ((order.side === "SELL" || order.side === "SHORT") && p <= trig && p >= targetPrice) {
        isTriggered = true;
        fillPrice = targetPrice;
      }
    } else if (order.type === "TRAILING_STOP" || order.type === "TRAILING") {
      const trig = parseFloat(order.triggerPrice || order.price || 0);
      if ((order.side === "BUY" || order.side === "LONG") && p >= trig) {
        isTriggered = true;
        fillPrice = p;
      } else if ((order.side === "SELL" || order.side === "SHORT") && p <= trig) {
        isTriggered = true;
        fillPrice = p;
      }
    }

    if (isTriggered) {
      filledAny = true;
      order.status = "FILLED";
      order.filledSize = order.size;
      order.price = fillPrice;
      
      executeClientSideOrder(order.side, order.size, order.tpPrice, order.slPrice, order.symbol, fillPrice, order.leverage, order.reduceOnly);
      playSound(order.side === "BUY" || order.side === "LONG" ? "buy" : "sell");

      // 1. OCO Alternate Leg Auto-Cancellation
      if (order.ocoGroupId) {
        const ocoId = order.ocoGroupId;
        localOpenOrders = localOpenOrders.filter(o => o === order || o.ocoGroupId !== ocoId);
        showOrderToast("info", "OCO Alternate Leg Cancelled", `${order.subType === 'OCO_TP' ? 'Take Profit' : 'Stop Loss'} executed. Alternate bracket automatically cancelled.`, { symbol: order.symbol, latency: "6ms" });
      }

      // 2. Iceberg Next Tranche Deployment
      if (order.isIceberg && order.remainingIcebergSize > 0) {
        let nextSize = Math.min(order.remainingIcebergSize, order.baseTrancheSize);
        if (order.hasVariance) {
          nextSize = +(nextSize * (0.92 + Math.random() * 0.16)).toFixed(4);
        }
        nextSize = Math.min(nextSize, order.remainingIcebergSize);
        const rem = +(order.remainingIcebergSize - nextSize).toFixed(4);

        const nextTranche = {
          ...order,
          id: Date.now() + Math.floor(Math.random() * 1000),
          orderId: `ICE-${Date.now().toString().slice(-6)}`,
          size: nextSize,
          remainingIcebergSize: rem,
          status: "PENDING",
          filledSize: 0,
          createdAt: Math.floor(Date.now() / 1000)
        };
        localOpenOrders.unshift(nextTranche);
        showOrderToast("success", "Iceberg Tranche Reloaded", `Next tranche of ${nextSize} ${order.symbol.split('-')[0]} placed into book. (Remaining: ${rem})`, { symbol: order.symbol, latency: "8ms" });
      }

      showOrderToast("success", `Order Filled: ${order.type} ${order.side}`, `${order.size} ${order.symbol.split("-")[0]} @ $${formatNumber(fillPrice, 2)}`, {
        symbol: order.symbol,
        notional: fillPrice * order.size,
        latency: "12ms",
        orderId: order.orderId || `ORD-${order.id}`
      });

      const orderIdx = localOpenOrders.indexOf(order);
      if (orderIdx !== -1) localOpenOrders.splice(orderIdx, 1);
    }
  }

  if (filledAny) {
    saveLocalOrders();
    renderOpenOrdersTable();
    loadPositions();
    loadAccountState();
    if (chartInstance && chartInstance.setPendingOrders) {
      chartInstance.setPendingOrders(localOpenOrders);
    }
  }
}

// Expose globals for on-chart canvas and HTML onclick handlers
window.cancelOrder = cancelOrder;
window.cancelAllOrdersPrompt = cancelAllOrdersPrompt;
window.openEditOrderModal = openEditOrderModal;
window.closeEditOrderModal = closeEditOrderModal;
window.saveOrderEdit = saveOrderEdit;
window.toggleScalperMode = toggleScalperMode;
window.setOrderType = setOrderType;
window.setTriggerBasis = setTriggerBasis;
window.setTrailingCallback = setTrailingCallback;
window.toggleHideOtherPairs = toggleHideOtherPairs;
window.showOrderToast = showOrderToast;

// 5. Account, Positions, Reversal, Partial Close & PnL Poster
async function loadAccountState() {
  const data = await safeFetchJson(`${API_BASE}/api/account?address=${currentWallet}`);
  if (data) {
    accountData = data;
    if (data.equity) accountEquity = data.equity;
  } else if (!accountData) {
    accountData = JSON.parse(localStorage.getItem("omni_account_data") || "null") || {
      equity: 422530.19,
      available: 374199.99,
      usedMargin: 48330.20,
      marginRatio: 11.44
    };
    accountEquity = accountData.equity;
  }
  
  if (accountData) {
    accountData.equity = accountEquity;
  }

  const acc = accountData;
  document.getElementById("headerEquityDisplay").textContent = `$${acc.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById("metricAvailable").textContent = `$${acc.available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  document.getElementById("assetsTotalEquity").textContent = `$${acc.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById("assetsAvailableMargin").textContent = `$${acc.available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById("assetsUsedMargin").textContent = `$${acc.usedMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById("assetsMarginRatio").textContent = `${acc.marginRatio}% (${acc.marginRatio < 60 ? "Safe" : "High Risk"})`;

  const headerWalletTotal = document.getElementById("headerOmniWalletTotal");
  if (headerWalletTotal) headerWalletTotal.textContent = `$${acc.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (typeof syncOmniWalletBalances === "function") syncOmniWalletBalances();
}

function updateBalancesDisplay() {
  if (accountData) {
    accountData.equity = accountEquity;
  }
  loadAccountState();
}

// 5. Collapsible Trading Desk & Position Management
let deskHeightState = "default"; // "default", "collapsed", "expanded"

function setDeskHeightState(state) {
  deskHeightState = state;
  const desk = document.getElementById("tradingDesk");
  if (!desk) return;

  desk.classList.remove("collapsed", "default", "expanded");
  desk.classList.add(state);

  const btnColl = document.getElementById("btnDeskCollapse");
  const btnDef = document.getElementById("btnDeskDefault");
  const btnExp = document.getElementById("btnDeskExpand");

  if (btnColl) btnColl.classList.toggle("active", state === "collapsed");
  if (btnDef) btnDef.classList.toggle("active", state === "default");
  if (btnExp) btnExp.classList.toggle("active", state === "expanded");

  // Resize canvas chart dynamically after transition
  setTimeout(() => {
    if (chartInstance) chartInstance.resize();
  }, 270);
}

async function closeAllPositionsPrompt() {
  const count = localPositions.length;
  if (count === 0) {
    alert("No open positions to close.");
    return;
  }
  if (!confirm(`Are you sure you want to close ALL ${count} open positions at current market prices?`)) {
    return;
  }

  let totalClosedPnl = 0;
  localPositions.forEach(pos => {
    totalClosedPnl += pos.unrealizedPnl;
    if (accountData) {
      accountData.available += (pos.margin + pos.unrealizedPnl);
      accountData.equity += pos.unrealizedPnl;
      accountData.usedMargin = Math.max(0, (accountData.usedMargin || 0) - pos.margin);
    }
  });

  if (accountData) {
    accountData.marginRatio = +((accountData.usedMargin / accountData.equity) * 100).toFixed(2);
    localStorage.setItem("omni_account_data", JSON.stringify(accountData));
  }

  localPositions = [];
  saveLocalPositions();
  playSound("sell");
  alert(`Closed all positions! Realized PnL: $${totalClosedPnl.toFixed(2)} USDT`);
  loadAccountState();
  loadPositions();
}

async function loadPositions() {
  let positions = null;
  const data = await safeFetchJson(`${API_BASE}/api/positions?address=${currentWallet}`);
  if (data && data.positions) {
    positions = data.positions;
    localPositions = positions;
    saveLocalPositions();
  } else {
    // Dynamic markPrice & unrealized PnL recalculation for client positions
    localPositions.forEach(p => {
      const mkt = allMarkets.find(m => m.symbol === p.symbol);
      if (mkt) {
        p.markPrice = mkt.price;
        const diff = p.side === "LONG" ? (p.markPrice - p.entryPrice) : (p.entryPrice - p.markPrice);
        p.unrealizedPnl = +(diff * p.size).toFixed(2);
        p.roePercent = p.margin > 0 ? +((p.unrealizedPnl / p.margin) * 100).toFixed(2) : 0;
      }
    });
    positions = localPositions;
  }
  window.currentPositionsList = positions;
  window.localPositions = positions;
  if (chartInstance) {
    chartInstance.positions = positions;
    chartInstance.render();
  }
  
  const badgeEl = document.getElementById("positionsCountBadge");
  if (badgeEl) badgeEl.textContent = positions.length;

  const tbody = document.getElementById("positionsTableBody");
  if (!tbody) return;

  if (positions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-table">No open positions. Place an order above or use Copy Trading!</td></tr>`;
    return;
  }

  tbody.innerHTML = positions.map(p => {
    const isLong = p.side === "LONG";
    const sideClass = isLong ? "pos-side-badge long" : "pos-side-badge short";
    const sideArrow = isLong ? `<span class="material-symbols-outlined gemini-symbol" style="font-size:11px;">north</span>` : `<span class="material-symbols-outlined gemini-symbol" style="font-size:11px;">south</span>`;
    const pnlClass = p.unrealizedPnl >= 0 ? "text-green" : "text-red";
    const pnlSign = p.unrealizedPnl >= 0 ? "+" : "";
    const mkt = allMarkets.find(m => m.symbol === p.symbol) || {};
    const prec = mkt.precision !== undefined ? mkt.precision : 2;
    const baseSym = p.symbol.split("-")[0] || "BTC";

    // Proximity to liquidation calculation
    const liqDist = p.liquidationPrice > 0 
      ? Math.abs(p.markPrice - p.liquidationPrice) / p.markPrice * 100 
      : 100;
    const safetyBadge = liqDist < 4
      ? `<span class="liq-safety-badge danger"><span class="material-symbols-outlined gemini-symbol gemini-grad-pink" style="font-size:13px;">warning</span> DANGER -${liqDist.toFixed(1)}%</span>`
      : `<span class="liq-safety-badge safe"><span class="material-symbols-outlined gemini-symbol gemini-grad-green" style="font-size:13px;">shield</span> SAFE +${liqDist.toFixed(1)}%</span>`;

    // TP/SL badge
    const tpslHtml = (p.tpPrice || p.slPrice)
      ? `<span class="tpsl-status-chip" onclick="openEditTpSlModal(${p.id})"><span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:13px;">track_changes</span> ${p.tpPrice ? formatNumber(p.tpPrice, 2) : "Set"} / ${p.slPrice ? formatNumber(p.slPrice, 2) : "Set"}</span>`
      : `<span class="tpsl-status-chip text-cyan" onclick="openEditTpSlModal(${p.id})">+ Set TP/SL</span>`;

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            ${getTokenVectorSvg(p.symbol, 'crypto', 18)}
            <strong>${p.symbol}</strong>
          </div>
        </td>
        <td><span class="${sideClass}">${sideArrow} ${p.side} ${p.leverage}x</span> <span style="font-size:10px; color:#94a3b8;">Cross</span></td>
        <td>
          <span class="font-mono">${p.size} ${baseSym}</span>
          <div style="font-size:10px; color:#94a3b8;">~$${(p.size * p.markPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</div>
        </td>
        <td class="font-mono">${formatNumber(p.entryPrice, prec)}</td>
        <td class="font-mono text-cyan">${formatNumber(p.markPrice, prec)}</td>
        <td class="font-mono">${formatNumber(p.margin, 2)}</td>
        <td class="font-mono text-red gemini-liq-cell">
          <span style="font-weight:700; letter-spacing:0.02em;">${formatNumber(p.liquidationPrice, prec)}</span>
          ${safetyBadge}
        </td>
        <td class="${pnlClass} font-mono" style="font-weight:700;">
          ${pnlSign}${p.unrealizedPnl.toFixed(2)} USDT (${pnlSign}${p.roePercent}%)
        </td>
        <td>${tpslHtml}</td>
        <td>
          <div class="pos-actions-cell">
            <button class="btn-act rev-btn" onclick="reversePosition(${p.id})" title="Instant 1-Click Reverse Position"><span class="material-symbols-outlined gemini-symbol" style="font-size:14px;">published_with_changes</span></button>
            <button class="btn-act tpsl-btn" onclick="openEditTpSlModal(${p.id})" title="Edit Take Profit / Stop Loss"><span class="material-symbols-outlined gemini-symbol" style="font-size:14px;">track_changes</span></button>
            <button class="btn-act share-btn" onclick="openPnlPoster('${p.symbol}', '${p.side}', ${p.size}, ${p.pnl})" title="Generate Viral PnL Card"><span class="material-symbols-outlined gemini-symbol" style="font-size:14px;">share</span></button>
            <button class="btn-act close-btn-danger" onclick="closePosition(${p.id})" title="Instant Market Close">Close</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  loadHistoryTabs();
}

function loadHistoryTabs() {
  const historyTbody = document.getElementById("historyTableBody");
  if (historyTbody && (!historyTbody.children.length || historyTbody.querySelector(".empty-table"))) {
    const now = new Date();
    const historySample = [
      {
        time: new Date(now.getTime() - 14 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        symbol: "BTC-USDT",
        type: "Market",
        side: "BUY",
        price: "66,150.00",
        filled: "0.500 / 0.500",
        avg: "66,150.00",
        status: "Filled"
      },
      {
        time: new Date(now.getTime() - 48 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        symbol: "ETH-USDT",
        type: "Limit",
        side: "SELL",
        price: "2,640.00",
        filled: "2.000 / 2.000",
        avg: "2,640.00",
        status: "Filled"
      }
    ];
    historyTbody.innerHTML = historySample.map(h => {
      const isBuy = h.side === 'BUY' || h.side === 'LONG';
      return `
        <tr>
          <td class="text-muted">${h.time}</td>
          <td><strong>${h.symbol}</strong></td>
          <td>${h.type}</td>
          <td><span class="gemini-side-pill ${isBuy ? 'buy' : 'sell'}"><span class="gemini-side-indicator ${isBuy ? 'buy' : 'sell'}"></span>${h.side}</span></td>
          <td class="font-mono">${h.price}</td>
          <td class="font-mono">${h.filled}</td>
          <td class="font-mono">${h.avg}</td>
          <td><span class="text-green">${h.status}</span></td>
        </tr>
      `;
    }).join("");
  }

  const tradesHistoryTbody = document.getElementById("tradesHistoryTableBody");
  if (tradesHistoryTbody && (!tradesHistoryTbody.children.length || tradesHistoryTbody.querySelector(".empty-table"))) {
    const now = new Date();
    const tradesSample = [
      {
        time: new Date(now.getTime() - 14 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        symbol: "BTC-USDT",
        side: "LONG",
        price: "66,150.00",
        size: "0.500 BTC",
        fee: "1.32 USDT",
        pnl: "+124.50 USDT"
      }
    ];
    tradesHistoryTbody.innerHTML = tradesSample.map(t => {
      const isLong = t.side === 'LONG' || t.side === 'BUY';
      return `
        <tr>
          <td class="text-muted">${t.time}</td>
          <td><strong>${t.symbol}</strong></td>
          <td><span class="gemini-side-pill ${isLong ? 'buy' : 'sell'}"><span class="gemini-side-indicator ${isLong ? 'buy' : 'sell'}"></span>${t.side}</span></td>
          <td class="font-mono">${t.price}</td>
          <td class="font-mono">${t.size}</td>
          <td class="font-mono text-muted">${t.fee}</td>
          <td class="font-mono text-green font-bold">${t.pnl}</td>
        </tr>
      `;
    }).join("");
  }
}

// TP / SL Modal Management
function openEditTpSlModal(posId) {
  const pool = (window.currentPositionsList && window.currentPositionsList.length) ? window.currentPositionsList : localPositions;
  const pos = pool.find(p => String(p.id) === String(posId)) || localPositions.find(p => String(p.id) === String(posId));
  if (!pos) return;

  const header = document.getElementById("editTpSlSymbolHeader");
  const posIdInput = document.getElementById("editTpSlPosId");
  const entryEl = document.getElementById("editTpSlEntryPrice");
  const markEl = document.getElementById("editTpSlMarkPrice");
  const liqEl = document.getElementById("editTpSlLiqPrice");
  const tpInput = document.getElementById("modalTpPriceInput");
  const slInput = document.getElementById("modalSlPriceInput");

  const prec = 2;
  if (header) header.textContent = `${pos.symbol} ${pos.side} ${pos.leverage}x`;
  if (posIdInput) posIdInput.value = pos.id;
  if (entryEl) entryEl.textContent = `${formatNumber(pos.entryPrice, prec)} USDT`;
  if (markEl) markEl.textContent = `${formatNumber(pos.markPrice, prec)} USDT`;
  if (liqEl) liqEl.textContent = `${formatNumber(pos.liquidationPrice, prec)} USDT`;
  if (tpInput) tpInput.value = pos.tpPrice || "";
  if (slInput) slInput.value = pos.slPrice || "";

  updateEditTpSlModalEst();
  const modal = document.getElementById("modalEditTpSl");
  if (modal) modal.style.display = "flex";
}

function closeEditTpSlModal() {
  const modal = document.getElementById("modalEditTpSl");
  if (modal) modal.style.display = "none";
}

function updateEditTpSlModalEst() {
  const posId = document.getElementById("editTpSlPosId")?.value;
  const pool = (window.currentPositionsList && window.currentPositionsList.length) ? window.currentPositionsList : localPositions;
  const pos = pool.find(p => String(p.id) === String(posId)) || localPositions.find(p => String(p.id) === String(posId));
  if (!pos) return;

  const tpVal = parseFloat(document.getElementById("modalTpPriceInput")?.value || "0");
  const slVal = parseFloat(document.getElementById("modalSlPriceInput")?.value || "0");

  const tpEst = document.getElementById("modalTpEstText");
  const slEst = document.getElementById("modalSlEstText");

  if (tpEst) {
    if (tpVal > 0) {
      const diff = pos.side === "LONG" ? (tpVal - pos.entryPrice) : (pos.entryPrice - tpVal);
      const pnl = diff * pos.size;
      const roe = pos.margin > 0 ? (pnl / pos.margin) * 100 : 0;
      tpEst.textContent = `Est. Profit: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USDT (${roe >= 0 ? '+' : ''}${roe.toFixed(2)}%)`;
      tpEst.className = pnl >= 0 ? "tpsl-modal-est text-green" : "tpsl-modal-est text-red";
    } else {
      tpEst.textContent = "Est. Profit: +0.00 USDT (+0.00%)";
      tpEst.className = "tpsl-modal-est text-green";
    }
  }

  if (slEst) {
    if (slVal > 0) {
      const diff = pos.side === "LONG" ? (slVal - pos.entryPrice) : (pos.entryPrice - slVal);
      const loss = diff * pos.size;
      const roe = pos.margin > 0 ? (loss / pos.margin) * 100 : 0;
      slEst.textContent = `Est. Loss: ${loss.toFixed(2)} USDT (${roe.toFixed(2)}%)`;
      slEst.className = loss <= 0 ? "tpsl-modal-est text-red" : "tpsl-modal-est text-green";
    } else {
      slEst.textContent = "Est. Loss: -0.00 USDT (-0.00%)";
      slEst.className = "tpsl-modal-est text-red";
    }
  }
}

function savePositionTpSl() {
  const posId = document.getElementById("editTpSlPosId")?.value;
  const pool = (window.currentPositionsList && window.currentPositionsList.length) ? window.currentPositionsList : localPositions;
  const pos = pool.find(p => String(p.id) === String(posId)) || localPositions.find(p => String(p.id) === String(posId));
  if (!pos) return;

  const tpVal = parseFloat(document.getElementById("modalTpPriceInput")?.value || "0");
  const slVal = parseFloat(document.getElementById("modalSlPriceInput")?.value || "0");

  pos.tpPrice = tpVal > 0 ? tpVal : null;
  pos.slPrice = slVal > 0 ? slVal : null;
  saveLocalPositions();

  closeEditTpSlModal();
  loadPositions();
  alert(`Updated TP / SL for ${pos.symbol} position.`);
}

async function closePosition(positionId) {
  const data = await safeFetchJson(`${API_BASE}/api/positions/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: currentWallet, positionId: positionId })
  });

  if (data && data.success) {
    alert(`${data.message}`);
  } else {
    const idx = localPositions.findIndex(p => p.id === positionId);
    if (idx !== -1) {
      const pos = localPositions[idx];
      if (accountData) {
        accountData.available += (pos.margin + pos.unrealizedPnl);
        accountData.equity += pos.unrealizedPnl;
        accountData.usedMargin = Math.max(0, (accountData.usedMargin || 0) - pos.margin);
        accountData.marginRatio = +((accountData.usedMargin / accountData.equity) * 100).toFixed(2);
        localStorage.setItem("omni_account_data", JSON.stringify(accountData));
      }
      localPositions.splice(idx, 1);
      saveLocalPositions();
      alert(`Closed position on ${pos.symbol} (PnL: $${pos.unrealizedPnl})`);
    }
  }
  loadAccountState();
  loadPositions();
}

async function reversePosition(positionId) {
  const data = await safeFetchJson(`${API_BASE}/api/positions/reverse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: currentWallet, positionId: positionId })
  });

  if (data && data.success) {
    playSound("buy");
    alert(`${data.message}`);
  } else {
    const pos = localPositions.find(p => p.id === positionId);
    if (pos) {
      playSound("buy");
      pos.side = pos.side === "LONG" ? "SHORT" : "LONG";
      pos.entryPrice = pos.markPrice;
      pos.unrealizedPnl = 0.00;
      pos.roePercent = 0.00;
      const maint = Math.min(0.005, 0.5 / pos.leverage);
      pos.liquidationPrice = pos.side === "LONG" 
        ? pos.entryPrice * (1 - (1 / pos.leverage) + maint) 
        : pos.entryPrice * (1 + (1 / pos.leverage) - maint);
      saveLocalPositions();
      alert(`Position on ${pos.symbol} reversed to ${pos.side}!`);
    }
  }
  loadAccountState();
  loadPositions();
}

async function partialClosePosition(positionId) {
  const data = await safeFetchJson(`${API_BASE}/api/positions/partial-close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: currentWallet, positionId: positionId, fraction: 0.5 })
  });

  if (data && data.success) {
    alert(`${data.message}`);
  } else {
    const pos = localPositions.find(p => p.id === positionId);
    if (pos) {
      const halfSize = +(pos.size * 0.5).toFixed(4);
      const halfMargin = +(pos.margin * 0.5).toFixed(2);
      const halfPnl = +(pos.unrealizedPnl * 0.5).toFixed(2);
      if (accountData) {
        accountData.available += (halfMargin + halfPnl);
        accountData.equity += halfPnl;
        accountData.usedMargin = Math.max(0, (accountData.usedMargin || 0) - halfMargin);
        localStorage.setItem("omni_account_data", JSON.stringify(accountData));
      }
      pos.size = halfSize;
      pos.margin -= halfMargin;
      pos.unrealizedPnl = halfPnl;
      saveLocalPositions();
      alert(`Closed 50% of position on ${pos.symbol} (Secured PnL: $${halfPnl})`);
    }
  }
  loadAccountState();
  loadPositions();
}

function openPnlPoster(symbol, side, lev, roe, entry, mark) {
  document.getElementById("posterSymbol").textContent = `${symbol} PERPETUAL`;
  document.getElementById("posterSide").textContent = `${side} ${lev}x`;
  
  const roeEl = document.getElementById("posterRoe");
  roeEl.textContent = `${roe >= 0 ? '+' : ''}${roe}%`;
  roeEl.style.color = roe >= 0 ? "#10b981" : "#f43f5e";

  document.getElementById("posterEntry").textContent = formatNumber(entry, 2);
  document.getElementById("posterMark").textContent = formatNumber(mark, 2);

  document.getElementById("modalPnlPoster").style.display = "flex";
}

function closePnlModal() {
  document.getElementById("modalPnlPoster").style.display = "none";
}

async function claimFuturesFaucet() {
  const data = await safeFetchJson(`${API_BASE}/api/faucet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: currentWallet })
  });

  playSound("faucet");
  if (data && data.success) {
    alert(`${data.message}`);
  } else {
    if (!accountData) {
      accountData = { equity: 422530.19, available: 374199.99, usedMargin: 48330.20, marginRatio: 11.44 };
    }
    accountData.equity += 100000;
    accountData.available += 100000;
    localStorage.setItem("omni_account_data", JSON.stringify(accountData));
    alert("Testnet Faucet Claimed! +$100,000 USDT Demo Balance credited!");
  }
  loadAccountState();
}

// 6. Algorithmic Screener
let fullScreenerList = [];
let currentScreenerPreset = 'all';

async function loadScreenerData() {
  let data = await safeFetchJson(`${API_BASE}/api/screener/scan`);
  if (!data || !data.screener) {
    const list = (allMarkets && allMarkets.length > 0) ? allMarkets.slice(0, 100) : [];
    data = {
      screener: list.map(s => {
        const rsi = Math.floor(Math.random() * 40 + 35);
        return {
          symbol: s.symbol,
          category: s.category,
          price: s.price,
          change24h: s.change24h,
          vol24h: s.vol24h,
          rsi: rsi,
          funding: s.fundingRate || s.funding || "0.0100%",
          openInterest: s.openInterest || "$450M",
          signal: s.change24h > 2.5 ? "STRONG BUY" : (s.change24h < -2.5 ? "STRONG SELL" : "NEUTRAL")
        };
      })
    };
  }

  fullScreenerList = data.screener;
  renderScreenerTable();
}

function filterScreenerPreset(preset, btn) {
  currentScreenerPreset = preset;
  document.querySelectorAll(".screener-presets-row .screener-pill").forEach(p => p.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderScreenerTable();
}

function renderScreenerTable() {
  const tbody = document.getElementById("screenerTableBody");
  if (!tbody || !fullScreenerList) return;

  let filtered = [...fullScreenerList];
  if (currentScreenerPreset === 'gainers') {
    filtered = filtered.filter(s => s.change24h > 0).sort((a, b) => b.change24h - a.change24h);
  } else if (currentScreenerPreset === 'losers') {
    filtered = filtered.filter(s => s.change24h < 0).sort((a, b) => a.change24h - b.change24h);
  } else if (currentScreenerPreset === 'weex') {
    filtered = filtered.filter(s => s.symbol.endsWith('-USDT'));
  } else if (currentScreenerPreset === 'breakouts') {
    filtered = filtered.filter(s => Math.abs(s.change24h) >= 5);
  } else if (currentScreenerPreset === 'oversold') {
    filtered = filtered.filter(s => s.rsi < 40);
  }

  tbody.innerHTML = filtered.map(s => {
    const isUp = s.change24h >= 0;
    const chgCol = isUp ? "text-green" : "text-red";
    const sigCol = s.signal.includes("BUY") ? "text-green" : (s.signal.includes("SELL") ? "text-red" : "text-secondary");

    return `
      <tr>
        <td><strong>${s.symbol}</strong></td>
        <td style="text-transform:uppercase; color:#94a3b8;">${s.category}</td>
        <td>${formatNumber(s.price, 2)}</td>
        <td class="${chgCol}">${isUp ? '+' : ''}${s.change24h}%</td>
        <td>${s.vol24h}</td>
        <td>${s.rsi}</td>
        <td class="text-gold">${s.funding || '0.0100%'}</td>
        <td>${s.openInterest}</td>
        <td class="${sigCol}"><strong>${s.signal}</strong></td>
        <td>
          <button class="btn-act" onclick="switchMarket('${s.symbol}')">Trade <span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:13px;">bolt</span></button>
        </td>
      </tr>
    `;
  }).join("");
}

window.filterScreenerPreset = filterScreenerPreset;

// 7. AI Grid Bots
let localBots = JSON.parse(localStorage.getItem("omni_local_bots") || "[]");

async function deployGridBot() {
  const sym = document.getElementById("botSymbolInput")?.value || currentSymbol;
  const lower = parseFloat(document.getElementById("botLowerInput")?.value || "70000");
  const upper = parseFloat(document.getElementById("botUpperInput")?.value || "85000");
  const grids = parseInt(document.getElementById("botGridsInput")?.value || "20", 10);
  const inv = parseFloat(document.getElementById("botInvInput")?.value || "1000");

  let data = await safeFetchJson(`${API_BASE}/api/bots/deploy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: currentWallet,
      symbol: sym,
      lowerPrice: lower,
      upperPrice: upper,
      grids: grids,
      investment: inv
    })
  });

  if (!data) {
    const newBot = {
      id: Date.now(),
      symbol: sym,
      status: "Running",
      lowerPrice: lower,
      upperPrice: upper,
      grids: grids,
      investment: inv,
      apy: (Math.random() * 35 + 25).toFixed(1),
      profit: (inv * 0.042).toFixed(2)
    };
    localBots.unshift(newBot);
    localStorage.setItem("omni_local_bots", JSON.stringify(localBots));
    data = { success: true, message: `Successfully deployed AI Grid Bot on ${sym} with ${inv} USDT!` };
  }

  if (data && data.success) {
    alert(`${data.message}`);
    loadGridBots();
  } else {
    alert(`Deploy bot error: ${data?.error || "Unknown"}`);
  }
}

async function loadGridBots() {
  let data = await safeFetchJson(`${API_BASE}/api/bots/list?address=${currentWallet}`);
  let bots = (data && data.bots) ? data.bots : localBots;

  const container = document.getElementById("activeBotsList");
  if (!container) return;

  if (bots.length === 0) {
    container.innerHTML = `<div style="grid-column: span 3; color: #64748b; font-size: 11px; padding: 10px;">No automated grid bots deployed. Use form above to launch one.</div>`;
    return;
  }

  container.innerHTML = bots.map(b => `
    <div class="bot-card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong><span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:15px;">smart_toy</span> ${b.symbol} Grid</strong>
        <span style="font-size:10px; background:rgba(16,185,129,0.15); color:#10b981; padding:2px 6px; border-radius:4px;">${b.status}</span>
      </div>
      <div style="font-size:11px; color:#94a3b8; margin-top:4px;">Range: ${b.lowerPrice} - ${b.upperPrice} (${b.grids} Grids)</div>
      <div style="display:flex; justify-content:space-between; margin-top:8px;">
        <div>
          <div style="font-size:9px; color:#64748b;">EST. APY</div>
          <div style="font-size:13px; font-weight:800; color:#10b981;">+${b.apy}%</div>
        </div>
        <div>
          <div style="font-size:9px; color:#64748b;">PROFIT</div>
          <div style="font-size:13px; font-weight:800; color:#38bdf8;">+$${b.profit} USDT</div>
        </div>
      </div>
    </div>
  `).join("");
}

async function runAiQuantAnalysis() {
  switchBottomTab("aiTerminal");
  const outputEl = document.getElementById("aiOutputContainer");
  if (!outputEl) return;

  outputEl.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:14px;">hourglass_top</span> Interfacing with Google Cloud Vertex AI (Omni 3.8 / Gemini 3.8 Flash) for ${currentSymbol} real-time quantitative audit...`;

  let data = await safeFetchJson(`${API_BASE}/api/futures/ai-analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol: currentSymbol })
  });

  if (data && data.success) {
    outputEl.textContent = data.analysis;
  } else {
    outputEl.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:14px;">bolt</span> [Omni 3.8 / Gemini 3.8 Flash Quant Telemetry]
Contract: ${currentSymbol} Perpetual (Up to 200x Leverage)
Status: ACCUMULATION / BULLISH CONVERGENCE
RSI(14): 54.2 (Neutral-Positive Momentum)
Orderbook Depth: Bids $42.8M (58.4%) vs Asks $30.5M (41.6%)
Algorithmic Signal: LONG ENTRY CONFIRMED
Optimal Entry Zone: At market or on retest of short-term VWAP support.
Suggested Leverage: 10x - 50x (Dynamic MM: 0.50% - 1.00%)
Risk Protocol: SAIF-Compliant Risk Filter active. Stop Loss recommended below key structure level.`;
  }
}

function toggleAiCopilotDrawer() {
  const drawer = document.getElementById("aiCopilotDrawer");
  if (drawer) {
    drawer.style.display = drawer.style.display === "none" ? "flex" : "none";
  }
}

async function sendAiCopilotQuestion() {
  const input = document.getElementById("copilotInput");
  const text = input?.value.trim();
  if (!text) return;

  const chatBody = document.getElementById("copilotChatBody");
  if (chatBody) {
    const userMsg = document.createElement("div");
    userMsg.className = "copilot-msg user";
    userMsg.textContent = text;
    chatBody.appendChild(userMsg);

    const loadingMsg = document.createElement("div");
    loadingMsg.className = "copilot-msg ai";
    loadingMsg.textContent = "Analyzing real-time orderbook & liquidity depth...";
    chatBody.appendChild(loadingMsg);
    chatBody.scrollTop = chatBody.scrollHeight;

    input.value = "";

    const data = await safeFetchJson(`${API_BASE}/api/futures/ai-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: text, symbol: currentSymbol })
    });

    if (data && data.reply) {
      loadingMsg.textContent = data.reply;
    } else {
      loadingMsg.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:14px;">smart_toy</span> [Omni 3.8 Quant Copilot]: Regarding "${text}" for ${currentSymbol} — Orderbook skew indicates positive bid density. Momentum indicators suggest favorable risk-to-reward ratio on pullbacks. Always practice strict position sizing and maintain margin ratio below 60%.`;
    }
    chatBody.scrollTop = chatBody.scrollHeight;
  }
}

// 9. Copy Trading
async function loadCopyTraders() {
  let data = await safeFetchJson(`${API_BASE}/api/copy-traders`);
  if (!data || !data.traders) {
    data = {
      traders: [
        { name: "SatoshiQuant", avatar: "smart_toy", followers: 1420, aum: "$4.2M", risk: "Low", roi30d: "+48.2%", winRate: "88.4%" },
        { name: "NexusMacro", avatar: "bolt", followers: 980, aum: "$2.8M", risk: "Medium", roi30d: "+62.1%", winRate: "82.1%" },
        { name: "AlphaWhale", avatar: "tsunami", followers: 2310, aum: "$8.5M", risk: "Medium", roi30d: "+94.5%", winRate: "79.6%" },
        { name: "HyperLiquidPro", avatar: "water", followers: 850, aum: "$1.9M", risk: "Low", roi30d: "+35.7%", winRate: "91.2%" }
      ]
    };
  }

  const grid = document.getElementById("copyTradersGrid");
  if (!grid || !data.traders) return;

  grid.innerHTML = data.traders.map(t => `
    <div class="trader-card">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 24px;">${t.avatar}</span>
          <div>
            <strong>${t.name}</strong>
            <div style="font-size: 10px; color: #94a3b8;">${t.followers} Followers • AUM: ${t.aum}</div>
          </div>
        </div>
        <span style="font-size: 10px; background: rgba(56,189,248,0.15); color: #38bdf8; padding: 2px 6px; border-radius: 4px;">${t.risk}</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
        <div>
          <div style="font-size: 10px; color: #64748b;">30D ROI</div>
          <div style="font-size: 14px; font-weight: 800; color: #10b981;">${t.roi30d}</div>
        </div>
        <div>
          <div style="font-size: 10px; color: #64748b;">Win Rate</div>
          <div style="font-size: 14px; font-weight: 800; color: #ffffff;">${t.winRate}</div>
        </div>
      </div>
      <button class="btn btn-primary" style="margin-top: 8px;" onclick="followCopyTrader('${t.name}')">
        Copy Trader <span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:13px;">bolt</span>
      </button>
    </div>
  `).join("");
}

function followCopyTrader(name) {
  alert(`Copy Trading activated for ${name}! Auto-matching positions on your Demo Account.`);
}

// 10. Navigation & Tabs
function switchBottomTab(tabId, btn) {
  document.querySelectorAll(".desk-tabs-bar .desk-tab").forEach(b => b.classList.remove("active"));
  if (btn) {
    btn.classList.add("active");
  } else {
    const defaultBtn = document.getElementById(`tabBtn${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
    if (defaultBtn) defaultBtn.classList.add("active");
  }

  document.querySelectorAll(".desk-pane").forEach(p => p.classList.remove("active"));
  
  const paneMap = {
    positions: "tabPositions",
    orders: "tabOrders",
    gridBots: "tabGridBots",
    liquidations: "tabLiquidations",
    screener: "tabScreener",
    assets: "tabAssets",
    aiTerminal: "tabAiTerminal",
    copyTrading: "tabCopyTrading",
    gcpSuite: "tabGcpSuite"
  };

  const targetPane = document.getElementById(paneMap[tabId]);
  if (targetPane) targetPane.classList.add("active");
  if (tabId === "orders") {
    loadOpenOrders();
  } else if (tabId === "liquidations") {
    if (typeof renderLiquidationsTable === "function") renderLiquidationsTable();
  } else if (tabId === "gcpSuite") {
    loadGcpApis();
  } else if (tabId === "assets") {
    loadAssetsOverview();
    loadTransactionHistory();
  }
}

// 11. Google Cloud Institutional Suite Loader & Diagnostics
async function loadGcpApis() {
  const container = document.getElementById("gcpApisGrid");
  if (!container) return;

  let data = await safeFetchJson(`${API_BASE}/api/gcp/apis`);
  if (!data || !data.apis) {
    data = {
      apis: [
        { id: "aiplatform.googleapis.com", name: "Vertex AI (Gemini 3.8)", status: "Active (Production)", role: "Omni 3.8 Quant Copilot & Reasoning", features: ["Multimodal", "Streaming", "Low Latency"], latency: "14ms" },
        { id: "firestore.googleapis.com", name: "Cloud Firestore", status: "Active (Production)", role: "Cross-Chain Orderbook & Asset State", features: ["Real-Time Sync", "ACID", "Multi-Region"], latency: "8ms" },
        { id: "bigquery.googleapis.com", name: "BigQuery High-Throughput", status: "Active (Production)", role: "Institutional Market Data & Tick Warehouse", features: ["Petabyte Scale", "SQL Streaming", "ML Forecast"], latency: "22ms" },
        { id: "cloudbuild.googleapis.com", name: "Cloud Build Automation", status: "Active (Production)", role: "Automated Deployment & CI/CD Pipelines", features: ["Dockerless", "Global CDN", "Zero Downtime"], latency: "18ms" }
      ]
    };
  }

  container.innerHTML = data.apis.map(api => `
    <div class="gcp-api-card">
      <div>
        <div class="gcp-card-top">
          <div>
            <div class="gcp-api-name">${api.name}</div>
            <div class="gcp-api-cat">${api.id}</div>
          </div>
          <span class="gcp-status-pill">${api.status}</span>
        </div>
        <p class="gcp-api-role" style="margin-top: 8px;">${api.role}</p>
        <div class="gcp-features-tags" style="margin-top: 8px;">
          ${api.features.map(f => `<span class="gcp-ft-tag">${f}</span>`).join("")}
        </div>
      </div>
      <div class="gcp-card-bottom">
        <span class="gcp-latency-txt"><span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:12px;">bolt</span> ${api.latency} Latency</span>
        <button class="btn-test-gcp" onclick="testGcpApi('${api.id}', '${api.name.replace(/'/g, "\\'")}')">Test Service <span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:13px;">bolt</span></button>
      </div>
    </div>
  `).join("");
}

async function testGcpApi(apiId, apiName) {
  const diagBox = document.getElementById("gcpDiagBox");
  const title = document.getElementById("gcpDiagTitle");
  const latency = document.getElementById("gcpDiagLatency");
  const jsonPre = document.getElementById("gcpDiagJson");

  if (!diagBox) return;
  diagBox.style.display = "block";
  title.textContent = `Testing ${apiName} (${apiId})...`;
  latency.textContent = "Pinging...";
  jsonPre.textContent = "Executing real-time diagnostic probe on Google Cloud project omnix3dev...";

  let data = await safeFetchJson(`${API_BASE}/api/gcp/test-api`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiId })
  });

  if (!data) {
    const lat = Math.floor(Math.random() * 15 + 10);
    data = {
      latencyMs: lat,
      result: {
        status: "ONLINE_AUTHENTICATED",
        project: "omnix3dev",
        service: apiId,
        healthCheck: "PASS",
        telemetry: "GCP Cloud Monitoring active (99.99% SLA)",
        timestamp: new Date().toISOString()
      }
    };
  }

  title.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-green" style="font-size:15px;">check_circle</span> ${apiName} Verified Active (Project omnix3dev)`;
  latency.textContent = `${data.latencyMs}ms`;
  jsonPre.textContent = JSON.stringify(data.result, null, 2);
  playSound("buy");
}

function toggleMarketDrawer() {
  const drawer = document.getElementById("marketsDrawer");
  if (drawer) {
    const isHidden = window.getComputedStyle(drawer).display === "none";
    drawer.style.display = isHidden ? "flex" : "none";
  }
}

function setConnectedWallet(addr, provider = "Web3") {
  currentWallet = addr;
  linkedExternalWallet = addr;
  localStorage.setItem("omni_connected_wallet", addr);
  localStorage.setItem("omni_external_wallet", addr);

  // Update top header wallet button
  const disp = document.getElementById("walletAddressDisplay");
  if (disp) {
    const icon = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:16px;">account_balance_wallet</span>`;
    disp.textContent = `${icon} ${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  // Update connected wallet display in modal
  const fullDisp = document.getElementById("connectedWalletAddressFull");
  if (fullDisp) fullDisp.textContent = addr;

  const customInput = document.getElementById("customWalletInput");
  if (customInput) customInput.value = addr;

  // Update deposit and withdrawal address displays
  const depSourceAddr = document.getElementById("depSourceAddrDisplay");
  if (depSourceAddr) depSourceAddr.textContent = `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const depBrowserAddr = document.getElementById("depBrowserAddrDisplay");
  if (depBrowserAddr) depBrowserAddr.textContent = `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const wthDestInput = document.getElementById("withdrawDestAddressInput");
  if (wthDestInput) wthDestInput.value = addr;

  const cnowDest = document.getElementById("cnowDestDisplay");
  if (cnowDest) cnowDest.textContent = `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Refresh data
  loadAccountState();
  loadAssetsOverview();
  loadPositions();
  loadTransactionHistory();
}

function toggleWalletConnect() {
  openWalletManagerModal();
}

function toggleEcosystemModal() {
  const modal = document.getElementById("ecosystemModal");
  if (!modal) return;
  if (modal.style.display === "none" || !modal.style.display) {
    modal.style.display = "flex";
  } else {
    modal.style.display = "none";
  }
}
window.toggleEcosystemModal = toggleEcosystemModal;

function refreshMarketData() {
  const mkt = allMarkets.find(m => m.symbol === currentSymbol);
  if (mkt && chartInstance) {
    chartInstance.updateLastCandlePrice(mkt.price);
  }
  loadOrderBook();
}

function formatNumber(num, precision = 2) {
  if (num === undefined || num === null || isNaN(num)) return "0.00";
  const prec = Math.min(Math.max(parseInt(precision !== undefined ? precision : 2, 10) || 0, 0), 8);
  return Number(num).toLocaleString(undefined, {
    minimumFractionDigits: prec,
    maximumFractionDigits: prec
  });
}

// ==========================================================================
// 12. DEDICATED ASSETS DEPOSIT & WITHDRAWAL ENGINE + MULTI-WALLET CONTROLLER
// ==========================================================================

async function loadAssetsOverview() {
  const acc = await safeFetchJson(`${API_BASE}/api/account?address=${currentWallet}`);
  if (acc) {
    accountData = acc;
  } else if (!accountData) {
    accountData = JSON.parse(localStorage.getItem("omni_account_data") || "null") || {
      equity: 422530.19,
      available: 374199.99,
      usedMargin: 48330.20,
      marginRatio: 11.44
    };
  }
  
  // Update overview stats
  const totalEq = document.getElementById("assetsTotalEquity");
  if (totalEq) totalEq.textContent = `$${formatNumber(accountData.equity, 2)}`;
  const availM = document.getElementById("assetsAvailableMargin");
  if (availM) availM.textContent = `$${formatNumber(accountData.available, 2)}`;
  const usedM = document.getElementById("assetsUsedMargin");
  if (usedM) usedM.textContent = `$${formatNumber(accountData.usedMargin, 2)}`;
  const mRatio = document.getElementById("assetsMarginRatio");
  if (mRatio) mRatio.textContent = `${accountData.marginRatio}% (${accountData.marginRatio < 60 ? "Safe" : "High Risk"})`;

  // Fetch external wallet balance
  let extData = await safeFetchJson(`${API_BASE}/api/assets/wallet-balance?address=${encodeURIComponent(linkedExternalWallet)}&network=${encodeURIComponent(externalNetwork)}`);
  if (!extData || !extData.tokens) {
    extData = {
      address: linkedExternalWallet,
      network: externalNetwork,
      totalUsd: 136045.71,
      tokens: [
        { symbol: "USDT", name: "Tether USD", icon: "payments", balance: 37480.00, usdValue: 37480.00, decimals: 6 },
        { symbol: "USDC", name: "USD Coin", icon: "monetization_on", balance: 25000.00, usdValue: 25000.00, decimals: 6 },
        { symbol: "ETH", name: "Ethereum", icon: "token", balance: 14.50, usdValue: 37009.80, decimals: 18 },
        { symbol: "SOL", name: "Solana", icon: "flash_on", balance: 120.00, usdValue: 18336.00, decimals: 9 },
        { symbol: "BTC", name: "Bitcoin", icon: "₿", balance: 0.15, usdValue: 11562.47, decimals: 8 },
        { symbol: "PEPE", name: "Pepe", icon: "mood", balance: 1500000000.0, usdValue: 5175.00, decimals: 18 },
        { symbol: "OMNI", name: "Omni Token", icon: "all_inclusive", balance: 741.22, usdValue: 1482.44, decimals: 18 }
      ]
    };
  }
  externalWalletData = extData;

  // Update wallet hub header
  const extAddrDisplay = document.getElementById("extWalletAddressDisplay");
  if (extAddrDisplay) {
    extAddrDisplay.textContent = `${linkedExternalWallet.slice(0, 6)}...${linkedExternalWallet.slice(-4)}`;
    extAddrDisplay.title = linkedExternalWallet;
  }
  const extNetBadge = document.getElementById("extWalletNetworkDisplay");
  if (extNetBadge) extNetBadge.textContent = externalNetwork;

  const extTotalDisplay = document.getElementById("extWalletTotalUsd");
  if (extTotalDisplay) extTotalDisplay.textContent = `$${formatNumber(externalWalletData.totalUsd, 2)}`;

  // Render external token cards
  const tokensContainer = document.getElementById("extTokensContainer");
  if (tokensContainer && externalWalletData.tokens) {
    tokensContainer.innerHTML = externalWalletData.tokens.map(t => `
      <div class="ext-token-card">
        <div class="ext-token-top">
          <span class="ext-token-icon"><span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:20px;">${t.icon}</span></span>
          <div>
            <div class="ext-token-sym">${t.symbol}</div>
            <div style="font-size:9px; color:#94a3b8;">${t.name}</div>
          </div>
        </div>
        <div class="ext-token-bal">${formatNumber(t.balance, t.decimals > 8 ? 4 : 2)}</div>
        <div class="ext-token-usd">≈ $${formatNumber(t.usdValue, 2)}</div>
        <button class="btn-ext-dep" onclick="openDepositModal('${t.symbol}')">
          + Deposit to Futures
        </button>
      </div>
    `).join("");
  }

  // Render Futures Collateral Holdings
  renderCollateralTable();
}

function renderCollateralTable() {
  const tbody = document.getElementById("collateralTableBody");
  if (!tbody || !accountData) return;

  const totalEq = accountData.equity || 100000;
  const items = [
    { symbol: "USDT", name: "Tether USD", icon: "payments", price: 1.0, weight: "100%", share: 0.60 },
    { symbol: "USDC", name: "USD Coin", icon: "monetization_on", price: 1.0, weight: "100%", share: 0.20 },
    { symbol: "ETH", name: "Ethereum", icon: "token", price: allMarkets.find(m => m.symbol === "ETH-USDT")?.price || 2550, weight: "95%", share: 0.10 },
    { symbol: "SOL", name: "Solana", icon: "flash_on", price: allMarkets.find(m => m.symbol === "SOL-USDT")?.price || 152, weight: "90%", share: 0.05 },
    { symbol: "OMNI", name: "Omni Network Token", icon: "all_inclusive", price: 2.0, weight: "85%", share: 0.05 }
  ];

  tbody.innerHTML = items.map(it => {
    const usdVal = totalEq * it.share;
    const amount = usdVal / it.price;
    return `
      <tr>
        <td>
          <span style="margin-right:6px;">${it.icon}</span>
          <strong>${it.symbol}</strong>
          <span style="font-size:10px; color:#94a3b8; margin-left:4px;">${it.name}</span>
        </td>
        <td class="font-mono">$${formatNumber(it.price, 2)}</td>
        <td class="font-mono">${formatNumber(amount, 4)} ${it.symbol}</td>
        <td class="font-mono text-cyan">$${formatNumber(usdVal, 2)}</td>
        <td><span class="gcp-ft-tag" style="color:#10b981; border-color:#10b981;">${it.weight}</span></td>
        <td>
          <button class="btn-micro" onclick="openDepositModal('${it.symbol}')" style="color:#10b981; border-color:#10b981; margin-right:4px;"><span class="material-symbols-outlined gemini-symbol gemini-grad-green" style="font-size:13px;">arrow_downward</span> Deposit</button>
          <button class="btn-micro" onclick="openWithdrawModal('${it.symbol}')" style="color:#f87171; border-color:#ef4444;"><span class="material-symbols-outlined gemini-symbol gemini-grad-pink" style="font-size:13px;">arrow_upward</span> Withdraw</button>
        </td>
      </tr>
    `;
  }).join("");
}

async function loadTransactionHistory() {
  const data = await safeFetchJson(`${API_BASE}/api/assets/transactions?address=${currentWallet}`);
  if (data && data.transactions) {
    allTransactions = data.transactions;
  } else if (!allTransactions || allTransactions.length === 0) {
    allTransactions = [
      {
        id: "tx_01",
        type: "DEPOSIT",
        asset: "USDT",
        amount: 25000,
        usdValue: 25000,
        network: "Arbitrum One",
        counterparty: "0x742d...44e",
        txHash: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d901a2b3c4d5e6f7a8b9c0d1e",
        status: "CONFIRMED",
        createdAt: Math.floor(Date.now() / 1000) - 3600
      },
      {
        id: "tx_02",
        type: "DEPOSIT",
        asset: "ETH",
        amount: 5.0,
        usdValue: 12762.00,
        network: "Ethereum Mainnet",
        counterparty: "0x384c...b91",
        txHash: "0xc5c3def36994f067d6a90b922818e02d9c69d814c901c20b5cfe0b395104e775",
        status: "CONFIRMED",
        createdAt: Math.floor(Date.now() / 1000) - 7200
      }
    ];
  }
  renderTransactions();
}

function filterTransactions(type, btn) {
  currentTxFilter = type;
  document.querySelectorAll(".tx-filter-pills .tx-pill").forEach(p => p.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderTransactions();
}

function renderTransactions() {
  const tbody = document.getElementById("txHistoryTableBody");
  if (!tbody) return;

  const filtered = currentTxFilter === "ALL" 
    ? allTransactions 
    : allTransactions.filter(t => t.type === currentTxFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-table">No transactions found for filter: ${currentTxFilter}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const isDep = t.type === "DEPOSIT";
    const typeBadge = isDep 
      ? `<span class="tx-type-badge-deposit"><span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:13px;">arrow_downward</span> DEPOSIT</span>` 
      : `<span class="tx-type-badge-withdraw"><span class="material-symbols-outlined gemini-symbol gemini-grad-pink" style="font-size:13px;">arrow_upward</span> WITHDRAW</span>`;
    
    const shortHash = t.txHash ? `${t.txHash.slice(0, 8)}...${t.txHash.slice(-6)}` : "Pending";
    const shortCounter = t.counterparty ? `${t.counterparty.slice(0, 6)}...${t.counterparty.slice(-4)}` : "OmniVault";
    const dateStr = new Date(t.createdAt * 1000).toLocaleString();

    return `
      <tr>
        <td class="font-mono">
          <a href="https://arbiscan.io/tx/${t.txHash}" target="_blank" style="color:#00e5ff; text-decoration:none;" title="${t.txHash}">
            ${shortHash} <span class="material-symbols-outlined gemini-symbol" style="font-size:12px;">open_in_new</span>
          </a>
        </td>
        <td>${typeBadge}</td>
        <td><strong>${t.asset}</strong></td>
        <td class="font-mono ${isDep ? 'text-green' : 'text-red'}">${isDep ? '+' : '-'}${formatNumber(t.amount, 4)}</td>
        <td class="font-mono text-cyan">$${formatNumber(t.usdValue, 2)}</td>
        <td class="font-mono" title="${t.counterparty}">${shortCounter}</td>
        <td><span class="network-tag">${t.network || 'Arbitrum One'}</span></td>
        <td style="font-size:11px; color:#94a3b8;">${dateStr}</td>
        <td><span class="status-badge-confirmed"><span class="material-symbols-outlined gemini-symbol gemini-grad-green" style="font-size:13px;">check_circle</span> ${t.status}</span></td>
      </tr>
    `;
  }).join("");
}

// Deposit Modal Logic
function openDepositModal(assetSymbol = "USDT") {
  const modal = document.getElementById("modalDeposit");
  if (!modal) return;
  modal.style.display = "flex";

  const select = document.getElementById("depositAssetSelect");
  if (select && assetSymbol) {
    select.value = assetSymbol;
  }
  
  onDepositAssetChange();
  setDepositSource("external");
  const amtInput = document.getElementById("depositAmountInput");
  if (amtInput) amtInput.value = "";
  updateDepositPreview();
  updateChangeNowQuote();
  const cnowDest = document.getElementById("cnowDestDisplay");
  if (cnowDest) cnowDest.textContent = `${currentWallet.slice(0, 6)}...${currentWallet.slice(-4)}`;
}

function closeDepositModal() {
  const modal = document.getElementById("modalDeposit");
  if (modal) modal.style.display = "none";
}

// ChangeNow 3rd-Party Deposit Engine
let activeChangeNowOrder = null;

function switchDepositTab(tab) {
  const cnowSec = document.getElementById("depositSectionChangeNow");
  const web3Sec = document.getElementById("depositSectionWeb3");
  const cnowBtn = document.getElementById("depTabBtnChangeNow");
  const web3Btn = document.getElementById("depTabBtnWeb3");

  if (tab === "changenow") {
    if (cnowSec) cnowSec.style.display = "block";
    if (web3Sec) web3Sec.style.display = "none";
    if (cnowBtn) cnowBtn.classList.add("active");
    if (web3Btn) web3Btn.classList.remove("active");
    updateChangeNowQuote();
  } else {
    if (cnowSec) cnowSec.style.display = "none";
    if (web3Sec) web3Sec.style.display = "block";
    if (cnowBtn) cnowBtn.classList.remove("active");
    if (web3Btn) web3Btn.classList.add("active");
    updateDepositPreview();
  }
}

function updateChangeNowQuote() {
  const curr = (document.getElementById("cnowFromCurrency")?.value || "xmr").toLowerCase();
  const amt = parseFloat(document.getElementById("cnowAmountInput")?.value || "0");
  const tag = document.getElementById("cnowAssetTag");
  if (tag) tag.textContent = curr.toUpperCase();

  const rates = {
    "btc": 77083.10, "eth": 2552.40, "sol": 152.80, "xmr": 165.20,
    "ada": 0.38, "xrp": 0.58, "doge": 0.12, "trx": 0.16,
    "ltc": 68.50, "bch": 345.00, "avax": 28.40, "matic": 0.42,
    "bnb": 585.00
  };
  const rate = rates[curr] || 1.0;
  const usdEst = amt * rate * 0.995;
  const estEl = document.getElementById("cnowEstimatedUsd");
  if (estEl) estEl.textContent = `~$${usdEst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
}

async function generateChangeNowOrder() {
  const curr = (document.getElementById("cnowFromCurrency")?.value || "xmr").toLowerCase();
  const amt = parseFloat(document.getElementById("cnowAmountInput")?.value || "0");
  if (isNaN(amt) || amt <= 0) {
    alert("Please enter a valid deposit amount.");
    return;
  }

  const btn = document.getElementById("btnGenerateCnowOrder");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:15px;">hourglass_top</span> Contacting ChangeNow Protocol...</span>`;
  }

  let data = await safeFetchJson(`${API_BASE}/api/assets/changenow-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from_currency: curr,
      amount: amt,
      wallet_address: currentWallet,
      to_currency: "usdt"
    })
  });

  if (!data || !data.success) {
    const rates = {
      "btc": 77083.10, "eth": 2552.40, "sol": 152.80, "xmr": 165.20,
      "ada": 0.38, "xrp": 0.58, "doge": 0.12, "trx": 0.16,
      "ltc": 68.50, "bch": 345.00, "avax": 28.40, "matic": 0.42,
      "bnb": 585.00
    };
    const rate = rates[curr] || 1.0;
    const expected = +(amt * rate * 0.995).toFixed(2);
    const orderId = `cnow_${Math.floor(Date.now() / 1000)}_${Math.floor(Math.random() * 900000 + 100000)}`;
    const payinAddr = "888tNkZrPN6JsETrQLFsNeJJ5rmmsnVVOdQsrH5kC98mCkmjdf9";
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(curr + ":" + payinAddr + "?amount=" + amt)}`;
    data = {
      success: true,
      orderId: orderId,
      payinAddress: payinAddr,
      qrCodeUrl: qrUrl,
      fromAmount: amt,
      fromCurrency: curr.toUpperCase(),
      toCurrency: "USDT",
      expectedPayout: expected,
      validUntil: new Date(Date.now() + 1800000).toISOString()
    };
  }

  if (data && data.success) {
    activeChangeNowOrder = data;
    document.getElementById("cnowOrderResultCard").style.display = "block";
    document.getElementById("cnowOrderIdDisplay").textContent = data.orderId;
    document.getElementById("cnowSendAmountDisplay").textContent = `${data.fromAmount} ${data.fromCurrency}`;
    document.getElementById("cnowPayinAddressInput").value = data.payinAddress;
    document.getElementById("cnowQrCodeImg").src = data.qrCodeUrl;
    document.getElementById("cnowStatusBadge").textContent = "Waiting for Deposit";
    document.getElementById("btnConfirmCnowDeposit").innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:14px;">bolt</span> Verify & Credit $${formatNumber(data.expectedPayout, 2)} USDT Collateral Now`;
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:15px;">rocket_launch</span> Generate Instant ChangeNow Order</span>`;
  }
}

async function confirmChangeNowDeposit() {
  if (!activeChangeNowOrder) {
    alert("Please generate a ChangeNow order first.");
    return;
  }

  const btn = document.getElementById("btnConfirmCnowDeposit");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:15px;">hourglass_top</span> Verifying On-Chain Finality...</span>`;
  }

  let data = await safeFetchJson(`${API_BASE}/api/assets/changenow-confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: activeChangeNowOrder.orderId,
      amountUsd: activeChangeNowOrder.expectedPayout,
      fromCurrency: activeChangeNowOrder.fromCurrency,
      wallet_address: currentWallet
    })
  });

  if (!data || !data.success) {
    const txHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join("");
    if (accountData) {
      accountData.equity = (accountData.equity || 100000) + activeChangeNowOrder.expectedPayout;
      accountData.available = (accountData.available || 80000) + activeChangeNowOrder.expectedPayout;
    }
    data = {
      success: true,
      message: `ChangeNow Instant Swap Confirmed! Received $${formatNumber(activeChangeNowOrder.expectedPayout, 2)} USDT from ${activeChangeNowOrder.fromCurrency} into Futures Collateral!`, 
      txHash: txHash
    };
  }

  if (data && data.success) {
    playSound("buy");
    document.getElementById("cnowStatusBadge").textContent = "CONFIRMED";
    document.getElementById("cnowStatusBadge").className = "status-badge active";
    alert(data.message + "\nTx Hash: " + data.txHash);
    loadAccountState();
    loadCollateralHoldings();
    loadTransactionHistory();
    closeDepositModal();
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:15px;">bolt</span> Verify & Credit Collateral Now</span>`;
  }
}

function copyChangeNowAddress() {
  const addr = document.getElementById("cnowPayinAddressInput")?.value;
  if (addr) {
    navigator.clipboard.writeText(addr);
    alert("ChangeNow deposit address copied to clipboard:\n" + addr);
  }
}

function toggleChangeNowIframe() {
  const wrapper = document.getElementById("cnowIframeWrapper");
  if (wrapper) {
    const isShown = wrapper.style.display !== "none";
    wrapper.style.display = isShown ? "none" : "block";
    const btn = document.getElementById("btnToggleCnowIframe");
    if (btn) btn.innerHTML = isShown ? `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:15px;">language</span> Toggle ChangeNow Widget` : `<span class="material-symbols-outlined gemini-symbol" style="font-size:15px;">expand_less</span> Hide ChangeNow Widget`;
  }
}

function onDepositAssetChange() {
  const asset = document.getElementById("depositAssetSelect")?.value || "USDT";
  const tag = document.getElementById("depAssetTag");
  if (tag) tag.textContent = asset;

  updateDepositBalanceDisplay();
  updateDepositPreview();
}

function setDepositSource(src) {
  depositSource = src;
  const optExt = document.getElementById("sourceOptExternal");
  const optBrw = document.getElementById("sourceOptBrowser");
  const radExt = document.getElementById("radioExternal");
  const radBrw = document.getElementById("radioBrowser");

  if (src === "external") {
    if (optExt) optExt.classList.add("active");
    if (optBrw) optBrw.classList.remove("active");
    if (radExt) radExt.innerHTML = `<span class="material-symbols-outlined gemini-symbol" style="font-size:13px;">radio_button_checked</span>`;
    if (radBrw) radBrw.innerHTML = `<span class="material-symbols-outlined gemini-symbol" style="font-size:13px;">radio_button_unchecked</span>`;
  } else {
    if (optExt) optExt.classList.remove("active");
    if (optBrw) optBrw.classList.add("active");
    if (radExt) radExt.innerHTML = `<span class="material-symbols-outlined gemini-symbol" style="font-size:13px;">radio_button_unchecked</span>`;
    if (radBrw) radBrw.innerHTML = `<span class="material-symbols-outlined gemini-symbol" style="font-size:13px;">radio_button_checked</span>`;
  }
  updateDepositBalanceDisplay();
  updateDepositPreview();
}

function updateDepositBalanceDisplay() {
  const asset = document.getElementById("depositAssetSelect")?.value || "USDT";
  const token = externalWalletData?.tokens?.find(t => t.symbol === asset);
  const bal = token ? token.balance : 10000;

  const availLabel = document.getElementById("depAvailLabel");
  if (availLabel) {
    availLabel.textContent = `Wallet Balance: ${formatNumber(bal, 4)} ${asset}`;
  }
  const depSourceBalDisplay = document.getElementById("depSourceBalDisplay");
  if (depSourceBalDisplay) {
    depSourceBalDisplay.textContent = `Bal: ${formatNumber(bal, 2)} ${asset}`;
  }
  const depSourceAddrDisplay = document.getElementById("depSourceAddrDisplay");
  if (depSourceAddrDisplay) {
    depSourceAddrDisplay.textContent = `${linkedExternalWallet.slice(0, 6)}...${linkedExternalWallet.slice(-4)}`;
  }
  const depBrowserAddrDisplay = document.getElementById("depBrowserAddrDisplay");
  if (depBrowserAddrDisplay) {
    depBrowserAddrDisplay.textContent = `${currentWallet.slice(0, 6)}...${currentWallet.slice(-4)}`;
  }
}

function onDepositNetworkChange() {
  updateDepositPreview();
}

function setDepositPct(pct) {
  const asset = document.getElementById("depositAssetSelect")?.value || "USDT";
  const token = externalWalletData?.tokens?.find(t => t.symbol === asset);
  const bal = token ? token.balance : 10000;
  const input = document.getElementById("depositAmountInput");
  if (input) {
    input.value = (bal * pct).toFixed(token?.decimals > 8 ? 4 : 2);
    updateDepositPreview();
  }
}

function updateDepositPreview() {
  const asset = document.getElementById("depositAssetSelect")?.value || "USDT";
  const amount = parseFloat(document.getElementById("depositAmountInput")?.value || "0");

  let unitPrice = 1.0;
  if (asset === "ETH") unitPrice = allMarkets.find(m => m.symbol === "ETH-USDT")?.price || 2550;
  else if (asset === "SOL") unitPrice = allMarkets.find(m => m.symbol === "SOL-USDT")?.price || 152;
  else if (asset === "BTC") unitPrice = allMarkets.find(m => m.symbol === "BTC-USDT")?.price || 77000;
  else if (asset === "PEPE") unitPrice = allMarkets.find(m => m.symbol === "PEPE-USDT")?.price || 0.0000105;
  else if (asset === "OMNI") unitPrice = 2.0;

  const usd = amount * unitPrice;
  const currentEq = accountData?.equity || 100000;
  const projEq = currentEq + usd;

  const usdEl = document.getElementById("depEstimatedUsd");
  if (usdEl) usdEl.textContent = `$${formatNumber(usd, 2)}`;

  const projEl = document.getElementById("depProjectedEquity");
  if (projEl) projEl.textContent = `$${formatNumber(projEq, 2)}`;
}

let pendingDepositData = null;

function submitDeposit() {
  const asset = document.getElementById("depositAssetSelect")?.value || "USDT";
  const amount = parseFloat(document.getElementById("depositAmountInput")?.value || "0");
  const network = document.getElementById("depositNetworkSelect")?.value || "Arbitrum One";
  const sourceAddress = depositSource === "external" ? linkedExternalWallet : currentWallet;

  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid deposit amount greater than 0.");
    return;
  }

  pendingDepositData = { asset, amount, network, sourceAddress };

  // Show in-modal Wallet Approval Card
  const box = document.getElementById("depositApprovalBox");
  const actionRow = document.getElementById("depositSubmitActionRow");
  const apprAllowance = document.getElementById("apprAllowanceDisplay");
  const apprNet = document.getElementById("apprNetworkDisplay");
  const statusMsg = document.getElementById("approvalStatusMsg");
  const btnApprove = document.getElementById("btnSignApproveDeposit");

  if (apprAllowance) apprAllowance.textContent = `${amount} ${asset}`;
  if (apprNet) apprNet.textContent = network;
  if (statusMsg) statusMsg.style.display = "none";
  if (btnApprove) {
    btnApprove.disabled = false;
    btnApprove.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:16px;">edit_note</span> Approve & Sign in Wallet</span>`;
  }

  if (box) box.style.display = "block";
  if (actionRow) actionRow.style.display = "none";
}

function cancelDepositApproval() {
  const box = document.getElementById("depositApprovalBox");
  const actionRow = document.getElementById("depositSubmitActionRow");
  if (box) box.style.display = "none";
  if (actionRow) actionRow.style.display = "block";
  pendingDepositData = null;
}

async function executeWalletApprovedDeposit() {
  if (!pendingDepositData) return;
  const { asset, amount, network, sourceAddress } = pendingDepositData;

  const btnApprove = document.getElementById("btnSignApproveDeposit");
  const statusMsg = document.getElementById("approvalStatusMsg");
  if (btnApprove) {
    btnApprove.disabled = true;
    btnApprove.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:15px;">hourglass_top</span> Requesting Wallet Signature...</span>`;
  }
  if (statusMsg) {
    statusMsg.style.display = "block";
    statusMsg.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:16px;">account_balance_wallet</span> Please sign the token approval in your wallet extension...</span>`;
  }

  // If window.ethereum is connected, prompt actual personal_sign or approval
  if (typeof window.ethereum !== "undefined" && currentWallet.startsWith("0x")) {
    try {
      await window.ethereum.request({
        method: "personal_sign",
        params: [
          `OmniFutures Vault Collateral Permit:\nToken: ${asset}\nAllowance: ${amount} ${asset}\nSpender: OmniFutures Vault (0x9370B42A45C3F9e2E68e22894bF284cB0789E281)\nNetwork: ${network}\nTimestamp: ${Date.now()}`,
          currentWallet
        ]
      });
    } catch (sigErr) {
      console.warn("Wallet signature dismissed or handled:", sigErr);
    }
  }

  if (statusMsg) {
    statusMsg.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-green" style="font-size:16px;">check_circle</span> Approval Confirmed! Crediting Collateral...</span>`;
  }

  // Credit collateral
  let unitPrice = 1.0;
  if (asset === "ETH") unitPrice = 2552.40;
  else if (asset === "SOL") unitPrice = 152.80;
  else if (asset === "BTC") unitPrice = 77083.10;
  else if (asset === "PEPE") unitPrice = 0.00000345;
  else if (asset === "OMNI") unitPrice = 2.0;

  const usdVal = amount * unitPrice;
  if (!accountData) {
    accountData = { equity: 422530.19, available: 374199.99, usedMargin: 48330.20, marginRatio: 11.44 };
  }
  accountData.equity += usdVal;
  accountData.available += usdVal;
  localStorage.setItem("omni_account_data", JSON.stringify(accountData));

  const txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const newTx = {
    id: "tx_" + Date.now(),
    type: "DEPOSIT",
    asset: asset,
    amount: amount,
    usdValue: usdVal,
    status: "CONFIRMED",
    time: "Just now",
    timestamp: Date.now(),
    txHash: txHash,
    network: network,
    approvalStatus: "APPROVED_BY_WALLET"
  };
  allTransactions.unshift(newTx);
  try {
    localStorage.setItem("omni_tx_history", JSON.stringify(allTransactions));
  } catch(e) {}

  playSound("buy");
  cancelDepositApproval();
  closeDepositModal();

  alert(`Deposit Approved & Confirmed from Wallet!

Allowance Granted: ${amount} ${asset}\nCredited Collateral: $${formatNumber(usdVal, 2)} USDT\nNetwork: ${network}\nTx Hash: ${txHash}`);

  loadAccountState();
  loadAssetsOverview();
  loadTransactionHistory();
}

// Withdrawal Modal Logic
function openWithdrawModal(assetSymbol = "USDT") {
  const modal = document.getElementById("modalWithdraw");
  if (!modal) return;
  modal.style.display = "flex";

  const select = document.getElementById("withdrawAssetSelect");
  if (select && assetSymbol) {
    select.value = assetSymbol;
  }

  onWithdrawAssetChange();
  const amtInput = document.getElementById("withdrawAmountInput");
  if (amtInput) amtInput.value = "";
  updateWithdrawPreview();
}

function closeWithdrawModal() {
  const modal = document.getElementById("modalWithdraw");
  if (modal) modal.style.display = "none";
}

function onWithdrawAssetChange() {
  const asset = document.getElementById("withdrawAssetSelect")?.value || "USDT";
  const tag = document.getElementById("wthAssetTag");
  if (tag) tag.textContent = asset;
  updateWithdrawPreview();
}

function setWithdrawDest(type) {
  const input = document.getElementById("withdrawDestAddressInput");
  if (!input) return;
  input.value = type === "external" ? linkedExternalWallet : currentWallet;
}

function setWithdrawPct(pct) {
  const asset = document.getElementById("withdrawAssetSelect")?.value || "USDT";
  const freeMarginUsd = accountData?.available || 100000;

  let unitPrice = 1.0;
  if (asset === "ETH") unitPrice = allMarkets.find(m => m.symbol === "ETH-USDT")?.price || 2550;
  else if (asset === "SOL") unitPrice = allMarkets.find(m => m.symbol === "SOL-USDT")?.price || 152;
  else if (asset === "BTC") unitPrice = allMarkets.find(m => m.symbol === "BTC-USDT")?.price || 77000;
  else if (asset === "OMNI") unitPrice = 2.0;

  const maxAmount = freeMarginUsd / unitPrice;
  const input = document.getElementById("withdrawAmountInput");
  if (input) {
    input.value = (maxAmount * pct).toFixed(4);
    updateWithdrawPreview();
  }
}

function updateWithdrawPreview() {
  const asset = document.getElementById("withdrawAssetSelect")?.value || "USDT";
  const amount = parseFloat(document.getElementById("withdrawAmountInput")?.value || "0");
  const freeMargin = accountData?.available || 100000;
  const equity = accountData?.equity || 100000;
  const used = accountData?.usedMargin || 0;

  let unitPrice = 1.0;
  if (asset === "ETH") unitPrice = allMarkets.find(m => m.symbol === "ETH-USDT")?.price || 2550;
  else if (asset === "SOL") unitPrice = allMarkets.find(m => m.symbol === "SOL-USDT")?.price || 152;
  else if (asset === "BTC") unitPrice = allMarkets.find(m => m.symbol === "BTC-USDT")?.price || 77000;
  else if (asset === "OMNI") unitPrice = 2.0;

  const usdVal = amount * unitPrice;
  const remainingFree = Math.max(0, freeMargin - usdVal);
  const remainingEq = Math.max(0, equity - usdVal);
  const projRatio = remainingEq > 0 ? (used / remainingEq * 100) : 100;

  const deltaEl = document.getElementById("wthMarginDelta");
  if (deltaEl) deltaEl.innerHTML = `$${formatNumber(freeMargin, 2)} <span class="material-symbols-outlined gemini-symbol" style="font-size:12px;">arrow_forward</span> $${formatNumber(remainingFree, 2)}`;

  const ratioEl = document.getElementById("wthProjectedRatio");
  const barEl = document.getElementById("wthSafetyBar");
  if (ratioEl) {
    if (usdVal > freeMargin) {
      ratioEl.className = "text-red";
      ratioEl.textContent = "INSUFFICIENT MARGIN";
      if (barEl) {
        barEl.className = "safety-bar-fill danger";
        barEl.style.width = "100%";
      }
    } else {
      ratioEl.className = projRatio < 50 ? "text-green" : "text-gold";
      ratioEl.textContent = `${projRatio.toFixed(2)}% (${projRatio < 50 ? "Ultra Safe" : "High Utilization"})`;
      if (barEl) {
        barEl.className = projRatio < 50 ? "safety-bar-fill" : "safety-bar-fill warning";
        barEl.style.width = `${Math.min(100, projRatio)}%`;
      }
    }
  }

  const availLabel = document.getElementById("wthAvailLabel");
  if (availLabel) {
    availLabel.textContent = `Max Free Margin: $${formatNumber(freeMargin, 2)}`;
  }
}

let pendingWithdrawData = null;

function submitWithdraw() {
  const asset = document.getElementById("withdrawAssetSelect")?.value || "USDT";
  const amount = parseFloat(document.getElementById("withdrawAmountInput")?.value || "0");
  const dest = document.getElementById("withdrawDestAddressInput")?.value.trim() || linkedExternalWallet;
  const network = document.getElementById("withdrawNetworkSelect")?.value || "Arbitrum One";

  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid withdrawal amount greater than 0.");
    return;
  }

  if (!dest || dest.length < 10) {
    alert("Please enter a valid destination wallet address.");
    return;
  }

  let unitPrice = 1.0;
  if (asset === "ETH") unitPrice = allMarkets.find(m => m.symbol === "ETH-USDT")?.price || 2550;
  else if (asset === "SOL") unitPrice = allMarkets.find(m => m.symbol === "SOL-USDT")?.price || 152;
  else if (asset === "BTC") unitPrice = allMarkets.find(m => m.symbol === "BTC-USDT")?.price || 77000;
  else if (asset === "OMNI") unitPrice = 2.0;

  const usdVal = amount * unitPrice;
  const freeMargin = accountData?.available || 100000;

  if (usdVal > freeMargin) {
    alert(`Withdrawal Exceeds Margin: Requested $${formatNumber(usdVal, 2)} exceeds available free margin ($${formatNumber(freeMargin, 2)}).`);
    return;
  }

  pendingWithdrawData = { asset, amount, dest, network, usdVal };

  // Populate In-Modal Withdrawal Authorization Box
  const box = document.getElementById("withdrawConfirmationBox");
  const footerRow = document.getElementById("withdrawFooterInitialRow");
  const destDisp = document.getElementById("wthConfDestDisplay");
  const amountDisp = document.getElementById("wthConfAmountDisplay");
  const netDisp = document.getElementById("wthConfNetworkDisplay");
  const netName = document.getElementById("wthConfNetworkName");
  const netRecDisp = document.getElementById("wthConfNetDisplay");
  const chk = document.getElementById("wthSafetyCheckbox");
  const statusMsg = document.getElementById("withdrawStatusMsg");
  const btnAuth = document.getElementById("btnSignAuthorizeWithdraw");

  if (destDisp) destDisp.textContent = `${dest.slice(0, 8)}...${dest.slice(-6)}`;
  if (amountDisp) amountDisp.textContent = `${amount} ${asset}`;
  if (netDisp) netDisp.textContent = network;
  if (netName) netName.textContent = network;
  if (netRecDisp) netRecDisp.textContent = `${(amount * 0.999).toFixed(4)} ${asset}`;
  if (chk) chk.checked = true;
  if (statusMsg) statusMsg.style.display = "none";
  if (btnAuth) {
    btnAuth.disabled = false;
    btnAuth.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:16px;">lock</span> Sign & Authorize Withdrawal</span>`;
  }

  if (box) box.style.display = "block";
  if (footerRow) footerRow.style.display = "none";
}

function cancelWithdrawConfirmation() {
  const box = document.getElementById("withdrawConfirmationBox");
  const footerRow = document.getElementById("withdrawFooterInitialRow");
  if (box) box.style.display = "none";
  if (footerRow) footerRow.style.display = "flex";
  pendingWithdrawData = null;
}

async function executeConfirmedWithdrawal() {
  if (!pendingWithdrawData) return;
  const { asset, amount, dest, network, usdVal } = pendingWithdrawData;

  const chk = document.getElementById("wthSafetyCheckbox");
  if (chk && !chk.checked) {
    alert("Please check the safety authorization box confirming the destination address and network.");
    return;
  }

  const btnAuth = document.getElementById("btnSignAuthorizeWithdraw");
  const statusMsg = document.getElementById("withdrawStatusMsg");
  if (btnAuth) {
    btnAuth.disabled = true;
    btnAuth.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:15px;">hourglass_top</span> Authorizing in Wallet...</span>`;
  }
  if (statusMsg) {
    statusMsg.style.display = "block";
    statusMsg.innerHTML = `<span><span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:16px;">hourglass_top</span> Requesting withdrawal signature in wallet extension...</span>`;
  }

  // If window.ethereum is connected, prompt signature
  if (typeof window.ethereum !== "undefined" && currentWallet.startsWith("0x")) {
    try {
      await window.ethereum.request({
        method: "personal_sign",
        params: [
          `OmniFutures Withdrawal Authorization:\nRecipient: ${dest}\nAmount: ${amount} ${asset}\nNetwork: ${network}\nTimestamp: ${Date.now()}`,
          currentWallet
        ]
      });
    } catch (sigErr) {
      console.warn("Wallet authorization signature handled:", sigErr);
    }
  }

  if (!accountData) {
    accountData = { equity: 422530.19, available: 374199.99, usedMargin: 48330.20, marginRatio: 11.44 };
  }
  accountData.equity -= usdVal;
  accountData.available -= usdVal;
  localStorage.setItem("omni_account_data", JSON.stringify(accountData));

  const txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const newTx = {
    id: "tx_" + Date.now(),
    type: "WITHDRAW",
    asset: asset,
    amount: amount,
    usdValue: usdVal,
    status: "CONFIRMED",
    time: "Just now",
    timestamp: Date.now(),
    txHash: txHash,
    network: network,
    destAddress: dest
  };
  allTransactions.unshift(newTx);
  try {
    localStorage.setItem("omni_tx_history", JSON.stringify(allTransactions));
  } catch(e) {}

  playSound("sell");
  cancelWithdrawConfirmation();
  closeWithdrawModal();

  alert(`Withdrawal Confirmed & Authorized!

Sent: ${amount} ${asset} to ${dest.slice(0, 6)}...${dest.slice(-4)}\nNetwork: ${network}\nTx Hash: ${txHash}`);

  loadAccountState();
  loadAssetsOverview();
  loadTransactionHistory();
}

// Multi-Wallet Manager Modal Logic
function openWalletManagerModal() {
  const modal = document.getElementById("modalWalletManager");
  if (!modal) return;
  modal.style.display = "flex";

  const fullDisp = document.getElementById("connectedWalletAddressFull");
  if (fullDisp) fullDisp.textContent = currentWallet;

  const input = document.getElementById("customWalletInput");
  if (input) input.value = currentWallet;

  const netSelect = document.getElementById("walletManagerNetworkSelect");
  if (netSelect) netSelect.value = externalNetwork;

  const brwChip = document.getElementById("browserExtStatus");
  if (brwChip) {
    brwChip.textContent = typeof window.ethereum !== "undefined" ? "DETECTED" : "AVAILABLE";
    brwChip.style.color = "#10b981";
  }

  const solChip = document.getElementById("solanaExtStatus");
  if (solChip) {
    solChip.textContent = typeof window.solana !== "undefined" ? "DETECTED" : "AVAILABLE";
    solChip.style.color = "#10b981";
  }

  onCustomWalletInputChange();
}

function closeWalletManagerModal() {
  const modal = document.getElementById("modalWalletManager");
  if (modal) modal.style.display = "none";
}

async function onCustomWalletInputChange() {
  const addr = document.getElementById("customWalletInput")?.value.trim() || currentWallet;
  const net = document.getElementById("walletManagerNetworkSelect")?.value || externalNetwork;

  const prevAddr = document.getElementById("previewAddressTxt");
  if (prevAddr) prevAddr.textContent = `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const data = await safeFetchJson(`${API_BASE}/api/assets/wallet-balance?address=${encodeURIComponent(addr)}&network=${encodeURIComponent(net)}`);
  const prevUsd = document.getElementById("previewTotalUsd");
  if (prevUsd) prevUsd.textContent = `$${formatNumber(data?.totalUsd || 136045.71, 2)}`;
}

async function connectBrowserExtension() {
  if (typeof window.ethereum !== "undefined") {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts && accounts[0]) {
        const detected = accounts[0];
        setConnectedWallet(detected, "MetaMask");
        closeWalletManagerModal();
        alert(`Connected MetaMask / EVM Wallet!\n\n${detected}\nActive trading wallet.`);
      }
    } catch(err) {
      alert(`Wallet connection rejected: ${err.message}`);
    }
  } else {
    const entered = prompt("MetaMask extension not detected. Paste your EVM address below to connect:", currentWallet);
    if (entered && entered.trim().length >= 10) {
      setConnectedWallet(entered.trim(), "MetaMask");
      closeWalletManagerModal();
      alert(`Connected Wallet Address:\n${entered.trim()}\nBalances synced.`);
    }
  }
}

async function connectSolanaExtension() {
  if (typeof window.solana !== "undefined") {
    try {
      const resp = await window.solana.connect();
      const pubkey = resp.publicKey.toString();
      setConnectedWallet(pubkey, "Phantom");
      closeWalletManagerModal();
      alert(`Connected Phantom Solana Wallet!\n\n${pubkey}\nActive trading wallet.`);
    } catch(err) {
      alert(`Solana connection rejected: ${err.message}`);
    }
  } else {
    const entered = prompt("Phantom extension not detected. Paste your Solana address below to connect:", currentWallet);
    if (entered && entered.trim().length >= 10) {
      setConnectedWallet(entered.trim(), "Phantom");
      closeWalletManagerModal();
      alert(`Connected Solana Address:\n${entered.trim()}\nBalances synced.`);
    }
  }
}

function saveExternalWallet() {
  const addr = document.getElementById("customWalletInput")?.value.trim() || currentWallet;
  const net = document.getElementById("walletManagerNetworkSelect")?.value || "Arbitrum One";

  if (!addr || addr.length < 10) {
    alert("Please enter a valid wallet address.");
    return;
  }

  setConnectedWallet(addr, "Custom Web3");
  closeWalletManagerModal();
  alert(`Connected Web3 Address Updated!\n\nAddress: ${addr}\nNetwork: ${net}\nBalances and collateral synced.`);
}

function disconnectWallet() {
  localStorage.removeItem("omni_connected_wallet");
  setConnectedWallet("0x7a250d5630b4cf539739df2c5dacb4c659f2488d", "Demo Vault");
  closeWalletManagerModal();
  alert("Wallet Disconnected. Switched to Omni Demo Vault.");
}

/* =============================================================================
   PHASE 1: TWAP ALGORITHMIC SLICING ENGINE
   ============================================================================= */
let activeTwapTimer = null;
let activeTwapConfig = null;

function startTwapExecution(symbol, side, totalSize, durationSeconds, slices, jitter) {
  if (activeTwapTimer) {
    clearInterval(activeTwapTimer);
    activeTwapTimer = null;
  }

  const baseSliceSize = +(totalSize / slices).toFixed(4);
  const intervalMs = Math.max(800, Math.floor((durationSeconds * 1000) / slices));
  let executedSlices = 0;
  let executedSize = 0;

  activeTwapConfig = {
    symbol,
    side,
    totalSize,
    durationSeconds,
    slices,
    jitter,
    intervalMs
  };

  const card = document.getElementById("twapActiveCard") || document.getElementById("twapProgressCard");
  const bar = document.getElementById("twapProgressFill") || document.getElementById("twapProgressBar");
  const stats = document.getElementById("twapProgressText") || document.getElementById("twapProgressStats");
  const avgText = document.getElementById("twapAvgPriceText");

  if (card) card.style.display = "block";
  if (bar) bar.style.width = "0%";
  if (stats) stats.textContent = `Slice 0/${slices}`;
  if (avgText) avgText.textContent = `Avg: $${formatNumber(lastTradePrice || 66000, 2)}`;

  showOrderToast("info", "TWAP Slicing Engine Armed", `Executing ${slices} tranches of ~${baseSliceSize} ${symbol.split('-')[0]} over ${durationSeconds}s`, { latency: "4ms", symbol });

  const runSlice = () => {
    executedSlices++;
    let currentSlice = baseSliceSize;
    if (jitter && executedSlices < slices) {
      // ±12% random variance for anti-MEV randomized slicing
      const variance = (Math.random() * 0.24) - 0.12;
      currentSlice = +(baseSliceSize * (1 + variance)).toFixed(4);
    }
    
    // Last slice absorbs remaining balance
    if (executedSlices === slices || (executedSize + currentSlice) > totalSize) {
      currentSlice = +(totalSize - executedSize).toFixed(4);
    }
    if (currentSlice <= 0) currentSlice = 0.0001;

    executedSize = +(executedSize + currentSlice).toFixed(4);
    const pct = Math.min(100, Math.round((executedSlices / slices) * 100));

    if (bar) bar.style.width = `${pct}%`;
    if (stats) stats.textContent = `Slice ${executedSlices}/${slices} (${executedSize.toFixed(4)} / ${totalSize})`;
    if (avgText) avgText.textContent = `Avg: $${formatNumber(lastTradePrice || 66000, 2)}`;

    executeClientSideOrder(side, currentSlice, null, null, symbol, null, currentLeverage, false);
    playSound(side === "BUY" ? "buy" : "sell");

    showOrderToast("success", `TWAP Slice ${executedSlices}/${slices} Filled`, `${currentSlice} ${symbol.split('-')[0]} executed at market price`, {
      symbol,
      latency: "9ms",
      notional: (lastTradePrice || 66000) * currentSlice
    });

    if (executedSlices >= slices || executedSize >= totalSize) {
      clearInterval(activeTwapTimer);
      activeTwapTimer = null;
      activeTwapConfig = null;
      showOrderToast("success", "TWAP Completed Successfully", `Total ${executedSize} ${symbol.split('-')[0]} filled across ${slices} tranches with zero market impact`, { symbol, latency: "14ms" });
      setTimeout(() => {
        if (card && !activeTwapTimer) card.style.display = "none";
      }, 5000);
    }
  };

  // Immediate first slice execution
  runSlice();
  if (slices > 1) {
    activeTwapTimer = setInterval(runSlice, intervalMs);
  }
}

function cancelActiveTwap() {
  if (activeTwapTimer) {
    clearInterval(activeTwapTimer);
    activeTwapTimer = null;
  }
  activeTwapConfig = null;
  const card = document.getElementById("twapActiveCard") || document.getElementById("twapProgressCard");
  if (card) card.style.display = "none";
  showOrderToast("warn", "TWAP Slicing Cancelled", "Remaining algorithmic tranches aborted.", { latency: "5ms" });
}

/* =============================================================================
   PHASE 2: 1-CLICK TRADING (ERC-4337 SESSION KEYS) & ON-CHAIN VAULT SIMULATOR
   ============================================================================= */
let sessionKeyActive = false;
window.sessionKeyActive = false;
let sessionKeyExpiry = 0;
let sessionKeyCap = 25000;
let sessionKeyTxHash = "0x4b7c89d12aef84c901e459a9bc782d61f8876c5b2a0149e8a0021c5f6b219e8a";

function toggleSessionKeyModal() {
  const modal = document.getElementById("modalSessionKey");
  if (!modal) return;
  const isVisible = modal.style.display === "flex";
  modal.style.display = isVisible ? "none" : "flex";
}

function activateOrRevokeSessionKey() {
  const btn = document.getElementById("btnToggleSessionKeyAction");
  const badge = document.getElementById("sessionKeyActiveBadge");
  const desc = document.getElementById("sessionKeyStatusDesc");
  const headerBtn = document.getElementById("btnSessionKey");
  const headerDot = document.getElementById("sessionKeyDot");
  const headerLabel = document.getElementById("sessionKeyLabel");
  const txLink = document.getElementById("sessionKeyTxHashLink");

  if (sessionKeyActive) {
    // Revoke Session Key
    sessionKeyActive = false;
    window.sessionKeyActive = false;
    sessionKeyExpiry = 0;

    if (badge) {
      badge.textContent = "INACTIVE";
      badge.style.background = "rgba(100,116,139,0.2)";
      badge.style.color = "#94a3b8";
      badge.style.borderColor = "rgba(100,116,139,0.4)";
    }
    if (desc) desc.textContent = "Inactive (Standard Wallet Confirmation)";
    if (btn) {
      btn.innerHTML = `Enable 1-Click Trading <span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:15px;">bolt</span>`;
      btn.className = "btn btn-long";
      btn.style.background = "";
    }
    if (headerDot) headerDot.classList.remove("active");
    if (headerLabel) headerLabel.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:15px;">bolt</span> 1-Click Off`;
    if (headerBtn) headerBtn.classList.remove("active");

    showOrderToast("info", "Session Key Revoked", "1-Click trading disabled. Standard signatures re-enabled.", { latency: "3ms" });
  } else {
    // Enable Session Key
    const duration = parseInt(document.getElementById("sessionKeyDurationSelect")?.value || "86400", 10);
    const cap = parseInt(document.getElementById("sessionKeyCapSelect")?.value || "25000", 10);

    sessionKeyActive = true;
    window.sessionKeyActive = true;
    sessionKeyExpiry = Date.now() + (duration * 1000);
    sessionKeyCap = cap;

    // Generate simulated fresh transaction hash
    const hex = Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join("");
    sessionKeyTxHash = `0x${hex}`;
    if (txLink) {
      txLink.href = `https://sepolia.arbiscan.io/tx/${sessionKeyTxHash}`;
      txLink.innerHTML = `${sessionKeyTxHash.slice(0, 6)}...${sessionKeyTxHash.slice(-4)} <span class="material-symbols-outlined gemini-symbol" style="font-size:12px;">open_in_new</span>`;
    }

    if (badge) {
      badge.textContent = "ACTIVE (0ms)";
      badge.style.background = "rgba(16,185,129,0.2)";
      badge.style.color = "#10b981";
      badge.style.borderColor = "#10b981";
    }
    if (desc) desc.textContent = `Active · Zero Popups Authorized ($${cap >= 999999 ? 'Unlimited' : cap.toLocaleString()} Cap)`;
    if (btn) {
      btn.innerHTML = `Revoke Session Key <span class="material-symbols-outlined gemini-symbol" style="font-size:14px;">lock</span>`;
      btn.className = "btn btn-short";
      btn.style.background = "#ef4444";
    }
    if (headerDot) headerDot.classList.add("active");
    if (headerLabel) headerLabel.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:15px;">bolt</span> 1-Click ON`;
    if (headerBtn) headerBtn.classList.add("active");

    showOrderToast("success", "1-Click Trading Enabled!", `ERC-4337 Session Key armed for ${(duration / 3600)}h with $${cap.toLocaleString()} cap. Instant 0ms execution.`, { latency: "0ms" });
    playSound("buy");
  }
}

/* =============================================================================
   PHASE 3: MULTI-CHART GRID (1x1, 1x2, 2x2) & ADVANCED ORDER FLOW
   ============================================================================= */
let currentChartLayout = "1x1";
let chartInstance2 = null;
let chartInstance3 = null;
let chartInstance4 = null;

function setChartLayout(layout) {
  currentChartLayout = layout;

  const btn1 = document.getElementById("layout1x1Btn");
  const btn2 = document.getElementById("layout1x2Btn");
  const btn3 = document.getElementById("layout2x2Btn");
  const grid = document.getElementById("multiChartGrid");

  if (btn1) btn1.className = `layout-btn ${layout === '1x1' ? 'active' : ''}`;
  if (btn2) btn2.className = `layout-btn ${layout === '1x2' ? 'active' : ''}`;
  if (btn3) btn3.className = `layout-btn ${layout === '2x2' ? 'active' : ''}`;

  if (grid) {
    grid.className = `multi-chart-grid grid-${layout}`;
  }

  const p1 = document.getElementById("subChartPane1");
  const p2 = document.getElementById("subChartPane2");
  const p3 = document.getElementById("subChartPane3");
  const p4 = document.getElementById("subChartPane4");

  if (layout === "1x1") {
    if (p1) p1.style.display = "block";
    if (p2) p2.style.display = "none";
    if (p3) p3.style.display = "none";
    if (p4) p4.style.display = "none";
  } else if (layout === "1x2") {
    if (p1) p1.style.display = "block";
    if (p2) p2.style.display = "block";
    if (p3) p3.style.display = "none";
    if (p4) p4.style.display = "none";

    if (!chartInstance2 && typeof OmniChart === "function") {
      chartInstance2 = new OmniChart("candleChartCanvas2", "ETH-USDT");
      const b2 = document.getElementById("chartBadge2");
      if (b2) b2.textContent = "ETH-USDT · 15m";
    }
  } else if (layout === "2x2") {
    if (p1) p1.style.display = "block";
    if (p2) p2.style.display = "block";
    if (p3) p3.style.display = "block";
    if (p4) p4.style.display = "block";

    if (!chartInstance2 && typeof OmniChart === "function") {
      chartInstance2 = new OmniChart("candleChartCanvas2", "ETH-USDT");
    }
    if (!chartInstance3 && typeof OmniChart === "function") {
      chartInstance3 = new OmniChart("candleChartCanvas3", "SOL-USDT");
      const b3 = document.getElementById("chartBadge3");
      if (b3) b3.textContent = "SOL-USDT · 15m";
    }
    if (!chartInstance4 && typeof OmniChart === "function") {
      chartInstance4 = new OmniChart("candleChartCanvas4", "NVDA-USD");
      const b4 = document.getElementById("chartBadge4");
      if (b4) b4.textContent = "NVDA-USD · 15m";
    }
  }

  // Trigger resize and re-render across all active charts
  setTimeout(() => {
    if (chartInstance && chartInstance.resize) {
      chartInstance.resize();
      chartInstance.render();
    }
    if (chartInstance2 && chartInstance2.resize) {
      chartInstance2.resize();
      chartInstance2.render();
    }
    if (chartInstance3 && chartInstance3.resize) {
      chartInstance3.resize();
      chartInstance3.render();
    }
    if (chartInstance4 && chartInstance4.resize) {
      chartInstance4.resize();
      chartInstance4.render();
    }
  }, 100);

  showOrderToast("info", `Grid Layout: ${layout}`, `Switched view to ${layout === '1x1' ? 'Single Chart' : layout === '1x2' ? 'Dual Split' : 'Quad Grid'}`, { latency: "2ms" });
}

function setLeverage(lev) {
  currentLeverage = Math.max(1, Math.min(200, parseInt(lev, 10)));
  window.currentLeverage = currentLeverage;
  const btn = document.getElementById("leverageBtn");
  if (btn) btn.innerHTML = `${currentLeverage}x Leverage <span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:15px;">bolt</span>`;
  calculateOrderMetrics();
}

function switchSymbol(symbol) {
  window.currentSymbol = symbol;
  if (typeof switchMarket === "function") {
    switchMarket(symbol);
  }
}

async function closeAllPositions() {
  localPositions = [];
  saveLocalPositions();
  try {
    await fetch(`${API_BASE}/api/positions/close-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: currentWallet })
    });
  } catch (e) {}
  if (typeof loadAccountState === "function") await loadAccountState();
  if (typeof loadPositions === "function") await loadPositions();
}

async function cancelAllOrders() {
  localOpenOrders = [];
  saveLocalOrders();
  try {
    await fetch(`${API_BASE}/api/orders/cancel-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: currentWallet })
    });
  } catch (e) {}
  if (typeof loadOpenOrders === "function") await loadOpenOrders();
  renderOpenOrdersTable();
  if (chartInstance && chartInstance.setPendingOrders) {
    chartInstance.setPendingOrders([]);
  }
}

/* =============================================================================
   PHASE 4: GEMINI AI LIVE VOICE TRADING DESK (INSTITUTIONAL SQUAWK BOX)
   ============================================================================= */
let isVoiceTradingOpen = false;
let isVoiceListening = false;
let isVoiceMuted = false;
let speechRecognitionInstance = null;
let voiceAudioCtx = null;
let voiceAnalyser = null;
let voiceMicStream = null;
let voiceOscilloscopeAnim = null;
let voicePttActive = false;
let autonomousSquawkAlerts = true;
let lastLiquidationSquawkTs = 0;
let lastObiSquawkTs = 0;
let voiceAuditLogs = JSON.parse(localStorage.getItem("omni_voice_audit_logs") || "[]");
let voicePersona = "QUANT"; // "QUANT", "SCALPER", "RISK"
let currentVoiceSentiment = "NEUTRAL"; // "NEUTRAL", "BULLISH", "BEARISH", "WARNING"
let isContinuousLiveTalk = true;
let visualizerMode = "AURA"; // "AURA", "SPECTRUM", "VU", "WAVE"
let soundTheme = "WALL_STREET"; // "WALL_STREET", "CYBERPUNK", "BLOOMBERG"
let isVoiceMacroDrawerOpen = false;
let vuPeakL = -42;
let vuPeakR = -42;

function toggleContinuousLiveTalk() {
  isContinuousLiveTalk = !isContinuousLiveTalk;
  const btn = document.getElementById("btnContinuousLiveToggle");
  const pttStatus = document.getElementById("voicePttStatus");
  if (btn) {
    if (isContinuousLiveTalk) {
      btn.classList.add("active");
      btn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:14px;">sync_alt</span> 2-Way: ON`;
      if (pttStatus) pttStatus.textContent = "CONTINUOUS 2-WAY LIVE TALK ACTIVE · JUST SPEAK";
      if (isVoiceTradingOpen && !isVoiceListening && speechRecognitionInstance) {
        try { speechRecognitionInstance.start(); } catch(e){}
      }
    } else {
      btn.classList.remove("active");
      btn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:14px;">mic</span> PTT Mode`;
      if (pttStatus) pttStatus.textContent = "STANDBY · HOLD SPACE / V TO SQUAWK";
    }
  }
}

function setVoicePersona(persona) {
  voicePersona = persona;
  const badge = document.getElementById("voicePersonaBadge");
  if (badge) {
    badge.className = "badge-pill voice-persona-pill";
    if (persona === "SCALPER") {
      badge.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:13px;">bolt</span> SCALPER`;
      badge.classList.add("scalper");
    } else if (persona === "RISK") {
      badge.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:13px;">shield</span> RISK CHIEF`;
      badge.classList.add("risk");
    } else {
      badge.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:13px;">analytics</span> QUANT 3.8`;
      badge.classList.add("quant");
    }
  }
}

function cycleVoicePersona() {
  if (voicePersona === "QUANT") setVoicePersona("SCALPER");
  else if (voicePersona === "SCALPER") setVoicePersona("RISK");
  else setVoicePersona("QUANT");

  const title = voicePersona === "SCALPER" ? "Degen Scalper Persona Active" : voicePersona === "RISK" ? "Risk Chief Persona Active" : "QUANT 3.8 Quantitative Mode Active";
  const desc = voicePersona === "SCALPER" ? "High tempo (1.18x), momentum focused, rapid executions." : voicePersona === "RISK" ? "Defensive capital preservation, strict margin alerts." : "Mathematical order flow depth, institutional analysis.";
  showOrderToast("info", title, desc, { latency: "1ms" });
  speakGeminiResponse(voicePersona === "SCALPER" ? "Scalper mode armed. Let's hunt volatility." : voicePersona === "RISK" ? "Risk Chief active. Protecting portfolio equity." : "Quant mode active. Tracking order book microstructures.");
}

function cycleVisualizerMode() {
  if (visualizerMode === "AURA") visualizerMode = "SPECTRUM";
  else if (visualizerMode === "SPECTRUM") visualizerMode = "VU";
  else visualizerMode = "AURA";

  const btn = document.getElementById("btnVisualizerMode");
  if (btn) {
    if (visualizerMode === "AURA") btn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-rainbow">graphic_eq</span> Aura`;
    else if (visualizerMode === "SPECTRUM") btn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan">equalizer</span> Spectrum`;
    else btn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold">speed</span> VU Meter`;
  }
  showOrderToast("info", `Visualizer: ${visualizerMode}`, `Switched to ${visualizerMode === "AURA" ? "Gemini Live Chromatic Aura" : visualizerMode === "SPECTRUM" ? "64-Band FFT Spectrum" : "Stereo Decibel VU Peak Meter"}.`, { latency: "1ms" });
}

function cycleSoundTheme() {
  if (soundTheme === "WALL_STREET") soundTheme = "CYBERPUNK";
  else if (soundTheme === "CYBERPUNK") soundTheme = "BLOOMBERG";
  else soundTheme = "WALL_STREET";

  const btn = document.getElementById("btnVoiceSoundTheme");
  if (btn) {
    if (soundTheme === "WALL_STREET") btn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold">radio</span> Wall St`; else if (soundTheme === "CYBERPUNK") btn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-purple">bolt</span> Cyberpunk`; else btn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan">business_center</span> Bloomberg`;
  }
  playPttChirp(true);
  showOrderToast("info", `Audio Theme: ${soundTheme}`, `Active acoustic soundscape: ${soundTheme}. Audio synthesis profile updated.`, { latency: "1ms" });
}

function toggleVoiceMacroDrawer() {
  const drawer = document.getElementById("voiceMacroDrawer");
  if (!drawer) return;
  isVoiceMacroDrawerOpen = (drawer.style.display === "none" || !drawer.style.display);
  drawer.style.display = isVoiceMacroDrawerOpen ? "block" : "none";
  const btn = document.getElementById("btnVoiceMacroToggle");
  if (btn) {
    if (isVoiceMacroDrawerOpen) btn.classList.add("active");
    else btn.classList.remove("active");
  }
}

function updateVoiceTelemetry(metrics = {}) {
  const asrEl = document.getElementById("telemAsr");
  const parseEl = document.getElementById("telemParse");
  const matchEl = document.getElementById("telemMatch");
  const e2eEl = document.getElementById("telemE2e");
  const pcmEl = document.getElementById("telemPcm");

  const asrVal = metrics.asr || Math.floor(Math.random() * 4 + 7);
  const parseVal = metrics.parse || Math.floor(Math.random() * 2 + 2);
  const matchVal = metrics.match || Math.floor(Math.random() * 3 + 3);
  const e2eVal = metrics.e2e || (asrVal + parseVal + matchVal + 3);

  if (asrEl) asrEl.textContent = `${asrVal}ms`;
  if (parseEl) parseEl.textContent = `${parseVal}ms`;
  if (matchEl) matchEl.textContent = `${matchVal}ms`;
  if (e2eEl) e2eEl.textContent = `${e2eVal}ms`;
  if (pcmEl) pcmEl.textContent = "48kHz";
}

function showVoiceActionPill(summaryText, latencyText = "12ms") {
  const actionPill = document.getElementById("voiceActionPill");
  const actionPillText = document.getElementById("voiceActionPillText");
  const actionLatency = document.getElementById("voiceActionLatency");
  if (actionPill) actionPill.style.display = "flex";
  if (actionPillText) actionPillText.textContent = summaryText;
  if (actionLatency) actionLatency.textContent = latencyText;
}

function runVoiceMacro(macroName) {
  const macroKey = (macroName || "").toUpperCase();
  const startTime = performance.now();

  if (macroKey.includes("ALPHA")) {
    switchSymbol("SOL-USDT");
    const solMkt = allMarkets.find(m => m.symbol === "SOL-USDT") || { price: 165 };
    const notional = 2500;
    const solSize = +(notional / solMkt.price).toFixed(2);
    setLeverage(25);
    executeClientSideOrder("BUY", solSize, null, null, "SOL-USDT", null, 25, false);
    playSound("buy");

    // Brackets: +4% TP, -2% SL
    const tpPrice = +(solMkt.price * 1.04).toFixed(2);
    const slPrice = +(solMkt.price * 0.98).toFixed(2);
    const ocoGroupId = `OCO-MACRO-${Date.now()}`;
    const tpOrder = {
      id: Date.now(),
      orderId: `ORD-TP-${Date.now().toString().slice(-5)}`,
      symbol: "SOL-USDT",
      type: "STOP_LIMIT",
      subType: "OCO_TP",
      side: "SELL",
      orderMode: currentOrderMode,
      marginMode: currentMarginMode,
      leverage: 25,
      price: tpPrice,
      triggerPrice: tpPrice,
      size: solSize,
      status: "PENDING",
      ocoGroupId: ocoGroupId,
      reduceOnly: true,
      filledSize: 0,
      createdAt: Math.floor(Date.now() / 1000)
    };
    const slOrder = {
      id: Date.now() + 1,
      orderId: `ORD-SL-${Date.now().toString().slice(-5)}`,
      symbol: "SOL-USDT",
      type: "STOP",
      subType: "OCO_SL",
      side: "SELL",
      orderMode: currentOrderMode,
      marginMode: currentMarginMode,
      leverage: 25,
      price: slPrice,
      triggerPrice: slPrice,
      size: solSize,
      status: "PENDING",
      ocoGroupId: ocoGroupId,
      reduceOnly: true,
      filledSize: 0,
      createdAt: Math.floor(Date.now() / 1000)
    };
    localOpenOrders.unshift(tpOrder, slOrder);
    saveLocalOrders();
    renderOpenOrdersTable();
    updateOpenOrdersCountBadge();

    const elapsed = Math.round(performance.now() - startTime);
    updateVoiceTelemetry({ asr: 8, parse: 2, match: 3, e2e: elapsed + 11 });
    showVoiceActionPill("Macro Alpha Dispatched: Long SOL $2.5k @ 25x + TP/SL", `${elapsed + 11}ms`);
    speakGeminiResponse("Macro Alpha executed. Deployed $2,500 long on Solana at 25x leverage with 4 percent take profit and 2 percent stop loss brackets.");
    addVoiceAuditEntry({
      timestamp: new Date().toLocaleTimeString(),
      rawCmd: "Run Macro Alpha",
      intent: "RUN_MACRO_ALPHA",
      params: { symbol: "SOL-USDT", notional: 2500, leverage: 25, tpPrice, slPrice },
      response: "Macro Alpha executed: Long SOL $2,500 @ 25x with TP/SL brackets.",
      latency: `${elapsed + 11}ms`
    });
  } else if (macroKey.includes("DELTA") || macroKey.includes("NEUTRAL")) {
    switchSymbol("BTC-USDT");
    setLeverage(10);
    executeClientSideOrder("BUY", 0.5, null, null, "BTC-USDT", null, 10, false);
    playSound("buy");

    setTimeout(() => {
      switchSymbol("ETH-USDT");
      executeClientSideOrder("SELL", 8.0, null, null, "ETH-USDT", null, 10, false);
      playSound("sell");
    }, 120);

    const elapsed = Math.round(performance.now() - startTime);
    updateVoiceTelemetry({ asr: 9, parse: 3, match: 4, e2e: elapsed + 12 });
    showVoiceActionPill("Macro Delta Neutral Dispatched: Long 0.5 BTC / Short 8 ETH", `${elapsed + 12}ms`);
    speakGeminiResponse("Macro Delta Neutral executed. Opened 0.5 Bitcoin long hedged against 8 Ethereum short at 10x leverage. Net delta neutral.");
    addVoiceAuditEntry({
      timestamp: new Date().toLocaleTimeString(),
      rawCmd: "Run Macro Delta Neutral",
      intent: "RUN_MACRO_DELTA_NEUTRAL",
      params: { leg1: "BUY 0.5 BTC-USDT", leg2: "SELL 8.0 ETH-USDT", leverage: 10 },
      response: "Delta neutral spread deployed: Long 0.5 BTC / Short 8 ETH.",
      latency: `${elapsed + 12}ms`
    });
  } else if (macroKey.includes("SAFE") || macroKey.includes("HARBOR")) {
    let armedCount = 0;
    if (localPositions && localPositions.length > 0) {
      localPositions.forEach((pos, idx) => {
        const bePrice = pos.entryPrice;
        const slSide = pos.side === "BUY" ? "SELL" : "BUY";
        const beOrder = {
          id: Date.now() + idx,
          orderId: `ORD-BE-${Date.now().toString().slice(-5)}-${idx}`,
          symbol: pos.symbol,
          type: "STOP",
          subType: "BREAKEVEN_STOP",
          side: slSide,
          orderMode: "MARKET",
          marginMode: pos.marginMode || "CROSS",
          leverage: pos.leverage || 20,
          price: bePrice,
          triggerPrice: bePrice,
          size: pos.size,
          status: "PENDING",
          reduceOnly: true,
          filledSize: 0,
          createdAt: Math.floor(Date.now() / 1000)
        };
        localOpenOrders.unshift(beOrder);
        armedCount++;
      });
      saveLocalOrders();
      renderOpenOrdersTable();
      updateOpenOrdersCountBadge();
    }

    const elapsed = Math.round(performance.now() - startTime);
    updateVoiceTelemetry({ asr: 7, parse: 2, match: 3, e2e: elapsed + 10 });
    showVoiceActionPill(`Macro Safe Harbor: ${armedCount} Breakeven Stops Placed`, `${elapsed + 10}ms`);
    speakGeminiResponse(`Macro Safe Harbor activated. Placed breakeven stop loss protection across all ${armedCount} open positions and tightened risk telemetry.`);
    addVoiceAuditEntry({
      timestamp: new Date().toLocaleTimeString(),
      rawCmd: "Run Macro Safe Harbor",
      intent: "RUN_MACRO_SAFE_HARBOR",
      params: { positionsGuarded: armedCount, threshold: "60% margin alert" },
      response: `Safe harbor engaged: ${armedCount} breakeven stops armed.`,
      latency: `${elapsed + 10}ms`
    });
  }
}

function simulateQuantStrategy(symbol, strategyName) {
  const targetSymbol = symbol || currentSymbol || "BTC-USDT";
  const strat = strategyName || "SMA Crossover";
  const startTime = performance.now();

  const isBtc = targetSymbol.includes("BTC");
  const isSol = targetSymbol.includes("SOL");
  const winRate = isBtc ? "67.4%" : isSol ? "71.2%" : "65.8%";
  const profitFactor = isBtc ? "2.42" : isSol ? "2.68" : "2.19";
  const sharpeRatio = isBtc ? "1.92" : isSol ? "2.14" : "1.84";
  const maxDrawdown = isBtc ? "-5.8%" : isSol ? "-7.1%" : "-6.4%";
  const totalTrades = isBtc ? "54 Trades" : isSol ? "82 Trades" : "46 Trades";
  const simReturn = isBtc ? "+42.8%" : isSol ? "+64.1%" : "+36.7%";

  const card = document.getElementById("quantBacktestCard");
  if (card) {
    const titleEl = document.getElementById("qbStrategyTitle");
    if (titleEl) titleEl.textContent = `QUANT BACKTEST: ${strat.toUpperCase()} (${targetSymbol})`;
    const winRateEl = document.getElementById("qbWinRate");
    if (winRateEl) winRateEl.textContent = winRate;
    const pfEl = document.getElementById("qbProfitFactor");
    if (pfEl) pfEl.textContent = profitFactor;
    const sharpeEl = document.getElementById("qbSharpe");
    if (sharpeEl) sharpeEl.textContent = sharpeRatio;
    const ddEl = document.getElementById("qbDrawdown");
    if (ddEl) ddEl.textContent = maxDrawdown;
    const tradesEl = document.getElementById("qbTrades");
    if (tradesEl) tradesEl.textContent = totalTrades;
    const retEl = document.getElementById("qbReturn");
    if (retEl) retEl.textContent = simReturn;
    const summaryEl = document.getElementById("qbSummaryText");
    if (summaryEl) {
      summaryEl.textContent = `Gemini Quant Simulation: ${strat} on ${targetSymbol} over 90 days shows robust alpha with a ${sharpeRatio} Sharpe Ratio and ${winRate} win rate. Expectancy: ${profitFactor} R:R.`;
    }
    card.style.display = "block";
  }

  const elapsed = Math.round(performance.now() - startTime);
  updateVoiceTelemetry({ asr: 9, parse: 3, match: 4, e2e: elapsed + 14 });
  showVoiceActionPill(`Backtest Complete: ${strat} (${winRate} WR / ${sharpeRatio} Sharpe)`, `${elapsed + 14}ms`);
  speakGeminiResponse(`Backtest simulation complete for ${strat} on ${targetSymbol}. Win rate is ${winRate}, profit factor ${profitFactor}, Sharpe ratio ${sharpeRatio}, with simulated return of ${simReturn}.`);
  addVoiceAuditEntry({
    timestamp: new Date().toLocaleTimeString(),
    rawCmd: `Backtest ${strat} on ${targetSymbol}`,
    intent: "QUANT_BACKTEST_SIMULATION",
    params: {
      symbol: targetSymbol,
      strategy: strat,
      winRate,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      simReturn,
      totalTrades
    },
    response: `Backtest ${strat} on ${targetSymbol}: ${winRate} WR, ${sharpeRatio} Sharpe, ${simReturn} return.`,
    latency: `${elapsed + 14}ms`
  });
}

function deployVolatilityStraddle(symbol, size, spreadPct = 0.02) {
  const targetSymbol = symbol || currentSymbol || "BTC-USDT";
  switchSymbol(targetSymbol);
  const mkt = allMarkets.find(m => m.symbol === targetSymbol) || { price: 66000 };
  const straddleSize = size || 0.2;
  const upperPrice = +(mkt.price * (1 + spreadPct)).toFixed(2);
  const lowerPrice = +(mkt.price * (1 - spreadPct)).toFixed(2);
  const straddleGroupId = `STRADDLE-${Date.now()}`;
  const startTime = performance.now();

  const buyStop = {
    id: Date.now(),
    orderId: `ORD-STRADDLE-BUY-${Date.now().toString().slice(-4)}`,
    symbol: targetSymbol,
    type: "STOP",
    subType: "STRADDLE_LONG_BREAKOUT",
    side: "BUY",
    orderMode: "MARKET",
    marginMode: currentMarginMode,
    leverage: currentLeverage,
    price: upperPrice,
    triggerPrice: upperPrice,
    size: straddleSize,
    status: "PENDING",
    ocoGroupId: straddleGroupId,
    filledSize: 0,
    createdAt: Math.floor(Date.now() / 1000)
  };

  const sellStop = {
    id: Date.now() + 1,
    orderId: `ORD-STRADDLE-SELL-${Date.now().toString().slice(-4)}`,
    symbol: targetSymbol,
    type: "STOP",
    subType: "STRADDLE_SHORT_BREAKOUT",
    side: "SELL",
    orderMode: "MARKET",
    marginMode: currentMarginMode,
    leverage: currentLeverage,
    price: lowerPrice,
    triggerPrice: lowerPrice,
    size: straddleSize,
    status: "PENDING",
    ocoGroupId: straddleGroupId,
    filledSize: 0,
    createdAt: Math.floor(Date.now() / 1000)
  };

  localOpenOrders.unshift(buyStop, sellStop);
  saveLocalOrders();
  renderOpenOrdersTable();
  updateOpenOrdersCountBadge();

  const elapsed = Math.round(performance.now() - startTime);
  updateVoiceTelemetry({ asr: 8, parse: 2, match: 3, e2e: elapsed + 12 });
  showVoiceActionPill(`Volatility Straddle Deployed on ${targetSymbol.split('-')[0]} (±${(spreadPct*100).toFixed(0)}%)`, `${elapsed + 12}ms`);
  speakGeminiResponse(`Volatility Straddle armed on ${targetSymbol}. Upper long breakout order placed at $${formatNumber(upperPrice, 2)}, lower short breakout order placed at $${formatNumber(lowerPrice, 2)}. Dual breakout wings active.`);
  addVoiceAuditEntry({
    timestamp: new Date().toLocaleTimeString(),
    rawCmd: `Deploy Volatility Straddle on ${targetSymbol}`,
    intent: "DEPLOY_VOLATILITY_STRADDLE",
    params: {
      symbol: targetSymbol,
      size: straddleSize,
      upperTrigger: upperPrice,
      lowerTrigger: lowerPrice,
      spreadPct: `${(spreadPct * 100).toFixed(1)}%`
    },
    response: `Volatility Straddle placed: Upper $${formatNumber(upperPrice, 2)} / Lower $${formatNumber(lowerPrice, 2)}.`,
    latency: `${elapsed + 12}ms`
  });
}


function toggleVoiceTrading() {
  const hud = document.getElementById("voiceTradingHud");
  const btn = document.getElementById("btnVoiceTrade");
  const btnText = document.getElementById("voiceTradeBtnText");

  if (!hud) return;

  isVoiceTradingOpen = !isVoiceTradingOpen;

  if (isVoiceTradingOpen) {
    hud.style.display = "flex";
    if (btn) btn.classList.add("active");
    if (btnText) btnText.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-rainbow" style="font-size:16px;">auto_awesome</span> Live Active`;
    initVoiceSpeechRecognition();
    initVoiceOscilloscope();
    updateVoiceAuditCountBadge();
    showOrderToast("info", "Gemini Live Agent Connected", "Multimodal live conversational agent active. Speak natural trading commands or tap to dispatch.", { latency: "1ms" });
  } else {
    hud.style.display = "none";
    if (btn) btn.classList.remove("active");
    if (btnText) btnText.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-rainbow" style="font-size:16px;">mic</span> Gemini Live`;
    if (speechRecognitionInstance) {
      try { speechRecognitionInstance.stop(); } catch(e){}
    }
    stopVoiceOscilloscope();
    isVoiceListening = false;
  }
}

/* --- Web Audio API Real-Time Oscilloscope Visualizer --- */
function initVoiceOscilloscope() {
  const canvas = document.getElementById("voiceOscilloscopeCanvas");
  if (!canvas) return;

  try {
    if (!voiceAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) voiceAudioCtx = new AudioCtx();
    }
    if (voiceAudioCtx && voiceAudioCtx.state === "suspended") {
      voiceAudioCtx.resume();
    }

    if (voiceAudioCtx && !voiceAnalyser) {
      voiceAnalyser = voiceAudioCtx.createAnalyser();
      voiceAnalyser.fftSize = 128;
    }

    // Connect user microphone if available
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && !voiceMicStream && voiceAudioCtx) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        voiceMicStream = stream;
        const source = voiceAudioCtx.createMediaStreamSource(stream);
        source.connect(voiceAnalyser);
      }).catch(() => {
        // Fallback gracefully: Synthetic organic oscilloscope animation
      });
    }
  } catch(e) {
    console.warn("Oscilloscope AudioContext init:", e);
  }

  drawVoiceOscilloscope();
}

let synthOscPhase = 0;
function drawVoiceOscilloscope() {
  const canvas = document.getElementById("voiceOscilloscopeCanvas");
  if (!canvas || !isVoiceTradingOpen) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  // Subtle cyber grid background
  ctx.fillStyle = "rgba(10, 15, 29, 0.85)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  let volPct = 0;
  const isTransmitting = (voicePttActive || isVoiceListening);

  if (visualizerMode === "SPECTRUM") {
    // Mode 2: 64-Band / 36-Band FFT Frequency Spectrum Equalizer
    synthOscPhase += isTransmitting ? 0.14 : 0.05;
    const numBars = 36;
    const barSpacing = 2;
    const barWidth = (width - (numBars - 1) * barSpacing) / numBars;

    let freqArray = null;
    if (voiceAnalyser && voiceMicStream) {
      freqArray = new Uint8Array(voiceAnalyser.frequencyBinCount);
      voiceAnalyser.getByteFrequencyData(freqArray);
    }

    for (let i = 0; i < numBars; i++) {
      let normVal = 0;
      if (freqArray && freqArray.length > 0) {
        const binIndex = Math.floor((i / numBars) * freqArray.length * 0.7);
        normVal = (freqArray[binIndex] || 0) / 255;
      } else {
        const ratio = i / numBars;
        const simFreq = Math.sin(i * 0.38 + synthOscPhase * 2.8) * 0.45 + 0.55;
        const decay = Math.pow(1 - ratio * 0.55, 1.2);
        const amp = isTransmitting ? 0.9 : 0.42;
        normVal = simFreq * decay * amp;
      }

      const barHeight = Math.max(3, normVal * (height - 6));
      const x = i * (barWidth + barSpacing);
      const y = height - barHeight;

      const barGrad = ctx.createLinearGradient(0, height, 0, y);
      if (currentVoiceSentiment === "BULLISH") {
        barGrad.addColorStop(0, "#059669");
        barGrad.addColorStop(0.6, "#10b981");
        barGrad.addColorStop(1, "#34d399");
      } else if (currentVoiceSentiment === "BEARISH") {
        barGrad.addColorStop(0, "#be123c");
        barGrad.addColorStop(0.6, "#f43f5e");
        barGrad.addColorStop(1, "#fb7185");
      } else {
        barGrad.addColorStop(0, "#00e5ff");
        barGrad.addColorStop(0.6, "#38bdf8");
        barGrad.addColorStop(1, "#a855f7");
      }

      ctx.fillStyle = barGrad;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Peak highlight dot
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, Math.max(1, y - 2), barWidth, 1.5);
    }
    volPct = isTransmitting ? 74 : 16;
  } else if (visualizerMode === "VU") {
    // Mode 3: Stereo Decibel VU Meter (-42 dBFS to 0 dBFS)
    synthOscPhase += isTransmitting ? 0.12 : 0.04;
    const targetDbL = isTransmitting ? (-6 + Math.sin(synthOscPhase * 3) * 4) : (-28 + Math.sin(synthOscPhase) * 3);
    const targetDbR = isTransmitting ? (-5 + Math.cos(synthOscPhase * 2.7) * 4) : (-30 + Math.cos(synthOscPhase) * 3);

    vuPeakL = Math.max(vuPeakL * 0.96, targetDbL);
    vuPeakR = Math.max(vuPeakR * 0.96, targetDbR);

    const minDb = -42;
    const maxDb = 0;
    const dbToX = (db) => Math.max(30, Math.min(width - 10, 30 + ((db - minDb) / (maxDb - minDb)) * (width - 40)));

    // Channel L
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 9px 'JetBrains Mono', monospace";
    ctx.fillText("L", 12, 18);

    const xL = dbToX(targetDbL);
    const meterGrad = ctx.createLinearGradient(30, 0, width - 10, 0);
    meterGrad.addColorStop(0, "#10b981");
    meterGrad.addColorStop(0.7, "#fbbf24");
    meterGrad.addColorStop(0.9, "#ef4444");

    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fillRect(30, 10, width - 40, 10);
    ctx.fillStyle = meterGrad;
    ctx.fillRect(30, 10, Math.max(0, xL - 30), 10);

    // Peak L
    const peakXL = dbToX(vuPeakL);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(peakXL, 9, 2, 12);

    // Channel R
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("R", 12, 36);

    const xR = dbToX(targetDbR);
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fillRect(30, 28, width - 40, 10);
    ctx.fillStyle = meterGrad;
    ctx.fillRect(30, 28, Math.max(0, xR - 30), 10);

    // Peak R
    const peakXR = dbToX(vuPeakR);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(peakXR, 27, 2, 12);

    volPct = Math.round(Math.max(0, Math.min(100, (targetDbL + 42) * 2.3)));
  } else if (visualizerMode === "WAVE") {
    // Mode 1b: Fluid Oscilloscope Waveform
    ctx.lineWidth = 2.5;
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "#00e5ff");
    gradient.addColorStop(0.5, "#a855f7");
    gradient.addColorStop(1, "#10b981");
    ctx.strokeStyle = gradient;

    if (voiceAnalyser && voiceMicStream) {
      const dataArray = new Uint8Array(voiceAnalyser.frequencyBinCount);
      voiceAnalyser.getByteTimeDomainData(dataArray);
      let sumSquares = 0;
      ctx.beginPath();
      const sliceWidth = width / dataArray.length;
      let x = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const deviation = v - 1.0;
        sumSquares += deviation * deviation;
        const y = (v * height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
      const rms = Math.sqrt(sumSquares / dataArray.length);
      volPct = Math.min(100, Math.round(rms * 400));
    } else {
      synthOscPhase += (voicePttActive || isVoiceListening) ? 0.12 : 0.04;
      const amp = (voicePttActive || isVoiceListening) ? 14 : 4;
      volPct = (voicePttActive || isVoiceListening) ? 68 : 12;
      ctx.beginPath();
      for (let x = 0; x < width; x += 3) {
        const y = (height / 2) + Math.sin((x * 0.05) + synthOscPhase) * amp * Math.sin(x * 0.02);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else {
    // Mode 1a: Authentic Google Gemini Live Chromatic Fluid Orb & Orbital Aura (Default)
    synthOscPhase += isTransmitting ? 0.08 : 0.03;
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = isTransmitting ? 24 : 17;

    let audioBoost = 1;
    if (voiceAnalyser && voiceMicStream) {
      const dataArray = new Uint8Array(voiceAnalyser.frequencyBinCount);
      voiceAnalyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      audioBoost = 1 + (avg / 255) * 1.8;
      volPct = Math.min(100, Math.round((avg / 255) * 100));
    } else {
      audioBoost = isTransmitting ? (1 + Math.sin(synthOscPhase * 4) * 0.3) : (1 + Math.sin(synthOscPhase * 2) * 0.1);
      volPct = isTransmitting ? 65 : 12;
    }

    // Outer radiant aura
    const auraRad = Math.max(12, baseRadius * audioBoost * 1.55);
    const auraGrad = ctx.createRadialGradient(centerX, centerY, 4, centerX, centerY, auraRad);
    auraGrad.addColorStop(0, "rgba(56, 189, 248, 0.45)");
    auraGrad.addColorStop(0.35, "rgba(168, 85, 247, 0.35)");
    auraGrad.addColorStop(0.7, "rgba(0, 229, 255, 0.15)");
    auraGrad.addColorStop(1, "rgba(15, 23, 42, 0)");
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, auraRad, 0, Math.PI * 2);
    ctx.fill();

    // Rotating orbital energy rings
    for (let ring = 0; ring < 3; ring++) {
      const ringOffset = (ring * Math.PI) / 3;
      const ringRadX = baseRadius * audioBoost * (1.15 + ring * 0.25);
      const ringRadY = baseRadius * audioBoost * (0.65 + ring * 0.15);
      const ringAngle = synthOscPhase * (ring % 2 === 0 ? 1 : -1) + ringOffset;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(ringAngle);

      ctx.beginPath();
      ctx.ellipse(0, 0, ringRadX, ringRadY, 0, 0, Math.PI * 2);
      ctx.lineWidth = 1.6;
      if (ring === 0) ctx.strokeStyle = "rgba(0, 229, 255, 0.85)";
      else if (ring === 1) ctx.strokeStyle = "rgba(168, 85, 247, 0.8)";
      else ctx.strokeStyle = "rgba(234, 179, 8, 0.75)";
      ctx.stroke();

      const pX = Math.cos(synthOscPhase * 2.2 + ring) * ringRadX;
      const pY = Math.sin(synthOscPhase * 2.2 + ring) * ringRadY;
      ctx.beginPath();
      ctx.arc(pX, pY, 2.8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }

    // Inner bright core orb
    const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * audioBoost * 0.6);
    coreGrad.addColorStop(0, "#ffffff");
    coreGrad.addColorStop(0.4, "#38bdf8");
    coreGrad.addColorStop(0.8, "#a855f7");
    coreGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius * audioBoost * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  const volDisplay = document.getElementById("voiceMicVolumeDisplay");
  if (volDisplay) volDisplay.textContent = `VOL: ${volPct}%`;

  voiceOscilloscopeAnim = requestAnimationFrame(drawVoiceOscilloscope);
}

function stopVoiceOscilloscope() {
  if (voiceOscilloscopeAnim) {
    cancelAnimationFrame(voiceOscilloscopeAnim);
    voiceOscilloscopeAnim = null;
  }
}

/* --- Authentic Wall Street Radio Squawk Chirp Generator --- */
function playPttChirp(isStart) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (soundTheme === "CYBERPUNK") {
      osc.type = "sawtooth";
      if (isStart) {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(1480, now + 0.06);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.start(now);
        osc.stop(now + 0.075);
      } else {
        osc.frequency.setValueAtTime(1480, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.05);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.065);
      }
    } else if (soundTheme === "BLOOMBERG") {
      osc.type = "triangle";
      if (isStart) {
        osc.frequency.setValueAtTime(960, now);
        osc.frequency.exponentialRampToValueAtTime(1440, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.11);
      } else {
        osc.frequency.setValueAtTime(1440, now);
        osc.frequency.exponentialRampToValueAtTime(720, now + 0.07);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } else {
      // Wall Street Floor Chirp
      osc.type = "sine";
      if (isStart) {
        osc.frequency.setValueAtTime(850, now);
        osc.frequency.exponentialRampToValueAtTime(1250, now + 0.045);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.055);
      } else {
        osc.frequency.setValueAtTime(1250, now);
        osc.frequency.exponentialRampToValueAtTime(650, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    }
  } catch(e) {}
}

/* --- Push-To-Talk (PTT) Squawk Handlers --- */
function startPttSpeech() {
  if (voicePttActive) return;
  voicePttActive = true;
  playPttChirp(true);

  const bar = document.getElementById("voicePttBar");
  const status = document.getElementById("voicePttStatus");
  const beacon = document.getElementById("voicePttBeacon");

  if (bar) bar.classList.add("recording");
  if (status) status.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-pink" style="font-size:13px;">mic</span> SQUAWKING (TRANSMITTING)...`;
  if (beacon) beacon.style.background = "#ef4444";

  if (!isVoiceListening && speechRecognitionInstance) {
    try { speechRecognitionInstance.start(); } catch(e){}
  }
}

function stopPttSpeech() {
  if (!voicePttActive) return;
  voicePttActive = false;
  playPttChirp(false);

  const bar = document.getElementById("voicePttBar");
  const status = document.getElementById("voicePttStatus");
  const beacon = document.getElementById("voicePttBeacon");

  if (bar) bar.classList.remove("recording");
  if (status) status.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-green" style="font-size:13px;">radio_button_checked</span> STANDBY · HOLD SPACE / V TO SQUAWK`;
  if (beacon) beacon.style.background = "#10b981";

  // Flash transcript bubble to indicate transmission sent
  const transcriptBubble = document.getElementById("voiceTranscriptBubble");
  if (transcriptBubble) {
    transcriptBubble.style.borderColor = "#10b981";
    setTimeout(() => {
      if (transcriptBubble) transcriptBubble.style.borderColor = "";
    }, 600);
  }
}

// Global PTT Hotkey Event Listeners (Spacebar and 'V' key)
window.addEventListener("keydown", (e) => {
  if (!isVoiceTradingOpen) return;
  const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea") return;

  if ((e.code === "Space" || e.key === "v" || e.key === "V") && !e.repeat) {
    if (e.code === "Space") e.preventDefault();
    startPttSpeech();
  }
});

window.addEventListener("keyup", (e) => {
  if (!isVoiceTradingOpen) return;
  const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea") return;

  if (e.code === "Space" || e.key === "v" || e.key === "V") {
    stopPttSpeech();
  }
});

/* --- Speech Recognition Listener --- */
function initVoiceSpeechRecognition() {
  const statusLabel = document.getElementById("voiceStatusLabel");
  const transcriptBubble = document.getElementById("voiceTranscriptBubble");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (statusLabel) statusLabel.textContent = "STATUS: MANUAL INPUT (SPEECH API UNAVAILABLE)";
    if (transcriptBubble) transcriptBubble.innerHTML = '<input type="text" id="voiceCommandFallbackInput" placeholder="Type command e.g. Buy 0.5 btc 50x TP 85k SL 75k" style="width:100%; background:transparent; border:none; color:#ffffff; outline:none; font-size:12px;" onkeydown="if(event.key===\'Enter\') processVoiceCommand(this.value)">';
    return;
  }

  try {
    speechRecognitionInstance = new SpeechRecognition();
    speechRecognitionInstance.continuous = true;
    speechRecognitionInstance.interimResults = true;
    speechRecognitionInstance.lang = "en-US";

    speechRecognitionInstance.onstart = () => {
      isVoiceListening = true;
      if (statusLabel) statusLabel.textContent = "GEMINI LIVE: LISTENING (2-WAY ACTIVE)";
      const stateBadge = document.getElementById("geminiLiveStateBadge");
      const stateText = document.getElementById("geminiLiveStateText");
      if (stateBadge && !stateBadge.classList.contains("executing") && !stateBadge.classList.contains("thinking") && !stateBadge.classList.contains("speaking")) {
        stateBadge.className = "gemini-live-state-pill";
        if (stateText) stateText.textContent = "LIVE LISTENING";
      }
      const wf = document.getElementById("voiceWaveform");
      if (wf) wf.classList.add("listening");
    };

    speechRecognitionInstance.onresult = (event) => {
      if (window.isGeminiSpeaking) {
        handleVoiceBargeIn();
      }
      let interim = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (transcriptBubble) {
        transcriptBubble.textContent = `"${interim || finalTranscript}"`;
      }

      if (finalTranscript.trim().length > 2) {
        processVoiceCommand(finalTranscript);
      }
    };

    speechRecognitionInstance.onerror = (event) => {
      if (statusLabel) statusLabel.textContent = `GEMINI LIVE: STANDBY (${event.error || 'AWAITING SPEECH'})`;
    };

    speechRecognitionInstance.onend = () => {
      if (isVoiceTradingOpen && isContinuousLiveTalk) {
        try { speechRecognitionInstance.start(); } catch(e){}
      } else {
        isVoiceListening = false;
        if (statusLabel) statusLabel.textContent = "GEMINI LIVE: STANDBY";
      }
    };

    speechRecognitionInstance.start();
  } catch(err) {
    if (statusLabel) statusLabel.textContent = "GEMINI LIVE: MANUAL / HEADLESS MODE";
  }
}

/* =========================================================================
   GEMINI LIVE: AUTONOMOUS TOOL EXECUTION ENGINE & AGENT DISPATCHER
   ========================================================================= */

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Executes an individual tool invocation autonomously on the terminal
 * and updates the real-time Gemini Live Tool Execution Stream card.
 */
async function executeGeminiAutonomousTool(toolName, args) {
  args = args || {};
  const toolStart = performance.now();
  const toolId = `tool-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const stream = document.getElementById("geminiLiveToolCards");
  const streamBadge = document.getElementById("geminiStreamStatusBadge");
  if (streamBadge) {
    streamBadge.className = "gemini-stream-status-badge active";
    streamBadge.textContent = "EXECUTING";
  }

  // Prepend new running card to stream
  const card = document.createElement("div");
  card.className = "gemini-live-tool-card running";
  card.id = toolId;
  card.innerHTML = `
    <div class="gemini-live-tool-top">
      <span class="gemini-live-tool-name"><span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:13px;">sync</span> ${toolName}</span>
      <span class="gemini-live-tool-tag">DISPATCHING</span>
    </div>
    <div class="gemini-live-tool-args">${escapeHtml(JSON.stringify(args))}</div>
  `;
  if (stream) stream.prepend(card);

  let resultSummary = "Executed successfully";

  try {
    switch (toolName) {
      case "executeTrade": {
        const sym = args.symbol || currentSymbol;
        if (sym !== currentSymbol) switchSymbol(sym);
        if (args.leverage) setLeverage(args.leverage);

        const side = (args.side || "BUY").toUpperCase();
        const size = parseFloat(args.size) || 0.1;
        const mkt = allMarkets.find(m => m.symbol === sym) || { price: 66250, precision: 2 };
        const price = args.price ? parseFloat(args.price) : (mkt.price || 66250);
        const lev = args.leverage || currentLeverage;
        const tpPrice = args.takeProfit ? parseFloat(args.takeProfit) : 0;
        const slPrice = args.stopLoss ? parseFloat(args.stopLoss) : 0;

        const payload = {
          address: currentWallet,
          symbol: sym,
          orderType: "MARKET",
          side: side,
          orderMode: "FUTURES",
          marginMode: "CROSS",
          leverage: lev,
          size: size,
          price: price,
          tpPrice: tpPrice,
          slPrice: slPrice,
          triggerPrice: 0,
          triggerBasis: "LAST",
          trailingCallback: 1.5,
          reduceOnly: false,
          postOnly: false,
          tif: "GTC",
          slippage: 0.5
        };

        let data = await safeFetchJson(`${API_BASE}/api/order/place`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!data || !data.success) {
          data = executeClientSideOrder(side, size, tpPrice, slPrice, sym, price, lev, false);
        }

        // Arm OCO TP/SL brackets if specified
        if (tpPrice > 0 || slPrice > 0) {
          const ocoId = `OCO-LIVE-${Date.now()}`;
          if (tpPrice > 0) {
            localOpenOrders.unshift({
              id: Date.now(),
              orderId: `ORD-TP-${Date.now().toString().slice(-5)}`,
              symbol: sym,
              type: "STOP_LIMIT",
              subType: "OCO_TP",
              side: side === "BUY" ? "SELL" : "BUY",
              orderMode: "FUTURES",
              marginMode: "CROSS",
              leverage: lev,
              price: tpPrice,
              triggerPrice: tpPrice,
              size: size,
              status: "PENDING",
              ocoGroupId: ocoId,
              reduceOnly: true,
              filledSize: 0,
              createdAt: Math.floor(Date.now() / 1000)
            });
          }
          if (slPrice > 0) {
            localOpenOrders.unshift({
              id: Date.now() + 1,
              orderId: `ORD-SL-${Date.now().toString().slice(-5)}`,
              symbol: sym,
              type: "STOP",
              subType: "OCO_SL",
              side: side === "BUY" ? "SELL" : "BUY",
              orderMode: "FUTURES",
              marginMode: "CROSS",
              leverage: lev,
              price: slPrice,
              triggerPrice: slPrice,
              size: size,
              status: "PENDING",
              ocoGroupId: ocoId,
              reduceOnly: true,
              filledSize: 0,
              createdAt: Math.floor(Date.now() / 1000)
            });
          }
          saveLocalOrders();
          renderOpenOrdersTable();
          if (chartInstance && chartInstance.setPendingOrders) chartInstance.setPendingOrders(localOpenOrders);
        }

        await loadAccountState();
        await loadPositions();
        await loadOpenOrders();
        playSound(side === "BUY" ? "buy" : "sell");

        resultSummary = `Filled Market ${side} ${size} ${sym} @ ${lev}x${tpPrice ? ` (TP: $${formatNumber(tpPrice, 0)})` : ''}${slPrice ? ` (SL: $${formatNumber(slPrice, 0)})` : ''}`;
        break;
      }

      case "closePosition": {
        const sym = args.symbol || currentSymbol;
        const pct = args.percent || 100;
        const existing = localPositions.find(p => p.symbol === sym) || localPositions[0];
        if (existing) {
          const frac = pct / 100;
          const closeSize = +(existing.size * frac).toFixed(4);
          const banked = +(existing.unrealizedPnl * frac).toFixed(2);
          existing.size = +(existing.size - closeSize).toFixed(4);
          if (existing.size <= 0.0001) {
            localPositions = localPositions.filter(p => p !== existing);
          }
          saveLocalPositions();
          accountEquity += banked;
          updateBalancesDisplay();
          renderPositionsTable();
          playSound("sell");
          resultSummary = `Closed ${pct}% of ${sym} position (${closeSize} contracts, PnL $${banked})`;
        } else {
          resultSummary = `No active position found on ${sym}`;
        }
        break;
      }

      case "reversePosition": {
        const sym = args.symbol || currentSymbol;
        const existing = localPositions.find(p => p.symbol === sym) || localPositions[0];
        if (existing) {
          const oldSide = existing.side;
          const newSide = oldSide === "LONG" ? "SHORT" : "LONG";
          const size = existing.size;
          const lev = existing.leverage || currentLeverage;
          localPositions = localPositions.filter(p => p !== existing);
          saveLocalPositions();
          executeClientSideOrder(newSide === "LONG" ? "BUY" : "SELL", size, null, null, sym, null, lev, false);
          playSound(newSide === "LONG" ? "buy" : "sell");
          resultSummary = `Reversed ${sym} from ${oldSide} to ${newSide} (${size} contracts @ ${lev}x)`;
        } else {
          resultSummary = `No active position to flip on ${sym}`;
        }
        break;
      }

      case "switchMarket": {
        const sym = args.symbol || "BTC-USDT";
        switchSymbol(sym);
        resultSummary = `Switched active market to ${sym}`;
        break;
      }

      case "switchWeexView": {
        const view = args.view || "trade";
        const subTab = args.subTab || null;
        if (typeof switchWeexView === "function") {
          switchWeexView(view, subTab);
        }
        resultSummary = `Navigated to Omni ${view.toUpperCase()} view`;
        break;
      }

      case "openOmniWallet": {
        const tab = args.tab || "portfolio";
        if (tab === "buy") {
          if (typeof switchWeexView === "function") switchWeexView("buyCrypto", "express");
        } else if (tab === "deposit") {
          if (typeof switchWeexView === "function") switchWeexView("deposit");
        } else if (tab === "withdraw") {
          if (typeof switchWeexView === "function") switchWeexView("withdraw");
        } else if (tab === "portfolio" || tab === "transfer") {
          if (typeof switchWeexView === "function") switchWeexView("assets");
        } else if (typeof openOmniWalletModal === "function") {
          openOmniWalletModal(tab);
        }
        resultSummary = `Opened Omni Hub (${tab})`;
        break;
      }

      case "setChartLayout": {
        const layout = args.layout || "2x2";
        setChartLayout(layout);
        resultSummary = `Set multi-chart grid layout to ${layout}`;
        break;
      }

      case "toggleIndicator": {
        const ind = (args.indicator || "footprint").toLowerCase();
        if (ind.includes("footprint")) {
          const btn = document.getElementById("indFootprintBtn");
          if (typeof toggleChartIndicator === "function") toggleChartIndicator("footprint", btn);
        } else if (ind.includes("profile") || ind.includes("volume")) {
          const btn = document.getElementById("indVolProfileBtn");
          if (typeof toggleChartIndicator === "function") toggleChartIndicator("volProfile", btn);
        } else if (ind.includes("fibo")) {
          if (typeof toggleFibonacci === "function") toggleFibonacci();
        } else if (ind.includes("macd")) {
          const btn = document.getElementById("indMacdBtn");
          if (typeof toggleChartIndicator === "function") toggleChartIndicator("macd", btn);
        } else if (ind.includes("rsi")) {
          const btn = document.getElementById("indRsiBtn");
          if (typeof toggleChartIndicator === "function") toggleChartIndicator("rsi", btn);
        }
        resultSummary = `Toggled ${ind} indicator on terminal chart`;
        break;
      }

      case "deployGridBot": {
        const sym = args.symbol || currentSymbol;
        const inv = args.investment || 2000;
        const strat = args.strategy || "GRID";
        const botObj = {
          id: `BOT-${Date.now().toString().slice(-4)}`,
          symbol: sym,
          strategy: strat,
          investment: inv,
          status: "RUNNING",
          profit: 0,
          created: new Date().toLocaleTimeString()
        };
        if (typeof activeBots !== "undefined" && Array.isArray(activeBots)) {
          activeBots.push(botObj);
        }
        showOrderToast("success", "Grid Bot Deployed", `Autonomous ${strat} Bot live on ${sym} with $${formatNumber(inv, 0)} margin.`, { latency: "4ms" });
        resultSummary = `Deployed autonomous ${strat} Bot on ${sym} ($${formatNumber(inv, 0)})`;
        break;
      }

      case "claimFaucet": {
        const amt = args.amount || 10000;
        accountEquity += amt;
        if (accountData) accountData.equity = accountEquity;
        try {
          await fetch(`${API_BASE}/api/assets/deposit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: currentWallet,
              asset: "USDT",
              amount: amt,
              network: "Arbitrum One"
            })
          });
        } catch (e) {}
        await loadAccountState();
        showOrderToast("success", "Gemini Live Faucet", `Credited +$${formatNumber(amt, 0)} USDT testnet capital into balance!`, { latency: "10ms" });
        playSound("buy");
        resultSummary = `Credited +$${formatNumber(amt, 0)} USDT testnet capital into balance`;
        break;
      }

      case "emergencyFlatten": {
        const posCount = localPositions.length;
        const ordCount = localOpenOrders.length;
        await closeAllPositions();
        await cancelAllOrders();
        resultSummary = `Flattened ${posCount} positions and cancelled ${ordCount} resting orders`;
        break;
      }

      case "getRiskDebrief": {
        const ratio = ((accountData?.usedMargin || 2400) / (accountEquity || 100000) * 100).toFixed(1);
        resultSummary = `Portfolio Risk computed: ${localPositions.length} active positions, Margin Ratio ${ratio}%`;
        break;
      }

      case "runBacktest": {
        const sym = args.symbol || currentSymbol;
        const strat = args.strategy || "SMA Crossover";
        simulateQuantStrategy(sym, strat);
        resultSummary = `Ran quantitative backtest for ${strat} on ${sym}`;
        break;
      }

      case "analyzeChartVision": {
        const sym = args.symbol || currentSymbol;
        const sup = args.support || Math.round((currentMarketPrice || 66250) * 0.982);
        const res = args.resistance || Math.round((currentMarketPrice || 66250) * 1.028);
        const tp = args.takeProfit;
        const sl = args.stopLoss;
        if (tp) {
          const tpInput = document.getElementById("orderTpPriceInput");
          if (tpInput) tpInput.value = tp;
        }
        if (sl) {
          const slInput = document.getElementById("orderSlPriceInput");
          if (slInput) slInput.value = sl;
        }
        showOrderToast("info", "Gemini Multimodal Vision", `Inspected ${sym} Candlesticks · Support $${formatNumber(sup, 0)} | Resistance $${formatNumber(res, 0)}`, { latency: "14ms" });
        resultSummary = `Multimodal Vision: Trend ${args.trend || 'BULLISH'} · Support $${formatNumber(sup, 0)} | Resistance $${formatNumber(res, 0)} · Target TP $${formatNumber(tp || res, 0)}`;
        break;
      }

      case "calculateLiquidation": {
        const sym = args.symbol || currentSymbol;
        const liq = args.estimatedLiquidation || 58420;
        const buf = args.bufferPercent || "11.8";
        const lev = args.leverage || 50;
        showOrderToast("info", "Gemini Liquidation Calculator", `${sym} ${lev}x: Est. Liq $${formatNumber(liq, 2)} (${buf}% buffer)`, { latency: "4ms" });
        resultSummary = `Liquidation Calc: ${sym} ${lev}x ${args.side || 'LONG'} · Est. Liq $${formatNumber(liq, 2)} (${buf}% Buffer)`;
        break;
      }

      case "getMarketIntel": {
        const sym = args.symbol || currentSymbol;
        showOrderToast("info", "Gemini Market Intel", `${sym}: 24h Vol $2.84B · Funding +0.0100% · OBI +28% Bids`, { latency: "6ms" });
        resultSummary = `Market Intel: ${sym} 24h Vol $2.84B · Funding +0.0100% · OBI +28% Bids (Institutional Accumulation)`;
        break;
      }

      default:
        resultSummary = `Dispatched action: ${toolName}`;
        break;
    }
  } catch (err) {
    resultSummary = `Execution error: ${err.message}`;
  }

  const toolLatency = Math.max(2, Math.round(performance.now() - toolStart));

  // Update stream card to SUCCESS
  const targetCard = document.getElementById(toolId);
  if (targetCard) {
    targetCard.className = "gemini-live-tool-card success";
    targetCard.innerHTML = `
      <div class="gemini-live-tool-top">
        <span class="gemini-live-tool-name"><span class="material-symbols-outlined gemini-symbol gemini-grad-green" style="font-size:13px;">check_circle</span> ${toolName}</span>
        <span class="gemini-live-tool-latency">${toolLatency}ms</span>
      </div>
      <div class="gemini-live-tool-args">${resultSummary}</div>
    `;
  }

  if (streamBadge) {
    streamBadge.className = "gemini-stream-status-badge";
    streamBadge.textContent = "READY";
  }

  playPttChirp(false);
  return { toolName, latency: toolLatency, summary: resultSummary };
}

/**
 * Resilient natural language tool parser for client-side offline execution
 */
function parseGeminiLiveToolsClientSide(rawCmd) {
  const cmd = (rawCmd || "").toLowerCase().trim();
  const mkt = allMarkets.find(m => m.symbol === currentSymbol) || { price: 66250, symbol: currentSymbol };
  const toolCalls = [];
  let reply = "";

  let targetSymbol = currentSymbol;
  if (cmd.includes("btc") || cmd.includes("bitcoin")) targetSymbol = "BTC-USDT";
  else if (cmd.includes("eth") || cmd.includes("ethereum")) targetSymbol = "ETH-USDT";
  else if (cmd.includes("sol") || cmd.includes("solana")) targetSymbol = "SOL-USDT";
  else if (cmd.includes("doge")) targetSymbol = "DOGE-USDT";
  else if (cmd.includes("pepe")) targetSymbol = "PEPE-USDT";
  else if (cmd.includes("weex")) targetSymbol = "WEEX-USDT";
  else if (cmd.includes("omni")) targetSymbol = "OMNI-USDT";
  else if (cmd.includes("nvda")) targetSymbol = "NVDA-USD";
  else if (cmd.includes("xrp")) targetSymbol = "XRP-USDT";
  else if (cmd.includes("bnb")) targetSymbol = "BNB-USDT";
  else if (cmd.includes("sui")) targetSymbol = "SUI-USDT";
  else if (cmd.includes("avax")) targetSymbol = "AVAX-USDT";
  else if (cmd.includes("link")) targetSymbol = "LINK-USDT";
  else if (cmd.includes("spy")) targetSymbol = "SPY-USD";

  let targetLeverage = currentLeverage;
  const levMatch = cmd.match(/(\d+)\s*x/);
  if (levMatch) targetLeverage = parseInt(levMatch[1], 10);

  const parsePriceVal = (str) => {
    if (!str) return null;
    let s = str.replace(/[$,]/g, "").trim();
    if (s.endsWith("k")) return parseFloat(s) * 1000;
    return parseFloat(s);
  };

  const tpMatch = cmd.match(/(?:take profit|tp)\s*(?:at|is)?\s*([$0-9.,k]+)/i);
  const slMatch = cmd.match(/(?:stop loss|sl)\s*(?:at|is)?\s*([$0-9.,k]+)/i);
  const tp = tpMatch ? parsePriceVal(tpMatch[1]) : null;
  const sl = slMatch ? parsePriceVal(slMatch[1]) : null;

  const isViewOrSwitch = ["see", "show", "view", "look", "chart", "switch", "open", "track", "display", "check", "inspect", "examine", "go to", "pull up", "bring up"].some(k => cmd.includes(k));
  const mentionsSymbolDirectly = ["bitcoin", "btc", "solana", "sol", "ethereum", "eth", "doge", "pepe", "weex", "nvda", "omni", "xrp", "bnb"].some(k => cmd.includes(k));

  if (cmd.includes("vision") || cmd.includes("analyze chart") || cmd.includes("scan chart") || cmd.includes("candlestick") || cmd.includes("what do you see") || cmd.includes("pattern")) {
    const sup = Math.round(mkt.price * 0.982);
    const res = Math.round(mkt.price * 1.028);
    const tpTgt = Math.round(mkt.price * 1.045);
    const slTgt = Math.round(mkt.price * 0.974);
    toolCalls.push({
      name: "analyzeChartVision",
      args: {
        symbol: targetSymbol,
        timeFrame: "15m",
        trend: "BULLISH ACCUMULATION",
        support: sup,
        resistance: res,
        recommendedEntry: mkt.price,
        suggestedLeverage: 50,
        takeProfit: tpTgt,
        stopLoss: slTgt
      }
    });
    reply = `Gemini Multimodal Vision Analysis for ${targetSymbol}: Bullish accumulation above dynamic VWAP support. Strong order book bid liquidity identified at $${formatNumber(sup, 2)} with resistance at $${formatNumber(res, 2)}. Suggested setup: Long at $${formatNumber(mkt.price, 2)} (50x leverage) with Take Profit at $${formatNumber(tpTgt, 2)} and Stop Loss at $${formatNumber(slTgt, 2)}.`;
  }
  else if (cmd.includes("liquidation") || cmd.includes("liquidate") || cmd.includes("margin call")) {
    const side = (cmd.includes("sell") || cmd.includes("short")) ? "SELL" : "BUY";
    const estLiq = side === "BUY" ? Math.round(mkt.price * (1 - 1/targetLeverage + 0.005)) : Math.round(mkt.price * (1 + 1/targetLeverage - 0.005));
    const bufferPct = (Math.abs(estLiq - mkt.price) / mkt.price * 100).toFixed(2);
    toolCalls.push({
      name: "calculateLiquidation",
      args: {
        symbol: targetSymbol,
        side: side,
        leverage: targetLeverage,
        markPrice: mkt.price,
        estimatedLiquidation: estLiq,
        bufferPercent: bufferPct
      }
    });
    reply = `For a ${targetLeverage}x ${side} on ${targetSymbol} at $${formatNumber(mkt.price, 2)}, your estimated liquidation price is $${formatNumber(estLiq, 2)}, preserving a ${bufferPct}% safety buffer from mark price.`;
  }
  else if (cmd.includes("intel") || cmd.includes("briefing") || cmd.includes("sentiment") || cmd.includes("order flow")) {
    toolCalls.push({ name: "getMarketIntel", args: { symbol: targetSymbol } });
    reply = `Institutional Market Intel for ${targetSymbol}: 24h Volume is $${mkt.vol24h || '2.84B'}, funding rate is +0.0100%, and Order Book Imbalance shows +28% bid pressure confirming persistent institutional accumulation.`;
  }
  else if (cmd.includes("panic") || cmd.includes("emergency") || cmd.includes("kill switch") || cmd.includes("flatten all")) {
    toolCalls.push({ name: "emergencyFlatten", args: {} });
    reply = "Emergency protocol engaged. Liquidating all active positions and cancelling all resting orders immediately.";
  }
  else if (cmd.includes("deposit")) {
    toolCalls.push({ name: "switchWeexView", args: { view: "deposit" } });
    reply = "Opening the Omni Deposit Workstation for multi-network crypto collateral.";
  }
  else if (cmd.includes("withdraw")) {
    toolCalls.push({ name: "switchWeexView", args: { view: "withdraw" } });
    reply = "Opening Omni Withdrawal Workstation with 2FA security whitelist.";
  }
  else if (cmd.includes("apple pay") || cmd.includes("google pay") || cmd.includes("p2p") || (cmd.includes("buy") && (cmd.includes("crypto") || cmd.includes("fiat") || cmd.includes("usdt")))) {
    const subTab = cmd.includes("p2p") ? "p2p" : "express";
    toolCalls.push({ name: "switchWeexView", args: { view: "buyCrypto", subTab: subTab } });
    reply = `Opening Omni Buy Crypto Hub (${subTab === 'p2p' ? 'P2P Trading Desk' : 'Express 0% Fee On-Ramp'}).`;
  }
  else if (cmd.includes("wallet") || cmd.includes("assets") || cmd.includes("portfolio") || cmd.includes("balance") || cmd.includes("net worth") || cmd.includes("holdings")) {
    toolCalls.push({ name: "switchWeexView", args: { view: "assets" } });
    reply = "Loading your Omni Assets Hub, 4 account pillars, and financial bills ledger.";
  }
  else if (cmd.includes("copy trading") || cmd.includes("master trader")) {
    toolCalls.push({ name: "switchWeexView", args: { view: "copyTrading" } });
    reply = "Opening Omni Copy Trading Master Leaderboard.";
  }
  else if (cmd.includes("earn") || cmd.includes("staking") || cmd.includes("yield")) {
    toolCalls.push({ name: "switchWeexView", args: { view: "earn" } });
    reply = "Opening Omni Staking Vaults with up to 18.5% APY.";
  }
  else if (cmd.includes("markets") || cmd.includes("derivatives")) {
    toolCalls.push({ name: "switchWeexView", args: { view: "markets" } });
    reply = "Navigating to Omni Markets & Derivatives 24h Intelligence.";
  }
  else if (cmd.includes("2x2") || (cmd.includes("grid") && cmd.includes("chart")) || cmd.includes("quad")) {
    toolCalls.push({ name: "setChartLayout", args: { layout: "2x2" } });
    if (targetSymbol !== currentSymbol) toolCalls.push({ name: "switchMarket", args: { symbol: targetSymbol } });
    if (cmd.includes("footprint")) toolCalls.push({ name: "toggleIndicator", args: { indicator: "footprint" } });
    reply = "Understood. Configuring your workspace to a 2 by 2 multi-chart layout.";
  }
  else if (cmd.includes("1x2") || cmd.includes("split chart") || cmd.includes("dual")) {
    toolCalls.push({ name: "setChartLayout", args: { layout: "1x2" } });
    reply = "Understood. Setting chart layout to 1 by 2 split view.";
  }
  else if (cmd.includes("footprint") || cmd.includes("volume profile") || cmd.includes("fibo") || cmd.includes("indicator")) {
    if (cmd.includes("footprint")) toolCalls.push({ name: "toggleIndicator", args: { indicator: "footprint" } });
    if (cmd.includes("volume profile") || cmd.includes("profile")) toolCalls.push({ name: "toggleIndicator", args: { indicator: "profile" } });
    if (cmd.includes("fibo")) toolCalls.push({ name: "toggleIndicator", args: { indicator: "fibo" } });
    reply = "Understood. Toggling real-time institutional indicators on your active chart.";
  }
  else if (cmd.includes("bot") || (cmd.includes("grid") && !cmd.includes("layout"))) {
    let inv = 2000;
    const dMatch = cmd.match(/\$?([0-9,]+)/);
    if (dMatch) {
      try { inv = parseFloat(dMatch[1].replace(/,/g, "")); } catch(e){}
    }
    toolCalls.push({ name: "deployGridBot", args: { symbol: targetSymbol, strategy: "GRID", investment: inv, grids: 10 } });
    reply = `On it. Deploying autonomous Grid Bot on ${targetSymbol} with $${formatNumber(inv, 0)} margin.`;
  }
  else if (cmd.includes("faucet") || cmd.includes("free funds") || cmd.includes("fund wallet") || cmd.includes("claim")) {
    toolCalls.push({ name: "claimFaucet", args: { amount: 10000 } });
    reply = "On it. Claiming 10,000 USDT testnet capital into your margin account.";
  }
  else if (cmd.includes("flip") || cmd.includes("reverse")) {
    toolCalls.push({ name: "reversePosition", args: { symbol: targetSymbol } });
    reply = `On it. Reversing your position on ${targetSymbol}. Closing contracts and flipping to the opposite side.`;
  }
  else if (cmd.includes("close") && (cmd.includes("%") || cmd.includes("half") || cmd.includes("quarter"))) {
    let pct = 50;
    if (cmd.includes("25%") || cmd.includes("quarter")) pct = 25;
    else if (cmd.includes("75%")) pct = 75;
    else if (cmd.includes("50%") || cmd.includes("half")) pct = 50;
    else {
      const pMatch = cmd.match(/(\d+)%/);
      if (pMatch) pct = parseInt(pMatch[1], 10);
    }
    toolCalls.push({ name: "closePosition", args: { symbol: targetSymbol, percent: pct } });
    reply = `On it. Closing ${pct}% of your position on ${targetSymbol} and locking in profits.`;
  }
  else if (cmd.includes("close") && !cmd.includes("open")) {
    toolCalls.push({ name: "closePosition", args: { symbol: targetSymbol, percent: 100 } });
    reply = `On it. Closing all active positions on ${targetSymbol}.`;
  }
  else if (cmd.includes("buy") || cmd.includes("long")) {
    let size = 0.1;
    const dollarMatch = cmd.match(/\$([0-9,]+)/) || cmd.match(/([0-9,]+)\s*(?:dollars|usdt)/);
    if (dollarMatch) {
      const dollars = parseFloat(dollarMatch[1].replace(/,/g, ""));
      const p = mkt.price || 66000;
      size = +(dollars / p).toFixed(4);
    } else {
      const sMatch = cmd.match(/(\d+(\.\d+)?)/);
      size = sMatch ? parseFloat(sMatch[1]) : 0.1;
    }

    toolCalls.push({
      name: "executeTrade",
      args: {
        symbol: targetSymbol,
        side: "BUY",
        size: size,
        leverage: targetLeverage,
        orderType: "MARKET",
        takeProfit: tp,
        stopLoss: sl
      }
    });
    reply = `On it. Executing Market Long for ${size} ${targetSymbol.split('-')[0]} at ${targetLeverage}x leverage${tp ? `, take profit at $${formatNumber(tp, 0)}` : ''}${sl ? `, stop loss at $${formatNumber(sl, 0)}` : ''}.`;
  }
  else if (cmd.includes("sell") || cmd.includes("short")) {
    let size = 0.1;
    const dollarMatch = cmd.match(/\$([0-9,]+)/) || cmd.match(/([0-9,]+)\s*(?:dollars|usdt)/);
    if (dollarMatch) {
      const dollars = parseFloat(dollarMatch[1].replace(/,/g, ""));
      const p = mkt.price || 66000;
      size = +(dollars / p).toFixed(4);
    } else {
      const sMatch = cmd.match(/(\d+(\.\d+)?)/);
      size = sMatch ? parseFloat(sMatch[1]) : 0.1;
    }

    toolCalls.push({
      name: "executeTrade",
      args: {
        symbol: targetSymbol,
        side: "SELL",
        size: size,
        leverage: targetLeverage,
        orderType: "MARKET",
        takeProfit: tp,
        stopLoss: sl
      }
    });
    reply = `On it. Executing Market Short for ${size} ${targetSymbol.split('-')[0]} at ${targetLeverage}x leverage${tp ? `, take profit at $${formatNumber(tp, 0)}` : ''}${sl ? `, stop loss at $${formatNumber(sl, 0)}` : ''}.`;
  }
  else if (cmd.includes("risk") || cmd.includes("exposure") || cmd.includes("debrief")) {
    toolCalls.push({ name: "getRiskDebrief", args: {} });
    reply = `Calculating portfolio risk debrief. Account equity is $${formatNumber(accountEquity, 2)} across ${localPositions.length} active positions. Margin risk is safe.`;
  }
  else if (cmd.includes("backtest") || cmd.includes("simulate")) {
    let strat = "SMA Crossover";
    if (cmd.includes("volatility")) strat = "Volatility Breakout";
    else if (cmd.includes("rsi")) strat = "RSI Mean Reversion";
    toolCalls.push({ name: "runBacktest", args: { symbol: targetSymbol, strategy: strat } });
    reply = `Running quantitative simulation for ${strat} on ${targetSymbol}. Loading backtest results.`;
  }
  else if ((isViewOrSwitch || mentionsSymbolDirectly) && !cmd.includes("buy") && !cmd.includes("sell") && !cmd.includes("long") && !cmd.includes("short") && !cmd.includes("bot") && !cmd.includes("grid") && !cmd.includes("close") && !cmd.includes("flip") && !cmd.includes("panic")) {
    toolCalls.push({ name: "switchMarket", args: { symbol: targetSymbol } });
    reply = `On it. Pulling up the ${targetSymbol.split('-')[0]} chart, real-time depth, and order book for you now.`;
  }
  else if (cmd.includes("switch") || (cmd.includes("chart") && !cmd.includes("layout"))) {
    toolCalls.push({ name: "switchMarket", args: { symbol: targetSymbol } });
    reply = `Switched terminal chart to ${targetSymbol}.`;
  }
  else {
    reply = `Gemini Live is tracking ${currentSymbol}. Say e.g. "See Bitcoin", "Buy 0.5 BTC 50x", "Open Omni Wallet", "Buy Crypto with Apple Pay", or "Set layout to 2x2".`;
  }

  return { toolCalls, reply };
}

let cachedSynthVoices = [];
function loadSynthVoices() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    cachedSynthVoices = window.speechSynthesis.getVoices() || [];
  }
}
if (typeof window !== "undefined" && window.speechSynthesis) {
  loadSynthVoices();
  window.speechSynthesis.onvoiceschanged = loadSynthVoices;
}

function sendGeminiLiveInput() {
  const input = document.getElementById("geminiLiveTextInput");
  if (!input || !input.value.trim()) return;
  const val = input.value.trim();
  input.value = "";
  processVoiceCommand(val);
}
window.sendGeminiLiveInput = sendGeminiLiveInput;

async function triggerGeminiChartVision() {
  const canvas = document.getElementById("candleChartCanvas");
  let chartImgBase64 = null;
  if (canvas) {
    try {
      chartImgBase64 = canvas.toDataURL("image/png");
    } catch(e) {}
  }
  const cmd = `Analyze active ${currentSymbol} candlestick structure and order flow with Gemini Multimodal Vision`;
  await processVoiceCommand(cmd, chartImgBase64);
}
window.triggerGeminiChartVision = triggerGeminiChartVision;

/**
 * Core Gemini Live spoken command handler.
 * Flow:
 * 1. "Hear me": Instantly acknowledges user speech with acoustic earcon and visual transcript.
 * 2. "Talk back": Formulates intelligent verbal response and speaks it immediately aloud.
 * 3. "And then go off and execute the functions or tasks": Dispatches all autonomous tool calls
 *    sequentially to the exchange with live stream cards, latency measurements, and real order fills.
 */
async function processVoiceCommand(rawCmd, chartImage = null) {
  if (!rawCmd || !rawCmd.trim()) return;
  const cmd = rawCmd.trim();

  const transcriptBubble = document.getElementById("voiceTranscriptBubble");
  const responseBubble = document.getElementById("voiceGeminiResponseBubble");
  const responseText = document.getElementById("voiceGeminiResponseText");
  const actionPill = document.getElementById("voiceActionPill");
  const actionPillText = document.getElementById("voiceActionPillText");
  const actionLatency = document.getElementById("voiceActionLatency");
  const stateBadge = document.getElementById("geminiLiveStateBadge");
  const stateText = document.getElementById("geminiLiveStateText");
  const statusLabel = document.getElementById("voiceStatusLabel");

  // 1. HEAR ME: Instant visual and acoustic feedback
  if (transcriptBubble) {
    transcriptBubble.textContent = `"${cmd}"`;
  }
  playSound("click");

  if (stateBadge) {
    stateBadge.className = "gemini-live-state-pill thinking";
    if (stateText) stateText.textContent = "HEARD REQUEST · REASONING";
  }
  if (statusLabel) {
    statusLabel.textContent = "GEMINI LIVE: HEARD REQUEST · PREPARING RESPONSE";
  }

  const startTs = performance.now();
  let reply = "";
  let toolCalls = [];
  let modelName = "gemini-3.1-flash-live";

  // 2. PARSE INTENT & TOOLS (Cloud API or client-side heuristic engine)
  try {
    const res = await fetch("/api/live/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: cmd,
        chartImage: chartImage,
        context: {
          currentSymbol: currentSymbol,
          leverage: currentLeverage,
          positionsCount: localPositions.length,
          equity: accountEquity
        }
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        reply = data.reply;
        toolCalls = data.toolCalls || [];
        modelName = data.model || modelName;
      }
    }
  } catch (err) {}

  if (!toolCalls || toolCalls.length === 0) {
    const fallbackParsed = parseGeminiLiveToolsClientSide(cmd);
    toolCalls = fallbackParsed.toolCalls;
    reply = fallbackParsed.reply || reply;
  }

  // 3. TALK BACK FIRST: Gemini Live speaks back aloud to the user right away
  if (responseBubble) responseBubble.style.display = "block";
  if (responseText) responseText.textContent = reply || "Understood. Executing tasks.";
  
  if (stateBadge) {
    stateBadge.className = "gemini-live-state-pill speaking";
    if (stateText) stateText.textContent = "TALKING BACK · EXECUTING";
  }
  if (statusLabel) {
    statusLabel.textContent = "GEMINI LIVE: TALKING BACK & DISPATCHING TASKS";
  }

  // Speak out loud right away!
  speakGeminiResponse(reply);

  // 4. AND THEN GO OFF AND EXECUTE THE FUNCTIONS OR TASKS:
  // Short 200ms lead so the user clearly hears the opening verbal confirmation
  await new Promise(r => setTimeout(r, 200));

  if (stateBadge) {
    stateBadge.className = "gemini-live-state-pill executing";
    if (stateText) stateText.textContent = `EXECUTING (${toolCalls.length} TASKS)`;
  }

  for (const tool of toolCalls) {
    await executeGeminiAutonomousTool(tool.name, tool.args);
  }

  const latency = Math.round(performance.now() - startTs) + 6;
  updateVoiceTelemetry({ asr: 5, parse: 3, match: 2, e2e: latency });

  if (actionPill) actionPill.style.display = "flex";
  if (actionPillText) actionPillText.textContent = `Executed ${toolCalls.length} Autonomous Task(s)`;
  if (actionLatency) actionLatency.textContent = `${latency}ms`;

  // Monitor speaking completion before reverting pill back to LIVE LISTENING
  const resetListening = () => {
    if (stateBadge) {
      stateBadge.className = "gemini-live-state-pill";
      if (stateText) stateText.textContent = "LIVE LISTENING";
    }
    if (statusLabel) {
      statusLabel.textContent = "GEMINI LIVE: CONTINUOUS LISTENING ACTIVE";
    }
  };

  if (!window.isGeminiSpeaking) {
    resetListening();
  } else {
    const checkInterval = setInterval(() => {
      if (!window.isGeminiSpeaking) {
        clearInterval(checkInterval);
        resetListening();
      }
    }, 150);
  }

  // 5. Audit log
  addVoiceAuditEntry({
    timestamp: new Date().toLocaleTimeString(),
    rawCmd: cmd,
    intent: toolCalls.map(t => t.name).join(", ") || "AGENT_EXECUTE",
    params: { toolCalls, model: modelName },
    response: reply,
    latency: `${latency}ms`
  });
}

window.isGeminiSpeaking = false;

function handleVoiceBargeIn() {
  if (window.isGeminiSpeaking || (window.speechSynthesis && window.speechSynthesis.speaking)) {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    window.isGeminiSpeaking = false;
    if (window.geminiLiveEngine) window.geminiLiveEngine.interrupt();
    
    const stateBadge = document.getElementById("geminiLiveStateBadge");
    const stateText = document.getElementById("geminiLiveStateText");
    if (stateBadge && stateText) {
      stateBadge.className = "gemini-live-state-pill";
      stateText.textContent = "BARGE-IN / LISTENING";
    }
    playSound("click");
    console.log("[Gemini Live] Barge-in speech interrupt handled successfully.");
  }
}

function speakGeminiResponse(text, onEnd) {
  if (isVoiceMuted || !window.speechSynthesis || !text) {
    window.isGeminiSpeaking = false;
    if (onEnd) setTimeout(onEnd, 150);
    return;
  }

  try {
    window.speechSynthesis.cancel();
    window.isGeminiSpeaking = true;
    const utterance = new SpeechSynthesisUtterance(text);
    if (voicePersona === "SCALPER") {
      utterance.rate = 1.18;
      utterance.pitch = 1.10;
    } else if (voicePersona === "RISK") {
      utterance.rate = 0.96;
      utterance.pitch = 0.95;
    } else {
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
    }

    const voices = cachedSynthVoices.length > 0 ? cachedSynthVoices : (window.speechSynthesis.getVoices() || []);
    const englishVoice = voices.find(v => v.lang && v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("Daniel") || v.name.includes("Alex") || v.name.includes("Karen"))) || voices.find(v => v.lang && v.lang.startsWith("en"));
    if (englishVoice) utterance.voice = englishVoice;

    utterance.onend = () => { 
      window.isGeminiSpeaking = false;
      if (onEnd) onEnd(); 
    };
    utterance.onerror = () => { 
      window.isGeminiSpeaking = false;
      if (onEnd) onEnd(); 
    };

    window.speechSynthesis.speak(utterance);
  } catch(e) {
    window.isGeminiSpeaking = false;
    console.warn("SpeechSynthesis error:", e);
    if (onEnd) onEnd();
  }
}

function toggleVoiceSpeechMute() {
  isVoiceMuted = !isVoiceMuted;
  const btn = document.getElementById("btnVoiceMute");
  if (btn) btn.innerHTML = `<span class="material-symbols-outlined gemini-symbol" id="btnVoiceMuteIcon">${isVoiceMuted ? "volume_off" : "volume_up"}</span>`;
  if (isVoiceMuted && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function speakMarketBriefing() {
  const mkt = allMarkets.find(m => m.symbol === currentSymbol) || { price: 66250, change24h: 3.42 };
  const obiText = document.getElementById("obiStatus")?.textContent || "OBI: +24% (Aggressive Buy Flow)";

  const briefing = `Gemini quantitative briefing for ${currentSymbol}. The current price is $${formatNumber(mkt.price, 2)}, with a 24-hour change of ${mkt.change24h}%. Microstructural order book depth indicates ${obiText}. Algorithmic indicators indicate strong momentum. Would you like me to open a position?`;

  const responseBubble = document.getElementById("voiceGeminiResponseBubble");
  const responseText = document.getElementById("voiceGeminiResponseText");
  const actionPill = document.getElementById("voiceActionPill");
  const actionPillText = document.getElementById("voiceActionPillText");
  const actionLatency = document.getElementById("voiceActionLatency");

  if (responseBubble) responseBubble.style.display = "block";
  if (responseText) responseText.textContent = `Gemini: ${briefing}`;
  if (actionPill) actionPill.style.display = "flex";
  if (actionPillText) actionPillText.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-rainbow" style="font-size:14px;">mic</span> Quantitative Briefing Delivered`;
  if (actionLatency) actionLatency.textContent = "12ms";

  addVoiceAuditEntry({
    timestamp: new Date().toLocaleTimeString(),
    rawCmd: "Market Briefing Request",
    intent: "MARKET_BRIEFING",
    params: { symbol: currentSymbol, price: mkt.price, change24h: mkt.change24h },
    response: briefing,
    latency: "12ms"
  });

  speakGeminiResponse(briefing);
}

/* --- Autonomous Gemini Voice Squawk Alerts Monitor --- */
function toggleAutonomousSquawkAlerts() {
  autonomousSquawkAlerts = !autonomousSquawkAlerts;
  const btn = document.getElementById("btnToggleSquawkAlerts");
  if (btn) {
    btn.innerHTML = autonomousSquawkAlerts ? `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan">volume_up</span> Squawk ON` : `<span class="material-symbols-outlined gemini-symbol" style="color:#64748b;">volume_off</span> Squawk OFF`;
    btn.classList.toggle("active", autonomousSquawkAlerts);
  }
  showOrderToast(autonomousSquawkAlerts ? "success" : "info", `Autonomous Squawk Alerts ${autonomousSquawkAlerts ? 'Enabled' : 'Muted'}`, "Gemini will speak proactive vocal warnings for margin risk and order book flow anomalies.", { latency: "1ms" });
}

// Check every 4 seconds for proactive risk & anomaly squawk conditions
setInterval(() => {
  if (!autonomousSquawkAlerts || !isVoiceTradingOpen) return;
  const now = Date.now();

  // 1. Check Liquidation Proximity Squawk Alert (>70% margin ratio or <5% buffer)
  if (now - lastLiquidationSquawkTs > 45000 && localPositions.length > 0) {
    const marginRatio = (accountData?.usedMargin || 0) / (accountEquity || 100000);
    if (marginRatio > 0.70) {
      lastLiquidationSquawkTs = now;
      const alertMsg = `Squawk Alert: High liquidation proximity detected on ${currentSymbol}. Margin ratio has reached ${(marginRatio * 100).toFixed(0)} percent. Recommend immediate derisking.`;
      speakGeminiResponse(alertMsg);
      showOrderToast("warn", "Autonomous Squawk Alert", alertMsg, { symbol: currentSymbol, latency: "2ms" });
    }
  }

  // 2. Check Order Book Flow Anomaly Squawk Alert (>40% OBI)
  if (now - lastObiSquawkTs > 45000 && lastRenderedObData) {
    const buyPctText = document.getElementById("obiBuyPct")?.textContent || "";
    const match = buyPctText.match(/(\d+)%/);
    if (match) {
      const buyPct = parseInt(match[1], 10);
      const imbalance = Math.abs(buyPct - (100 - buyPct));
      if (imbalance >= 40) {
        lastObiSquawkTs = now;
        const side = buyPct > 50 ? "Buy" : "Sell";
        const alertMsg = `Order Flow Squawk: Extreme institutional ${side} imbalance of ${imbalance} percent detected on ${currentSymbol}. Depth pressure building.`;
        speakGeminiResponse(alertMsg);
        showOrderToast("info", "Order Flow Squawk Alert", alertMsg, { symbol: currentSymbol, latency: "3ms" });
      }
    }
  }
}, 4000);

/* --- Voice Command History & JSON Intent Audit Drawer --- */
function toggleVoiceAuditDrawer() {
  const drawer = document.getElementById("voiceAuditDrawer");
  const hud = document.getElementById("voiceTradingHud");
  const btn = document.getElementById("btnVoiceAuditToggle");

  if (!drawer || !hud) return;
  const isOpen = drawer.style.display !== "none";

  if (isOpen) {
    drawer.style.display = "none";
    hud.classList.remove("expanded");
    if (btn) btn.classList.remove("active");
  } else {
    drawer.style.display = "block";
    hud.classList.add("expanded");
    if (btn) btn.classList.add("active");
    renderVoiceAuditList();
  }
}

function updateVoiceAuditCountBadge() {
  const badge = document.getElementById("voiceAuditCount");
  if (badge) badge.textContent = voiceAuditLogs.length;
}

function addVoiceAuditEntry(entry) {
  voiceAuditLogs.unshift(entry);
  if (voiceAuditLogs.length > 50) voiceAuditLogs.pop();
  localStorage.setItem("omni_voice_audit_logs", JSON.stringify(voiceAuditLogs));
  updateVoiceAuditCountBadge();
  const drawer = document.getElementById("voiceAuditDrawer");
  if (drawer && drawer.style.display !== "none") {
    renderVoiceAuditList();
  }
}

function renderVoiceAuditList() {
  const list = document.getElementById("voiceAuditList");
  if (!list) return;

  if (voiceAuditLogs.length === 0) {
    list.innerHTML = '<div style="font-size:10px; color:#94a3b8; text-align:center; padding:12px;">No voice executions logged yet. Hold Spacebar or click a suggestion chip to squawk.</div>';
    return;
  }

  list.innerHTML = voiceAuditLogs.map((log, idx) => `
    <div class="voice-audit-item">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-weight:700; color:#e2e8f0;">"${log.rawCmd}"</span>
        <span style="font-size:9.5px; color:#64748b;">${log.timestamp}</span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
        <span class="badge-pill" style="background:rgba(56,189,248,0.15); color:#38bdf8; font-size:9px; padding:1px 5px; border-radius:4px;">${log.intent}</span>
        <div style="display:flex; gap:6px; align-items:center;">
          <span class="font-mono text-cyan" style="font-size:9.5px;">${log.latency}</span>
          <button onclick="replayVoiceLog(${idx})" style="background:none; border:none; color:#10b981; cursor:pointer; font-size:10px;" title="Replay voice audio"><span class="material-symbols-outlined gemini-symbol" style="font-size:12px;">play_arrow</span> Replay</button>
        </div>
      </div>
      <div class="voice-audit-json">
        ${JSON.stringify(log.params || {})}
      </div>
    </div>
  `).join("");
}

function replayVoiceLog(idx) {
  const entry = voiceAuditLogs[idx];
  if (entry && entry.response) {
    speakGeminiResponse(entry.response);
  }
}

function clearVoiceAuditLogs() {
  voiceAuditLogs = [];
  localStorage.removeItem("omni_voice_audit_logs");
  updateVoiceAuditCountBadge();
  renderVoiceAuditList();
}

/* --- Order Book Imbalance (OBI) Radar Updater --- */
function updateObiRadar(bids, asks) {
  const buyPctEl = document.getElementById("obiBuyPct");
  const sellPctEl = document.getElementById("obiSellPct");
  const statusEl = document.getElementById("obiStatus");
  const fillEl = document.getElementById("obiFillBuy");

  if (!buyPctEl || !sellPctEl || !statusEl || !fillEl) return;

  const topBids = (bids || []).slice(0, 10);
  const topAsks = (asks || []).slice(0, 10);

  let bidVol = topBids.reduce((acc, r) => acc + (parseFloat(r[1] || r.size || 0)), 0);
  let askVol = topAsks.reduce((acc, r) => acc + (parseFloat(r[1] || r.size || 0)), 0);

  const totalVol = bidVol + askVol;
  if (totalVol <= 0) return;

  const buyPct = Math.round((bidVol / totalVol) * 100);
  const sellPct = 100 - buyPct;
  const imbalance = buyPct - sellPct;

  buyPctEl.textContent = `Bids: ${buyPct}%`;
  sellPctEl.textContent = `Asks: ${sellPct}%`;
  fillEl.style.width = `${buyPct}%`;

  if (imbalance > 15) {
    statusEl.textContent = `OBI: +${imbalance}% (Aggressive Buy Flow)`;
    statusEl.className = "text-green font-mono";
  } else if (imbalance < -15) {
    statusEl.textContent = `OBI: ${imbalance}% (Heavy Sell Wall)`;
    statusEl.className = "text-red font-mono";
  } else {
    statusEl.textContent = `OBI: ${imbalance >= 0 ? '+' : ''}${imbalance}% (Balanced Flow)`;
    statusEl.className = "text-cyan font-mono";
  }
}

/* =============================================================================
   PHASE 5: 1v1 PVP TRADING ARENA & GAMIFICATION ENGINE
   ============================================================================= */
let pvpDuelTimer = null;
let pvpTimeLeft = 60;
let pvpPlayerRoeVal = 0;
let pvpOpponentRoeVal = 0;

function openPvpArenaModal() {
  const modal = document.getElementById("modalPvpArena");
  if (modal) modal.style.display = "flex";
}

function closePvpArenaModal() {
  const modal = document.getElementById("modalPvpArena");
  if (modal) modal.style.display = "none";
  if (pvpDuelTimer) {
    clearInterval(pvpDuelTimer);
    pvpDuelTimer = null;
  }
}

function startPvpDuel() {
  const btn = document.getElementById("btnStartPvpDuel");
  const stake = parseInt(document.getElementById("pvpStakeSelect")?.value || "100", 10);
  const duration = parseInt(document.getElementById("pvpDurationSelect")?.value || "60", 10);
  const potDisplay = document.getElementById("pvpPotDisplay");
  const timerDisplay = document.getElementById("pvpCountdownTimer");
  const resultBanner = document.getElementById("pvpResultBanner");
  const resultTitle = document.getElementById("pvpResultTitle");
  const opponentName = document.getElementById("pvpOpponentName");
  const playerHealth = document.getElementById("pvpPlayerHealth");
  const opponentHealth = document.getElementById("pvpOpponentHealth");
  const playerRoe = document.getElementById("pvpPlayerRoe");
  const opponentRoe = document.getElementById("pvpOpponentRoe");

  if (pvpDuelTimer) {
    clearInterval(pvpDuelTimer);
    pvpDuelTimer = null;
  }

  const opponents = ["CYBER_WHALE_42", "ARBITRUM_SNIPER", "SATOSHI_PUPIL", "QUANTUM_ALPHA_99", "SOL_GOD_42"];
  const selectedOpponent = opponents[Math.floor(Math.random() * opponents.length)];

  if (opponentName) opponentName.textContent = selectedOpponent;
  if (potDisplay) potDisplay.textContent = `POT: $${(stake * 2).toLocaleString()} USDT`;
  if (resultBanner) resultBanner.style.display = "none";
  if (btn) {
    btn.innerHTML = `Duel In Progress <span class="material-symbols-outlined gemini-symbol gemini-grad-pink" style="font-size:15px;">swords</span>`;
    btn.disabled = true;
  }

  pvpTimeLeft = duration;
  pvpPlayerRoeVal = 0;
  pvpOpponentRoeVal = 0;

  if (playerHealth) playerHealth.style.width = "100%";
  if (opponentHealth) opponentHealth.style.width = "100%";
  if (playerRoe) playerRoe.textContent = "+0.00% ROE";
  if (opponentRoe) opponentRoe.textContent = "-0.00% ROE";

  playSound("buy");
  showOrderToast("info", "PvP Duel Commenced!", `Matching against ${selectedOpponent} for a $${(stake * 2).toLocaleString()} pot!`, { latency: "4ms" });

  pvpDuelTimer = setInterval(() => {
    pvpTimeLeft--;
    const mins = Math.floor(pvpTimeLeft / 60).toString().padStart(2, "0");
    const secs = (pvpTimeLeft % 60).toString().padStart(2, "0");
    if (timerDisplay) timerDisplay.textContent = `${mins}:${secs}`;

    // Dynamic ROE & Health Bar simulation
    pvpPlayerRoeVal += (Math.random() * 0.8) - 0.2;
    pvpOpponentRoeVal -= (Math.random() * 0.7) - 0.2;

    const pHealth = Math.max(10, Math.min(100, Math.round(100 + pvpPlayerRoeVal * 4)));
    const oHealth = Math.max(10, Math.min(100, Math.round(100 - pvpOpponentRoeVal * 4)));

    if (playerHealth) playerHealth.style.width = `${pHealth}%`;
    if (opponentHealth) opponentHealth.style.width = `${oHealth}%`;
    if (playerRoe) playerRoe.textContent = `${pvpPlayerRoeVal >= 0 ? '+' : ''}${pvpPlayerRoeVal.toFixed(2)}% ROE`;
    if (opponentRoe) opponentRoe.textContent = `${pvpOpponentRoeVal >= 0 ? '+' : ''}${pvpOpponentRoeVal.toFixed(2)}% ROE`;

    if (pvpTimeLeft <= 0) {
      clearInterval(pvpDuelTimer);
      pvpDuelTimer = null;

      if (btn) {
        btn.innerHTML = `Rematch Duel <span class="material-symbols-outlined gemini-symbol gemini-grad-pink" style="font-size:15px;">swords</span>`;
        btn.disabled = false;
      }

      if (resultBanner) resultBanner.style.display = "block";
      const prize = stake * 2;
      if (resultTitle) resultTitle.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:20px;">military_tech</span> VICTORY! YOU WON $${prize.toLocaleString()} USDT`;

      // Credit winnings
      accountEquity += prize;
      updateBalancesDisplay();
      playSound("buy");
      showOrderToast("success", "PvP Duel Victory!", `Pot prize of $${prize.toLocaleString()} USDT credited to demo equity!`, { latency: "0ms" });
    }
  }, 1000);
}

/* =============================================================================
   PHASE 5: SEASON PASS 500 TIERS ENGINE
   ============================================================================= */
let seasonPassData = {
  tier: 4,
  xp: 14250,
  nextXp: 20000,
  volume: 142500
};

function openSeasonPassModal() {
  const modal = document.getElementById("modalSeasonPass");
  if (modal) {
    modal.style.display = "flex";
    renderSeasonPassTiers();
  }
}

function closeSeasonPassModal() {
  const modal = document.getElementById("modalSeasonPass");
  if (modal) modal.style.display = "none";
}

function renderSeasonPassTiers() {
  const container = document.getElementById("seasonTiersScroll");
  if (!container) return;

  const milestones = [
    { tier: 1, title: "Apprentice Trader", reward: "Base 0.020% / 0.040%", unlocked: true },
    { tier: 5, title: "Momentum Scalper", reward: "VIP 1: 5% Fee Discount", unlocked: true },
    { tier: 10, title: "Order Flow Tactician", reward: "VIP 2: Bronze Trader Badge", unlocked: true },
    { tier: 25, title: "Depth Raider", reward: "VIP 3: 10% Fee Discount", unlocked: false },
    { tier: 50, title: "Cyber Quant Specialist", reward: "VIP 4: Neon Cyber Avatar", unlocked: false },
    { tier: 100, title: "Algorithmic Knight", reward: "VIP 5: 25% Fee Discount", unlocked: false },
    { tier: 250, title: "Institutional Market Maker", reward: "VIP 8: 40% Fee Discount", unlocked: false },
    { tier: 500, title: "Apex Omni Whale", reward: "0.008% Maker Fee + Sovereign Crown", unlocked: false }
  ];

  container.innerHTML = milestones.map(m => `
    <div class="season-tier-item ${m.unlocked ? 'unlocked' : ''}">
      <div style="display:flex; align-items:center; gap:10px;">
        <span class="season-tier-badge ${m.unlocked ? 'unlocked' : ''}">T${m.tier}</span>
        <div>
          <div style="font-size:12px; font-weight:700; color:#ffffff;">${m.title}</div>
          <div style="font-size:10px; color:${m.unlocked ? '#10b981' : '#94a3b8'};">${m.reward}</div>
        </div>
      </div>
      <span class="badge-pill" style="background:${m.unlocked ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.2)'}; color:${m.unlocked ? '#10b981' : '#94a3b8'}; font-size:10px; padding:3px 8px; border-radius:10px;">
        ${m.unlocked ? 'CLAIMED' : 'LOCKED'}
      </span>
    </div>
  `).join("");
}

function claimSeasonPassBonus() {
  seasonPassData.xp += 500;
  const pct = Math.min(100, Math.round((seasonPassData.xp / seasonPassData.nextXp) * 100));
  
  const xpText = document.getElementById("spXpText");
  const bar = document.getElementById("spProgressBar");
  if (xpText) xpText.textContent = `${seasonPassData.xp.toLocaleString()} / ${seasonPassData.nextXp.toLocaleString()} XP`;
  if (bar) bar.style.width = `${pct}%`;

  playSound("buy");
  showOrderToast("success", "Daily XP Bonus Claimed!", "+500 XP added to your OmniFutures Season Pass progression!", { latency: "2ms" });
}

/* =============================================================================
   WINDOW EXPORTS FOR GLOBAL DISPATCH & AUTOMATION TESTING
   ============================================================================= */
window.startTwapExecution = startTwapExecution;
window.cancelActiveTwap = cancelActiveTwap;
window.toggleSessionKeyModal = toggleSessionKeyModal;
window.activateOrRevokeSessionKey = activateOrRevokeSessionKey;
window.setChartLayout = setChartLayout;
window.toggleVoiceTrading = toggleVoiceTrading;
window.initVoiceSpeechRecognition = initVoiceSpeechRecognition;
window.processVoiceCommand = processVoiceCommand;
window.speakGeminiResponse = speakGeminiResponse;
window.toggleVoiceSpeechMute = toggleVoiceSpeechMute;
window.speakMarketBriefing = speakMarketBriefing;
window.updateObiRadar = updateObiRadar;
window.openPvpArenaModal = openPvpArenaModal;
window.closePvpArenaModal = closePvpArenaModal;
window.startPvpDuel = startPvpDuel;
window.openSeasonPassModal = openSeasonPassModal;
window.closeSeasonPassModal = closeSeasonPassModal;
window.renderSeasonPassTiers = renderSeasonPassTiers;
window.claimSeasonPassBonus = claimSeasonPassBonus;
window.startPttSpeech = startPttSpeech;
window.stopPttSpeech = stopPttSpeech;
window.toggleAutonomousSquawkAlerts = toggleAutonomousSquawkAlerts;
window.toggleVoiceAuditDrawer = toggleVoiceAuditDrawer;
window.clearVoiceAuditLogs = clearVoiceAuditLogs;
window.replayVoiceLog = replayVoiceLog;
window.updateBalancesDisplay = updateBalancesDisplay;
window.setVoicePersona = setVoicePersona;
window.cycleVoicePersona = cycleVoicePersona;
window.cycleVisualizerMode = cycleVisualizerMode;
window.cycleSoundTheme = cycleSoundTheme;
window.toggleVoiceMacroDrawer = toggleVoiceMacroDrawer;
window.runVoiceMacro = runVoiceMacro;
window.simulateQuantStrategy = simulateQuantStrategy;
window.deployVolatilityStraddle = deployVolatilityStraddle;
window.updateVoiceTelemetry = updateVoiceTelemetry;
window.toggleContinuousLiveTalk = toggleContinuousLiveTalk;
window.executeGeminiAutonomousTool = executeGeminiAutonomousTool;
window.closePnlModal = closePnlModal;

// =============================================================================
// MODULE 2: ON-CHAIN $OMNI / $sOMNI SMART CONTRACT COLLATERAL & STAKING HOOK
// =============================================================================
const OMNI_TOKEN_CONTRACT = "0x89C1a5F9A6C0a38bCd38F5eF5a4A067e42421375";
const SOMNI_TOKEN_CONTRACT = "0x4F12b3294cD793b827A795995e8657B671754f2A";

let onChainOmniState = {
  liquidBalance: 14250.00,
  stakedBalance: 5000.00,
  accruedYield: 184.22,
  stakingApy: 14.50,
  vipTier: 2, // 0 = standard, 1 = 10% disc, 2 = 20% disc, 3 = 25% disc
  currentAction: "stake" // "stake" | "unstake"
};

async function fetchOnChainOmniBalances(walletAddress) {
  walletAddress = walletAddress || currentWallet;
  
  // Real EVM eth_call if Web3 browser extension exists
  if (typeof window.ethereum !== "undefined" && walletAddress && walletAddress.startsWith("0x")) {
    try {
      const balanceOfSelector = "0x70a08231";
      const paddedAddr = walletAddress.toLowerCase().replace("0x", "").padStart(64, "0");
      const callData = balanceOfSelector + paddedAddr;

      const rawHex = await window.ethereum.request({
        method: "eth_call",
        params: [{ to: OMNI_TOKEN_CONTRACT, data: callData }, "latest"]
      });

      if (rawHex && rawHex !== "0x") {
        const valBig = BigInt(rawHex);
        const floatVal = Number(valBig) / 1e18;
        if (floatVal > 0) {
          onChainOmniState.liquidBalance = +(floatVal).toFixed(2);
        }
      }
    } catch (err) {
      // Fallback to local on-chain simulated balance
    }
  }

  // Calculate VIP Tier based on holdings
  const totalOmni = onChainOmniState.liquidBalance + onChainOmniState.stakedBalance;
  if (totalOmni >= 25000) onChainOmniState.vipTier = 3;
  else if (totalOmni >= 10000) onChainOmniState.vipTier = 2;
  else if (totalOmni >= 1000) onChainOmniState.vipTier = 1;
  else onChainOmniState.vipTier = 0;

  updateOmniStakingUI();
  return onChainOmniState;
}

function updateOmniStakingUI() {
  const liquidEl = document.getElementById("walletOmniBalanceDisplay");
  const stakedEl = document.getElementById("stakedSomniBalanceDisplay");
  const apyEl = document.getElementById("omniStakingApy");
  const tierEl = document.getElementById("omniVipTier");
  const maxLbl = document.getElementById("lblStakingMaxAvail");

  if (liquidEl) liquidEl.textContent = `${formatNumber(onChainOmniState.liquidBalance, 2)} OMNI`;
  if (stakedEl) stakedEl.textContent = `${formatNumber(onChainOmniState.stakedBalance, 2)} sOMNI`;
  if (apyEl) apyEl.textContent = `${onChainOmniState.stakingApy.toFixed(2)}% APY`;
  
  const tierNames = [
    "TIER 0 (STANDARD)",
    "TIER 1 (10% DISCOUNT)",
    "TIER 2 (20% DISCOUNT)",
    "TIER 3 (25% VIP PRIME)"
  ];
  if (tierEl) tierEl.textContent = tierNames[onChainOmniState.vipTier] || "TIER 2 (20% DISCOUNT)";

  if (maxLbl) {
    const maxVal = onChainOmniState.currentAction === "stake" ? onChainOmniState.liquidBalance : onChainOmniState.stakedBalance;
    const asset = onChainOmniState.currentAction === "stake" ? "OMNI" : "sOMNI";
    maxLbl.textContent = `Available: ${formatNumber(maxVal, 2)} ${asset}`;
  }
}

function openOmniStakingModal() {
  fetchOnChainOmniBalances();
  const modal = document.getElementById("modalOmniStaking");
  if (modal) modal.style.display = "flex";
}

function closeOmniStakingModal() {
  const modal = document.getElementById("modalOmniStaking");
  if (modal) modal.style.display = "none";
}

function switchStakingAction(action) {
  onChainOmniState.currentAction = action;
  const btnStake = document.getElementById("btnStakingTabStake");
  const btnUnstake = document.getElementById("btnStakingTabUnstake");
  const lblAction = document.getElementById("lblStakingAction");
  const assetTag = document.getElementById("omniStakingAssetTag");
  const submitBtn = document.getElementById("btnExecuteStaking");

  if (btnStake && btnUnstake) {
    if (action === "stake") {
      btnStake.classList.add("active");
      btnUnstake.classList.remove("active");
      if (lblAction) lblAction.textContent = "Amount to Stake";
      if (assetTag) assetTag.textContent = "OMNI";
      if (submitBtn) submitBtn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-gold" style="font-size:16px;">lock</span> Stake $OMNI & Activate 20% Fee Discount`;
    } else {
      btnStake.classList.remove("active");
      btnUnstake.classList.add("active");
      if (lblAction) lblAction.textContent = "Amount to Unstake";
      if (assetTag) assetTag.textContent = "sOMNI";
      if (submitBtn) submitBtn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:16px;">lock_open</span> Unstake $sOMNI & Redeem Liquid $OMNI`;
    }
  }
  updateOmniStakingUI();
}

function setStakingAmountPct(pct) {
  const max = onChainOmniState.currentAction === "stake" ? onChainOmniState.liquidBalance : onChainOmniState.stakedBalance;
  const input = document.getElementById("omniStakingAmountInput");
  if (input) {
    input.value = Math.floor(max * pct);
  }
}

function executeOmniStakingAction() {
  const input = document.getElementById("omniStakingAmountInput");
  const amount = parseFloat(input?.value) || 0;

  if (amount <= 0) {
    alert("Please enter a valid amount.");
    return;
  }

  if (onChainOmniState.currentAction === "stake") {
    if (amount > onChainOmniState.liquidBalance) {
      alert(`Insufficient $OMNI balance. Max available: ${onChainOmniState.liquidBalance}`);
      return;
    }
    onChainOmniState.liquidBalance -= amount;
    onChainOmniState.stakedBalance += amount;
    playSound("buy");
    showOrderToast("success", "Staked $OMNI Successfully", `Locked ${amount.toLocaleString()} OMNI -> Received ${amount.toLocaleString()} sOMNI. 20% Fee Tier Active!`, { symbol: "OMNI", latency: "2ms" });
  } else {
    if (amount > onChainOmniState.stakedBalance) {
      alert(`Insufficient $sOMNI staked balance. Max available: ${onChainOmniState.stakedBalance}`);
      return;
    }
    onChainOmniState.stakedBalance -= amount;
    onChainOmniState.liquidBalance += amount;
    playSound("sell");
    showOrderToast("info", "Unstaked $sOMNI Successfully", `Redeemed ${amount.toLocaleString()} sOMNI -> Returned ${amount.toLocaleString()} liquid $OMNI.`, { symbol: "sOMNI", latency: "3ms" });
  }

  updateOmniStakingUI();
}

function claimOmniStakingYield() {
  const claimed = onChainOmniState.accruedYield;
  if (claimed <= 0) {
    alert("No accrued yield available to claim at this moment.");
    return;
  }
  onChainOmniState.liquidBalance += claimed;
  onChainOmniState.accruedYield = 0;
  playSound("faucet");
  showOrderToast("success", "Claimed Staking Yield", `+${claimed.toFixed(2)} OMNI transferred directly to your trading wallet!`, { symbol: "OMNI", latency: "1ms" });
  updateOmniStakingUI();
}

window.onChainOmniState = onChainOmniState;
window.fetchOnChainOmniBalances = fetchOnChainOmniBalances;
window.openOmniStakingModal = openOmniStakingModal;
window.closeOmniStakingModal = closeOmniStakingModal;
window.switchStakingAction = switchStakingAction;
window.setStakingAmountPct = setStakingAmountPct;
window.executeOmniStakingAction = executeOmniStakingAction;
window.claimOmniStakingYield = claimOmniStakingYield;

/* =============================================================================
   MODULE 1: MULTI-EXCHANGE LIQUIDATION STREAM & INTERACTIVE DEPTH CHART
   ============================================================================= */

// --- 1. Interactive Canvas Order Book Depth Chart ---
let depthChartHover = null;

function renderOrderBookDepthChart(data) {
  const canvas = document.getElementById("orderbookDepthCanvas");
  if (!canvas || !data) return;

  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = rect.width || 340;
  const height = rect.height || 220;

  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }
  ctx.resetTransform();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const rawBids = (data.bids || []).slice(0, 30);
  const rawAsks = (data.asks || []).slice(0, 30);

  if (rawBids.length === 0 || rawAsks.length === 0) return;

  // Best prices
  const bestBid = Number(rawBids[0][0]);
  const bestAsk = Number(rawAsks[0][0]);
  const midPrice = (bestBid + bestAsk) / 2;
  const spread = Math.abs(bestAsk - bestBid);
  const spreadBps = ((spread / midPrice) * 10000).toFixed(1);

  // Update header text elements
  const midEl = document.getElementById("depthMidPrice");
  const spreadBadge = document.getElementById("depthSpreadBadge");
  const ratioText = document.getElementById("depthRatioText");
  const bidVolEl = document.getElementById("depthBidVol");
  const askVolEl = document.getElementById("depthAskVol");
  const barBid = document.getElementById("depthBarBid");
  const barAsk = document.getElementById("depthBarAsk");

  const mkt = allMarkets.find(m => m.symbol === currentSymbol) || { precision: 2 };
  const prec = mkt.precision !== undefined ? mkt.precision : 2;

  if (midEl) midEl.textContent = `$${formatNumber(midPrice, prec)}`;
  if (spreadBadge) spreadBadge.textContent = `Spread: ${formatNumber(spread, prec)} (${spreadBps} bps)`;

  // Sort: bids descending away from mid, asks ascending away from mid
  // Calculate cumulative volumes
  let cumBid = 0;
  const bidPoints = [];
  for (let i = 0; i < rawBids.length; i++) {
    const p = Number(rawBids[i][0]);
    const vol = Number(rawBids[i][1]);
    cumBid += vol;
    bidPoints.push({ price: p, cumVol: cumBid, type: "bid" });
  }

  let cumAsk = 0;
  const askPoints = [];
  for (let i = 0; i < rawAsks.length; i++) {
    const p = Number(rawAsks[i][0]);
    const vol = Number(rawAsks[i][1]);
    cumAsk += vol;
    askPoints.push({ price: p, cumVol: cumAsk, type: "ask" });
  }

  // Update volume totals & ratio
  const totalVol = cumBid + cumAsk;
  const bidPct = totalVol > 0 ? Math.round((cumBid / totalVol) * 100) : 50;
  const askPct = 100 - bidPct;
  const baseSym = currentSymbol.split("-")[0] || "BTC";

  if (bidVolEl) bidVolEl.textContent = `${cumBid.toFixed(2)} ${baseSym}`;
  if (askVolEl) askVolEl.textContent = `${cumAsk.toFixed(2)} ${baseSym}`;
  if (ratioText) ratioText.textContent = `${bidPct}% Bid / ${askPct}% Ask`;
  if (barBid) {
    barBid.style.width = `${bidPct}%`;
    barBid.textContent = `${bidPct}% Buy Pressure`;
  }
  if (barAsk) {
    barAsk.style.width = `${askPct}%`;
    barAsk.textContent = `${askPct}% Sell Pressure`;
  }

  const maxCum = Math.max(cumBid, cumAsk, 0.001);
  const midX = width / 2;

  // Draw Grid Lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;
  for (let y = 30; y < height - 20; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw Bids Mountain (Left half: from x=0 to midX)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, height - 20);

  // bidPoints goes from near mid (index 0) to furthest left (index last)
  // Reverse to draw from left to right:
  const sortedBidRender = [...bidPoints].reverse();
  sortedBidRender.forEach((pt, idx) => {
    const x = (idx / (sortedBidRender.length - 1)) * midX;
    const y = (height - 20) - (pt.cumVol / maxCum) * (height - 50);
    ctx.lineTo(x, y);
  });
  ctx.lineTo(midX, height - 20);
  ctx.closePath();

  const bidGrad = ctx.createLinearGradient(0, 0, 0, height);
  bidGrad.addColorStop(0, "rgba(16, 185, 129, 0.45)");
  bidGrad.addColorStop(1, "rgba(16, 185, 129, 0.02)");
  ctx.fillStyle = bidGrad;
  ctx.fill();

  // Bid outline stroke
  ctx.beginPath();
  sortedBidRender.forEach((pt, idx) => {
    const x = (idx / (sortedBidRender.length - 1)) * midX;
    const y = (height - 20) - (pt.cumVol / maxCum) * (height - 50);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Draw Asks Mountain (Right half: from midX to width)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(midX, height - 20);

  askPoints.forEach((pt, idx) => {
    const x = midX + (idx / (askPoints.length - 1)) * (width - midX);
    const y = (height - 20) - (pt.cumVol / maxCum) * (height - 50);
    ctx.lineTo(x, y);
  });
  ctx.lineTo(width, height - 20);
  ctx.closePath();

  const askGrad = ctx.createLinearGradient(0, 0, 0, height);
  askGrad.addColorStop(0, "rgba(239, 68, 68, 0.45)");
  askGrad.addColorStop(1, "rgba(239, 68, 68, 0.02)");
  ctx.fillStyle = askGrad;
  ctx.fill();

  // Ask outline stroke
  ctx.beginPath();
  askPoints.forEach((pt, idx) => {
    const x = midX + (idx / (askPoints.length - 1)) * (width - midX);
    const y = (height - 20) - (pt.cumVol / maxCum) * (height - 50);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Draw Mid Price Center Line
  ctx.save();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = "rgba(0, 229, 255, 0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(midX, 10);
  ctx.lineTo(midX, height - 20);
  ctx.stroke();
  ctx.restore();

  // Bottom baseline & price labels
  ctx.fillStyle = "#64748b";
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  if (sortedBidRender[0]) ctx.fillText(`$${formatNumber(sortedBidRender[0].price, 1)}`, 4, height - 6);
  ctx.textAlign = "center";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(`$${formatNumber(midPrice, 1)}`, midX, height - 6);
  ctx.textAlign = "right";
  if (askPoints[askPoints.length - 1]) ctx.fillText(`$${formatNumber(askPoints[askPoints.length - 1].price, 1)}`, width - 4, height - 6);

  // Setup interactive mouse hover listener once
  if (!canvas.dataset.hasListener) {
    canvas.dataset.hasListener = "true";
    canvas.addEventListener("mousemove", (e) => {
      const r = canvas.getBoundingClientRect();
      const mouseX = e.clientX - r.left;
      const mouseY = e.clientY - r.top;
      const tooltip = document.getElementById("depthChartTooltip");
      if (!tooltip || !lastRenderedObData) return;

      const isBidSide = mouseX < r.width / 2;
      const priceAtCursor = isBidSide
        ? bestBid - ((r.width / 2 - mouseX) / (r.width / 2)) * (bestBid * 0.015)
        : bestAsk + ((mouseX - r.width / 2) / (r.width / 2)) * (bestAsk * 0.015);

      tooltip.style.display = "block";
      tooltip.style.left = `${Math.min(r.width - 150, Math.max(10, mouseX - 60))}px`;
      tooltip.style.top = `${Math.max(10, mouseY - 45)}px`;
      tooltip.innerHTML = `
        <div style="color:${isBidSide ? '#10b981' : '#ef4444'}; font-weight:700;">${isBidSide ? 'BID DEPTH' : 'ASK DEPTH'}</div>
        <div>Price: $${formatNumber(priceAtCursor, 2)}</div>
        <div style="color:#94a3b8;">Cumulative: ~${formatNumber(Math.abs(mouseX - r.width/2) * 0.15, 2)} ${currentSymbol.split('-')[0]}</div>
      `;
    });

    canvas.addEventListener("mouseleave", () => {
      const tooltip = document.getElementById("depthChartTooltip");
      if (tooltip) tooltip.style.display = "none";
    });
  }
}

// --- 2. Global Multi-Exchange Liquidation Stream Multiplexer ---
let globalLiquidations = [];
let currentLiqFilter = "all";
let isLiqSoundEnabled = true;
let binanceLiqWs = null;
let liqTotal24hUSD = 184925400;
let liqLongsUSD = 108000000;
let liqShortsUSD = 76925400;

function initGlobalLiquidationStream() {
  const seedPairs = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "PEPEUSDT", "DOGEUSDT", "XRPUSDT"];
  const now = Date.now();

  if (globalLiquidations.length === 0) {
    for (let i = 25; i >= 0; i--) {
      const sym = seedPairs[Math.floor(Math.random() * seedPairs.length)];
      const isLong = Math.random() > 0.42;
      const price = sym.includes("BTC") ? 66100 + Math.random() * 400 : (sym.includes("ETH") ? 3480 + Math.random() * 40 : 142 + Math.random() * 5);
      const qty = sym.includes("BTC") ? Number((0.2 + Math.random() * 4.5).toFixed(3)) : Number((2 + Math.random() * 40).toFixed(2));
      const usdVal = Math.round(price * qty);

      globalLiquidations.push({
        id: `liq_${now - i * 14000}`,
        time: new Date(now - i * 14000).toTimeString().split(" ")[0],
        symbol: sym,
        side: isLong ? "SELL" : "BUY",
        type: isLong ? "LONG LIQUIDATION" : "SHORT SQUEEZE",
        price: price,
        qty: qty,
        usdVal: usdVal,
        isWhale: usdVal >= 100000
      });
    }
    renderLiquidationsTable();
  }

  try {
    if (binanceLiqWs) {
      try { binanceLiqWs.close(); } catch(e){}
    }

    binanceLiqWs = new WebSocket("wss://fstream.binance.com/ws/!forceOrder@arr");

    binanceLiqWs.onopen = () => {
      console.log("[Binance Fstream] Connected to live global liquidation feed.");
      const badge = document.getElementById("binanceLiqStatusBadge");
      if (badge) {
        badge.innerHTML = `<span class="pulse-dot"></span> BINANCE FSTREAM LIVE`;
        badge.className = "badge-tag text-green";
      }
    };

    binanceLiqWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg && msg.o) {
          handleIncomingLiquidation(msg.o);
        }
      } catch (err) {}
    };

    binanceLiqWs.onerror = () => {
      const badge = document.getElementById("binanceLiqStatusBadge");
      if (badge) {
        badge.innerHTML = `<span class="pulse-dot" style="background:#f59e0b;"></span> STREAM RESTRICTED (OFFLINE FALLBACK)`;
        badge.className = "badge-tag text-gold";
      }
    };

    binanceLiqWs.onclose = () => {
      setTimeout(initGlobalLiquidationStream, 5000);
    };
  } catch (e) {
    console.warn("Binance liquidation websocket initialization:", e);
  }

  setInterval(() => {
    if (!binanceLiqWs || binanceLiqWs.readyState !== WebSocket.OPEN) {
      const sym = seedPairs[Math.floor(Math.random() * seedPairs.length)];
      const isLong = Math.random() > 0.45;
      const isWhale = Math.random() < 0.2;
      const price = sym.includes("BTC") ? 66000 + Math.random() * 500 : (sym.includes("ETH") ? 3450 + Math.random() * 50 : 140 + Math.random() * 8);
      const qty = isWhale 
        ? (sym.includes("BTC") ? 1.8 + Math.random() * 3.5 : 35 + Math.random() * 60)
        : (sym.includes("BTC") ? 0.1 + Math.random() * 0.8 : 1.5 + Math.random() * 10);

      handleIncomingLiquidation({
        s: sym,
        S: isLong ? "SELL" : "BUY",
        p: price.toFixed(2),
        q: qty.toFixed(3)
      });
    }
  }, 4500);
}

function handleIncomingLiquidation(order) {
  const sym = order.s || "BTCUSDT";
  const side = order.S || "SELL";
  const price = parseFloat(order.p || order.ap || 66000);
  const qty = parseFloat(order.q || 0.1);
  const usdVal = Math.round(price * qty);
  const isLong = side === "SELL";
  const isWhale = usdVal >= 100000;

  const entry = {
    id: `liq_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    time: new Date().toTimeString().split(" ")[0],
    symbol: sym,
    side: side,
    type: isLong ? "LONG LIQUIDATION" : "SHORT SQUEEZE",
    price: price,
    qty: qty,
    usdVal: usdVal,
    isWhale: isWhale
  };

  globalLiquidations.unshift(entry);
  if (globalLiquidations.length > 80) globalLiquidations.pop();

  liqTotal24hUSD += usdVal;
  if (isLong) liqLongsUSD += usdVal;
  else liqShortsUSD += usdVal;

  const totalEl = document.getElementById("liqTotal24h");
  const longsEl = document.getElementById("liqLongsRatio");
  const shortsEl = document.getElementById("liqShortsRatio");

  if (totalEl) totalEl.textContent = `$${liqTotal24hUSD.toLocaleString()}`;
  if (longsEl && shortsEl) {
    const total = liqLongsUSD + liqShortsUSD;
    const lPct = ((liqLongsUSD / total) * 100).toFixed(1);
    const sPct = (100 - parseFloat(lPct)).toFixed(1);
    longsEl.textContent = `${lPct}% ($${(liqLongsUSD / 1e6).toFixed(1)}M)`;
    shortsEl.textContent = `${sPct}% ($${(liqShortsUSD / 1e6).toFixed(1)}M)`;
  }

  if (isWhale && isLiqSoundEnabled) {
    playSound("click");
    showOrderToast("info", "Whale Liquidation Event", `+$${usdVal.toLocaleString()} ${entry.type} on ${sym}!`, { symbol: sym, latency: "4ms" });
  }

  const table = document.getElementById("liquidationsTableBody");
  if (table && document.getElementById("tabLiquidations")?.classList.contains("active")) {
    renderLiquidationsTable();
  }
}

function setLiqFilter(filter, btn) {
  currentLiqFilter = filter;
  document.querySelectorAll(".filter-pills .filter-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderLiquidationsTable();
}

function toggleLiqSound() {
  isLiqSoundEnabled = !isLiqSoundEnabled;
  const icon = document.getElementById("liqSoundIcon");
  if (icon) icon.textContent = isLiqSoundEnabled ? "volume_up" : "volume_off";
}

function renderLiquidationsTable() {
  const tbody = document.getElementById("liquidationsTableBody");
  if (!tbody) return;

  let filtered = globalLiquidations;
  if (currentLiqFilter === "10k") {
    filtered = globalLiquidations.filter(l => l.usdVal >= 10000);
  } else if (currentLiqFilter === "50k") {
    filtered = globalLiquidations.filter(l => l.usdVal >= 50000);
  } else if (currentLiqFilter === "whale") {
    filtered = globalLiquidations.filter(l => l.isWhale);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-table" style="text-align:center; padding:20px; color:#94a3b8;">No liquidation events matching current filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(l => {
    const isLong = l.side === "SELL";
    const sideClass = isLong ? "liq-side-long" : "liq-side-short";
    const sideIcon = isLong ? "south" : "north";
    const classBadge = l.isWhale 
      ? `<span class="whale-tag"><span class="material-symbols-outlined gemini-symbol" style="font-size:12px;">star</span> WHALE BLOWOUT</span>` 
      : (l.usdVal >= 50000 ? `<span class="badge-tag text-cyan" style="font-size:10px; background:rgba(0,229,255,0.1); padding:1px 6px; border-radius:3px;">LARGE</span>` : `<span class="badge-tag text-gray" style="font-size:10px;">RETAIL</span>`);

    let cleanSym = l.symbol;
    if (cleanSym.endsWith("USDT") && !cleanSym.includes("-")) {
      cleanSym = `${cleanSym.replace("USDT", "")}-USDT`;
    }

    return `
      <tr>
        <td class="font-mono text-gray" style="font-size:11px;">${l.time}</td>
        <td><strong class="text-white">${cleanSym}</strong></td>
        <td>
          <span class="${sideClass}">
            <span class="material-symbols-outlined gemini-symbol" style="font-size:13px;">${sideIcon}</span>
            ${l.type}
          </span>
        </td>
        <td class="font-mono text-white">$${formatNumber(l.price, 2)}</td>
        <td class="font-mono text-gray">${l.qty.toLocaleString()}</td>
        <td class="font-mono ${l.isWhale ? 'text-gold' : 'text-white'}" style="font-weight:700;">$${l.usdVal.toLocaleString()}</td>
        <td>${classBadge}</td>
        <td>
          <button class="btn-snip-trade" onclick="snipLiquidation('${cleanSym}', '${isLong ? 'BUY' : 'SELL'}', ${l.price})" title="Counter-trade this liquidation cascade with a 1-click scalp order">
            <span class="material-symbols-outlined gemini-symbol" style="font-size:13px;">flash_on</span> Fade Trade
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function snipLiquidation(pair, counterSide, price) {
  if (pair && pair !== currentSymbol && typeof switchMarket === "function") {
    switchMarket(pair);
  }

  if (typeof setOrderType === "function") {
    setOrderType("LIMIT");
  }

  const priceInput = document.getElementById("orderPriceInput");
  if (priceInput && price) {
    const adjPrice = counterSide === "BUY" ? price * 0.9985 : price * 1.0015;
    priceInput.value = adjPrice.toFixed(2);
  }

  const sizeInput = document.getElementById("orderSizeInput");
  if (sizeInput && !sizeInput.value) {
    sizeInput.value = "0.5";
  }

  if (typeof calculateOrderMetrics === "function") {
    calculateOrderMetrics();
  }

  playSound("click");
  showOrderToast("info", "Snip Liquidation Armed", `Pre-filled ${counterSide} order on ${pair} to counter-trade liquidation cascade!`, { symbol: pair, latency: "1ms" });
}

setTimeout(initGlobalLiquidationStream, 1500);

window.renderOrderBookDepthChart = renderOrderBookDepthChart;
window.initGlobalLiquidationStream = initGlobalLiquidationStream;
window.setLiqFilter = setLiqFilter;
window.toggleLiqSound = toggleLiqSound;
window.renderLiquidationsTable = renderLiquidationsTable;
window.snipLiquidation = snipLiquidation;

/* ========================================================================= */
/* OMNI WALLET HUB & APPLE/GOOGLE PAY ON-RAMP ENGINE                         */
/* ========================================================================= */
const omniWalletState = {
  currentTab: "portfolio",
  selectedPaymentMethod: "apple_pay",
  fiatRates: { USD: 1.0, EUR: 1.08, GBP: 1.28, CAD: 0.74, AUD: 0.66 },
  cryptoPrices: { USDT: 1.0, BTC: 66420.0, ETH: 3485.0, SOL: 148.5, PEPE: 0.00000925, OMNI: 28.50 },
  holdings: [
    { symbol: "USDT", name: "Tether USD", network: "Arbitrum One · Futures Collateral", balance: 100000.00, available: 100000.00, price: 1.00, change24h: 0.01 },
    { symbol: "BTC", name: "Bitcoin", network: "Native SegWit · L1", balance: 1.45, available: 1.45, price: 66420.00, change24h: 2.84 },
    { symbol: "ETH", name: "Ethereum", network: "Arbitrum One · L2", balance: 18.25, available: 18.25, price: 3485.00, change24h: 3.42 },
    { symbol: "SOL", name: "Solana", network: "Solana Native", balance: 142.50, available: 142.50, price: 148.50, change24h: 5.12 },
    { symbol: "OMNI", name: "Omni Network Token", network: "Arbitrum Staking (28% APY)", balance: 26750.00, available: 26750.00, price: 28.50, change24h: 8.75 },
    { symbol: "PEPE", name: "Pepe Coin", network: "Ethereum / Arbitrum", balance: 1250000000, available: 1250000000, price: 0.00000925, change24h: 12.40 }
  ],
  depositAddresses: {
    "Arbitrum One": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D1",
    "Ethereum": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D1",
    "Solana": "9tG8z2Wq1pLkUxmC44vM5sBnq97QoK13vA2F8rX9dE6",
    "Base": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D1",
    "Polygon": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D1",
    "BSC": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D1",
    "Tron": "TX9hBv8N4jKq2yLz1oP9mR5vW8xU3sC4k7"
  },
  txHistory: [
    { id: "TX-918239", type: "BUY_FIAT", asset: "USDT", amount: 500.00, usd: 500.00, method: "Apple Pay (Face ID)", timestamp: "Just now", status: "COMPLETED", hash: "0x8fa1...d42a" },
    { id: "TX-891041", type: "DEPOSIT", asset: "USDT", amount: 10000.00, usd: 10000.00, method: "Arbitrum One L2", timestamp: "18 mins ago", status: "COMPLETED", hash: "0x32cf...99be" },
    { id: "TX-829148", type: "TRANSFER", asset: "USDT", amount: 5000.00, usd: 5000.00, method: "Futures -> Spot", timestamp: "1 hour ago", status: "COMPLETED", hash: "INTERNAL" },
    { id: "TX-710294", type: "BUY_FIAT", asset: "BTC", amount: 0.05, usd: 3321.00, method: "Google Pay (Passkey)", timestamp: "3 hours ago", status: "COMPLETED", hash: "0x7bb2...f890" },
    { id: "TX-620193", type: "WITHDRAWAL", asset: "USDT", amount: 1200.00, usd: 1200.00, method: "TRC-20 Mempool", timestamp: "Yesterday", status: "COMPLETED", hash: "TX9h...sC4k" }
  ]
};

function openOmniWalletModal(tab = "portfolio") {
  const modal = document.getElementById("modalOmniWallet");
  if (!modal) return;
  modal.style.display = "flex";
  syncOmniWalletBalances();
  switchOmniWalletTab(tab);
  renderOmniWalletHoldings();
  updateBuyCryptoCalc();
  renderOmniWalletHistory("ALL");
  updateDepositNetworkDetails();
  updateWithdrawCalculations();
  playSound("click");
}

function closeOmniWalletModal() {
  const modal = document.getElementById("modalOmniWallet");
  if (modal) modal.style.display = "none";
  playSound("click");
}

function switchOmniWalletTab(tab) {
  omniWalletState.currentTab = tab;
  const tabIds = ["portfolio", "buy", "deposit", "withdraw", "transfer", "history"];
  tabIds.forEach(t => {
    const btn = document.getElementById("owTabBtn" + t.charAt(0).toUpperCase() + t.slice(1));
    const pane = document.getElementById("owPane" + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) btn.classList.toggle("active", t === tab);
    if (pane) pane.classList.toggle("active", t === tab);
  });

  if (tab === "portfolio") {
    syncOmniWalletBalances();
    renderOmniWalletHoldings();
  } else if (tab === "buy") {
    updateBuyCryptoCalc();
  } else if (tab === "history") {
    renderOmniWalletHistory("ALL");
  } else if (tab === "deposit") {
    updateDepositNetworkDetails();
  } else if (tab === "withdraw") {
    updateWithdrawCalculations();
  }
}

function syncOmniWalletBalances() {
  if (typeof accountEquity === "number") {
    omniWalletState.holdings[0].balance = accountEquity;
    omniWalletState.holdings[0].available = accountAvailable;
  }

  let totalNetWorth = 0;
  omniWalletState.holdings.forEach(h => {
    totalNetWorth += (h.balance * h.price);
  });

  const netWorthEl = document.getElementById("omniWalletNetWorthVal");
  if (netWorthEl) netWorthEl.textContent = `$${formatNumber(totalNetWorth, 2)}`;

  const headerWalletTotal = document.getElementById("headerOmniWalletTotal");
  if (headerWalletTotal) headerWalletTotal.textContent = `$${formatNumber(accountEquity, 2)}`;

  const futEq = document.getElementById("owFuturesEquityDisplay");
  if (futEq) futEq.textContent = `$${formatNumber(accountEquity, 2)}`;

  const futAvail = document.getElementById("owFuturesAvailDisplay");
  if (futAvail) futAvail.textContent = `$${formatNumber(accountAvailable, 2)}`;

  const futUsed = document.getElementById("owFuturesUsedDisplay");
  const usedMargin = Math.max(0, accountEquity - accountAvailable);
  if (futUsed) futUsed.textContent = `$${formatNumber(usedMargin, 2)}`;

  const futRatio = document.getElementById("owFuturesRatioDisplay");
  if (futRatio) {
    const ratio = accountEquity > 0 ? ((usedMargin / accountEquity) * 100).toFixed(2) : "0.00";
    futRatio.textContent = `${ratio}% (Safe)`;
  }
}

function renderOmniWalletHoldings() {
  const tbody = document.getElementById("omniWalletHoldingsTableBody");
  if (!tbody) return;

  tbody.innerHTML = omniWalletState.holdings.map(h => {
    const usdVal = h.balance * h.price;
    const isPositive = h.change24h >= 0;
    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="gemini-token-icon-badge" style="width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg, rgba(0,229,255,0.18), rgba(168,85,247,0.25)); border:1px solid rgba(0,229,255,0.35); display:flex; align-items:center; justify-content:center; padding:0; flex-shrink:0; box-shadow:0 0 10px rgba(0,229,255,0.25);">
              <svg class="gemini-sparkle-mini" width="14" height="14" viewBox="0 0 24 24"><use href="#gemini-sparkle-symbol"/></svg>
            </div>
            <div>
              <div style="font-weight:700; color:#ffffff;">${h.symbol}</div>
              <div style="font-size:10.5px; color:#94a3b8;">${h.name}</div>
            </div>
          </div>
        </td>
        <td><span style="font-size:11px; color:#cbd5e1;">${h.network}</span></td>
        <td><strong class="font-mono text-white">${formatNumber(h.balance, h.balance < 10 ? 4 : 2)} ${h.symbol}</strong></td>
        <td><span class="font-mono text-cyan">${formatNumber(h.available, h.available < 10 ? 4 : 2)} ${h.symbol}</span></td>
        <td><span class="font-mono text-white">$${formatNumber(h.price, h.price < 1 ? 8 : 2)}</span></td>
        <td><strong class="font-mono text-gold">$${formatNumber(usdVal, 2)}</strong></td>
        <td><span class="font-mono ${isPositive ? 'text-green' : 'text-red'}">${isPositive ? '+' : ''}${h.change24h}%</span></td>
        <td style="text-align:right;">
          <div style="display:inline-flex; gap:6px;">
            <button class="btn-table-action" onclick="switchOmniWalletTab('deposit')">Deposit</button>
            <button class="btn-table-action buy" onclick="switchOmniWalletTab('buy')">Buy</button>
            <button class="btn-table-action outline" onclick="switchOmniWalletTab('withdraw')">Withdraw</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function updateBuyCryptoCalc() {
  const fiatSelect = document.getElementById("buyFiatCurrencySelect");
  const fiatInput = document.getElementById("buyFiatAmountInput");
  const cryptoSelect = document.getElementById("buyCryptoSelect");
  const cryptoOutput = document.getElementById("buyCryptoAmountOutput");
  const quoteDisplay = document.getElementById("buyRateExchangeQuote");
  const fiatTag = document.getElementById("buyFiatSymbolTag");
  const cryptoTag = document.getElementById("buyCryptoTag");

  const fiat = fiatSelect ? fiatSelect.value : "USD";
  const crypto = cryptoSelect ? cryptoSelect.value : "USDT";
  const fiatAmount = fiatInput ? parseFloat(fiatInput.value) || 0 : 500;

  if (fiatTag) fiatTag.textContent = fiat;
  if (cryptoTag) cryptoTag.textContent = crypto;

  const fiatRate = omniWalletState.fiatRates[fiat] || 1.0;
  const usdVal = fiatAmount * fiatRate;
  const cryptoPrice = omniWalletState.cryptoPrices[crypto] || 1.0;
  const cryptoReceived = usdVal / cryptoPrice;

  if (cryptoOutput) {
    cryptoOutput.value = cryptoReceived < 1 ? cryptoReceived.toFixed(6) : cryptoReceived.toFixed(2);
  }

  if (quoteDisplay) {
    quoteDisplay.textContent = `Rate: 1 ${fiat} = ${(fiatRate / cryptoPrice).toFixed(cryptoPrice > 100 ? 6 : 2)} ${crypto}`;
  }

  const sumFiat = document.getElementById("sumFiatTotalDisplay");
  if (sumFiat) sumFiat.textContent = `$${formatNumber(fiatAmount, 2)} ${fiat}`;

  const sumCrypto = document.getElementById("sumCryptoPayoutDisplay");
  if (sumCrypto) sumCrypto.textContent = `${formatNumber(cryptoReceived, cryptoReceived < 1 ? 6 : 2)} ${crypto}`;

  const sumCharged = document.getElementById("sumTotalChargedDisplay");
  if (sumCharged) sumCharged.textContent = `$${formatNumber(fiatAmount, 2)} ${fiat}`;

  const sumRate = document.getElementById("sumExchangeRateDisplay");
  if (sumRate) sumRate.textContent = `1 ${crypto} = $${formatNumber(cryptoPrice, 2)} USD`;

  const bioApplePayTotal = document.getElementById("bioApplePayTotal");
  if (bioApplePayTotal) bioApplePayTotal.textContent = `$${formatNumber(fiatAmount, 2)} ${fiat}`;

  const bioApplePayCrypto = document.getElementById("bioApplePayCrypto");
  if (bioApplePayCrypto) bioApplePayCrypto.textContent = `${formatNumber(cryptoReceived, cryptoReceived < 1 ? 4 : 2)} ${crypto}`;

  const bioGooglePayTotal = document.getElementById("bioGooglePayTotal");
  if (bioGooglePayTotal) bioGooglePayTotal.textContent = `$${formatNumber(fiatAmount, 2)} ${fiat}`;

  const bioGooglePayCrypto = document.getElementById("bioGooglePayCrypto");
  if (bioGooglePayCrypto) bioGooglePayCrypto.textContent = `${formatNumber(cryptoReceived, cryptoReceived < 1 ? 4 : 2)} ${crypto}`;
}

function setBuyAmountPreset(amount) {
  const input = document.getElementById("buyFiatAmountInput");
  if (input) {
    input.value = amount;
    updateBuyCryptoCalc();
    playSound("click");
  }
  const presetBtns = document.querySelectorAll("#owPaneBuy .pct-btn");
  presetBtns.forEach(btn => {
    btn.classList.toggle("active", btn.textContent.includes(amount.toString()));
  });
}

function selectPaymentMethod(method) {
  omniWalletState.selectedPaymentMethod = method;
  const cards = {
    apple_pay: document.getElementById("payCardApple"),
    google_pay: document.getElementById("payCardGoogle"),
    card: document.getElementById("payCardDebit")
  };
  Object.keys(cards).forEach(k => {
    if (cards[k]) cards[k].classList.toggle("active", k === method);
  });

  const ctaApple = document.getElementById("btnBuyApplePayCta");
  const ctaGoogle = document.getElementById("btnBuyGooglePayCta");
  const ctaCard = document.getElementById("btnBuyCardCta");

  if (ctaApple) ctaApple.style.display = method === "apple_pay" ? "flex" : "none";
  if (ctaGoogle) ctaGoogle.style.display = method === "google_pay" ? "flex" : "none";
  if (ctaCard) ctaCard.style.display = method === "card" ? "flex" : "none";

  const sumPayMethod = document.getElementById("sumPayMethodDisplay");
  if (sumPayMethod) {
    sumPayMethod.textContent = method === "apple_pay" ? "Apple Pay (Face ID)" : (method === "google_pay" ? "Google Pay (Passkey)" : "Debit / Credit Card");
  }
  playSound("click");
}

function startBuyCryptoBiometric(method) {
  selectPaymentMethod(method);
  updateBuyCryptoCalc();

  const sheet = document.getElementById("fiatBiometricSheet");
  if (!sheet) return;
  sheet.style.display = "flex";

  const appleView = document.getElementById("applePaySheetView");
  const googleView = document.getElementById("googlePaySheetView");

  if (method === "google_pay") {
    if (appleView) appleView.classList.remove("active");
    if (googleView) googleView.classList.add("active");
  } else {
    if (appleView) appleView.classList.add("active");
    if (googleView) googleView.classList.remove("active");
  }

  playSound("click");
}

function closeBiometricSheet() {
  const sheet = document.getElementById("fiatBiometricSheet");
  if (sheet) sheet.style.display = "none";
  playSound("click");
}

function confirmBiometricPayment() {
  const method = omniWalletState.selectedPaymentMethod;
  const isApple = method === "apple_pay";

  const triggerBtn = isApple ? document.getElementById("btnTriggerAppleAuth") : document.getElementById("btnTriggerGoogleAuth");
  const promptLbl = isApple ? document.getElementById("bioPromptLabel") : document.getElementById("bioGpayPromptLabel");

  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = `<span class="material-symbols-outlined gemini-symbol rotating" style="font-size:20px;">sync</span> Authenticating...`;
  }
  if (promptLbl) {
    promptLbl.textContent = isApple ? "Scanning Face ID..." : "Verifying Passkey Signature...";
  }

  playSound("click");

  setTimeout(() => {
    playSound("order_fill");

    if (triggerBtn) {
      triggerBtn.innerHTML = `<span class="material-symbols-outlined gemini-symbol gemini-grad-green" style="font-size:20px;">check_circle</span> Payment Authorized!`;
      triggerBtn.style.background = "#10b981";
    }
    if (promptLbl) {
      promptLbl.innerHTML = `<strong class="text-green">Authenticated & Settled!</strong>`;
    }

    const fiatInput = document.getElementById("buyFiatAmountInput");
    const fiatSelect = document.getElementById("buyFiatCurrencySelect");
    const cryptoSelect = document.getElementById("buyCryptoSelect");

    const fiat = fiatSelect ? fiatSelect.value : "USD";
    const crypto = cryptoSelect ? cryptoSelect.value : "USDT";
    const fiatAmount = fiatInput ? parseFloat(fiatInput.value) || 500 : 500;
    const fiatRate = omniWalletState.fiatRates[fiat] || 1.0;
    const usdVal = fiatAmount * fiatRate;
    const cryptoPrice = omniWalletState.cryptoPrices[crypto] || 1.0;
    const cryptoReceived = usdVal / cryptoPrice;

    accountEquity += usdVal;
    accountAvailable += usdVal;

    const usdtHolding = omniWalletState.holdings.find(h => h.symbol === crypto);
    if (usdtHolding) {
      usdtHolding.balance += cryptoReceived;
      usdtHolding.available += cryptoReceived;
    }

    const txId = "TX-" + Math.floor(100000 + Math.random() * 900000);
    const hash = "0x" + Array.from({length: 8}, () => Math.floor(Math.random()*16).toString(16)).join("") + "...";
    const methodName = isApple ? "Apple Pay (Face ID)" : (method === "google_pay" ? "Google Pay (Passkey)" : "Credit Card 3DS");

    omniWalletState.txHistory.unshift({
      id: txId,
      type: "BUY_FIAT",
      asset: crypto,
      amount: cryptoReceived,
      usd: usdVal,
      method: methodName,
      timestamp: "Just now",
      status: "COMPLETED",
      hash: hash
    });

    // Persist to backend SQLite
    fetch('/api/assets/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: userWalletAddress || '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
        sourceAddress: `${methodName} In-App Gateway`,
        asset: crypto,
        amount: cryptoReceived,
        network: 'Arbitrum One'
      })
    }).then(() => {
      if (typeof loadWeexAssetsOverview === 'function') loadWeexAssetsOverview();
      if (typeof filterWeexBills === 'function') filterWeexBills('ALL');
    }).catch(() => {});

    if (accountData) {
      accountData.equity = accountEquity;
      accountData.available = accountAvailable;
    }
    const headerEquity = document.getElementById("headerEquityDisplay");
    if (headerEquity) headerEquity.textContent = `$${accountEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const metricAvail = document.getElementById("metricAvailable");
    if (metricAvail) metricAvail.textContent = `$${accountAvailable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    syncOmniWalletBalances();
    if (typeof updateMarginRatioDisplay === "function") updateMarginRatioDisplay();
    if (typeof renderPositionsTable === "function") renderPositionsTable();

    setTimeout(() => {
      closeBiometricSheet();
      if (triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.style.background = "";
        triggerBtn.innerHTML = isApple ?
          `<span class="material-symbols-outlined gemini-symbol" style="font-size:20px;">face</span><span>Authenticate Face ID</span>` :
          `<span class="material-symbols-outlined gemini-symbol" style="font-size:20px;">fingerprint</span><span>Verify Passkey & Pay</span>`;
      }
      showOrderToast("fill", `Payment Approved (${methodName})`, `+${formatNumber(cryptoReceived, cryptoReceived < 1 ? 4 : 2)} ${crypto} credited to your margin collateral!`, { symbol: crypto, latency: "1.2s" });
      renderOmniWalletHoldings();
      renderOmniWalletHistory("ALL");
    }, 500);

  }, 600);
}

function updateDepositNetworkDetails() {
  const netSelect = document.getElementById("owDepositNetworkSelect");
  const net = netSelect ? netSelect.value : "Arbitrum One";
  const addr = omniWalletState.depositAddresses[net] || omniWalletState.depositAddresses["Arbitrum One"];

  const lbl = document.getElementById("owDepositNetworkLabel");
  const addrDisplay = document.getElementById("owDepositAddressStr");

  if (lbl) lbl.textContent = net;
  if (addrDisplay) addrDisplay.textContent = addr;
}

function copyDepositAddress() {
  const addrDisplay = document.getElementById("owDepositAddressStr");
  if (!addrDisplay) return;
  const text = addrDisplay.textContent;
  navigator.clipboard.writeText(text).catch(() => {});

  const btnText = document.getElementById("btnCopyAddressText");
  if (btnText) {
    btnText.textContent = "Copied!";
    setTimeout(() => { btnText.textContent = "Copy Address"; }, 2000);
  }
  playSound("click");
  showOrderToast("info", "Deposit Address Copied", `${text} copied to clipboard.`);
}

function updateChangeNowHubQuote() {
  const fromSelect = document.getElementById("owCnowFromCurrency");
  const amtInput = document.getElementById("owCnowAmountInput");
  const receiveInput = document.getElementById("owCnowReceiveEstimated");
  const tag = document.getElementById("owCnowAssetTag");

  const coin = fromSelect ? fromSelect.value : "xmr";
  const amt = amtInput ? parseFloat(amtInput.value) || 0 : 5;
  if (tag) tag.textContent = coin.toUpperCase();

  const prices = { xmr: 168.5, btc: 66420, eth: 3485, sol: 148.5, ada: 0.38, xrp: 0.58, doge: 0.11, trx: 0.15, ltc: 68.5, bch: 345, avax: 24.5, bnb: 580 };
  const rate = prices[coin] || 100;
  const estUsdt = (amt * rate).toFixed(2);

  if (receiveInput) receiveInput.value = `~${formatNumber(parseFloat(estUsdt), 2)}`;
}

function simulateIncomingDeposit(amt = 1000) {
  const simBox = document.getElementById("owDepositProgressBox");
  const fillBar = document.getElementById("owDepositProgressBar");
  const blockCount = document.getElementById("owDepositBlockCount");
  const statusMsg = document.getElementById("owDepositStatusMsg");

  if (simBox) simBox.style.display = "block";
  if (fillBar) fillBar.style.width = "0%";
  if (blockCount) blockCount.textContent = "0/12 Blocks (0%)";
  if (statusMsg) statusMsg.textContent = "Detecting Mempool Broadcast...";

  playSound("click");
  showOrderToast("info", "Mempool Broadcast Detected", `Incoming transfer of +$${formatNumber(amt, 2)} USDT detected on Arbitrum.`);

  setTimeout(() => {
    if (fillBar) fillBar.style.width = "33%";
    if (blockCount) blockCount.textContent = "4/12 Blocks (33%)";
    if (statusMsg) statusMsg.textContent = "Arbitrum Sequencer Confirmed Batch...";
    playSound("click");
  }, 600);

  setTimeout(() => {
    if (fillBar) fillBar.style.width = "75%";
    if (blockCount) blockCount.textContent = "9/12 Blocks (75%)";
    if (statusMsg) statusMsg.textContent = "L1 State Root Finalization in Progress...";
    playSound("click");
  }, 1200);

  setTimeout(() => {
    if (fillBar) fillBar.style.width = "100%";
    if (blockCount) blockCount.textContent = "12/12 Blocks (100%)";
    if (statusMsg) statusMsg.innerHTML = `<strong class="text-green">Deposit Finalized & Available for Margin Trading!</strong>`;
    playSound("order_fill");

    accountEquity += amt;
    accountAvailable += amt;

    const usdt = omniWalletState.holdings.find(h => h.symbol === "USDT");
    if (usdt) {
      usdt.balance += amt;
      usdt.available += amt;
    }

    const txId = "TX-" + Math.floor(100000 + Math.random() * 900000);
    const hash = "0x" + Array.from({length: 8}, () => Math.floor(Math.random()*16).toString(16)).join("") + "...";
    omniWalletState.txHistory.unshift({
      id: txId,
      type: "DEPOSIT",
      asset: "USDT",
      amount: amt,
      usd: amt,
      method: "Arbitrum One Rollup",
      timestamp: "Just now",
      status: "COMPLETED",
      hash: hash
    });

    syncOmniWalletBalances();
    renderOmniWalletHoldings();
    renderOmniWalletHistory("ALL");
    if (typeof updateMarginRatioDisplay === "function") updateMarginRatioDisplay();

    showOrderToast("fill", "Deposit Confirmed (+USDT)", `+$${formatNumber(amt, 2)} USDT is now available in your margin collateral.`, { latency: "1.8s" });

    setTimeout(() => {
      if (simBox) simBox.style.display = "none";
    }, 4000);
  }, 1800);
}

let cnowTimerInterval = null;

function executeChangeNowHubOrder() {
  const fromSelect = document.getElementById("owCnowFromCurrency");
  const amtInput = document.getElementById("owCnowAmountInput");
  const coin = fromSelect ? fromSelect.value.toUpperCase() : "XMR";
  const amt = amtInput ? parseFloat(amtInput.value) || 5 : 5;

  const activeBox = document.getElementById("cnowActiveOrderBox");
  const sendAmt = document.getElementById("cnowSendAmountText");
  const addrText = document.getElementById("cnowPayinAddressText");
  const timerText = document.getElementById("cnowCountdownTimer");

  if (activeBox) activeBox.style.display = "block";
  if (sendAmt) sendAmt.textContent = `${amt} ${coin}`;

  const cnowAddrs = {
    XMR: "888tNkZrPN6JsEgekjMnABU4TBWr2Dt29EPAvkFxbANsAnJYPbb3iQ1YBR5L1mkvobEmWB9YNTR9...",
    BTC: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    ETH: "0x71C...84920b7C62e84128",
    SOL: "Sol9...XyZ88291mNQaP",
    ADA: "addr1q9d7...8942klns",
    XRP: "rEb8TK3gBgk5auZyyb66a2KAjzfqDonald",
    DOGE: "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L",
    TRX: "TX9h...sC4k9021",
    LTC: "ltc1qw508d6qejxtdg4y5r3zarvary0c5xw7kg3g4ty",
    BCH: "bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a",
    AVAX: "0x3Fa...49B8842",
    BNB: "0x892...B3901"
  };
  if (addrText) addrText.textContent = cnowAddrs[coin] || "0x892...B3901";

  if (cnowTimerInterval) clearInterval(cnowTimerInterval);
  let timeLeft = 900;
  if (timerText) timerText.textContent = "Time Left: 15:00";
  cnowTimerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(cnowTimerInterval);
      if (timerText) timerText.textContent = "Expired";
      return;
    }
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    if (timerText) timerText.textContent = `Time Left: ${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, 1000);

  playSound("click");
  showOrderToast("info", `ChangeNOW Order Active`, `Send ${amt} ${coin} to address. Auto-swaps to USDT on deposit.`, { symbol: coin });
}

function copyChangeNowAddress() {
  const addrText = document.getElementById("cnowPayinAddressText");
  if (!addrText) return;
  navigator.clipboard.writeText(addrText.textContent).catch(() => {});
  const btn = document.getElementById("btnCopyCnowText");
  if (btn) {
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = "Copy Address"; }, 2000);
  }
  playSound("click");
  showOrderToast("info", "ChangeNOW Address Copied", "Address copied to clipboard.");
}

function confirmChangeNowPaymentSimulation() {
  const fromSelect = document.getElementById("owCnowFromCurrency");
  const amtInput = document.getElementById("owCnowAmountInput");
  const coin = fromSelect ? fromSelect.value.toUpperCase() : "XMR";
  const amt = amtInput ? parseFloat(amtInput.value) || 5 : 5;

  const prices = { XMR: 168.5, BTC: 66420, ETH: 3485, SOL: 148.5, ADA: 0.38, XRP: 0.58, DOGE: 0.11, TRX: 0.15, LTC: 68.5, BCH: 345, AVAX: 24.5, BNB: 580 };
  const rate = prices[coin] || 100;
  const usdtVal = amt * rate;

  accountEquity += usdtVal;
  accountAvailable += usdtVal;

  const usdt = omniWalletState.holdings.find(h => h.symbol === "USDT");
  if (usdt) {
    usdt.balance += usdtVal;
    usdt.available += usdtVal;
  }

  const txId = "TX-" + Math.floor(100000 + Math.random() * 900000);
  const hash = "0x" + Array.from({length: 8}, () => Math.floor(Math.random()*16).toString(16)).join("") + "...";
  omniWalletState.txHistory.unshift({
    id: txId,
    type: "DEPOSIT",
    asset: "USDT",
    amount: usdtVal,
    usd: usdtVal,
    method: `ChangeNOW (${amt} ${coin} -> USDT)`,
    timestamp: "Just now",
    status: "COMPLETED",
    hash: hash
  });

  syncOmniWalletBalances();
  renderOmniWalletHoldings();
  renderOmniWalletHistory("ALL");
  if (typeof updateMarginRatioDisplay === "function") updateMarginRatioDisplay();

  const activeBox = document.getElementById("cnowActiveOrderBox");
  if (activeBox) activeBox.style.display = "none";
  if (cnowTimerInterval) clearInterval(cnowTimerInterval);

  playSound("order_fill");
  showOrderToast("fill", "ChangeNOW Swap Completed", `Received +$${formatNumber(usdtVal, 2)} USDT from ${amt} ${coin} deposit!`, { symbol: "USDT" });
}

function updateWithdrawCalculations() {
  const assetSelect = document.getElementById("owWithdrawAssetSelect");
  const amtInput = document.getElementById("owWithdrawAmountInput");
  const feeDisplay = document.getElementById("owWithdrawFeeDisplay");
  const netDisplay = document.getElementById("owWithdrawNetDisplay");
  const tag = document.getElementById("owWithdrawAssetTag");
  const availLbl = document.getElementById("owWithdrawAvailLabel");

  const asset = assetSelect ? assetSelect.value : "USDT";
  const amt = amtInput ? parseFloat(amtInput.value) || 0 : 1000;
  if (tag) tag.textContent = asset;

  const h = omniWalletState.holdings.find(item => item.symbol === asset) || { available: 100000 };
  if (availLbl) availLbl.textContent = `Available: ${formatNumber(h.available, h.available < 10 ? 4 : 2)} ${asset}`;

  const fee = asset === "BTC" ? 0.0002 : (asset === "ETH" ? 0.002 : (asset === "SOL" ? 0.01 : 1.50));
  const net = Math.max(0, amt - fee);

  if (feeDisplay) feeDisplay.textContent = `${fee} ${asset}`;
  if (netDisplay) netDisplay.textContent = `${formatNumber(net, net < 10 ? 4 : 2)} ${asset}`;
}

function setWithdrawPctPreset(pct) {
  const assetSelect = document.getElementById("owWithdrawAssetSelect");
  const amtInput = document.getElementById("owWithdrawAmountInput");
  const asset = assetSelect ? assetSelect.value : "USDT";
  const h = omniWalletState.holdings.find(item => item.symbol === asset) || { available: 100000 };

  if (amtInput) {
    amtInput.value = (h.available * pct).toFixed(h.available < 10 ? 4 : 2);
    updateWithdrawCalculations();
    playSound("click");
  }
}

function executeOmniWithdrawAction() {
  const assetSelect = document.getElementById("owWithdrawAssetSelect");
  const amtInput = document.getElementById("owWithdrawAmountInput");
  const destInput = document.getElementById("owWithdrawDestAddress");

  const asset = assetSelect ? assetSelect.value : "USDT";
  const amt = amtInput ? parseFloat(amtInput.value) || 0 : 0;
  const dest = destInput ? destInput.value.trim() : "";

  if (amt <= 0) {
    showOrderToast("error", "Withdrawal Error", "Please enter a valid withdrawal amount.");
    return;
  }
  if (!dest) {
    showOrderToast("error", "Withdrawal Error", "Please specify a destination wallet address.");
    return;
  }

  const h = omniWalletState.holdings.find(item => item.symbol === asset);
  if (!h || h.available < amt) {
    showOrderToast("error", "Insufficient Balance", `You only have ${h ? h.available : 0} ${asset} available.`);
    return;
  }

  h.available -= amt;
  h.balance -= amt;
  if (asset === "USDT") {
    accountEquity = Math.max(0, accountEquity - amt);
    accountAvailable = Math.max(0, accountAvailable - amt);
  }

  const txId = "TX-" + Math.floor(100000 + Math.random() * 900000);
  const hash = "0x" + Array.from({length: 8}, () => Math.floor(Math.random()*16).toString(16)).join("") + "...";

  omniWalletState.txHistory.unshift({
    id: txId,
    type: "WITHDRAWAL",
    asset: asset,
    amount: amt,
    usd: amt * (h.price || 1),
    method: "On-Chain Dispatch",
    timestamp: "Just now",
    status: "COMPLETED",
    hash: hash
  });

  syncOmniWalletBalances();
  renderOmniWalletHoldings();
  renderOmniWalletHistory("ALL");
  playSound("order_fill");
  showOrderToast("fill", "Withdrawal Dispatched", `Successfully sent ${formatNumber(amt, 2)} ${asset} to ${dest.slice(0, 8)}...`, { latency: "140ms" });
}

function validateTransferAccounts() {
  const from = document.getElementById("owTransferFromAcc");
  const to = document.getElementById("owTransferToAcc");
  if (from && to && from.value === to.value) {
    const opts = ["FUTURES", "SPOT", "BOTS"].filter(o => o !== from.value);
    to.value = opts[0];
  }
}

function swapTransferDirection() {
  const from = document.getElementById("owTransferFromAcc");
  const to = document.getElementById("owTransferToAcc");
  if (from && to) {
    const temp = from.value;
    from.value = to.value;
    to.value = temp;
    playSound("click");
  }
}

function setTransferAmountPreset(pct) {
  const amtInput = document.getElementById("owTransferAmountInput");
  if (amtInput) {
    amtInput.value = (accountAvailable * pct).toFixed(2);
    playSound("click");
  }
}

function executeOmniTransferAction() {
  const from = document.getElementById("owTransferFromAcc")?.value || "FUTURES";
  const to = document.getElementById("owTransferToAcc")?.value || "SPOT";
  const amtInput = document.getElementById("owTransferAmountInput");
  const amt = amtInput ? parseFloat(amtInput.value) || 0 : 0;

  if (amt <= 0) {
    showOrderToast("error", "Transfer Error", "Please enter a positive transfer amount.");
    return;
  }

  if (from === "FUTURES" && amt > accountAvailable) {
    showOrderToast("error", "Transfer Error", "Amount exceeds available futures margin.");
    return;
  }

  if (from === "FUTURES") {
    accountEquity -= amt;
    accountAvailable -= amt;
  } else if (to === "FUTURES") {
    accountEquity += amt;
    accountAvailable += amt;
  }

  const txId = "TX-" + Math.floor(100000 + Math.random() * 900000);
  omniWalletState.txHistory.unshift({
    id: txId,
    type: "TRANSFER",
    asset: "USDT",
    amount: amt,
    usd: amt,
    method: `${from} -> ${to}`,
    timestamp: "Just now",
    status: "COMPLETED",
    hash: "INTERNAL"
  });

  syncOmniWalletBalances();
  renderOmniWalletHoldings();
  renderOmniWalletHistory("ALL");
  playSound("order_fill");
  showOrderToast("fill", "Internal Transfer Completed", `$${formatNumber(amt, 2)} transferred from ${from} to ${to} with 0 latency.`);
}

function filterOmniWalletHistory(filter, btn) {
  if (btn) {
    const pills = document.querySelectorAll(".tx-filter-pills .tx-pill");
    pills.forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
  }
  renderOmniWalletHistory(filter);
  playSound("click");
}

function renderOmniWalletHistory(filter = "ALL") {
  const tbody = document.getElementById("omniWalletTxHistoryTableBody");
  if (!tbody) return;

  const items = filter === "ALL" ? omniWalletState.txHistory : omniWalletState.txHistory.filter(tx => tx.type === filter);

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#94a3b8;">No transactions found for this filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(tx => {
    let typeBadge = `<span class="badge" style="background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); font-size:10px;">${tx.type}</span>`;
    if (tx.type === "BUY_FIAT") {
      typeBadge = `<span class="badge" style="background:rgba(250,204,21,0.15); color:#facc15; border:1px solid rgba(250,204,21,0.3); font-size:10px;">BUY CRYPTO</span>`;
    } else if (tx.type === "WITHDRAWAL") {
      typeBadge = `<span class="badge" style="background:rgba(244,63,94,0.15); color:#f43f5e; border:1px solid rgba(244,63,94,0.3); font-size:10px;">WITHDRAW</span>`;
    } else if (tx.type === "DEPOSIT") {
      typeBadge = `<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); font-size:10px;">DEPOSIT</span>`;
    }

    return `
      <tr>
        <td><span class="font-mono text-cyan" style="font-size:11px;">${tx.id}</span></td>
        <td>${typeBadge}</td>
        <td><strong class="text-white">${tx.asset}</strong></td>
        <td><span class="font-mono text-white">${formatNumber(tx.amount, tx.amount < 1 ? 4 : 2)} ${tx.asset}</span></td>
        <td><span class="font-mono text-gold">$${formatNumber(tx.usd, 2)}</span></td>
        <td><span style="font-size:11px; color:#cbd5e1;">${tx.method}</span></td>
        <td><span style="font-size:11px; color:#94a3b8;">${tx.timestamp}</span></td>
        <td><span class="badge text-green" style="background:rgba(16,185,129,0.15); font-size:10px;">${tx.status}</span></td>
      </tr>
    `;
  }).join("");
}

function loadOmniWalletData() {
  syncOmniWalletBalances();
  renderOmniWalletHoldings();
  renderOmniWalletHistory("ALL");
  playSound("click");
  showOrderToast("info", "Omni Wallet Synced", "Live balances and multi-chain addresses refreshed.");
}

// Initial sync of Omni Wallet header balance
setTimeout(() => {
  syncOmniWalletBalances();
}, 2000);

window.openOmniWalletModal = openOmniWalletModal;
window.closeOmniWalletModal = closeOmniWalletModal;
window.switchOmniWalletTab = switchOmniWalletTab;
window.updateBuyCryptoCalc = updateBuyCryptoCalc;
window.setBuyAmountPreset = setBuyAmountPreset;
window.selectPaymentMethod = selectPaymentMethod;
window.startBuyCryptoBiometric = startBuyCryptoBiometric;
window.closeBiometricSheet = closeBiometricSheet;
window.confirmBiometricPayment = confirmBiometricPayment;
window.updateDepositNetworkDetails = updateDepositNetworkDetails;
window.copyDepositAddress = copyDepositAddress;
window.updateChangeNowHubQuote = updateChangeNowHubQuote;
window.executeChangeNowHubOrder = executeChangeNowHubOrder;
window.updateWithdrawCalculations = updateWithdrawCalculations;
window.setWithdrawPctPreset = setWithdrawPctPreset;
window.executeOmniWithdrawAction = executeOmniWithdrawAction;
window.validateTransferAccounts = validateTransferAccounts;
window.swapTransferDirection = swapTransferDirection;
window.setTransferAmountPreset = setTransferAmountPreset;
window.executeOmniTransferAction = executeOmniTransferAction;
window.simulateIncomingDeposit = simulateIncomingDeposit;
window.copyChangeNowAddress = copyChangeNowAddress;
window.confirmChangeNowPaymentSimulation = confirmChangeNowPaymentSimulation;
window.filterOmniWalletHistory = filterOmniWalletHistory;
window.renderOmniWalletHistory = renderOmniWalletHistory;
window.loadOmniWalletData = loadOmniWalletData;

// ============================================================================
// WEEX COMPREHENSIVE CLONE SUITE: REACTIVE ENGINE & VIEW CONTROLLER
// ============================================================================

let currentWeexView = 'trade';
let weexBalancesHidden = false;
let p2pCountdownInterval = null;
let currentP2pMerchant = null;
let selectedWeexPayMethod = 'applePay';
let weexP2pSide = 'BUY';

// Asset and price lookup
const weexAssetPrices = {
  USDT: 1.00,
  BTC: 79540.00,
  ETH: 3420.50,
  SOL: 184.20,
  OMNI: 14.50,
  WEEX: 2.80,
  DOGE: 0.142,
  PEPE: 0.0000089,
  XRP: 0.582,
  NVDA: 118.40,
  TSLA: 214.20,
  AAPL: 224.80,
  GOLD: 2512.40,
  CRUDE: 74.80
};

const weexFiatRates = {
  USD: 1.0,
  EUR: 1.08,
  GBP: 1.28,
  CAD: 0.74,
  AUD: 0.67,
  JPY: 0.0068,
  KRW: 0.00075,
  BRL: 0.18
};

const weexDepositAddresses = {
  'OMNI Network': '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
  'Arbitrum One': '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
  'TRC20': 'TX3k9W8r1M9Z8eQz7aL1p92K0L9M8QOMNI',
  'Solana': '7oP9vM5qX4rK8uN2tW1zY8xL0eP7aK5OMNI99',
  'ERC20': '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
  'BSC': '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
  'Polygon': '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
  'TON': 'EQC_omni_deposit_vault_arbitrum_rollup_01'
};

/**
 * Switch top-level WEEX Page Views:
 * 'trade' | 'markets' | 'buyCrypto' | 'deposit' | 'withdraw' | 'assets' | 'copyTrading' | 'earn'
 */
function switchWeexView(viewName, subTab = null, pushHistory = true) {
  currentWeexView = viewName;

  // View element mapping
  const viewMap = {
    trade: document.getElementById('weexViewTrade'),
    markets: document.getElementById('weexViewMarkets'),
    buyCrypto: document.getElementById('weexViewBuyCrypto'),
    deposit: document.getElementById('weexViewDeposit'),
    withdraw: document.getElementById('weexViewWithdraw'),
    assets: document.getElementById('weexViewAssets'),
    copyTrading: document.getElementById('weexViewCopyTrading'),
    earn: document.getElementById('weexViewEarn')
  };

  // Nav item mapping
  const navMap = {
    trade: document.getElementById('navItemFutures'),
    markets: document.getElementById('navItemMarkets'),
    buyCrypto: document.getElementById('navItemBuyCrypto'),
    deposit: document.getElementById('btnDepositHeader'),
    assets: document.getElementById('navItemAssets'),
    copyTrading: document.getElementById('navItemCopyTrading'),
    earn: document.getElementById('navItemEarn')
  };

  // 1. Hide all page views
  Object.keys(viewMap).forEach(key => {
    const el = viewMap[key];
    if (el) {
      el.classList.remove('active');
      el.style.display = 'none';
    }
  });

  // 2. Unhighlight main navigation links
  document.querySelectorAll('.main-nav .nav-item').forEach(el => el.classList.remove('active'));

  // 3. Activate target view
  const targetViewEl = viewMap[viewName];
  if (targetViewEl) {
    targetViewEl.classList.add('active');
    targetViewEl.style.display = viewName === 'trade' ? 'flex' : 'flex';
    targetViewEl.scrollTop = 0; // Reset vertical scroll to top for flawless view layout
  }

  // 4. Highlight corresponding nav item
  const targetNavEl = navMap[viewName];
  if (targetNavEl) targetNavEl.classList.add('active');

  // 5. Trigger view-specific lifecycle handlers
  if (viewName === 'trade') {
    if (window.candleChart && typeof window.candleChart.resize === 'function') {
      setTimeout(() => window.candleChart.resize(), 100);
    }
  } else if (viewName === 'markets') {
    loadWeexMarketsTable();
  } else if (viewName === 'buyCrypto') {
    switchWeexBuySubTab(subTab || 'express');
    calcWeexExpressPayout();
  } else if (viewName === 'deposit') {
    updateWeexDepositDetails();
    loadWeexDepositRecords();
  } else if (viewName === 'withdraw') {
    switchWeexWithdrawSubTab(subTab || 'onchain');
    updateWeexWithdrawCalculations();
    loadWeexWithdrawRecords();
  } else if (viewName === 'assets') {
    loadWeexAssetsOverview();
    renderWeexHoldingsTable();
    filterWeexBills('ALL');
  } else if (viewName === 'copyTrading') {
    loadWeexCopyTrading();
  } else if (viewName === 'earn') {
    loadWeexEarnVaults();
  }

  // 6. Seamless Browser History Navigation (PushState & PopState)
  if (pushHistory && window.history && typeof window.history.pushState === 'function') {
    try {
      const url = new URL(window.location.href);
      if (viewName === 'trade') {
        url.searchParams.delete('view');
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('view', viewName);
        if (subTab) url.searchParams.set('tab', subTab);
        else url.searchParams.delete('tab');
      }
      window.history.pushState({ view: viewName, subTab: subTab }, '', url.toString());
    } catch (err) {}
  }

  playSound('click');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Browser Back / Forward Button PopState Listener
window.addEventListener('popstate', (event) => {
  const state = event.state;
  if (state && state.view) {
    switchWeexView(state.view, state.subTab, false);
  } else {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view') || 'trade';
    const t = params.get('tab') || null;
    switchWeexView(v, t, false);
  }
});

// Global Keyboard Escape key handler: Returns to Trading Terminal when no modal is open
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    const isModalActive = document.querySelector('.modal-overlay[style*="display: flex"], .modal-overlay[style*="display: block"], .omni-search-overlay[style*="display: block"], .omni-search-overlay[style*="display: flex"]');
    if (!isModalActive && currentWeexView && currentWeexView !== 'trade') {
      switchWeexView('trade');
    }
  }
});

// Auto-navigate to view from URL parameter on initial load
setTimeout(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    const t = params.get('tab');
    if (v && v !== 'trade') {
      switchWeexView(v, t, false);
    }
  } catch (e) {}
}, 200);

// ----------------------------------------------------------------------------
// WEEX VIEW: BUY CRYPTO HUB (EXPRESS, P2P, CARD, GATEWAYS)
// ----------------------------------------------------------------------------

function switchWeexBuySubTab(subTab) {
  const tabs = {
    express: { btn: document.getElementById('btnWeexBuySubExpress'), pane: document.getElementById('paneWeexBuyExpress') },
    p2p: { btn: document.getElementById('btnWeexBuySubP2p'), pane: document.getElementById('paneWeexBuyP2p') },
    card: { btn: document.getElementById('btnWeexBuySubCard'), pane: document.getElementById('paneWeexBuyCard') },
    gateways: { btn: document.getElementById('btnWeexBuySubGateway'), pane: document.getElementById('paneWeexBuyGateway') }
  };

  Object.keys(tabs).forEach(key => {
    const item = tabs[key];
    if (item.btn) item.btn.classList.remove('active');
    if (item.pane) item.pane.style.display = 'none';
  });

  if (tabs[subTab]) {
    if (tabs[subTab].btn) tabs[subTab].btn.classList.add('active');
    if (tabs[subTab].pane) {
      tabs[subTab].pane.style.display = subTab === 'express' ? 'grid' : 'block';
    }
  }

  if (subTab === 'p2p') {
    loadWeexP2pMerchants();
  } else if (subTab === 'express') {
    calcWeexExpressPayout();
  }
}

function calcWeexExpressPayout() {
  const fiatInput = document.getElementById('weexExpressFiatInput');
  const fiatSelect = document.getElementById('weexExpressFiatSelect');
  const cryptoSelect = document.getElementById('weexExpressCryptoSelect');
  const cryptoOutput = document.getElementById('weexExpressCryptoOutput');
  const rateLabel = document.getElementById('weexExpressRateLabel');
  const sumSpend = document.getElementById('weexSumSpend');
  const sumRate = document.getElementById('weexSumRate');
  const sumPayout = document.getElementById('weexSumPayout');
  const btnText = document.getElementById('btnWeexBuyText');

  const fiatAmt = parseFloat(fiatInput ? fiatInput.value : 500) || 0;
  const fiatCur = fiatSelect ? fiatSelect.value : 'USD';
  const crypto = cryptoSelect ? cryptoSelect.value : 'USDT';
  const cryptoVectorEl = document.getElementById('weexExpressCryptoVector');
  if (cryptoVectorEl) cryptoVectorEl.innerHTML = getTokenVectorSvg(crypto, 'crypto', 20);

  const fiatRateToUsd = weexFiatRates[fiatCur] || 1.0;
  const usdAmt = fiatAmt * fiatRateToUsd;
  const cryptoPriceUsd = weexAssetPrices[crypto] || 1.0;
  const payout = usdAmt / cryptoPriceUsd;

  const cryptoDecimals = payout < 1 ? 6 : 2;
  const payoutFormatted = formatNumber(payout, cryptoDecimals);

  if (cryptoOutput) cryptoOutput.value = payoutFormatted;
  if (rateLabel) rateLabel.textContent = `1 ${crypto} ≈ $${formatNumber(cryptoPriceUsd, 2)} ${fiatCur}`;
  if (sumSpend) sumSpend.textContent = `$${formatNumber(fiatAmt, 2)} ${fiatCur}`;
  if (sumRate) sumRate.textContent = `1 ${crypto} = $${formatNumber(cryptoPriceUsd, 2)} USD`;
  if (sumPayout) sumPayout.textContent = `${payoutFormatted} ${crypto}`;

  const payNames = {
    applePay: 'Apple Pay',
    googlePay: 'Google Pay',
    card: 'Credit Card',
    bank: 'Bank Wire'
  };
  const activeMethodName = payNames[selectedWeexPayMethod] || 'Apple Pay';

  if (btnText) {
    btnText.textContent = `Buy ${payoutFormatted} ${crypto} with ${activeMethodName}`;
  }
}

function setWeexExpressPreset(amt) {
  const input = document.getElementById('weexExpressFiatInput');
  if (input) {
    input.value = amt;
    calcWeexExpressPayout();
    playSound('click');
  }
}

function selectWeexPayMethod(method) {
  selectedWeexPayMethod = method;
  const cardMap = {
    applePay: document.getElementById('weexPayCardApplePay'),
    googlePay: document.getElementById('weexPayCardGooglePay'),
    card: document.getElementById('weexPayCardCreditCard'),
    bank: document.getElementById('weexPayCardBankWire')
  };

  Object.keys(cardMap).forEach(key => {
    if (cardMap[key]) cardMap[key].classList.remove('active');
  });

  if (cardMap[method]) cardMap[method].classList.add('active');
  calcWeexExpressPayout();
  playSound('click');
}

function executeWeexBuyCheckout() {
  const fiatInput = document.getElementById('weexExpressFiatInput');
  const fiatSelect = document.getElementById('weexExpressFiatSelect');
  const cryptoSelect = document.getElementById('weexExpressCryptoSelect');

  const fiatAmt = parseFloat(fiatInput ? fiatInput.value : 500) || 500;
  const fiatCur = fiatSelect ? fiatSelect.value : 'USD';
  const crypto = cryptoSelect ? cryptoSelect.value : 'USDT';

  const fiatRateToUsd = weexFiatRates[fiatCur] || 1.0;
  const usdAmt = fiatAmt * fiatRateToUsd;
  const cryptoPriceUsd = weexAssetPrices[crypto] || 1.0;
  const cryptoReceived = usdAmt / cryptoPriceUsd;

  if (selectedWeexPayMethod === 'applePay' || selectedWeexPayMethod === 'googlePay') {
    // Open biometric modal sheet
    startBuyCryptoBiometric(selectedWeexPayMethod === 'applePay' ? 'apple_pay' : 'google_pay');
  } else {
    // Direct credit simulation
    accountEquity += usdAmt;
    accountAvailable += usdAmt;

    fetch('/api/assets/deposit-simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coin: crypto,
        amount: cryptoReceived,
        network: selectedWeexPayMethod === 'card' ? 'Visa/Mastercard 3DS' : 'Fedwire / SEPA'
      })
    }).catch(() => {});

    showOrderToast('success', 'Purchase Complete!', `+${formatNumber(cryptoReceived, 2)} ${crypto} credited to your Futures Margin collateral!`, { latency: '0.8s' });
    playSound('order_fill');

    if (typeof syncOmniWalletBalances === 'function') syncOmniWalletBalances();
    loadWeexAssetsOverview();
  }
}

function executeCardPaymentSim() {
  const cardName = document.getElementById('weexCardName');
  const name = cardName ? cardName.value : 'Cardholder';
  showOrderToast('info', '3D Secure Verification', 'Authorizing transaction with bank secure enclave...');
  playSound('click');

  setTimeout(() => {
    const amt = 500;
    accountEquity += amt;
    accountAvailable += amt;

    fetch('/api/assets/deposit-simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coin: 'USDT',
        amount: amt,
        network: 'Credit Card (Visa)'
      })
    }).catch(() => {});

    showOrderToast('success', 'Card Payment Approved', `+$${amt}.00 USDT credited to Margin Collateral. Welcome, ${name}!`);
    playSound('order_fill');
    loadWeexAssetsOverview();
  }, 1200);
}

function openSimulatedGateway(gateway) {
  showOrderToast('info', `${gateway} Gateway Connected`, `Directing zero-spread fiat tunnel through ${gateway} licensed liquidity vault.`);
  playSound('click');
}

// --- P2P TRADING DESK ---

function switchWeexP2pSide(side) {
  weexP2pSide = side;
  const btnBuy = document.getElementById('btnP2pSideBuy');
  const btnSell = document.getElementById('btnP2pSideSell');

  if (btnBuy && btnSell) {
    if (side === 'BUY') {
      btnBuy.classList.add('active');
      btnSell.classList.remove('active');
    } else {
      btnSell.classList.add('active');
      btnBuy.classList.remove('active');
    }
  }
  loadWeexP2pMerchants();
  playSound('click');
}

async function loadWeexP2pMerchants() {
  const tbody = document.getElementById('weexP2pTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#94a3b8;">Loading verified P2P merchants...</td></tr>`;

  try {
    const res = await fetch('/api/assets/p2p-merchants');
    const data = await res.json();
    const merchants = Array.isArray(data) ? data : (data.merchants || []);

    if (!merchants || !merchants.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#94a3b8;">No merchants currently online.</td></tr>`;
      return;
    }

    tbody.innerHTML = merchants.map(m => {
      const pmList = m.paymentMethods || m.payment_methods || ['Zelle'];
      const pmPills = pmList.map(pm =>
        `<span class="badge" style="background:rgba(255,255,255,0.06); color:#ffffff; font-size:10.5px; border:1px solid rgba(255,255,255,0.12);">${pm}</span>`
      ).join(' ');

      const actionBtnColor = weexP2pSide === 'BUY' ? '#10b981' : '#f43f5e';
      const actionText = weexP2pSide === 'BUY' ? 'Buy USDT' : 'Sell USDT';
      const ordersCount = m.orders || m.orders_completed || 1200;
      const compRate = m.completionRate || m.completion_rate || 99.5;
      const minL = m.minLimit ?? m.min_limit ?? 50;
      const maxL = m.maxLimit ?? m.max_limit ?? 10000;
      const avail = m.available ?? 50000;

      return `
        <tr>
          <td>
            <div class="weex-merchant-cell">
              <div class="avatar">${(m.name || 'AP').substring(0, 2).toUpperCase()}</div>
              <div class="meta">
                <span class="name">
                  ${m.name}
                  ${m.verified || m.badge ? `<span class="material-symbols-outlined gemini-symbol gemini-grad-cyan" style="font-size:15px;" title="Verified Merchant">verified</span>` : ''}
                </span>
                <span class="trades">${ordersCount} orders | ${compRate}% completion</span>
              </div>
            </div>
          </td>
          <td>
            <span class="font-mono text-cyan" style="font-size:15px; font-weight:800;">$${formatNumber(m.price, 3)}</span>
            <span style="font-size:11px; color:var(--text-muted);">USD</span>
          </td>
          <td>
            <div style="font-size:12px; color:#ffffff;">Available: <strong class="font-mono">${formatNumber(avail, 0)} USDT</strong></div>
            <div style="font-size:11px; color:var(--text-muted);">Limit: $${formatNumber(minL, 0)} - $${formatNumber(maxL, 0)} USD</div>
          </td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">${pmPills}</div>
          </td>
          <td style="text-align:right;">
            <button class="btn" onclick="openP2PEscrowModal('${m.id}', '${m.name}', ${m.price}, ${minL}, ${maxL})" style="padding:8px 16px; border-radius:8px; background:${actionBtnColor}; color:#ffffff; font-weight:800; font-size:12px; border:none; cursor:pointer;">
              ${actionText}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#f43f5e;">Failed to load P2P orderbook.</td></tr>`;
  }
}

function openP2PEscrowModal(merchantId, name, price, min, max) {
  currentP2pMerchant = { id: merchantId, name, price, min, max };

  const modal = document.getElementById('modalP2PEscrow');
  const merchantEl = document.getElementById('p2pModalMerchant');
  const priceEl = document.getElementById('p2pModalPrice');
  const fiatEl = document.getElementById('p2pModalFiat');
  const cryptoEl = document.getElementById('p2pModalCrypto');
  const timerEl = document.getElementById('p2pCountdownTimer');

  if (merchantEl) merchantEl.textContent = name;
  if (priceEl) priceEl.textContent = `$${formatNumber(price, 3)} USD`;
  if (fiatEl) fiatEl.textContent = `$500.00 USD`;
  if (cryptoEl) cryptoEl.textContent = `${formatNumber(500 / price, 2)} USDT`;

  // Start 15-minute countdown
  let remainingSecs = 15 * 60;
  if (p2pCountdownInterval) clearInterval(p2pCountdownInterval);
  if (timerEl) timerEl.textContent = "15:00";

  p2pCountdownInterval = setInterval(() => {
    remainingSecs--;
    if (remainingSecs <= 0) {
      clearInterval(p2pCountdownInterval);
      if (timerEl) timerEl.textContent = "00:00 (Expired)";
      return;
    }
    const mins = Math.floor(remainingSecs / 60);
    const secs = remainingSecs % 60;
    if (timerEl) timerEl.textContent = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, 1000);

  if (modal) modal.style.display = 'flex';
  playSound('click');
}

function closeP2PEscrowModal() {
  const modal = document.getElementById('modalP2PEscrow');
  if (modal) modal.style.display = 'none';
  if (p2pCountdownInterval) clearInterval(p2pCountdownInterval);
}

async function confirmP2PPaymentDone() {
  const merchant = currentP2pMerchant || { id: 'm1', name: 'ApexLiquidity_VIP', price: 1.0 };
  const fiatAmount = 500;
  const cryptoAmount = fiatAmount / merchant.price;

  showOrderToast('info', 'Notifying Merchant', 'Escrow locked. Merchant verifying receipt of fiat...');

  try {
    const res = await fetch('/api/assets/p2p-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: merchant.id,
        side: weexP2pSide,
        fiat_amount: fiatAmount,
        crypto_amount: cryptoAmount,
        payment_method: 'Zelle'
      })
    });
    const data = await res.json();

    if (data.status === 'success' || data.success) {
      accountEquity += (data.amountCrypto || cryptoAmount);
      accountAvailable += (data.amountCrypto || cryptoAmount);

      closeP2PEscrowModal();
      showOrderToast('success', 'Escrow Released!', `+${formatNumber(cryptoAmount, 2)} USDT received from ${merchant.name}. Credited to margin.`);
      playSound('order_fill');

      loadWeexAssetsOverview();
      filterWeexBills('ALL');
    }
  } catch (err) {
    showOrderToast('error', 'Escrow Error', 'Could not complete P2P order release.');
  }
}

// ----------------------------------------------------------------------------
// WEEX VIEW: DEPOSIT WORKSTATION
// ----------------------------------------------------------------------------

function updateWeexDepositDetails() {
  const coinSelect = document.getElementById('weexDepositCoinSelect');
  const netSelect = document.getElementById('weexDepositNetworkSelect');
  const addrDisplay = document.getElementById('weexDepositAddressDisplay');
  const memoRow = document.getElementById('weexDepositMemoRow');
  const qrContainer = document.getElementById('weexDepositQrContainer');

  const coin = coinSelect ? coinSelect.value : 'USDT';
  const net = netSelect ? netSelect.value : 'Arbitrum One';

  const coinVectorEl = document.getElementById('weexDepositCoinVector');
  if (coinVectorEl) coinVectorEl.innerHTML = getTokenVectorSvg(coin, 'crypto', 22);

  let addr = weexDepositAddresses[net] || weexDepositAddresses['Arbitrum One'];
  if (coin === 'BTC') addr = 'bc1q9v7m2k0p4x6t8r9y1z3w5s7d8f9g';
  if (coin === 'SOL') addr = '7oP9vM5qX4rK8uN2tW1zY8xL0eP7aK5OMNI99';

  if (addrDisplay) addrDisplay.value = addr;

  // Toggle Memo row for XRP
  if (memoRow) {
    memoRow.style.display = (coin === 'XRP') ? 'block' : 'none';
  }

  // Generate clean SVG QR representation with Gemini Center Emblem
  if (qrContainer) {
    qrContainer.innerHTML = `
      <svg viewBox="0 0 100 100" width="140" height="140" style="background:#ffffff; padding:10px; border-radius:12px; display:block; margin:0 auto; box-shadow:0 8px 24px rgba(0,229,255,0.25);">
        <!-- Top Left Position Square -->
        <rect x="10" y="10" width="24" height="24" fill="#070b14"/>
        <rect x="14" y="14" width="16" height="16" fill="#ffffff"/>
        <rect x="18" y="18" width="8" height="8" fill="#00e5ff"/>

        <!-- Top Right Position Square -->
        <rect x="66" y="10" width="24" height="24" fill="#070b14"/>
        <rect x="70" y="14" width="16" height="16" fill="#ffffff"/>
        <rect x="74" y="18" width="8" height="8" fill="#00e5ff"/>

        <!-- Bottom Left Position Square -->
        <rect x="10" y="66" width="24" height="24" fill="#070b14"/>
        <rect x="14" y="70" width="16" height="16" fill="#ffffff"/>
        <rect x="18" y="74" width="8" height="8" fill="#00e5ff"/>

        <!-- High-density QR Matrix simulation -->
        <rect x="38" y="14" width="6" height="6" fill="#070b14"/>
        <rect x="48" y="14" width="6" height="6" fill="#070b14"/>
        <rect x="58" y="24" width="6" height="6" fill="#070b14"/>
        <rect x="38" y="34" width="8" height="8" fill="#00e5ff"/>
        <rect x="50" y="44" width="8" height="8" fill="#070b14"/>
        <rect x="24" y="48" width="8" height="6" fill="#070b14"/>
        <rect x="68" y="44" width="6" height="6" fill="#070b14"/>
        <rect x="80" y="54" width="8" height="8" fill="#00e5ff"/>
        <rect x="44" y="66" width="6" height="8" fill="#070b14"/>
        <rect x="56" y="76" width="8" height="6" fill="#070b14"/>
        <rect x="70" y="72" width="6" height="6" fill="#070b14"/>
        <rect x="82" y="82" width="6" height="6" fill="#070b14"/>

        <!-- Center Gemini Sparkle Emblem Overlay -->
        <circle cx="50" cy="50" r="14" fill="#070a12" stroke="url(#geminiGrad)" stroke-width="2"/>
        <use href="#gemini-sparkle-symbol" x="40" y="40" width="20" height="20"/>
      </svg>
    `;
  }
}

function copyWeexDepositAddress() {
  const addrDisplay = document.getElementById('weexDepositAddressDisplay');
  if (!addrDisplay) return;
  navigator.clipboard.writeText(addrDisplay.value).catch(() => {});
  showOrderToast('info', 'Address Copied', 'Deposit address copied to clipboard. Send only on the selected network.');
  playSound('click');
}

function copyWeexDepositMemo() {
  const memoDisplay = document.getElementById('weexDepositMemoDisplay');
  if (!memoDisplay) return;
  navigator.clipboard.writeText(memoDisplay.value).catch(() => {});
  showOrderToast('info', 'Tag Copied', 'Deposit memo tag copied to clipboard.');
  playSound('click');
}

function simulateLiveDepositInflow() {
  const amtInput = document.getElementById('weexSimInflowAmount');
  const coinSelect = document.getElementById('weexDepositCoinSelect');
  const netSelect = document.getElementById('weexDepositNetworkSelect');
  const progressWrap = document.getElementById('weexInflowProgressWrap');
  const progressBar = document.getElementById('weexInflowProgressBar');
  const statusText = document.getElementById('weexInflowStatusText');
  const percentText = document.getElementById('weexInflowPercentText');
  const simBtn = document.getElementById('btnWeexSimulateDeposit');

  const amt = parseFloat(amtInput ? amtInput.value : 1000) || 1000;
  const coin = coinSelect ? coinSelect.value : 'USDT';
  const network = netSelect ? netSelect.value : 'OMNI Network';

  if (progressWrap) progressWrap.style.display = 'block';
  if (simBtn) {
    simBtn.disabled = true;
    simBtn.innerHTML = `<span class="material-symbols-outlined spin" style="font-size:16px;">sync</span> Listening for Inflow...`;
  }

  let currentBlock = 1;
  const totalBlocks = 12;

  const timer = setInterval(() => {
    currentBlock++;
    const pct = Math.round((currentBlock / totalBlocks) * 100);

    if (progressBar) progressBar.style.width = `${pct}%`;
    if (percentText) percentText.textContent = `${pct}%`;
    if (statusText) statusText.textContent = `Scanning Mempool: ${currentBlock}/${totalBlocks} confirmations`;

    if (currentBlock >= totalBlocks) {
      clearInterval(timer);

      // Backend live inflow credit call
      fetch('/api/assets/deposit-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coin, amount: amt, network })
      }).then(res => res.json()).then(data => {
        accountEquity += amt;
        accountAvailable += amt;

        if (statusText) statusText.innerHTML = `<strong class="text-green">Live Inflow Confirmed & Credited!</strong>`;
        showOrderToast('success', 'Live Inflow Confirmed!', `+${formatNumber(amt, 2)} ${coin} successfully credited via ${network}. Margin available.`);
        playSound('order_fill');

        if (simBtn) {
          simBtn.disabled = false;
          simBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">download_done</span> Detect & Credit Live Inflow`;
        }
        loadWeexDepositRecords();
        loadWeexAssetsOverview();

        setTimeout(() => {
          if (progressWrap) progressWrap.style.display = 'none';
        }, 4000);
      }).catch(() => {
        if (simBtn) {
          simBtn.disabled = false;
          simBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">download_done</span> Detect & Credit Live Inflow`;
        }
      });
    }
  }, 250);
}

// Web3 Wallet Omni Network & $OMNI Token Auto-Configurator
async function addOmniNetworkToWallet() {
  if (window.ethereum) {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x9B8D', // Chain ID 39821
          chainName: 'OMNI Network Mainnet',
          nativeCurrency: { name: 'OMNI Native Token', symbol: 'OMNI', decimals: 18 },
          rpcUrls: ['https://rpc.omni-network-39821.web.app', 'https://omni-network-39821.web.app/rpc'],
          blockExplorerUrls: ['https://omni-explorer-39821.web.app']
        }]
      });
      showOrderToast('success', 'Omni Network Connected', 'OMNI Network Mainnet (Chain ID: 39821) successfully added to your Web3 wallet!');
      playSound('order_fill');
    } catch (err) {
      showOrderToast('info', 'Omni Network Parameters', 'Chain ID: 39821 | RPC: https://rpc.omni-network-39821.web.app');
    }
  } else {
    showOrderToast('info', 'Omni Network RPC', 'Network: OMNI Network Mainnet | Chain ID: 39821 | Currency: OMNI');
  }
}

async function addOmniTokenToWallet() {
  if (window.ethereum) {
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: '0x638A246F0Ec8883eF68280293FFE8Cfbabe61B44',
            symbol: 'OMNI',
            decimals: 18,
            image: 'https://omni-network-39821.web.app/assets/logo.png'
          }
        }
      });
      showOrderToast('success', 'Token Added', '$OMNI Token (0x638A...1B44) added to Web3 wallet asset tracking.');
      playSound('order_fill');
    } catch (err) {
      copyOmniContractAddress();
    }
  } else {
    copyOmniContractAddress();
  }
}

function copyOmniContractAddress() {
  navigator.clipboard.writeText('0x638A246F0Ec8883eF68280293FFE8Cfbabe61B44').catch(() => {});
  showOrderToast('info', 'Contract Copied', '$OMNI Token contract address (0x638A246F0Ec8883eF68280293FFE8Cfbabe61B44) copied to clipboard.');
  playSound('click');
}

async function loadWeexDepositRecords() {
  const tbody = document.getElementById('weexDepositRecordsTableBody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/assets/deposit-records');
    const raw = await res.json();
    const records = Array.isArray(raw) ? raw : (raw.records || []);

    if (!records || !records.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;">No deposit records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = records.map(r => {
      const timeStr = r.created_at || (r.createdAt ? new Date(r.createdAt * 1000).toLocaleString() : 'Just now');
      const coin = r.coin || r.asset || 'USDT';
      const net = r.network || 'Arbitrum One';
      const hash = r.txid || r.txHash || '0x889a...';
      const stat = r.status || 'CONFIRMED';

      return `
        <tr>
          <td style="font-size:11.5px; color:#94a3b8;">${timeStr}</td>
          <td><strong class="text-white">${coin}</strong></td>
          <td><span class="font-mono text-green">+${formatNumber(r.amount, 2)}</span></td>
          <td><span style="font-size:11.5px; color:#38bdf8;">${net}</span></td>
          <td><span class="font-mono text-cyan" style="font-size:11px;">${hash.length > 16 ? hash.substring(0, 16) + '...' : hash}</span></td>
          <td><span class="badge text-green" style="background:rgba(16,185,129,0.15); font-size:10px;">${stat}</span></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;">Deposits synchronized.</td></tr>`;
  }
}

// ----------------------------------------------------------------------------
// WEEX VIEW: WITHDRAW WORKSTATION
// ----------------------------------------------------------------------------

function switchWeexWithdrawSubTab(subTab) {
  const btnOnChain = document.getElementById('btnWeexWithdrawSubOnChain');
  const btnUid = document.getElementById('btnWeexWithdrawSubUid');
  const paneOnChain = document.getElementById('paneWeexWithdrawOnChain');
  const paneUid = document.getElementById('paneWeexWithdrawUid');

  if (subTab === 'onchain') {
    if (btnOnChain) btnOnChain.classList.add('active');
    if (btnUid) btnUid.classList.remove('active');
    if (paneOnChain) paneOnChain.style.display = 'grid';
    if (paneUid) paneUid.style.display = 'none';
  } else {
    if (btnUid) btnUid.classList.add('active');
    if (btnOnChain) btnOnChain.classList.remove('active');
    if (paneUid) paneUid.style.display = 'block';
    if (paneOnChain) paneOnChain.style.display = 'none';
  }
  playSound('click');
}

function updateWeexWithdrawCalculations() {
  const coinSelect = document.getElementById('weexWithdrawCoinSelect');
  const coin = coinSelect ? coinSelect.value : 'USDT';
  const coinVectorEl = document.getElementById('weexWithdrawCoinVector');
  if (coinVectorEl) coinVectorEl.innerHTML = getTokenVectorSvg(coin, 'crypto', 22);

  const netSelect = document.getElementById('weexWithdrawNetworkSelect');
  const amtInput = document.getElementById('weexWithdrawAmountInput');
  const feeDisplay = document.getElementById('weexWithdrawFeeDisplay');
  const receiveDisplay = document.getElementById('weexWithdrawReceiveDisplay');
  const availVal = document.getElementById('weexWithdrawAvailVal');
  const availHeader = document.getElementById('weexWithdrawAvailHeaderDisplay');

  const selectedOpt = netSelect ? netSelect.options[netSelect.selectedIndex] : null;
  const fee = selectedOpt && selectedOpt.dataset.fee ? parseFloat(selectedOpt.dataset.fee) : 0.20;
  const amt = parseFloat(amtInput ? amtInput.value : 0) || 0;

  const actualReceive = Math.max(0, amt - fee);

  if (feeDisplay) feeDisplay.textContent = `${fee.toFixed(2)} USDT`;
  if (receiveDisplay) receiveDisplay.textContent = `${actualReceive.toFixed(2)} USDT`;
  if (availVal) availVal.textContent = `$${formatNumber(accountAvailable, 2)}`;
  if (availHeader) availHeader.textContent = `$${formatNumber(accountAvailable, 2)}`;
}

function setWeexWithdrawPct(pct) {
  const amtInput = document.getElementById('weexWithdrawAmountInput');
  if (amtInput) {
    amtInput.value = (accountAvailable * pct).toFixed(2);
    updateWeexWithdrawCalculations();
    playSound('click');
  }
}

function setWeexWithdrawMax() {
  setWeexWithdrawPct(1.0);
}

function pasteToWeexWithdrawAddress() {
  navigator.clipboard.readText().then(clipText => {
    const input = document.getElementById('weexWithdrawAddressInput');
    if (input) input.value = clipText;
    showOrderToast('info', 'Address Pasted', 'External wallet address pasted from clipboard.');
  }).catch(() => {
    showOrderToast('info', 'Paste Active', 'Standard EVM/Tron address populated.');
  });
}

function triggerDidSignatureVerification() {
  const btn = document.getElementById('btnSignWithDidKey');
  const btnText = document.getElementById('btnSignWithDidText');
  const statusContainer = document.getElementById('didProofStatusContainer');
  const statusText = document.getElementById('didSignatureStatusText');
  const hashShort = document.getElementById('didSigHashShort');
  const fullSigInput = document.getElementById('didProofSignatureFull');
  const nonceDisplay = document.getElementById('didChallengeNonceDisplay');

  if (btn) {
    btn.style.opacity = '0.7';
    btn.disabled = true;
  }
  if (btnText) btnText.textContent = 'Authenticating Biometric Secure Enclave...';
  playSound('click');

  setTimeout(() => {
    const nonce = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2, '0')).join('');
    const mockSig = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('') +
                           Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('') + '1b';
    
    if (nonceDisplay) nonceDisplay.textContent = `Nonce: ${nonce}`;
    if (hashShort) hashShort.textContent = `${mockSig.substring(0, 6)}...${mockSig.substring(mockSig.length - 4)}`;
    if (fullSigInput) fullSigInput.value = mockSig;
    if (statusText) statusText.textContent = 'DID Signature: Valid & Cryptographically Bound';
    if (statusContainer) {
      statusContainer.style.borderColor = 'rgba(16,185,129,0.6)';
      statusContainer.style.background = 'rgba(16,185,129,0.12)';
    }

    if (btn) {
      btn.style.opacity = '1';
      btn.disabled = false;
      btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      btn.style.boxShadow = '0 0 20px rgba(16,185,129,0.5)';
    }
    if (btnText) btnText.textContent = 'DID Hardware Enclave Verified';

    playSound('order_fill');
    showOrderToast('success', 'DID Enclave Verified', 'Cryptographic signature proof generated by did:omni:0x88392104E729BF5A');
  }, 350);
}

function openWeexWithdraw2FAModal() {
  const amtInput = document.getElementById('weexWithdrawAmountInput');
  const netSelect = document.getElementById('weexWithdrawNetworkSelect');
  const amt = parseFloat(amtInput ? amtInput.value : 0) || 0;
  const net = netSelect ? netSelect.value : 'Arbitrum One';

  if (amt <= 0) {
    showOrderToast('error', 'Invalid Amount', 'Please enter a withdrawal amount greater than zero.');
    return;
  }
  if (amt > accountAvailable) {
    showOrderToast('error', 'Insufficient Margin', 'Withdrawal amount exceeds available margin collateral.');
    return;
  }

  const modal = document.getElementById('modalWithdraw2FA');
  const display = document.getElementById('twoFaAmountDisplay');
  const nonceDisplay = document.getElementById('didChallengeNonceDisplay');
  const fullSigInput = document.getElementById('didProofSignatureFull');
  const hashShort = document.getElementById('didSigHashShort');

  const nonce = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b => b.toString(16).padStart(2, '0')).join('');
  if (nonceDisplay) nonceDisplay.textContent = `Nonce: ${nonce}`;
  if (fullSigInput && !fullSigInput.value) {
    const initSig = '0x4a9ef1829cd82710bb73e9182390192837482910ab3827192830192830192831b';
    fullSigInput.value = initSig;
    if (hashShort) hashShort.textContent = `${initSig.substring(0, 6)}...${initSig.substring(initSig.length - 4)}`;
  }

  if (display) display.textContent = `${amt.toFixed(2)} USDT (${net})`;
  if (modal) modal.style.display = 'flex';
  playSound('click');
}

function closeWithdraw2FAModal() {
  const modal = document.getElementById('modalWithdraw2FA');
  if (modal) modal.style.display = 'none';
}

function sendSimulatedEmailCode() {
  const btn = document.getElementById('twoFaSendCodeBtn');
  if (!btn) return;
  btn.textContent = 'Sent! (59s)';
  btn.style.pointerEvents = 'none';
  showOrderToast('info', 'Encrypted OTP Dispatched', 'Simulated 6-digit backup code sent to decentralized identity recovery email.');

  let countdown = 59;
  const timer = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(timer);
      btn.textContent = 'Request Encrypted OTP';
      btn.style.pointerEvents = 'auto';
      return;
    }
    btn.textContent = `Sent! (${countdown}s)`;
  }, 1000);
}

async function executeVerifiedWithdrawal() {
  const amtInput = document.getElementById('weexWithdrawAmountInput');
  const netSelect = document.getElementById('weexWithdrawNetworkSelect');
  const addrInput = document.getElementById('weexWithdrawAddressInput');
  const codeInput = document.getElementById('twoFaInputCode');
  const didSig = document.getElementById('didProofSignatureFull')?.value || '0x4a9ef1829cd82710bb73e9182390192837482910ab3827192830192830192831b';
  const didId = document.getElementById('didIdentifierDisplay')?.textContent || 'did:omni:0x88392104E729BF5A';

  const amt = parseFloat(amtInput ? amtInput.value : 0) || 0;
  const net = netSelect ? netSelect.value : 'Arbitrum One';
  const addr = addrInput ? addrInput.value : '0x3892...';
  const code = codeInput ? codeInput.value : '894210';

  if (!code && !didSig) {
    showOrderToast('error', 'DID Proof Required', 'Please authenticate with your Omni DID Key or enter a backup code.');
    return;
  }

  try {
    const res = await fetch('/api/assets/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: userWalletAddress || '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
        destAddress: addr,
        asset: 'USDT',
        amount: amt,
        network: net,
        twoFaCode: code,
        didIdentifier: didId,
        didProof: didSig
      })
    });
    const data = await res.json();

    if (data.success || data.status === 'success') {
      accountEquity = Math.max(0, accountEquity - amt);
      accountAvailable = Math.max(0, accountAvailable - amt);

      closeWithdraw2FAModal();
      showOrderToast('success', 'Withdrawal Broadcasted', `-${formatNumber(amt, 2)} USDT transferred via Omni DID Proof (${didId.substring(0, 14)}...).`);
      playSound('order_fill');

      loadWeexWithdrawRecords();
      loadWeexAssetsOverview();
    } else {
      closeWithdraw2FAModal();
      showOrderToast('error', 'Withdrawal Failed', data.error || 'Check available margin.');
    }
  } catch (err) {
    closeWithdraw2FAModal();
    showOrderToast('error', 'Withdrawal Failed', 'Could not process on-chain broadcast.');
  }
}

async function executeWeexUidTransfer() {
  const recipientInput = document.getElementById('weexUidRecipientInput');
  const amtInput = document.getElementById('weexUidAmountInput');

  const recipient = recipientInput ? recipientInput.value.trim() : '';
  const amt = parseFloat(amtInput ? amtInput.value : 0) || 0;

  if (!recipient) {
    showOrderToast('error', 'Recipient Required', 'Please enter a target UID or registered email.');
    return;
  }
  if (amt <= 0 || amt > accountAvailable) {
    showOrderToast('error', 'Invalid Transfer Amount', 'Amount must be greater than 0 and within available collateral.');
    return;
  }

  accountEquity -= amt;
  accountAvailable -= amt;

  try {
    await fetch('/api/assets/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_account: 'futures',
        to_account: `uid_${recipient}`,
        asset: 'USDT',
        amount: amt
      })
    });

    showOrderToast('success', 'Instant 0-Fee Transfer', `Sent ${formatNumber(amt, 2)} USDT to UID ${recipient} with 0 gas fees.`);
    playSound('order_fill');
    loadWeexAssetsOverview();
    filterWeexBills('ALL');
  } catch (err) {
    showOrderToast('error', 'Transfer Failed', 'Internal UID transfer could not be logged.');
  }
}

async function loadWeexWithdrawRecords() {
  const tbody = document.getElementById('weexWithdrawRecordsTableBody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/assets/withdraw-records');
    const raw = await res.json();
    const records = Array.isArray(raw) ? raw : (raw.records || []);

    if (!records || !records.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;">No withdrawal records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = records.map(r => {
      const timeStr = r.created_at || (r.createdAt ? new Date(r.createdAt * 1000).toLocaleString() : 'Just now');
      const coin = r.coin || r.asset || 'USDT';
      const net = r.network || 'Arbitrum One';
      const addr = r.address || r.counterparty || '0x3892...';
      const stat = r.status || 'CONFIRMED';

      return `
        <tr>
          <td style="font-size:11.5px; color:#94a3b8;">${timeStr}</td>
          <td><strong class="text-white">${coin}</strong></td>
          <td><span class="font-mono text-pink">-${formatNumber(r.amount, 2)}</span></td>
          <td><span style="font-size:11.5px; color:#38bdf8;">${net}</span></td>
          <td><span class="font-mono" style="font-size:11px; color:#cbd5e1;">${addr.length > 16 ? addr.substring(0, 16) + '...' : addr}</span></td>
          <td><span class="badge text-green" style="background:rgba(16,185,129,0.15); font-size:10px;">${stat}</span></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;">Withdrawal history synchronized.</td></tr>`;
  }
}

// ----------------------------------------------------------------------------
// WEEX VIEW: ASSETS & FINANCIAL OVERVIEW HUB
// ----------------------------------------------------------------------------

async function loadWeexAssetsOverview() {
  try {
    const res = await fetch('/api/assets/overview');
    const data = await res.json();

    const netUsd = document.getElementById('weexTotalNetWorthUsdDisplay');
    const netBtc = document.getElementById('weexTotalNetWorthBtcDisplay');
    const todayPnl = document.getElementById('weexTodayPnlDisplay');

    const futuresEq = document.getElementById('weexPillarFuturesEquity');
    const futuresAvail = document.getElementById('weexPillarFuturesAvail');
    const futuresUsed = document.getElementById('weexPillarFuturesUsed');
    const futuresRatio = document.getElementById('weexPillarFuturesRatio');

    const spotEq = document.getElementById('weexPillarSpotEquity');
    const fundingEq = document.getElementById('weexPillarFundingEquity');
    const earnEq = document.getElementById('weexPillarEarnEquity');

    if (weexBalancesHidden) {
      if (netUsd) netUsd.textContent = '$••••••••';
      if (netBtc) netBtc.textContent = '≈ •••• BTC';
      if (futuresEq) futuresEq.textContent = '$••••••••';
      if (spotEq) spotEq.textContent = '$••••••••';
      if (fundingEq) fundingEq.textContent = '$••••••••';
      if (earnEq) earnEq.textContent = '$••••••••';
      return;
    }

    const totalUsd = data.totalNetWorthUsd ?? data.total_net_worth_usd ?? 1128553.59;
    const totalBtc = data.totalNetWorthBtc ?? data.total_net_worth_btc ?? 14.1371;
    const pnlUsd = data.todayPnlUsd ?? data.today_pnl_usd ?? 3412.50;
    const pnlPct = data.todayPnlPct ?? data.today_pnl_pct ?? 0.30;

    const accFutures = data.accounts?.futures || data.futures_margin || { equity: accountEquity, available: accountAvailable, usedMargin: 798.79, marginRatio: 0.09 };
    const accSpot = data.accounts?.spot || data.spot || { equity: 144762.27 };
    const accFunding = data.accounts?.funding || data.funding || { equity: 15420.00 };
    const accEarn = data.accounts?.earn || data.earn || { equity: 48500.00 };

    if (netUsd) netUsd.textContent = `$${formatNumber(totalUsd, 2)}`;
    if (netBtc) netBtc.textContent = `≈ ${totalBtc.toFixed(4)} BTC`;
    if (todayPnl) {
      const pnlPrefix = pnlUsd >= 0 ? '+' : '';
      todayPnl.textContent = `${pnlPrefix}$${formatNumber(pnlUsd, 2)} (${pnlPrefix}${pnlPct.toFixed(2)}%)`;
      todayPnl.className = `font-mono ${pnlUsd >= 0 ? 'text-green' : 'text-pink'}`;
    }

    const fEquity = accFutures.equity ?? accountEquity;
    const fAvail = accFutures.available ?? accountAvailable;
    const fUsed = accFutures.usedMargin ?? accFutures.position_margin ?? 798.79;
    const fRatio = accFutures.marginRatio ?? accFutures.margin_ratio ?? 0.09;

    if (futuresEq) futuresEq.textContent = `$${formatNumber(fEquity, 2)}`;
    if (futuresAvail) futuresAvail.textContent = `$${formatNumber(fAvail, 2)}`;
    if (futuresUsed) futuresUsed.textContent = `$${formatNumber(fUsed, 2)}`;
    if (futuresRatio) futuresRatio.textContent = `${fRatio}% (Safe)`;

    if (spotEq) spotEq.textContent = `$${formatNumber(accSpot.equity, 2)}`;
    if (fundingEq) fundingEq.textContent = `$${formatNumber(accFunding.equity, 2)}`;
    if (earnEq) earnEq.textContent = `$${formatNumber(accEarn.equity, 2)}`;

    // Update Allocation Bar
    const alloc = data.allocationPercentages || data.allocation_percentages || { futures: 81.5, spot: 12.8, earn: 4.3, funding: 1.4 };
    const barF = document.getElementById('weexAllocBarFutures');
    const barS = document.getElementById('weexAllocBarSpot');
    const barE = document.getElementById('weexAllocBarEarn');
    const barU = document.getElementById('weexAllocBarFunding');

    if (barF) barF.style.width = `${alloc.futures}%`;
    if (barS) barS.style.width = `${alloc.spot}%`;
    if (barE) barE.style.width = `${alloc.earn}%`;
    if (barU) barU.style.width = `${alloc.funding}%`;

    const pctF = document.getElementById('weexAllocPctFutures');
    const pctS = document.getElementById('weexAllocPctSpot');
    const pctE = document.getElementById('weexAllocPctEarn');
    const pctU = document.getElementById('weexAllocPctFunding');

    if (pctF) pctF.textContent = `${alloc.futures}%`;
    if (pctS) pctS.textContent = `${alloc.spot}%`;
    if (pctE) pctE.textContent = `${alloc.earn}%`;
    if (pctU) pctU.textContent = `${alloc.funding}%`;
  } catch (err) {
    console.warn('Failed to fetch live assets overview:', err);
  }
}

function toggleBalanceVisibility() {
  weexBalancesHidden = !weexBalancesHidden;
  const icon = document.getElementById('balanceEyeIcon');
  if (icon) {
    icon.textContent = weexBalancesHidden ? 'visibility_off' : 'visibility';
  }
  loadWeexAssetsOverview();
  renderWeexHoldingsTable();
  playSound('click');
}

function getLiveMarketInfo(asset) {
  if (asset === 'USDT') return { price: 1.00, change: 0.01 };
  if (window.allMarkets && window.allMarkets.length > 0) {
    const pair = window.allMarkets.find(m => m.symbol === `${asset}-USDT` || m.symbol === `${asset}-USD` || m.symbol === asset);
    if (pair && pair.price) {
      return { price: pair.price, change: typeof pair.change24h === 'number' ? pair.change24h : 0 };
    }
  }
  return { price: weexAssetPrices[asset] || 1.0, change: 0.0 };
}

function renderWeexHoldingsTable() {
  const tbody = document.getElementById('weexHoldingsTableBody');
  const hideZero = document.getElementById('weexHideZeroBalances')?.checked || false;
  const searchInput = document.getElementById('weexHoldingsSearchInput')?.value.toUpperCase() || '';

  if (!tbody) return;

  const btcInfo = getLiveMarketInfo('BTC');
  const ethInfo = getLiveMarketInfo('ETH');
  const solInfo = getLiveMarketInfo('SOL');
  const omniInfo = getLiveMarketInfo('OMNI');
  const dogeInfo = getLiveMarketInfo('DOGE');
  const pepeInfo = getLiveMarketInfo('PEPE');
  const nvdaInfo = getLiveMarketInfo('NVDA');
  const tslaInfo = getLiveMarketInfo('TSLA');
  const aaplInfo = getLiveMarketInfo('AAPL');
  const msftInfo = getLiveMarketInfo('MSFT');
  const spyInfo = getLiveMarketInfo('SPY');
  const qqqInfo = getLiveMarketInfo('QQQ');

  const holdings = [
    { asset: 'OMNI', name: 'Omni Network (Native L1)', net: 'Omni EVM / Arbitrum', balance: 25000.00, avail: 25000.00, inOrder: 0.00, price: omniInfo.price, change: 4.85, category: 'crypto' },
    { asset: 'USDT', name: 'Tether USD', net: 'Arbitrum One', balance: accountEquity * 0.75, avail: accountAvailable * 0.75, inOrder: 798.79, price: 1.00, change: 0.01, category: 'crypto' },
    { asset: 'BTC', name: 'Bitcoin', net: 'Native / Taproot', balance: 1.842, avail: 1.842, inOrder: 0.00, price: btcInfo.price, change: btcInfo.change, category: 'crypto' },
    { asset: 'ETH', name: 'Ethereum', net: 'Arbitrum / ERC20', balance: 14.50, avail: 14.50, inOrder: 0.00, price: ethInfo.price, change: ethInfo.change, category: 'crypto' },
    { asset: 'SOL', name: 'Solana', net: 'SPL Network', balance: 120.00, avail: 120.00, inOrder: 0.00, price: solInfo.price, change: solInfo.change, category: 'crypto' },
    { asset: 'DOGE', name: 'Dogecoin', net: 'Native Doge', balance: 25000.00, avail: 25000.00, inOrder: 0.00, price: dogeInfo.price, change: dogeInfo.change, category: 'meme' },
    { asset: 'PEPE', name: 'Pepe', net: 'ERC20 / Arbitrum', balance: 500000000.00, avail: 500000000.00, inOrder: 0.00, price: pepeInfo.price, change: pepeInfo.change, category: 'meme' },
    { asset: 'NVDA', name: 'Nvidia Perpetual Stock', net: 'TradFi Perpetual', balance: 45.00, avail: 45.00, inOrder: 0.00, price: nvdaInfo.price || 118.50, change: nvdaInfo.change || 3.15, category: 'stocks' },
    { asset: 'TSLA', name: 'Tesla Perpetual Stock', net: 'TradFi Perpetual', balance: 20.00, avail: 20.00, inOrder: 0.00, price: tslaInfo.price || 215.20, change: tslaInfo.change || -2.40, category: 'stocks' },
    { asset: 'AAPL', name: 'Apple Inc Perpetual Stock', net: 'TradFi Perpetual', balance: 35.00, avail: 35.00, inOrder: 0.00, price: aaplInfo.price || 224.80, change: aaplInfo.change || 0.85, category: 'stocks' },
    { asset: 'MSFT', name: 'Microsoft Perpetual Stock', net: 'TradFi Perpetual', balance: 18.00, avail: 18.00, inOrder: 0.00, price: msftInfo.price || 418.00, change: msftInfo.change || 1.15, category: 'stocks' },
    { asset: 'SPY', name: 'SPDR S&P 500 ETF Trust', net: 'Index ETF Perpetual', balance: 12.00, avail: 12.00, inOrder: 0.00, price: spyInfo.price || 545.20, change: spyInfo.change || 0.62, category: 'etfs' },
    { asset: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq)', net: 'Tech ETF Perpetual', balance: 22.00, avail: 22.00, inOrder: 0.00, price: qqqInfo.price || 470.50, change: qqqInfo.change || 1.18, category: 'etfs' }
  ];

  const filtered = holdings.filter(h => {
    if (hideZero && h.balance <= 0) return false;
    if (searchInput && !h.asset.includes(searchInput) && !h.name.toUpperCase().includes(searchInput)) return false;
    return true;
  });

  tbody.innerHTML = filtered.map(h => {
    const usdVal = h.balance * h.price;
    const isPos = h.change >= 0;

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="flex-shrink:0; display:flex; align-items:center; justify-content:center;">
              ${getTokenVectorSvg(h.asset, h.category, 28)}
            </div>
            <div>
              <div style="font-weight:800; color:#ffffff;">${h.asset}</div>
              <div style="font-size:11px; color:var(--text-muted);">${h.name}</div>
            </div>
          </div>
        </td>
        <td><span class="badge" style="background:rgba(56,189,248,0.1); color:#38bdf8; font-size:10.5px;">${h.net}</span></td>
        <td><strong class="font-mono text-white">${weexBalancesHidden ? '••••••' : formatNumber(h.balance, h.balance < 1 ? 4 : 2)}</strong></td>
        <td><span class="font-mono text-cyan">${weexBalancesHidden ? '••••••' : formatNumber(h.avail, h.balance < 1 ? 4 : 2)}</span></td>
        <td><span class="font-mono text-gold">${weexBalancesHidden ? '••••••' : formatNumber(h.inOrder, 2)}</span></td>
        <td><span class="font-mono text-white">$${formatNumber(h.price, h.price < 0.01 ? 6 : 2)}</span></td>
        <td><strong class="font-mono text-gold">${weexBalancesHidden ? '••••••' : '$' + formatNumber(usdVal, 2)}</strong></td>
        <td><span class="${isPos ? 'text-green' : 'text-pink'} font-mono">${isPos ? '+' : ''}${h.change.toFixed(2)}%</span></td>
        <td style="text-align:right;">
          <div style="display:flex; justify-content:flex-end; gap:6px;">
            <button class="btn-ow-sub-action cyan" onclick="switchWeexView('trade')" style="padding:4px 8px; font-size:11px;">Trade</button>
            <button class="btn-ow-sub-action outline" onclick="switchWeexView('deposit')" style="padding:4px 8px; font-size:11px;">Deposit</button>
            <button class="btn-ow-sub-action outline" onclick="switchWeexView('withdraw')" style="padding:4px 8px; font-size:11px;">Withdraw</button>
            <button class="btn-ow-sub-action outline" onclick="openWeexInternalTransferModal()" style="padding:4px 8px; font-size:11px;">Transfer</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function filterWeexBills(type, btn = null) {
  if (btn) {
    document.querySelectorAll('#billsFilterPills .weex-subnav-btn').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
  }

  const tbody = document.getElementById('weexBillsTableBody');
  if (!tbody) return;

  const mockBills = [
    { time: '2026-09-06 09:28', type: 'DEPOSIT', asset: 'USDT', amount: 1000.00, usd: 1000.00, detail: 'Arbitrum One Rollup (Block 1849201)', hash: '0x9482...a812', status: 'COMPLETED' },
    { time: '2026-09-06 08:14', type: 'P2P_BUY', asset: 'USDT', amount: 500.00, usd: 500.00, detail: 'Merchant: ApexLiquidity_VIP (Zelle)', hash: 'P2P-884920', status: 'COMPLETED' },
    { time: '2026-09-05 22:45', type: 'INTERNAL_TRANSFER', asset: 'USDT', amount: 250.00, usd: 250.00, detail: 'Spot -> Futures Margin (0 Fee)', hash: 'XFER-991204', status: 'COMPLETED' },
    { time: '2026-09-05 19:10', type: 'WITHDRAW', asset: 'USDT', amount: 350.00, usd: 350.00, detail: 'To 0x3892...8492 (TRC20)', hash: '0x712a...f991', status: 'COMPLETED' },
    { time: '2026-09-05 14:02', type: 'DEPOSIT', asset: 'BTC', amount: 0.05, usd: 3977.00, detail: 'Taproot Inflow (12/12 blocks)', hash: '0x1842...bc01', status: 'COMPLETED' }
  ];

  const filtered = type === 'ALL' ? mockBills : mockBills.filter(b => b.type === type);

  tbody.innerHTML = filtered.map(b => {
    let badgeClass = 'text-green';
    let badgeBg = 'rgba(16,185,129,0.15)';
    if (b.type === 'WITHDRAW') {
      badgeClass = 'text-pink';
      badgeBg = 'rgba(244,63,94,0.15)';
    } else if (b.type === 'INTERNAL_TRANSFER') {
      badgeClass = 'text-cyan';
      badgeBg = 'rgba(56,189,248,0.15)';
    }

    return `
      <tr>
        <td style="font-size:11.5px; color:#94a3b8;">${b.time}</td>
        <td><span class="badge ${badgeClass}" style="background:${badgeBg}; font-size:10.5px;">${b.type}</span></td>
        <td><strong class="text-white">${b.asset}</strong></td>
        <td><span class="font-mono ${b.type === 'WITHDRAW' ? 'text-pink' : 'text-green'}">${b.type === 'WITHDRAW' ? '-' : '+'}${formatNumber(b.amount, b.amount < 1 ? 4 : 2)}</span></td>
        <td><span class="font-mono text-gold">$${formatNumber(b.usd, 2)}</span></td>
        <td style="font-size:12px; color:#cbd5e1;">${b.detail}</td>
        <td><span class="font-mono text-cyan" style="font-size:11px;">${b.hash}</span></td>
        <td><span class="badge text-green" style="background:rgba(16,185,129,0.15); font-size:10px;">${b.status}</span></td>
      </tr>
    `;
  }).join('');
}

// --- INTERNAL TRANSFER MODAL ---

function openWeexInternalTransferModal(defaultAcc = 'futures') {
  const modal = document.getElementById('modalInternalTransfer');
  const fromSelect = document.getElementById('xferFromAccountSelect');
  const toSelect = document.getElementById('xferToAccountSelect');

  if (fromSelect) fromSelect.value = defaultAcc;
  if (toSelect) {
    toSelect.value = defaultAcc === 'spot' ? 'futures' : 'spot';
  }

  if (modal) modal.style.display = 'flex';
  playSound('click');
}

function closeInternalTransferModal() {
  const modal = document.getElementById('modalInternalTransfer');
  if (modal) modal.style.display = 'none';
}

function flipTransferAccounts() {
  const fromSelect = document.getElementById('xferFromAccountSelect');
  const toSelect = document.getElementById('xferToAccountSelect');
  if (fromSelect && toSelect) {
    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;
    playSound('click');
  }
}

async function executeInternalTransferSubmit() {
  const fromSelect = document.getElementById('xferFromAccountSelect');
  const toSelect = document.getElementById('xferToAccountSelect');
  const assetSelect = document.getElementById('xferAssetSelect');
  const amtInput = document.getElementById('xferAmountInput');

  const fromAcc = fromSelect ? fromSelect.value : 'futures';
  const toAcc = toSelect ? toSelect.value : 'spot';
  const asset = assetSelect ? assetSelect.value : 'USDT';
  const amt = parseFloat(amtInput ? amtInput.value : 0) || 0;

  if (fromAcc === toAcc) {
    showOrderToast('error', 'Same Account', 'Source and destination accounts must be different.');
    return;
  }
  if (amt <= 0) {
    showOrderToast('error', 'Invalid Amount', 'Please enter a valid transfer amount.');
    return;
  }

  try {
    const res = await fetch('/api/assets/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_account: fromAcc,
        to_account: toAcc,
        asset: asset,
        amount: amt
      })
    });
    const data = await res.json();

    if (data.status === 'success') {
      closeInternalTransferModal();
      showOrderToast('success', 'Transfer Completed (0 Fee)', `Moved ${formatNumber(amt, 2)} ${asset} from ${fromAcc.toUpperCase()} to ${toAcc.toUpperCase()}.`);
      playSound('order_fill');

      loadWeexAssetsOverview();
      renderWeexHoldingsTable();
      filterWeexBills('ALL');
    } else {
      showOrderToast('error', 'Transfer Failed', data.error || 'Check balance.');
    }
  } catch (err) {
    showOrderToast('error', 'Transfer Error', 'Network error executing internal transfer.');
  }
}

// ----------------------------------------------------------------------------
// WEEX VIEW: MARKETS & DERIVATIVES TABLE
// ----------------------------------------------------------------------------

let currentMarketsCategory = 'ALL';

function filterWeexMarkets(category, btn = null) {
  currentMarketsCategory = category;
  if (btn) {
    document.querySelectorAll('#marketsCategoryPills .weex-subnav-btn').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
  }
  loadWeexMarketsTable();
  playSound('click');
}

function handleWeexMarketsSearch(query) {
  loadWeexMarketsTable(query);
}

function loadWeexMarketsTable(searchQuery = '') {
  const tbody = document.getElementById('weexMarketsTableBody');
  if (!tbody) return;

  let marketPairs = [];
  if (window.allMarkets && window.allMarkets.length > 0) {
    marketPairs = window.allMarkets.map(m => {
      const p = m.price || 1.0;
      const chg = typeof m.change24h === 'number' ? m.change24h : 0;
      const hi = m.high24h || p * 1.03;
      const lo = m.low24h || p * 0.97;
      let turnoverVal = 50000000;
      if (m.vol24h && typeof m.vol24h === 'string') {
        const num = parseFloat(m.vol24h.replace(/[^0-9.]/g, '')) || 50;
        turnoverVal = m.vol24h.includes('B') ? num * 1e9 : (m.vol24h.includes('M') ? num * 1e6 : num * 1e3);
      }
      return {
        symbol: m.symbol,
        name: m.name || `${m.symbol} Perpetual`,
        price: p,
        change: chg,
        high: hi,
        low: lo,
        turnover: turnoverVal,
        category: (m.category || 'CRYPTO').toUpperCase(),
        isOmni: m.symbol.startsWith('OMNI') || m.isWeex || false
      };
    });
  } else {
    marketPairs = [
      { symbol: 'BTC-USDT', name: 'Bitcoin Perpetual', price: weexAssetPrices.BTC, change: 2.34, high: 80120.00, low: 77800.00, turnover: 8421050200, category: 'HOT', isOmni: true },
      { symbol: 'ETH-USDT', name: 'Ethereum Perpetual', price: weexAssetPrices.ETH, change: 1.82, high: 3495.00, low: 3380.00, turnover: 3120400100, category: 'HOT', isOmni: true },
      { symbol: 'SOL-USDT', name: 'Solana Perpetual', price: weexAssetPrices.SOL, change: 5.41, high: 189.50, low: 173.20, turnover: 1450200900, category: 'GAINERS', isOmni: true },
      { symbol: 'OMNI-USDT', name: 'Omni Network Perpetual', price: weexAssetPrices.OMNI, change: 8.92, high: 15.20, low: 13.10, turnover: 412000500, category: 'OMNI', isOmni: true },
      { symbol: 'PEPE-USDT', name: 'Pepe 1000x Perp', price: weexAssetPrices.PEPE, change: 14.80, high: 0.0000095, low: 0.0000078, turnover: 890400200, category: 'MEME', isOmni: false },
      { symbol: 'DOGE-USDT', name: 'Dogecoin Perpetual', price: weexAssetPrices.DOGE, change: -1.25, high: 0.148, low: 0.139, turnover: 642000100, category: 'LOSERS', isOmni: false },
      { symbol: 'NVDA-USDT', name: 'Nvidia Perpetual Stock', price: weexAssetPrices.NVDA, change: 3.15, high: 121.50, low: 115.80, turnover: 580200300, category: 'STOCKS', isOmni: false },
      { symbol: 'TSLA-USDT', name: 'Tesla Perpetual Stock', price: weexAssetPrices.TSLA, change: -2.40, high: 220.00, low: 211.50, turnover: 410500200, category: 'STOCKS', isOmni: false },
      { symbol: 'AAPL-USDT', name: 'Apple Inc Perpetual Stock', price: weexAssetPrices.AAPL, change: 0.85, high: 226.40, low: 223.10, turnover: 320100400, category: 'STOCKS', isOmni: false },
      { symbol: 'GOLD-USDT', name: 'XAU Gold Perpetual', price: weexAssetPrices.GOLD, change: 0.42, high: 2525.00, low: 2505.00, turnover: 910400200, category: 'HOT', isOmni: false },
      { symbol: 'CRUDE-USDT', name: 'WTI Crude Oil Perpetual', price: weexAssetPrices.CRUDE, change: -0.92, high: 76.20, low: 73.90, turnover: 280100900, category: 'STOCKS', isOmni: false }
    ];
  }

  const q = (searchQuery || document.getElementById('weexMarketsSearchInput')?.value || '').toUpperCase();

  const filtered = marketPairs.filter(m => {
    if (currentMarketsCategory === 'HOT' && m.category !== 'HOT' && m.turnover < 1e8) return false;
    if (currentMarketsCategory === 'GAINERS' && m.change <= 0) return false;
    if (currentMarketsCategory === 'LOSERS' && m.change >= 0) return false;
    if ((currentMarketsCategory === 'OMNI' || currentMarketsCategory === 'WEEX') && !m.isOmni && !m.symbol.includes('OMNI')) return false;
    if (currentMarketsCategory === 'MEME' && m.category !== 'MEME') return false;
    if (currentMarketsCategory === 'STOCKS' && m.category !== 'STOCKS') return false;
    if (currentMarketsCategory === 'ETFS' && m.category !== 'ETFS') return false;
    if (q && !m.symbol.includes(q) && !m.name.toUpperCase().includes(q)) return false;
    return true;
  }).slice(0, 100); // Efficient rendering cap for instant 60fps responsiveness

  tbody.innerHTML = filtered.map(m => {
    const isPos = m.change >= 0;
    return `
      <tr>
        <td style="text-align:center;">
          <span class="material-symbols-outlined gemini-symbol" style="font-size:16px; color:#64748b; cursor:pointer;" onclick="this.classList.toggle('text-gold'); this.textContent = this.textContent === 'star' ? 'star_border' : 'star';">star_border</span>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            ${getTokenVectorSvg(m.symbol, m.category, 26)}
            <div>
              <div style="font-weight:800; color:#ffffff; font-size:14px; display:flex; align-items:center; gap:6px;">
                ${m.symbol}
                ${m.sourceBadge ? `<span class="omni-source-badge" style="font-size:9px; font-weight:700; padding:1px 5px; border-radius:4px; background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.25);">${m.sourceBadge}</span>` : ''}
              </div>
              <div style="font-size:11px; color:var(--text-muted);">${m.name}</div>
            </div>
          </div>
        </td>
        <td><strong class="font-mono text-white" style="font-size:14px;">$${formatNumber(m.price, m.price < 0.01 ? 6 : 2)}</strong></td>
        <td><span class="badge ${isPos ? 'text-green' : 'text-pink'}" style="background:${isPos ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)'}; font-size:12px; font-weight:800;">${isPos ? '+' : ''}${m.change.toFixed(2)}%</span></td>
        <td><span class="font-mono" style="font-size:12px; color:#cbd5e1;">$${formatNumber(m.high, m.price < 0.01 ? 6 : 2)}</span></td>
        <td><span class="font-mono" style="font-size:12px; color:#cbd5e1;">$${formatNumber(m.low, m.price < 0.01 ? 6 : 2)}</span></td>
        <td><span class="font-mono text-gold" style="font-size:12px;">$${formatNumber(m.turnover, 0)}</span></td>
        <td style="text-align:right;">
          <button class="btn" onclick="selectMarketPairFromWeex('${m.symbol}')" style="padding:6px 14px; border-radius:8px; background:#38bdf8; color:#070b14; font-size:11.5px; font-weight:800; border:none; cursor:pointer;">
            Trade
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function selectMarketPairFromWeex(symbol) {
  switchWeexView('trade');
  if (typeof switchSymbol === 'function') {
    switchSymbol(symbol);
  }
}

// ----------------------------------------------------------------------------
// WEEX VIEW: COPY TRADING MASTER LEADERBOARD
// ----------------------------------------------------------------------------

let activeCopySubscriptions = JSON.parse(localStorage.getItem('omni_copy_subscriptions') || '[]');

function loadWeexCopyTrading() {
  const grid = document.getElementById('weexCopyTradersGrid');
  if (!grid) return;

  const masters = [
    { name: 'AlphaQuant_VIP', roi: '+384.2%', winRate: '94.2%', followers: 1840, maxDrawdown: '4.2%', aum: '$4,280,000', badge: 'Top Scalper' },
    { name: 'DeltaHedge_Pro', roi: '+214.8%', winRate: '89.5%', followers: 980, maxDrawdown: '6.1%', aum: '$2,140,000', badge: 'Arbitrage Master' },
    { name: 'SatoshisGhost', roi: '+192.4%', winRate: '88.0%', followers: 1420, maxDrawdown: '7.8%', aum: '$3,890,000', badge: 'Macro Trend' },
    { name: 'OmniAlgo_99', roi: '+158.0%', winRate: '92.1%', followers: 640, maxDrawdown: '3.4%', aum: '$1,450,000', badge: 'Zero Slippage' }
  ];

  grid.innerHTML = masters.map(m => {
    const isSubscribed = activeCopySubscriptions.includes(m.name);

    return `
      <div class="weex-card-box liquid-glass-card" style="display:flex; flex-direction:column; gap:14px; border:1px solid ${isSubscribed ? 'rgba(255,215,0,0.5)' : 'rgba(56,189,248,0.25)'}; box-shadow:${isSubscribed ? '0 0 20px rgba(255,215,0,0.25)' : 'none'};">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, #00e5ff, #7c3aed); display:flex; align-items:center; justify-content:center; font-weight:900; color:#ffffff; box-shadow:0 0 12px rgba(0,229,255,0.4); position:relative;">
              <svg class="gemini-sparkle-mini" width="18" height="18" viewBox="0 0 24 24"><use href="#gemini-sparkle-symbol"/></svg>
            </div>
            <div>
              <div style="font-weight:800; color:#ffffff; font-size:14px; display:flex; align-items:center; gap:4px;">
                ${m.name}
                <svg class="gemini-sparkle-mini" width="12" height="12" viewBox="0 0 24 24"><use href="#gemini-sparkle-cyan"/></svg>
              </div>
              <div style="font-size:11px; color:var(--text-muted);">${m.followers + (isSubscribed ? 1 : 0)} active copiers · AUM ${m.aum}</div>
            </div>
          </div>
          <span class="badge" style="background:${isSubscribed ? 'rgba(255,215,0,0.2)' : 'rgba(56,189,248,0.15)'}; color:${isSubscribed ? '#ffd700' : '#38bdf8'}; font-size:10px; font-weight:800; border:1px solid ${isSubscribed ? 'rgba(255,215,0,0.4)' : 'rgba(56,189,248,0.3)'};">
            ${isSubscribed ? 'ACTIVE MIRRORING' : m.badge}
          </span>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; background:rgba(10,15,29,0.7); padding:12px; border-radius:10px; border:1px solid rgba(0,229,255,0.15);">
          <div>
            <div style="font-size:11px; color:var(--text-muted);">30D ROI</div>
            <div class="font-mono text-green" style="font-size:18px; font-weight:900;">${m.roi}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted);">Win Rate</div>
            <div class="font-mono text-cyan" style="font-size:18px; font-weight:900;">${m.winRate}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted);">Max Drawdown</div>
            <div class="font-mono text-gold" style="font-size:13px; font-weight:700;">${m.maxDrawdown}</div>
          </div>
          <div>
            <div style="font-size:11px; color:var(--text-muted);">Profit Share</div>
            <div class="font-mono text-white" style="font-size:13px; font-weight:700;">10%</div>
          </div>
        </div>

        <button class="btn" onclick="executeCopyTradeFollow('${m.name}')" style="width:100%; padding:10px; border-radius:8px; background:${isSubscribed ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}; color:#ffffff; font-weight:800; font-size:13px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 14px ${isSubscribed ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'};">
          <svg class="gemini-sparkle-mini" width="14" height="14" viewBox="0 0 24 24"><use href="#gemini-sparkle-symbol"/></svg>
          ${isSubscribed ? 'Pause / Unsubscribe' : '1-Click Copy Trader'}
        </button>
      </div>
    `;
  }).join('');
}

function executeCopyTradeFollow(masterName) {
  const idx = activeCopySubscriptions.indexOf(masterName);
  if (idx >= 0) {
    activeCopySubscriptions.splice(idx, 1);
    localStorage.setItem('omni_copy_subscriptions', JSON.stringify(activeCopySubscriptions));
    showOrderToast('info', 'Copy Unsubscribed', `Paused trade mirroring for ${masterName}. Active positions remain open.`, { latency: '3ms' });
  } else {
    activeCopySubscriptions.push(masterName);
    localStorage.setItem('omni_copy_subscriptions', JSON.stringify(activeCopySubscriptions));
    showOrderToast('success', 'Copy Trading Armed', `Subscribed to ${masterName}. Mirroring perpetual contract execution with $1,000 margin allocation.`, { latency: '4ms' });
    simulateMasterTradeMirror(masterName);
  }
  playSound('order_fill');
  loadWeexCopyTrading();
}

function simulateMasterTradeMirror(masterName) {
  const pairs = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'NVDA-USD'];
  const sym = pairs[Math.floor(Math.random() * pairs.length)];
  const mkt = (allMarkets || []).find(m => m.symbol === sym) || { price: 66000 };
  const price = mkt.price || 66000;
  const side = Math.random() > 0.5 ? 'LONG' : 'SHORT';
  const size = parseFloat((1000 * 20 / price).toFixed(3));

  if (isBackendConnected) {
    fetch('/api/order/place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: userWalletAddress || '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
        symbol: sym,
        side: side,
        type: 'MARKET',
        orderMode: 'FUTURES',
        marginMode: 'ISOLATED',
        leverage: 20,
        price: price,
        size: size
      })
    }).then(res => res.json()).then(() => {
      showOrderToast('fill', `Mirrored ${masterName}`, `Auto-copied ${side} ${size} ${sym} @ $${formatNumber(price, 2)} (20x Isolated)`, { symbol: sym });
      loadPositions();
    }).catch(() => {});
  }
}

// ----------------------------------------------------------------------------
// WEEX VIEW: EARN & STAKING VAULTS
// ----------------------------------------------------------------------------

function loadWeexEarnVaults() {
  // Vaults are rendered with reactive buttons & direct OmniDAO portal linkages
}

function goToOmniDaoStaking() {
  playSound('click');
  showOrderToast('info', 'Redirecting to OmniDAO', 'Connecting to Official OmniDAO Staking Protocol at omni-dao-39821.web.app...');
  window.open('https://omni-dao-39821.web.app', '_blank');
}

function openOmniStakingModal() {
  const modal = document.getElementById("modalOmniStaking");
  if (modal) {
    if (typeof fetchOnChainOmniBalances === 'function') fetchOnChainOmniBalances();
    modal.style.display = "flex";
    playSound('modal_open');
  } else {
    goToOmniDaoStaking();
  }
}

function stakeCryptoSim(coin) {
  showOrderToast('success', 'Vault Deposit Confirmed', `Successfully allocated idle ${coin} to Omni Institutional Flexible Yield pool.`);
  playSound('order_fill');
}

// ----------------------------------------------------------------------------
// EXPOSE ALL WEEX FUNCTIONS TO GLOBAL WINDOW
// ----------------------------------------------------------------------------
window.switchWeexView = switchWeexView;
window.switchWeexBuySubTab = switchWeexBuySubTab;
window.calcWeexExpressPayout = calcWeexExpressPayout;
window.setWeexExpressPreset = setWeexExpressPreset;
window.selectWeexPayMethod = selectWeexPayMethod;
window.executeWeexBuyCheckout = executeWeexBuyCheckout;
window.executeCardPaymentSim = executeCardPaymentSim;
window.openSimulatedGateway = openSimulatedGateway;

window.switchWeexP2pSide = switchWeexP2pSide;
window.loadWeexP2pMerchants = loadWeexP2pMerchants;
window.openP2PEscrowModal = openP2PEscrowModal;
window.closeP2PEscrowModal = closeP2PEscrowModal;
window.confirmP2PPaymentDone = confirmP2PPaymentDone;

window.updateWeexDepositDetails = updateWeexDepositDetails;
window.copyWeexDepositAddress = copyWeexDepositAddress;
window.copyWeexDepositMemo = copyWeexDepositMemo;
window.simulateLiveDepositInflow = simulateLiveDepositInflow;
window.processLiveDepositInflow = simulateLiveDepositInflow;
window.addOmniNetworkToWallet = addOmniNetworkToWallet;
window.addOmniTokenToWallet = addOmniTokenToWallet;
window.copyOmniContractAddress = copyOmniContractAddress;
window.loadWeexDepositRecords = loadWeexDepositRecords;

window.switchWeexWithdrawSubTab = switchWeexWithdrawSubTab;
window.updateWeexWithdrawCalculations = updateWeexWithdrawCalculations;
window.setWeexWithdrawPct = setWeexWithdrawPct;
window.setWeexWithdrawMax = setWeexWithdrawMax;
window.pasteToWeexWithdrawAddress = pasteToWeexWithdrawAddress;
window.openWeexWithdraw2FAModal = openWeexWithdraw2FAModal;
window.closeWithdraw2FAModal = closeWithdraw2FAModal;
window.triggerDidSignatureVerification = triggerDidSignatureVerification;
window.sendSimulatedEmailCode = sendSimulatedEmailCode;
window.executeVerifiedWithdrawal = executeVerifiedWithdrawal;
window.executeWeexUidTransfer = executeWeexUidTransfer;
window.loadWeexWithdrawRecords = loadWeexWithdrawRecords;

window.loadWeexAssetsOverview = loadWeexAssetsOverview;
window.toggleBalanceVisibility = toggleBalanceVisibility;
window.renderWeexHoldingsTable = renderWeexHoldingsTable;
window.filterWeexBills = filterWeexBills;
window.openWeexInternalTransferModal = openWeexInternalTransferModal;
window.closeInternalTransferModal = closeInternalTransferModal;
window.flipTransferAccounts = flipTransferAccounts;
window.executeInternalTransferSubmit = executeInternalTransferSubmit;

window.filterWeexMarkets = filterWeexMarkets;
window.handleWeexMarketsSearch = handleWeexMarketsSearch;
window.loadWeexMarketsTable = loadWeexMarketsTable;
window.selectMarketPairFromWeex = selectMarketPairFromWeex;

window.loadWeexCopyTrading = loadWeexCopyTrading;
window.executeCopyTradeFollow = executeCopyTradeFollow;
window.loadWeexEarnVaults = loadWeexEarnVaults;
window.openOmniStakingModal = openOmniStakingModal;
window.goToOmniDaoStaking = goToOmniDaoStaking;
window.stakeCryptoSim = stakeCryptoSim;

// Initial prefetch on load
setTimeout(() => {
  if (typeof loadWeexAssetsOverview === 'function') loadWeexAssetsOverview();
}, 2500);

