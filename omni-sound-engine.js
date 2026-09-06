/**
 * ============================================================================
 * OMNI AUDIO & GAMIFICATION ENGINE (v5.0)
 * Zero-Dependency Procedural Web Audio API Synthesizer & Arcade SFX Suite
 * ============================================================================
 */

(function() {
  'use strict';

  // Master Audio State
  let audioCtx = null;
  let isMuted = localStorage.getItem('omni_sfx_muted') === 'true';
  let sfxVolume = parseFloat(localStorage.getItem('omni_sfx_volume') || '0.65');

  // Initialize Web Audio Context on first user gesture
  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Safe Audio Unlocking on First Interaction
  function unlockAudioOnGesture() {
    const unlock = () => {
      getAudioContext();
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
  }
  unlockAudioOnGesture();

  // Core Synthesizer Helper
  function playTone(freq, duration, type = 'sine', gainVal = 0.2, startDelay = 0) {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime + startDelay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      const effectiveGain = gainVal * sfxVolume;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, effectiveGain), now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch (e) {
      // Audio fallback
    }
  }

  // 12 Distinct Procedural Sound Effects
  const OmniAudio = {
    // 1. Crisp UI Arcade Click
    playClick() {
      if (isMuted) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
        gain.gain.setValueAtTime(0.18 * sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } catch (e) {}
    },

    // 2. Micro Hover Tone
    playHover() {
      if (isMuted) return;
      playTone(987.77, 0.035, 'sine', 0.05);
    },

    // 3. Zelda/Mario Style Sparkling Golden Coin Chime
    playCoin() {
      if (isMuted) return;
      // C5 -> E5 -> G5 -> C6 Arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        playTone(freq, 0.18, 'triangle', 0.22, idx * 0.05);
      });
    },

    // 4. XP Burst Shimmer
    playXpBurst() {
      if (isMuted) return;
      const notes = [440, 554.37, 659.25, 880, 1108.73];
      notes.forEach((freq, idx) => {
        playTone(freq, 0.12, 'sine', 0.18, idx * 0.035);
      });
    },

    // 5. Grand Triumphant Level-Up Fanfare
    playLevelUp() {
      if (isMuted) return;
      // Grand Major Fanfare: C4 -> G4 -> C5 -> E5 -> G5 -> C6 (Sustained)
      const chord = [
        { f: 523.25, d: 0.12, delay: 0 },
        { f: 659.25, d: 0.12, delay: 0.08 },
        { f: 783.99, d: 0.15, delay: 0.16 },
        { f: 1046.50, d: 0.55, delay: 0.24 },
        { f: 1318.51, d: 0.65, delay: 0.32 },
        { f: 1567.98, d: 0.8, delay: 0.40 }
      ];
      chord.forEach(item => {
        playTone(item.f, item.d, 'triangle', 0.28, item.delay);
      });
    },

    // 6. 3D Supply Chest Opening Rumble & Burst
    playChestOpen() {
      if (isMuted) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // Low Rumble Osc
        const oscLow = ctx.createOscillator();
        const gainLow = ctx.createGain();
        oscLow.type = 'sawtooth';
        oscLow.frequency.setValueAtTime(65, now);
        oscLow.frequency.exponentialRampToValueAtTime(240, now + 0.5);
        gainLow.gain.setValueAtTime(0.25 * sfxVolume, now);
        gainLow.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        oscLow.connect(gainLow);
        gainLow.connect(ctx.destination);
        oscLow.start(now);
        oscLow.stop(now + 0.55);

        // Radiant Sparkle Burst at 0.45s
        setTimeout(() => {
          [880, 1108.73, 1318.51, 1760].forEach((freq, idx) => {
            playTone(freq, 0.3, 'sine', 0.25, idx * 0.05);
          });
        }, 450);
      } catch (e) {}
    },

    // 7. 8-Bit Retro Achievement Feat Jingle
    playAchievement() {
      if (isMuted) return;
      const notes = [392.00, 523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        playTone(freq, 0.16, 'square', 0.12, idx * 0.06);
      });
    },

    // 8. Roulette Wheel Mechanical Ticker
    playWheelTick() {
      if (isMuted) return;
      playTone(1400 + Math.random() * 300, 0.02, 'triangle', 0.16);
    },

    // 9. Jackpot Multi-Tone Victory Cascade
    playJackpot() {
      if (isMuted) return;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
      notes.forEach((freq, idx) => {
        playTone(freq, 0.25, 'triangle', 0.25, idx * 0.07);
      });
    },

    // 10. Companion Mascot Cute React Chirp
    playPetReaction() {
      if (isMuted) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1250, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.16);
        gain.gain.setValueAtTime(0.22 * sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } catch (e) {}
    },

    // 11. View Tab Navigation Whoosh
    playTabWhoosh() {
      if (isMuted) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(720, now + 0.07);
        gain.gain.setValueAtTime(0.12 * sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } catch (e) {}
    },

    // 12. Dynamic Pitch-Scaled Combo Chime
    playCombo(multiplier = 1) {
      if (isMuted) return;
      const baseFreq = 440 * Math.min(2.5, (1 + (multiplier - 1) * 0.25));
      playTone(baseFreq, 0.15, 'triangle', 0.2);
      playTone(baseFreq * 1.5, 0.18, 'sine', 0.15, 0.05);
    },

    // 13. Provably Fair 3D Dice Roll & Tumbling Sound
    playDiceRoll() {
      if (isMuted) return;
      for (let i = 0; i < 7; i++) {
        setTimeout(() => {
          playTone(300 + Math.random() * 400, 0.035, 'triangle', 0.15);
        }, i * 45);
      }
    },

    // 14. Casino Wager Placed Beep
    playBetPlaced() {
      if (isMuted) return;
      playTone(659.25, 0.06, 'sine', 0.18);
      playTone(880.00, 0.08, 'triangle', 0.2, 0.04);
    },

    // 15. Polymarket Prediction Win Fanfare
    playPredictionWin() {
      if (isMuted) return;
      const notes = [587.33, 739.99, 880.00, 1174.66, 1479.98];
      notes.forEach((freq, idx) => {
        playTone(freq, 0.25, 'triangle', 0.25, idx * 0.06);
      });
    },

    // 16. Monopoly Pass GO +500 OMNI Golden Cascade Chime
    playMonopolyPassGo() {
      if (isMuted) return;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
      notes.forEach((freq, idx) => {
        playTone(freq, 0.35, 'triangle', 0.28, idx * 0.05);
      });
    },

    // 17. Cinematic Quantum Chest Fanfare
    playChestFanfare() {
      if (isMuted) return;
      const fanfareChords = [440, 554.37, 659.25, 880, 1108.73, 1318.51, 1760];
      fanfareChords.forEach((freq, idx) => {
        playTone(freq, 0.45, 'triangle', 0.3, idx * 0.07);
      });
    },

    // 18. Quantum Energy Sizzle & Crackle
    playQuantumCrackle() {
      if (isMuted) return;
      for (let i = 0; i < 9; i++) {
        setTimeout(() => {
          playTone(800 + Math.random() * 1200, 0.04, 'sawtooth', 0.12);
        }, i * 35);
      }
    },

    // 19. Holographic Card Foil Shine
    playCardFoilShine() {
      if (isMuted) return;
      [1046.50, 1174.66, 1318.51, 1396.91, 1567.98, 1760.00, 1975.53, 2093.00, 2349.32, 2637.02].forEach((freq, idx) => {
        playTone(freq, 0.35, 'sine', 0.22, idx * 0.04);
        playTone(freq * 1.5, 0.2, 'triangle', 0.12, idx * 0.04 + 0.01);
      });
    },

    // 20. OMNI RESONANCE: Hydraulic Lock Release & Mechanical Clunk
    playHydraulicRelease() {
      if (isMuted) return;
      // Mechanical latch snap
      playTone(320, 0.06, 'square', 0.4);
      playTone(180, 0.09, 'sawtooth', 0.45, 0.03);
      playTone(90, 0.18, 'triangle', 0.5, 0.05);
      // Pressurized air hiss
      for (let i = 0; i < 14; i++) {
        setTimeout(() => {
          playTone(2400 + Math.random() * 1600, 0.035, 'sawtooth', 0.18 * (1 - i / 14));
        }, i * 22);
      }
    },

    // 21. OMNI RESONANCE: Epic Summoning Sequence Start & Deep Sub-Bass
    playGachaSummonStart() {
      if (isMuted) return;
      // Deep 50Hz sub-bass foundation
      playTone(55.0, 2.5, 'sine', 0.45);
      playTone(110.0, 2.0, 'triangle', 0.3, 0.1);
      playTone(220.0, 1.6, 'sine', 0.25, 0.3);
      // Ethereal celestial shimmer
      [440, 554.37, 659.25, 880, 1108.73].forEach((f, idx) => {
        playTone(f, 1.2, 'sine', 0.15, 0.4 + idx * 0.1);
      });
    },

    // 22. OMNI RESONANCE: Deep Space Warp Speed Accelerate (Smooth Hyperspace Drone)
    playWarpSpeedAccelerate() {
      if (isMuted) return;
      const steps = 30;
      for (let i = 0; i < steps; i++) {
        setTimeout(() => {
          const freq = 65 + i * 38;
          playTone(freq, 0.18, 'sawtooth', 0.15 + (i / steps) * 0.22);
          playTone(freq * 1.5, 0.12, 'triangle', 0.12);
          if (i % 4 === 0) {
            playTone(800 + i * 50, 0.05, 'sine', 0.1);
          }
        }, i * 110);
      }
    },

    // 23. OMNI RESONANCE: Laser Fissures Crackling & Energy Charge
    playGachaCharging() {
      if (isMuted) return;
      const resonanceNotes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      resonanceNotes.forEach((freq, idx) => {
        playTone(freq, 0.6, 'triangle', 0.25, idx * 0.18);
        playTone(freq * 2, 0.4, 'sine', 0.15, idx * 0.18 + 0.03);
      });
      // Plasma arc crackles
      for (let i = 0; i < 15; i++) {
        setTimeout(() => {
          playTone(1200 + Math.random() * 2000, 0.03, 'square', 0.18);
        }, i * 70);
      }
    },

    // 24. OMNI RESONANCE: Violent Sub-Bass Rumble & Core Fracture
    playGachaRumble() {
      if (isMuted) return;
      const steps = 28;
      for (let i = 0; i < steps; i++) {
        setTimeout(() => {
          playTone(45 + Math.random() * 55, 0.14, 'sawtooth', 0.42);
          playTone(90 + Math.random() * 80, 0.1, 'triangle', 0.35);
          if (i % 2 === 0) {
            playTone(1500 + Math.random() * 2500, 0.04, 'square', 0.22); // violent sparks
          }
        }, i * 65);
      }
    },

    // 25. OMNI RESONANCE: Supernova Explosion & Dimensional Portal Eruption
    playGachaBurst() {
      if (isMuted) return;
      // Massive sub-bass blast
      playTone(48.0, 1.2, 'sawtooth', 0.6);
      playTone(96.0, 1.0, 'square', 0.48, 0.02);
      playTone(192.0, 0.8, 'triangle', 0.4, 0.04);
      // High-energy laser pulse eruption
      [587.33, 880.00, 1174.66, 1760.00, 2349.32, 2793.83, 3520.00].forEach((freq, idx) => {
        playTone(freq, 0.9, 'triangle', 0.32, idx * 0.03);
        playTone(freq * 1.5, 0.7, 'sine', 0.2, idx * 0.03 + 0.01);
      });
    },

    // 26. OMNI RESONANCE: 3D Holographic Card Slam Impact
    playGachaCardSlam() {
      if (isMuted) return;
      playTone(70, 0.35, 'sawtooth', 0.55);
      playTone(140, 0.28, 'triangle', 0.4, 0.02);
      playTone(1046.50, 0.4, 'sine', 0.35, 0.04);
      playTone(2093.00, 0.3, 'sine', 0.25, 0.06);
    },

    // 27. OMNI RESONANCE: Grand 12-Voice Orchestral Victory Fanfare
    playGachaFanfare() {
      if (isMuted) return;
      const fanfareChords = [
        { f: 440.00, d: 0.25, t: 0 },
        { f: 554.37, d: 0.25, t: 0.12 },
        { f: 659.25, d: 0.25, t: 0.24 },
        { f: 880.00, d: 0.55, t: 0.36 },
        { f: 783.99, d: 0.25, t: 0.65 },
        { f: 880.00, d: 0.25, t: 0.77 },
        { f: 1046.50, d: 0.3, t: 0.89 },
        { f: 1318.51, d: 0.3, t: 1.01 },
        { f: 1567.98, d: 0.8, t: 1.15 },
        { f: 1760.00, d: 0.9, t: 1.35 },
        { f: 2093.00, d: 1.4, t: 1.55 }
      ];
      fanfareChords.forEach(c => {
        playTone(c.f, c.d, 'triangle', 0.35, c.t);
        playTone(c.f * 1.5, c.d * 0.85, 'sine', 0.2, c.t + 0.02);
        playTone(c.f * 0.5, c.d * 1.1, 'sawtooth', 0.15, c.t);
      });
    },

    // 28. OMNI RESONANCE: 5x Multi-Card Staggered Reveal Sound
    playMultiCardReveal(cardIndex = 0) {
      if (isMuted) return;
      const baseFreqs = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
      const freq = baseFreqs[cardIndex % baseFreqs.length];
      playTone(freq, 0.45, 'triangle', 0.35);
      playTone(freq * 1.5, 0.35, 'sine', 0.25, 0.03);
      playTone(freq * 2, 0.28, 'sine', 0.18, 0.06);
      playTone(freq * 0.5, 0.4, 'sawtooth', 0.15, 0.01);
    },

    // 29. OMNI RESONANCE: Ticket Redeem & Digital Voucher Tear
    playTicketRedeem() {
      if (isMuted) return;
      playTone(783.99, 0.1, 'square', 0.25);
      playTone(1046.50, 0.14, 'triangle', 0.3, 0.04);
      playTone(1567.98, 0.2, 'sine', 0.35, 0.08);
      playTone(2093.00, 0.25, 'sine', 0.3, 0.12);
    },

    // Toggle Audio Mute
    toggleMute() {
      isMuted = !isMuted;
      localStorage.setItem('omni_sfx_muted', isMuted);
      updateAudioControlPill();
      if (!isMuted) {
        this.playCoin();
      }
      return isMuted;
    },

    // Set Volume (0.0 to 1.0)
    setVolume(val) {
      sfxVolume = Math.max(0, Math.min(1, val));
      localStorage.setItem('omni_sfx_volume', sfxVolume.toString());
      updateAudioControlPill();
    },

    get isMuted() { return isMuted; },
    get volume() { return sfxVolume; }
  };

  // Expose Globally
  window.OmniAudio = OmniAudio;

  // Floating Arcade Text Spawner Helper
  window.spawnFloatingText = function(text, x, y, color = '#00e5ff', icon = '') {
    const el = document.createElement('div');
    el.className = 'omni-floating-xp-badge';
    const iconHtml = icon ? `<span class="floating-icon">${icon}</span> ` : `<span class="material-symbols-outlined gemini-symbol gemini-grad-rainbow" style="font-size:16px;">auto_awesome</span> `;
    el.innerHTML = `${iconHtml}${text}`;
    el.style.left = `${x || (window.innerWidth / 2)}px`;
    el.style.top = `${y || (window.innerHeight / 2)}px`;
    el.style.color = color;
    document.body.appendChild(el);

    setTimeout(() => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 1200);
  };

  // Floating Audio Controller Pill removed per user request
  function injectGlobalAudioControlPill() {
    return;
  }

  function updateAudioControlPill() {
    const icon = document.getElementById('omniAudioIcon');
    const label = document.getElementById('omniAudioLabel');
    const btn = document.getElementById('omniAudioToggleBtn');
    if (icon && label && btn) {
      icon.innerHTML = `<span class="material-symbols-outlined gemini-symbol">${isMuted ? 'volume_off' : 'volume_up'}</span>`;
      label.textContent = isMuted ? 'SFX OFF' : 'SFX ON';
      if (isMuted) {
        btn.classList.add('muted');
      } else {
        btn.classList.remove('muted');
      }
    }
  }

  // Auto-Attach Sound to All Interactive UI Elements
  function attachEcosystemSoundListeners() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button, .btn, .pass-tab-btn, .tier-filter-chip, .jump-btn, .ach-pill, .suggestion-chip, a');
      if (btn && !btn.classList.contains('no-sfx')) {
        // Distinguish sound based on button intent
        if (btn.classList.contains('btn-hero-primary') || btn.classList.contains('btn-reward-confirm') || btn.id === 'btnUnlockObsidianPass') {
          OmniAudio.playJackpot();
        } else if (btn.classList.contains('btn-open-chest-large') || btn.id === 'btnOpenDailyChest') {
          OmniAudio.playChestOpen();
        } else if (btn.classList.contains('btn-hero-secondary') || btn.textContent.includes('Claim')) {
          OmniAudio.playCoin();
        } else if (btn.classList.contains('btn-hero-simulator') || btn.textContent.includes('+500 XP')) {
          OmniAudio.playXpBurst();
        } else if (btn.classList.contains('pass-tab-btn')) {
          OmniAudio.playTabWhoosh();
        } else {
          OmniAudio.playClick();
        }
      }
    }, { passive: true });

    // Subtle Hover Sound on Cards
    document.addEventListener('mouseenter', (e) => {
      if (e.target && e.target.classList && (
        e.target.classList.contains('tier-card') ||
        e.target.classList.contains('ach-card') ||
        e.target.classList.contains('mascot-card') ||
        e.target.classList.contains('stat-card')
      )) {
        OmniAudio.playHover();
      }
    }, true);
  }

  // Inject Styles for Audio Pill & Floating Badges
  function injectAudioEngineStyles() {
    if (document.getElementById('omni-audio-engine-styles')) return;
    const style = document.createElement('style');
    style.id = 'omni-audio-engine-styles';
    style.textContent = `
      .omni-audio-pill-container {
        position: fixed;
        bottom: 24px;
        left: 24px;
        z-index: 99999;
        font-family: 'Outfit', -apple-system, sans-serif;
      }
      .omni-audio-toggle-btn {
        background: rgba(18, 20, 29, 0.85);
        border: 1px solid rgba(0, 229, 255, 0.35);
        border-radius: 20px;
        padding: 6px 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #00e5ff;
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
        backdrop-filter: blur(12px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 0 10px rgba(0, 229, 255, 0.2);
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        user-select: none;
      }
      .omni-audio-toggle-btn:hover {
        transform: scale(1.06);
        border-color: #ffd700;
        color: #ffd700;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 215, 0, 0.3);
      }
      .omni-audio-toggle-btn.muted {
        border-color: rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 0.45);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      }
      
      /* Floating Arcade XP Badges */
      .omni-floating-xp-badge {
        position: fixed;
        pointer-events: none;
        z-index: 100000;
        font-family: 'Rajdhani', 'Outfit', sans-serif;
        font-weight: 800;
        font-size: 1.35rem;
        text-shadow: 0 0 12px currentColor, 0 2px 4px rgba(0,0,0,0.8);
        transform: translate(-50%, -50%);
        animation: omniFloatUpAndFade 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      @keyframes omniFloatUpAndFade {
        0% {
          opacity: 0;
          transform: translate(-50%, 0) scale(0.6);
        }
        20% {
          opacity: 1;
          transform: translate(-50%, -20px) scale(1.2);
        }
        80% {
          opacity: 0.9;
          transform: translate(-50%, -55px) scale(1);
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -80px) scale(0.8);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize Audio Systems on DOM Load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectAudioEngineStyles();
      injectGlobalAudioControlPill();
      attachEcosystemSoundListeners();
    });
  } else {
    injectAudioEngineStyles();
    injectGlobalAudioControlPill();
    attachEcosystemSoundListeners();
  }

})();
