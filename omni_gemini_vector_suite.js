/**
 * OMNI ECOSYSTEM - UNIVERSAL MASTER SUITE (v6.0)
 * Features the Official All-Seeing Eye OMNI Token as the Universal Brand Logo across all 12 websites,
 * Card-Only Chromatic Spotlight Light Follower (Zero Tilt),
 * and OMNI Model Suite integrations.
 */
(function() {
  'use strict';

  // 1. Inject Fonts & CDNs if missing
  function injectDependencies() {
    if (!document.getElementById('gemini-material-symbols-link')) {
      const link = document.createElement('link');
      link.id = 'gemini-material-symbols-link';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Rajdhani:wght@600;700&family=Share+Tech+Mono&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block';
      document.head.appendChild(link);
    }

    if (!document.getElementById('gemini-lordicon-cdn') && !window.lordicon) {
      const script = document.createElement('script');
      script.id = 'gemini-lordicon-cdn';
      script.src = 'https://cdn.lordicon.com/lordicon.js';
      document.head.appendChild(script);
    }

    if (!window.OmniAudio && !document.getElementById('omni-sound-engine-script')) {
      const audioScript = document.createElement('script');
      audioScript.id = 'omni-sound-engine-script';
      audioScript.src = 'omni-sound-engine.js';
      document.head.appendChild(audioScript);
    }
  }

  // 2. Inject Global SVG Definitions
  function injectSvgDefs() {
    if (document.getElementById('omni-gemini-svg-defs')) return;

    const svgContainer = document.createElement('div');
    svgContainer.id = 'omni-gemini-svg-defs';
    svgContainer.style.cssText = 'position:absolute; width:0; height:0; overflow:hidden; pointer-events:none; z-index:-1000;';
    svgContainer.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Official Gemini Rainbow Gradient -->
          <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00e5ff"/>
            <stop offset="35%" stop-color="#7c3aed"/>
            <stop offset="70%" stop-color="#db2777"/>
            <stop offset="100%" stop-color="#fbbf24"/>
          </linearGradient>

          <!-- Gemini Cyan Blue Gradient -->
          <linearGradient id="geminiCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00e5ff"/>
            <stop offset="100%" stop-color="#0070f3"/>
          </linearGradient>

          <!-- Gemini Purple Magenta Gradient -->
          <linearGradient id="geminiPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#a855f7"/>
            <stop offset="100%" stop-color="#ec4899"/>
          </linearGradient>

          <!-- Gemini Gold Amber Gradient -->
          <linearGradient id="geminiGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffd700"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>

          <!-- MASTER ALL-SEEING EYE OMNI TOKEN SYMBOL (Official Universal Brand Logo - Continuous Smooth Vector) -->
          <g id="omni-all-seeing-eye-token">
            <circle cx="50" cy="50" r="46" stroke="url(#geminiGoldGrad)" stroke-width="3" fill="none"/>
            <circle cx="50" cy="50" r="41" stroke="rgba(0, 229, 255, 0.45)" stroke-width="1.2" fill="none"/>
            <polygon points="50,10 88,80 12,80" stroke="url(#geminiGrad)" stroke-width="2" stroke-linejoin="round" fill="rgba(124, 58, 237, 0.1)"/>
            <path d="M16 50 C28 32, 72 32, 84 50 C72 68, 28 68, 16 50 Z" fill="#070b14" stroke="url(#geminiGoldGrad)" stroke-width="2.8" stroke-linejoin="round"/>
            <circle cx="50" cy="50" r="16" fill="url(#geminiGrad)" stroke="#00e5ff" stroke-width="1.8"/>
            <path d="M50 34 Q50 50 34 50 Q50 50 50 66 Q50 50 66 50 Q50 50 50 34 Z" fill="#ffffff" filter="drop-shadow(0 0 6px #ffffff)"/>
            <circle cx="50" cy="50" r="3.5" fill="#00e5ff"/>
          </g>

          <!-- 4-Pointed Sparkle Star -->
          <g id="gemini-sparkle-symbol">
            <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" fill="url(#geminiGrad)"/>
          </g>

          <g id="gemini-sparkle-mini">
            <path d="M8 0C8 4.418 4.418 8 0 8C4.418 8 8 11.582 8 16C8 11.582 11.582 8 16 8C11.582 8 8 4.418 8 0Z" fill="url(#geminiCyanGrad)"/>
          </g>
        </defs>
      </svg>
    `;
    document.body.appendChild(svgContainer);
  }

  // 3. Inject Styles (CARD-ONLY Chromatic Light Follower + Logo Styling)
  function injectStyles() {
    if (document.getElementById('omni-gemini-vector-styles')) return;

    const style = document.createElement('style');
    style.id = 'omni-gemini-vector-styles';
    style.textContent = `
      /* Chromatic Color Shift for Card Reflections */
      @keyframes omniChromaticShift {
        0% {
          --omni-glow-1: #00e5ff;
          --omni-glow-2: #7c3aed;
          --omni-glow-3: #e040fb;
        }
        25% {
          --omni-glow-1: #e040fb;
          --omni-glow-2: #ff9100;
          --omni-glow-3: #ffd700;
        }
        50% {
          --omni-glow-1: #ffd700;
          --omni-glow-2: #00ff66;
          --omni-glow-3: #00e5ff;
        }
        75% {
          --omni-glow-1: #00ff66;
          --omni-glow-2: #00e5ff;
          --omni-glow-3: #7c3aed;
        }
        100% {
          --omni-glow-1: #00e5ff;
          --omni-glow-2: #7c3aed;
          --omni-glow-3: #e040fb;
        }
      }

      /* Card-Only Surface Cursor Light Spotlight */
      .card, .tier-card, .ach-card, .mascot-card, .stat-card,
      .quest-row-item, .feature-card, .swap-card, .pool-card,
      .proposal-card, .node-card, .table-card, .model-card,
      .agent-card, .action-card, .hero-card, .dashboard-card,
      .interactive-card, .portal-card, .miner-card, .player-hud-card,
      .glass-card, .beam-panel, .status-panel, .explore-card {
        position: relative;
        overflow: hidden;
      }

      /* Interactive Cursor Tracking Light (Spotlight Follows Mouse - Season Pass Match) */
      .card, .tier-card, .ach-card, .mascot-card, .stat-card,
      .quest-row-item, .feature-card, .swap-card, .pool-card,
      .proposal-card, .node-card, .table-card, .model-card,
      .agent-card, .action-card, .hero-card, .dashboard-card,
      .interactive-card, .portal-card, .miner-card, .player-hud-card,
      .glass-card, .beam-panel, .status-panel, .explore-card,
      .gemini-prompt-card, .photo-item-card, .video-response-card {
        position: relative;
        overflow: hidden;
      }

      .card::after, .tier-card::after, .ach-card::after, .mascot-card::after, .stat-card::after,
      .quest-row-item::after, .feature-card::after, .swap-card::after, .pool-card::after,
      .proposal-card::after, .node-card::after, .table-card::after, .model-card::after,
      .agent-card::after, .action-card::after, .hero-card::after, .dashboard-card::after,
      .interactive-card::after, .portal-card::after, .miner-card::after, .player-hud-card::after,
      .glass-card::after, .beam-panel::after, .status-panel::after, .explore-card::after,
      .gemini-prompt-card::after, .photo-item-card::after, .video-response-card::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: radial-gradient(
          320px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
          rgba(0, 229, 255, 0.18),
          rgba(224, 64, 251, 0.08) 40%,
          transparent 75%
        );
        opacity: 0;
        transition: opacity 0.25s ease;
        border-radius: inherit;
        z-index: 1;
      }

      .card:hover::after, .tier-card:hover::after, .ach-card:hover::after, .mascot-card:hover::after, .stat-card:hover::after,
      .quest-row-item:hover::after, .feature-card:hover::after, .swap-card:hover::after, .pool-card:hover::after,
      .proposal-card:hover::after, .node-card:hover::after, .table-card:hover::after, .model-card:hover::after,
      .agent-card:hover::after, .action-card:hover::after, .hero-card:hover::after, .dashboard-card:hover::after,
      .interactive-card:hover::after, .portal-card:hover::after, .miner-card:hover::after, .player-hud-card:hover::after,
      .glass-card:hover::after, .beam-panel:hover::after, .status-panel:hover::after, .explore-card:hover::after,
      .gemini-prompt-card:hover::after, .photo-item-card:hover::after, .video-response-card:hover::after {
        opacity: 1;
      }

      /* Master OMNI Token Logo Styling */
      .omni-main-token-logo {
        display: inline-block;
        vertical-align: middle;
        width: 28px;
        height: 28px;
        filter: drop-shadow(0 0 8px rgba(0, 229, 255, 0.7));
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .omni-main-token-logo:hover {
        transform: scale(1.1) rotate(5deg);
        filter: drop-shadow(0 0 14px rgba(255, 215, 0, 0.9));
      }

      .gemini-sparkle-icon {
        display: inline-block;
        vertical-align: middle;
        width: 1.25em;
        height: 1.25em;
        filter: drop-shadow(0 0 6px rgba(0, 229, 255, 0.7));
      }

      .material-symbols-outlined.gemini-symbol {
        font-family: 'Material Symbols Outlined' !important;
        font-weight: normal;
        font-style: normal;
        font-size: 20px;
        line-height: 1;
        display: inline-block;
        white-space: nowrap;
        word-wrap: normal;
        direction: ltr;
        -webkit-font-feature-settings: 'liga';
        -webkit-font-smoothing: antialiased;
        vertical-align: middle;
      }
    `;
    document.head.appendChild(style);
  }

  // 4. Card-Only Cursor Coordinate Tracking
  function initCardOnlyLightTracker() {
    window.addEventListener('mousemove', (e) => {
      const card = e.target.closest(
        '.card, .tier-card, .ach-card, .mascot-card, .stat-card, ' +
        '.quest-row-item, .feature-card, .swap-card, .pool-card, ' +
        '.proposal-card, .node-card, .table-card, .model-card, ' +
        '.agent-card, .action-card, .hero-card, .dashboard-card, ' +
        '.interactive-card, .portal-card, .miner-card, .player-hud-card, ' +
        '.glass-card, .beam-panel, .status-panel, .explore-card, ' +
        '.gemini-prompt-card, .photo-item-card, .video-response-card'
      );

      if (card) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      }
    }, { passive: true });
  }

  // 5. Inject Omni Status Pill (with OMNI Token Vector)
  function injectGeminiLivePill() {
    if (document.getElementById('omni-gemini-status-pill')) return;

    const pill = document.createElement('div');
    pill.id = 'omni-gemini-status-pill';
    pill.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(11, 14, 20, 0.88);
      border: 1px solid rgba(0, 229, 255, 0.4);
      padding: 6px 14px;
      border-radius: 30px;
      display: flex;
      align-items: center;
      gap: 8px;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 16px rgba(0, 229, 255, 0.25);
      z-index: 9998;
      font-family: 'Share Tech Mono', monospace;
      font-size: 11px;
      color: #00e5ff;
      pointer-events: auto;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    pill.innerHTML = `
      <svg viewBox="0 0 100 100" width="18" height="18" style="filter:drop-shadow(0 0 4px #ffd700);">
        <use href="#omni-all-seeing-eye-token"/>
      </svg>
      <span>OMNI 3.8 FLASH ACTIVE</span>
    `;

    pill.addEventListener('mouseenter', () => {
      pill.style.transform = 'translateY(-3px) scale(1.04)';
      pill.style.boxShadow = '0 12px 40px rgba(0,0,0,0.8), 0 0 24px rgba(224, 64, 251, 0.5)';
      pill.style.borderColor = 'rgba(224, 64, 251, 0.6)';
    });
    pill.addEventListener('mouseleave', () => {
      pill.style.transform = 'translateY(0) scale(1)';
      pill.style.boxShadow = '0 8px 32px rgba(0,0,0,0.6), 0 0 16px rgba(0, 229, 255, 0.25)';
      pill.style.borderColor = 'rgba(0, 229, 255, 0.4)';
    });

    document.body.appendChild(pill);
  }

  // 6. Make OMNI Token Logo the Official Brand Logo Across Every Website
  function enhanceIcons() {
    // Transform all header / navbar logos into the All-Seeing Eye OMNI Token
    document.querySelectorAll('.logo-icon, .brand-logo-icon, .logo-icon-wrap, .brand-logo, .brand-wrapper .brand-logo-icon, .logo-badge').forEach(el => {
      el.innerHTML = `
        <svg class="omni-main-token-logo" viewBox="0 0 100 100">
          <use href="#omni-all-seeing-eye-token"/>
        </svg>
      `;
    });

    // Also check links with class 'logo'
    document.querySelectorAll('a.logo, .navbar-brand, .header-logo-group').forEach(logoWrap => {
      const existingSvg = logoWrap.querySelector('svg');
      if (existingSvg && !existingSvg.classList.contains('omni-main-token-logo')) {
        existingSvg.outerHTML = `
          <svg class="omni-main-token-logo" viewBox="0 0 100 100">
            <use href="#omni-all-seeing-eye-token"/>
          </svg>
        `;
      }
    });

    // Enhance navigation items with Material Symbols
    document.querySelectorAll('.sub-nav-link, .sidebar-tab-btn, .header-tab').forEach(el => {
      const text = el.textContent.trim();
      if (!el.querySelector('.material-symbols-outlined') && !el.querySelector('.gemini-symbol') && !el.querySelector('svg')) {
        let iconName = 'auto_awesome';
        if (text.includes('Dashboard')) iconName = 'dashboard';
        else if (text.includes('Swap')) iconName = 'currency_exchange';
        else if (text.includes('Pool')) iconName = 'water_drop';
        else if (text.includes('Governance') || text.includes('Vote')) iconName = 'how_to_vote';
        else if (text.includes('Farm') || text.includes('Stake')) iconName = 'savings';
        else if (text.includes('Treasury') || text.includes('Reserve')) iconName = 'account_balance';
        else if (text.includes('Delegate') || text.includes('Council')) iconName = 'groups';
        else if (text.includes('Portfolio') || text.includes('Wallet')) iconName = 'account_balance_wallet';
        else if (text.includes('Network') || text.includes('Node')) iconName = 'hub';
        else if (text.includes('Ledger') || text.includes('Tx')) iconName = 'receipt_long';
        else if (text.includes('About') || text.includes('Info')) iconName = 'info';

        const span = document.createElement('span');
        span.className = 'material-symbols-outlined gemini-symbol';
        span.style.color = '#00e5ff';
        span.style.marginRight = '6px';
        span.textContent = iconName;
        el.prepend(span);
      }
    });

    // Dropdown hover listeners
    document.querySelectorAll('.nav-dropdown, .logo-dropdown-wrapper').forEach(dropdown => {
      let timeoutId;
      dropdown.addEventListener('mouseenter', () => {
        clearTimeout(timeoutId);
        dropdown.classList.add('is-open');
      });
      dropdown.addEventListener('mouseleave', () => {
        timeoutId = setTimeout(() => {
          dropdown.classList.remove('is-open');
        }, 280);
      });
    });
  }

  // Initialize
  function init() {
    injectDependencies();
    injectSvgDefs();
    injectStyles();
    initCardOnlyLightTracker();
    injectGeminiLivePill();
    enhanceIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
