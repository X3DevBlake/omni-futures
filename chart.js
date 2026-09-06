/**
 * Enhanced OmniFutures Pro Canvas Candlestick Chart Engine (WEEX Clone & TradingView Grade)
 * Multi-Indicator (MA 7/25/99 Ribbon, EMA 9/21, BOLL 20/2, RSI 14, Volume MA5),
 * Heikin-Ashi, High/Low Extreme Flags, Pulsating Real-Time Price Line & Tag, 60FPS Render
 */

class OmniCandleChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.candles = [];
    this.crosshair = { x: null, y: null, visible: false };
    this.padding = { top: 28, right: 82, bottom: 24, left: 12 };
    this.currentSymbol = 'BTC-USDT';
    
    // Indicator Toggles
    this.indicators = {
      ma: true,
      ema: false,
      boll: false,
      volume: true,
      rsi: true,
      macd: false,
      footprint: false,
      profile: false,
      fibo: false
    };

    this.chartStyle = 'candles'; // 'candles', 'hollow', 'heikin', 'line', 'area'
    this.pulsePhase = 0;
    this.pendingOrders = [];
    this.cancelClickTargets = [];
    this.onCancelOrderClick = null;
    this._initEvents();
    this.resize();

    // Subtle beacon animation loop for the live price dot
    this._pulseInterval = setInterval(() => {
      this.pulsePhase = (this.pulsePhase + 0.1) % (Math.PI * 2);
      if (this.candles.length > 0) {
        this.render();
      }
    }, 120);
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.render();
  }

  _initEvents() {
    window.addEventListener('resize', () => this.resize());
    if (!this.canvas) return;

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.crosshair.x = e.clientX - rect.left;
      this.crosshair.y = e.clientY - rect.top;
      this.crosshair.visible = true;

      // Check if hovering over on-chart cancel button
      let isOverCancel = false;
      for (const t of this.cancelClickTargets) {
        if (this.crosshair.x >= t.x && this.crosshair.x <= t.x + t.w &&
            this.crosshair.y >= t.y && this.crosshair.y <= t.y + t.h) {
          isOverCancel = true;
          break;
        }
      }
      this.canvas.style.cursor = isOverCancel ? 'pointer' : 'crosshair';

      this.render();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.crosshair.visible = false;
      this.canvas.style.cursor = 'crosshair';
      this.render();
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      for (const target of this.cancelClickTargets) {
        if (clickX >= target.x && clickX <= target.x + target.w &&
            clickY >= target.y && clickY <= target.y + target.h) {
          if (this.onCancelOrderClick) {
            this.onCancelOrderClick(target.orderId);
          } else if (typeof window.cancelOrder === 'function') {
            window.cancelOrder(target.orderId);
          }
          break;
        }
      }
    });
  }

  setPendingOrders(orders) {
    this.pendingOrders = orders || [];
    this.render();
  }

  setCandles(candles, symbol, precision) {
    this.candles = candles || [];
    this.currentSymbol = symbol || this.currentSymbol;
    if (precision !== undefined && precision !== null) {
      this.currentPrecision = precision;
    }
    this.render();
  }

  _formatPrice(priceVal) {
    if (priceVal === undefined || priceVal === null || isNaN(priceVal)) return '0.00';
    const p = Math.abs(priceVal);
    let prec = 2;
    if (this.currentPrecision !== undefined && this.currentPrecision !== null) {
      prec = this.currentPrecision;
    } else if (p >= 500) {
      prec = 2;
    } else if (p >= 1) {
      prec = 4;
    } else if (p >= 0.01) {
      prec = 5;
    } else if (p >= 0.0001) {
      prec = 6;
    } else {
      prec = 8;
    }
    return Number(priceVal).toLocaleString(undefined, { minimumFractionDigits: prec, maximumFractionDigits: prec });
  }

  updateLastCandlePrice(price) {
    if (!this.candles || this.candles.length === 0) return;
    const last = this.candles[this.candles.length - 1];
    // Safeguard: if price is drastically different order of magnitude (>50x or <0.02x) from last candle close,
    // prevent corrupted scaling until setCandles has loaded for the new symbol
    if (last.close > 0 && (price / last.close > 50 || price / last.close < 0.02)) {
      return;
    }
    last.close = price;
    last.high = Math.max(last.high, price);
    last.low = Math.min(last.low, price);
    this.render();
  }

  toggleIndicator(name) {
    if (this.indicators.hasOwnProperty(name)) {
      this.indicators[name] = !this.indicators[name];
      this.render();
    }
  }

  setChartStyle(style) {
    this.chartStyle = style;
    this.render();
  }

  // Compute Heikin-Ashi representation
  _computeHeikinAshi(rawCandles) {
    const haCandles = [];
    for (let i = 0; i < rawCandles.length; i++) {
      const c = rawCandles[i];
      const haClose = (c.open + c.high + c.low + c.close) / 4;
      const haOpen = i === 0 ? (c.open + c.close) / 2 : (haCandles[i - 1].open + haCandles[i - 1].close) / 2;
      const haHigh = Math.max(c.high, haOpen, haClose);
      const haLow = Math.min(c.low, haOpen, haClose);
      haCandles.push({
        time: c.time,
        open: haOpen,
        high: haHigh,
        low: haLow,
        close: haClose,
        volume: c.volume
      });
    }
    return haCandles;
  }

  render() {
    if (!this.canvas || !this.ctx || this.candles.length === 0) return;
    const ctx = this.ctx;
    const w = this.canvas.width / window.devicePixelRatio;
    const h = this.canvas.height / window.devicePixelRatio;

    ctx.clearRect(0, 0, w, h);

    // Deep WEEX obsidian background
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, w, h);

    const chartW = w - this.padding.left - this.padding.right;
    const totalH = h - this.padding.top - this.padding.bottom;
    
    // Allocate heights: RSI sub-chart (if on), MACD sub-chart (if on), Volume sub-chart (if on), Price main area
    const rsiH = this.indicators.rsi ? 58 : 0;
    const macdH = this.indicators.macd ? 65 : 0;
    const volH = this.indicators.volume ? Math.max(38, totalH * 0.15) : 0;
    const priceH = Math.max(120, totalH - volH - rsiH - macdH - 8);

    const displayCandles = this.chartStyle === 'heikin' 
      ? this._computeHeikinAshi(this.candles) 
      : this.candles;

    // Price Bounds & Extreme detection
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let minIndex = 0;
    let maxIndex = 0;
    let maxVol = 0;

    for (let i = 0; i < displayCandles.length; i++) {
      const c = displayCandles[i];
      if (c.low < minPrice) {
        minPrice = c.low;
        minIndex = i;
      }
      if (c.high > maxPrice) {
        maxPrice = c.high;
        maxIndex = i;
      }
      if (c.volume > maxVol) maxVol = c.volume;
    }

    const priceRange = (maxPrice - minPrice) || 1;
    minPrice -= priceRange * 0.04;
    maxPrice += priceRange * 0.04;
    const adjustedRange = maxPrice - minPrice;

    // Horizontal Grid Lines & Price Axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';

    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const y = this.padding.top + (priceH / steps) * i;
      const priceVal = maxPrice - (adjustedRange / steps) * i;
      
      ctx.beginPath();
      ctx.moveTo(this.padding.left, y);
      ctx.lineTo(w - this.padding.right, y);
      ctx.stroke();

      ctx.fillText(this._formatPrice(priceVal), w - this.padding.right + 8, y + 3);
    }

    const candleCount = displayCandles.length;
    const candleSpacing = chartW / candleCount;
    const candleWidth = Math.max(3, candleSpacing * 0.72);

    // 1. Draw Volume Sub-Chart with Baseline & Volume MA(5)
    if (this.indicators.volume) {
      const volTopY = this.padding.top + priceH + 6;
      const volBaseY = volTopY + volH;

      // Volume sub-chart separator & background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.moveTo(this.padding.left, volTopY);
      ctx.lineTo(w - this.padding.right, volTopY);
      ctx.stroke();

      // Volume Title & Scale
      ctx.fillStyle = '#64748b';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(`Vol(USDT)  Max: ${(maxVol > 1e6 ? (maxVol / 1e6).toFixed(2) + 'M' : (maxVol / 1e3).toFixed(1) + 'K')}`, this.padding.left + 4, volTopY + 12);

      // Volume Bars
      for (let i = 0; i < candleCount; i++) {
        const c = displayCandles[i];
        const x = this.padding.left + i * candleSpacing + candleSpacing / 2;
        const vH = Math.max(2, (c.volume / (maxVol || 1)) * (volH - 14));
        const vY = volBaseY - vH;

        const isUp = c.close >= c.open;
        ctx.fillStyle = isUp ? 'rgba(14, 203, 129, 0.42)' : 'rgba(246, 70, 93, 0.42)';
        ctx.fillRect(x - candleWidth / 2, vY, candleWidth, vH);
        
        ctx.strokeStyle = isUp ? '#0ecb81' : '#f6465d';
        ctx.lineWidth = 0.6;
        ctx.strokeRect(x - candleWidth / 2, vY, candleWidth, vH);
      }

      // Volume MA(5) Line
      if (candleCount >= 5) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        let startedVolMa = false;
        for (let i = 4; i < candleCount; i++) {
          let sumVol = 0;
          for (let j = 0; j < 5; j++) sumVol += displayCandles[i - j].volume;
          const maVol = sumVol / 5;
          const x = this.padding.left + i * candleSpacing + candleSpacing / 2;
          const vH = Math.max(2, (maVol / (maxVol || 1)) * (volH - 14));
          const y = volBaseY - vH;
          if (!startedVolMa) {
            ctx.moveTo(x, y);
            startedVolMa = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    }

    // 2. Bollinger Bands BOLL(20, 2)
    if (this.indicators.boll) {
      this._drawBollingerBands(ctx, 20, 2, minPrice, adjustedRange, priceH, candleSpacing, displayCandles);
    }

    // 3. Moving Averages Ribbon (MA7 in Cyan, MA25 in Amber, MA99 in Purple)
    if (this.indicators.ma) {
      this._drawMA(ctx, 7, '#00e5ff', minPrice, adjustedRange, priceH, candleSpacing, displayCandles);
      this._drawMA(ctx, 25, '#f59e0b', minPrice, adjustedRange, priceH, candleSpacing, displayCandles);
      this._drawMA(ctx, 99, '#a855f7', minPrice, adjustedRange, priceH, candleSpacing, displayCandles);
      this._drawMaLegend(ctx, displayCandles);
    }

    // 4. Exponential Moving Averages (EMA9 in Pink, EMA21 in Violet)
    if (this.indicators.ema) {
      this._drawEMA(ctx, 9, '#ec4899', minPrice, adjustedRange, priceH, candleSpacing, displayCandles);
      this._drawEMA(ctx, 21, '#8b5cf6', minPrice, adjustedRange, priceH, candleSpacing, displayCandles);
    }

    // 5. Render Candles, Hollow, Heikin-Ashi, Line or Area
    if (this.chartStyle === 'line' || this.chartStyle === 'area') {
      this._drawLineChart(ctx, minPrice, adjustedRange, priceH, candleSpacing, displayCandles, this.chartStyle === 'area');
    } else {
      this._drawCandlesticks(ctx, candleWidth, candleSpacing, minPrice, adjustedRange, priceH, displayCandles);
    }

    // 6. High & Low Extreme Marker Flags (WEEX Signature Style)
    this._drawExtremeMarkers(ctx, minIndex, maxIndex, displayCandles, minPrice, adjustedRange, priceH, candleSpacing);

    // 6.2. Order Flow Volume Footprint Overlay
    if (this.indicators.footprint) {
      this._drawFootprint(ctx, candleWidth, candleSpacing, minPrice, adjustedRange, priceH, displayCandles);
    }

    // 6.4. Institutional Volume Profile (POC/VAH/VAL)
    if (this.indicators.profile) {
      this._drawVolumeProfile(ctx, w, chartW, minPrice, adjustedRange, priceH, displayCandles);
    }

    // 6.6. Fibonacci Retracement Grid
    if (this.indicators.fibo) {
      this._drawFibonacciRetracement(ctx, w, minPrice, adjustedRange, priceH, minIndex, maxIndex, displayCandles);
    }

    // 7. RSI Sub-Chart
    const rsiY = this.padding.top + priceH + volH + 6;
    if (this.indicators.rsi) {
      this._drawRsiSubChart(ctx, w, h, chartW, rsiH, candleSpacing, displayCandles, rsiY);
    }

    // 7.5. MACD Sub-Chart
    const macdY = rsiY + (this.indicators.rsi ? rsiH + 6 : 0);
    if (this.indicators.macd) {
      this._drawMacdSubChart(ctx, w, h, chartW, macdH, candleSpacing, displayCandles, macdY);
    }

    // 8. Real-Time Pulsating Horizontal Current Price Guideline & Tag
    const lastCandle = displayCandles[displayCandles.length - 1];
    const isLastUp = lastCandle.close >= lastCandle.open;
    const accentColor = isLastUp ? '#0ecb81' : '#f6465d';
    const currPriceY = this.padding.top + priceH * (1 - (lastCandle.close - minPrice) / adjustedRange);

    // Pulsing dashed line across price chart
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(this.padding.left, currPriceY);
    ctx.lineTo(w - this.padding.right, currPriceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pulsing live beacon at the latest candle tip
    const lastCandleX = this.padding.left + (displayCandles.length - 1) * candleSpacing + candleSpacing / 2;
    const pulseRadius = 3.5 + Math.sin(this.pulsePhase) * 1.5;
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(lastCandleX, currPriceY, pulseRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isLastUp ? 'rgba(14, 203, 129, 0.45)' : 'rgba(246, 70, 93, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(lastCandleX, currPriceY, pulseRadius + 4, 0, Math.PI * 2);
    ctx.stroke();

    // Right Y-Axis Pulsing Current Price Badge
    ctx.fillStyle = accentColor;
    const priceText = this._formatPrice(lastCandle.close);
    const badgeW = Math.max(78, ctx.measureText(priceText).width + 12);
    ctx.fillRect(w - this.padding.right + 1, currPriceY - 10, badgeW, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(priceText, w - this.padding.right + 6, currPriceY + 4);

    // 8.5. Visual On-Chart Pending Orders (Limits, Stops, Grids)
    this._drawPendingOrders(ctx, w, minPrice, adjustedRange, priceH);

    // 8.6. Visual On-Chart Position & Liquidation Warning Lines
    this._drawPositionAndLiquidationLines(ctx, w, minPrice, adjustedRange, priceH);

    // 9. Interactive Crosshair & Floating Tooltip
    if (this.crosshair.visible && this.crosshair.x >= this.padding.left && this.crosshair.x <= w - this.padding.right) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.setLineDash([3, 3]);

      // Vertical guideline
      ctx.beginPath();
      ctx.moveTo(this.crosshair.x, this.padding.top);
      ctx.lineTo(this.crosshair.x, h - this.padding.bottom);
      ctx.stroke();

      // Horizontal guideline
      ctx.beginPath();
      ctx.moveTo(this.padding.left, this.crosshair.y);
      ctx.lineTo(w - this.padding.right, this.crosshair.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Index & Tooltip readout
      const idx = Math.floor((this.crosshair.x - this.padding.left) / candleSpacing);
      if (idx >= 0 && idx < displayCandles.length) {
        const hoverCandle = displayCandles[idx];
        const dateStr = new Date(hoverCandle.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const chg = ((hoverCandle.close - hoverCandle.open) / hoverCandle.open * 100).toFixed(2);
        const col = hoverCandle.close >= hoverCandle.open ? '#0ecb81' : '#f6465d';
        
        ctx.fillStyle = 'rgba(10, 14, 23, 0.94)';
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
        ctx.fillRect(this.padding.left + 6, 4, 490, 22);
        ctx.strokeRect(this.padding.left + 6, 4, 490, 22);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10.5px "JetBrains Mono", monospace';
        ctx.fillText(`T:${dateStr}  O:${this._formatPrice(hoverCandle.open)}  H:${this._formatPrice(hoverCandle.high)}  L:${this._formatPrice(hoverCandle.low)}  C:${this._formatPrice(hoverCandle.close)}  V:${(hoverCandle.volume).toFixed(1)}`, this.padding.left + 12, 18);
        ctx.fillStyle = col;
        ctx.fillText(`(${chg > 0 ? '+' : ''}${chg}%)`, this.padding.left + 435, 18);
      }
    }
  }

  // Candlestick renderer supporting solid and hollow
  _drawCandlesticks(ctx, candleWidth, candleSpacing, minPrice, adjustedRange, priceH, candles) {
    const candleCount = candles.length;
    for (let i = 0; i < candleCount; i++) {
      const c = candles[i];
      const x = this.padding.left + i * candleSpacing + candleSpacing / 2;
      const isGreen = c.close >= c.open;
      const color = isGreen ? '#0ecb81' : '#f6465d';

      const highY = this.padding.top + priceH * (1 - (c.high - minPrice) / adjustedRange);
      const lowY = this.padding.top + priceH * (1 - (c.low - minPrice) / adjustedRange);
      const openY = this.padding.top + priceH * (1 - (c.open - minPrice) / adjustedRange);
      const closeY = this.padding.top + priceH * (1 - (c.close - minPrice) / adjustedRange);

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const bodyY = Math.min(openY, closeY);
      const bodyH = Math.max(1.8, Math.abs(closeY - openY));

      if (this.chartStyle === 'hollow' && isGreen) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        ctx.strokeRect(x - candleWidth / 2, bodyY, candleWidth, bodyH);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyH);
      }
    }
  }

  // Draw High and Low Extreme Flags (WEEX Signature Style)
  _drawExtremeMarkers(ctx, minIndex, maxIndex, candles, minPrice, adjustedRange, priceH, candleSpacing) {
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';

    // High Flag
    if (candles[maxIndex]) {
      const highC = candles[maxIndex];
      const x = this.padding.left + maxIndex * candleSpacing + candleSpacing / 2;
      const y = this.padding.top + priceH * (1 - (highC.high - minPrice) / adjustedRange);

      const label = `H: ${this._formatPrice(highC.high)}`;
      const textW = ctx.measureText(label).width;
      const badgeX = Math.min(x, this.canvas.width / window.devicePixelRatio - this.padding.right - textW - 14);

      ctx.fillStyle = 'rgba(246, 70, 93, 0.85)';
      ctx.fillRect(badgeX - 4, y - 18, textW + 8, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, badgeX, y - 7);

      // Pointer line to wick
      ctx.strokeStyle = '#f6465d';
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    // Low Flag
    if (candles[minIndex]) {
      const lowC = candles[minIndex];
      const x = this.padding.left + minIndex * candleSpacing + candleSpacing / 2;
      const y = this.padding.top + priceH * (1 - (lowC.low - minPrice) / adjustedRange);

      const label = `L: ${this._formatPrice(lowC.low)}`;
      const textW = ctx.measureText(label).width;
      const badgeX = Math.min(x, this.canvas.width / window.devicePixelRatio - this.padding.right - textW - 14);

      ctx.fillStyle = 'rgba(14, 203, 129, 0.85)';
      ctx.fillRect(badgeX - 4, y + 4, textW + 8, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, badgeX, y + 15);

      // Pointer line to wick
      ctx.strokeStyle = '#0ecb81';
      ctx.beginPath();
      ctx.moveTo(x, y + 4);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  // Draw MA Legend at top left of chart
  _drawMaLegend(ctx, candles) {
    if (!candles || candles.length === 0) return;
    const calcMa = (p) => {
      if (candles.length < p) return 0;
      let sum = 0;
      for (let i = 0; i < p; i++) sum += candles[candles.length - 1 - i].close;
      return sum / p;
    };

    const ma7 = calcMa(7);
    const ma25 = calcMa(25);
    const ma99 = calcMa(99);

    ctx.font = '9.5px "JetBrains Mono", monospace';
    let lx = this.padding.left + 8;
    const ly = this.padding.top - 10;

    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`MA(7): ${ma7.toFixed(2)}`, lx, ly);
    lx += 95;

    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`MA(25): ${ma25.toFixed(2)}`, lx, ly);
    lx += 105;

    if (ma99 > 0) {
      ctx.fillStyle = '#a855f7';
      ctx.fillText(`MA(99): ${ma99.toFixed(2)}`, lx, ly);
    }
  }

  // Line / Area chart renderer
  _drawLineChart(ctx, minPrice, adjustedRange, priceH, candleSpacing, candles, isArea) {
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const x = this.padding.left + i * candleSpacing + candleSpacing / 2;
      const y = this.padding.top + priceH * (1 - (c.close - minPrice) / adjustedRange);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (isArea) {
      const lastX = this.padding.left + (candles.length - 1) * candleSpacing + candleSpacing / 2;
      const firstX = this.padding.left + candleSpacing / 2;
      ctx.lineTo(lastX, this.padding.top + priceH);
      ctx.lineTo(firstX, this.padding.top + priceH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, this.padding.top, 0, this.padding.top + priceH);
      grad.addColorStop(0, 'rgba(0, 229, 255, 0.28)');
      grad.addColorStop(1, 'rgba(0, 229, 255, 0.01)');
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  _drawMA(ctx, period, color, minPrice, adjustedRange, priceH, candleSpacing, candles) {
    if (candles.length < period) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();

    let started = false;
    for (let i = period - 1; i < candles.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += candles[i - j].close;
      const ma = sum / period;
      const x = this.padding.left + i * candleSpacing + candleSpacing / 2;
      const y = this.padding.top + priceH * (1 - (ma - minPrice) / adjustedRange);

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  _drawEMA(ctx, period, color, minPrice, adjustedRange, priceH, candleSpacing, candles) {
    if (candles.length < period) return;
    const k = 2 / (period + 1);
    let ema = candles[0].close;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();

    for (let i = 0; i < candles.length; i++) {
      ema = candles[i].close * k + ema * (1 - k);
      const x = this.padding.left + i * candleSpacing + candleSpacing / 2;
      const y = this.padding.top + priceH * (1 - (ema - minPrice) / adjustedRange);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  _drawBollingerBands(ctx, period, stdDevMult, minPrice, adjustedRange, priceH, candleSpacing, candles) {
    if (candles.length < period) return;
    const upperPoints = [];
    const lowerPoints = [];

    for (let i = period - 1; i < candles.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += candles[i - j].close;
      const ma = sum / period;

      let variance = 0;
      for (let j = 0; j < period; j++) variance += Math.pow(candles[i - j].close - ma, 2);
      const stdDev = Math.sqrt(variance / period);

      const upper = ma + stdDev * stdDevMult;
      const lower = ma - stdDev * stdDevMult;

      const x = this.padding.left + i * candleSpacing + candleSpacing / 2;
      const yUpper = this.padding.top + priceH * (1 - (upper - minPrice) / adjustedRange);
      const yLower = this.padding.top + priceH * (1 - (lower - minPrice) / adjustedRange);

      upperPoints.push({ x, y: yUpper });
      lowerPoints.push({ x, y: yLower });
    }

    // Ribbon Cloud
    ctx.beginPath();
    for (let i = 0; i < upperPoints.length; i++) {
      if (i === 0) ctx.moveTo(upperPoints[i].x, upperPoints[i].y);
      else ctx.lineTo(upperPoints[i].x, upperPoints[i].y);
    }
    for (let i = lowerPoints.length - 1; i >= 0; i--) {
      ctx.lineTo(lowerPoints[i].x, lowerPoints[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
    ctx.fill();

    // Upper Line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  _drawRsiSubChart(ctx, w, h, chartW, subH, candleSpacing, candles, customY) {
    const rsiY = customY !== undefined ? customY : (h - subH - this.padding.bottom + 12);
    
    // Background & Bounds (70 Overbought, 30 Oversold)
    ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
    ctx.fillRect(this.padding.left, rsiY, chartW, subH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeRect(this.padding.left, rsiY, chartW, subH);

    // 70 line
    const y70 = rsiY + subH * 0.3;
    const y30 = rsiY + subH * 0.7;

    ctx.strokeStyle = 'rgba(246, 70, 93, 0.28)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(this.padding.left, y70);
    ctx.lineTo(w - this.padding.right, y70);
    ctx.stroke();

    // 30 line
    ctx.strokeStyle = 'rgba(14, 203, 129, 0.28)';
    ctx.beginPath();
    ctx.moveTo(this.padding.left, y30);
    ctx.lineTo(w - this.padding.right, y30);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#64748b';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('70 OB', w - this.padding.right + 6, y70 + 3);
    ctx.fillText('30 OS', w - this.padding.right + 6, y30 + 3);
    ctx.fillText('RSI(14)', this.padding.left + 6, rsiY + 12);

    if (candles.length < 15) return;
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.3;
    ctx.beginPath();

    let started = false;
    for (let i = 14; i < candles.length; i++) {
      let gains = 0, losses = 0;
      for (let j = 0; j < 14; j++) {
        const diff = candles[i - j].close - candles[i - j - 1].close;
        if (diff > 0) gains += diff;
        else losses += Math.abs(diff);
      }
      const rs = (gains / 14) / ((losses / 14) || 1);
      const rsi = 100 - (100 / (1 + rs));

      const x = this.padding.left + i * candleSpacing + candleSpacing / 2;
      const y = rsiY + subH * (1 - rsi / 100);

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  // 7.5 MACD(12, 26, 9) Sub-Chart Renderer (Dual EMA, Signal Line & Divergence Histogram)
  _drawMacdSubChart(ctx, w, h, chartW, subH, candleSpacing, candles, macdY) {
    if (candles.length < 26) return;

    // Background & Bounds
    ctx.fillStyle = 'rgba(10, 14, 23, 0.88)';
    ctx.fillRect(this.padding.left, macdY, chartW, subH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.strokeRect(this.padding.left, macdY, chartW, subH);

    // Compute Fast EMA (12) and Slow EMA (26)
    const kFast = 2 / (12 + 1);
    const kSlow = 2 / (26 + 1);
    let emaFast = candles[0].close;
    let emaSlow = candles[0].close;
    const macdSeries = [];

    for (let i = 0; i < candles.length; i++) {
      emaFast = candles[i].close * kFast + emaFast * (1 - kFast);
      emaSlow = candles[i].close * kSlow + emaSlow * (1 - kSlow);
      macdSeries.push(emaFast - emaSlow);
    }

    // Signal Line: 9-period EMA of MACD
    const kSig = 2 / (9 + 1);
    let sig = macdSeries[0];
    const signalSeries = [];
    const histSeries = [];

    for (let i = 0; i < macdSeries.length; i++) {
      sig = macdSeries[i] * kSig + sig * (1 - kSig);
      signalSeries.push(sig);
      histSeries.push(macdSeries[i] - sig);
    }

    // Find max range for vertical scaling
    let maxAbs = 0.0001;
    for (let i = 12; i < candles.length; i++) {
      const absM = Math.abs(macdSeries[i]);
      const absS = Math.abs(signalSeries[i]);
      const absH = Math.abs(histSeries[i]);
      if (absM > maxAbs) maxAbs = absM;
      if (absS > maxAbs) maxAbs = absS;
      if (absH > maxAbs) maxAbs = absH;
    }
    maxAbs *= 1.15; // 15% padding

    // Zero centerline
    const zeroY = macdY + subH / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(this.padding.left, zeroY);
    ctx.lineTo(w - this.padding.right, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Histogram Bars
    const barWidth = Math.max(1.5, candleSpacing * 0.65);
    for (let i = 0; i < candles.length; i++) {
      const hist = histSeries[i];
      const x = this.padding.left + i * candleSpacing + candleSpacing / 2;
      const bH = (Math.abs(hist) / maxAbs) * (subH / 2 - 8);
      const bY = hist >= 0 ? zeroY - bH : zeroY;

      ctx.fillStyle = hist >= 0 ? 'rgba(14, 203, 129, 0.6)' : 'rgba(246, 70, 93, 0.6)';
      ctx.fillRect(x - barWidth / 2, bY, barWidth, Math.max(1, bH));
    }

    // Draw MACD Line (Cyan)
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let i = 0; i < candles.length; i++) {
      const x = this.padding.left + i * candleSpacing + candleSpacing / 2;
      const y = zeroY - (macdSeries[i] / maxAbs) * (subH / 2 - 8);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Signal Line (Amber)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = 0; i < candles.length; i++) {
      const x = this.padding.left + i * candleSpacing + candleSpacing / 2;
      const y = zeroY - (signalSeries[i] / maxAbs) * (subH / 2 - 8);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Labels and current values
    const lastM = macdSeries[macdSeries.length - 1];
    const lastS = signalSeries[signalSeries.length - 1];
    const lastH = histSeries[histSeries.length - 1];

    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('MACD(12,26,9)', this.padding.left + 6, macdY + 12);
    
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`DIF: ${lastM.toFixed(4)}`, this.padding.left + 85, macdY + 12);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`DEA: ${lastS.toFixed(4)}`, this.padding.left + 165, macdY + 12);

    ctx.fillStyle = lastH >= 0 ? '#0ecb81' : '#f6465d';
    ctx.fillText(`HIST: ${lastH > 0 ? '+' : ''}${lastH.toFixed(4)}`, this.padding.left + 245, macdY + 12);
  }

  // 8.5 Visual On-Chart Pending Orders Lines, Badges & Quick Cancel
  _drawPendingOrders(ctx, w, minPrice, adjustedRange, priceH) {
    this.cancelClickTargets = [];
    if (!this.pendingOrders || this.pendingOrders.length === 0) return;

    const curSymClean = (this.currentSymbol || '').toUpperCase().replace(/[-_]/g, '');

    const relevant = this.pendingOrders.filter(o => {
      if (o.status !== 'PENDING' && o.status !== 'OPEN') return false;
      const oSymClean = (o.symbol || '').toUpperCase().replace(/[-_]/g, '');
      return oSymClean === curSymClean || oSymClean.startsWith(curSymClean) || curSymClean.startsWith(oSymClean);
    });

    for (const order of relevant) {
      const targetPrice = parseFloat(order.price || order.stopPrice || order.triggerPrice || 0);
      if (!targetPrice || isNaN(targetPrice)) continue;

      const y = this.padding.top + priceH * (1 - (targetPrice - minPrice) / adjustedRange);
      if (y < this.padding.top - 2 || y > this.padding.top + priceH + 2) continue;

      const isBuy = (order.side === 'BUY' || order.side === 'LONG');
      const color = isBuy ? '#0ecb81' : '#f6465d';

      // Dashed Line across chart
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(this.padding.left, y);
      ctx.lineTo(w - this.padding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Left Tag: e.g. "LIMIT BUY 0.50 BTC"
      const typeStr = (order.type || 'LIMIT').toUpperCase();
      const sideStr = isBuy ? 'BUY' : 'SELL';
      const symBase = (order.symbol || 'BTC').split(/[-_]/)[0];
      const sizeStr = `${order.size || 0} ${symBase}`;
      const label = `${typeStr} ${sideStr} ${sizeStr}`;

      ctx.font = '800 10.5px "Plus Jakarta Sans", "Outfit", system-ui, sans-serif';
      const labelW = ctx.measureText(label).width + 16;
      const badgeX = this.padding.left + 6;
      const badgeY = y - 10;
      const badgeH = 20;

      // Pill Background with Gemini glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = isBuy ? 'rgba(5, 150, 105, 0.4)' : 'rgba(225, 29, 72, 0.4)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(badgeX, badgeY, labelW, badgeH, 4);
      } else {
        ctx.rect(badgeX, badgeY, labelW, badgeH);
      }
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Pill Text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, badgeX + 8, y + 4);

      // On-Chart 1-Click Cancel Button: [X]
      const cancelX = badgeX + labelW + 4;
      const cancelW = 18;
      const cancelH = badgeH;
      ctx.fillStyle = 'rgba(246, 70, 93, 0.22)';
      ctx.strokeStyle = 'rgba(246, 70, 93, 0.8)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(cancelX, badgeY, cancelW, cancelH, 3);
      } else {
        ctx.rect(cancelX, badgeY, cancelW, cancelH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ff6b7d';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('X', cancelX + 5, y + 4);

      // Register click target for instant canvas order cancellation
      this.cancelClickTargets.push({
        orderId: order.id,
        x: cancelX,
        y: badgeY,
        w: cancelW,
        h: cancelH
      });

      // Right Y-Axis Price Badge
      const prec = targetPrice > 500 ? 2 : (targetPrice > 1 ? 4 : 6);
      const priceStr = targetPrice.toLocaleString(undefined, { minimumFractionDigits: prec, maximumFractionDigits: prec });
      ctx.fillStyle = color;
      ctx.fillRect(w - this.padding.right + 1, y - 8, 78, 16);
      ctx.fillStyle = '#080c14';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText(priceStr, w - this.padding.right + 4, y + 4);

      ctx.restore();
    }
  }

  // 8.6 Visual On-Chart Open Positions & Liquidation Warning Lines
  _drawPositionAndLiquidationLines(ctx, w, minPrice, adjustedRange, priceH) {
    const curSymClean = (this.currentSymbol || '').toUpperCase().replace(/[-_]/g, '');
    const allPos = this.positions || (typeof localPositions !== 'undefined' ? localPositions : (window.localPositions || []));
    if (!allPos || !allPos.length) return;

    const pos = allPos.find(p => {
      const pSymClean = (p.symbol || '').toUpperCase().replace(/[-_]/g, '');
      return pSymClean === curSymClean || pSymClean.startsWith(curSymClean) || curSymClean.startsWith(pSymClean);
    });
    if (!pos) return;

    // 1. Draw Position Entry Price Line (Emerald / Rose)
    if (pos.entryPrice && pos.entryPrice > 0) {
      const entryY = this.padding.top + priceH * (1 - (pos.entryPrice - minPrice) / adjustedRange);
      if (entryY >= this.padding.top - 2 && entryY <= this.padding.top + priceH + 2) {
        ctx.save();
        const isLong = pos.side === 'LONG';
        const color = isLong ? '#10b981' : '#f43f5e';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.3;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(this.padding.left, entryY);
        ctx.lineTo(w - this.padding.right, entryY);
        ctx.stroke();
        ctx.setLineDash([]);

        const entryLabel = `POS ${pos.side} ${pos.leverage}x @ $${pos.entryPrice.toLocaleString()}`;
        ctx.font = '800 10.5px "Plus Jakarta Sans", "Outfit", sans-serif';
        const eLabelW = ctx.measureText(entryLabel).width + 16;
        const eX = this.padding.left + 6;
        const eY = entryY - 10;
        ctx.fillStyle = 'rgba(13, 18, 28, 0.92)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(eX, eY, eLabelW, 20, 4);
        else ctx.rect(eX, eY, eLabelW, 20);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = isLong ? '#34d399' : '#fb7185';
        ctx.fillText(entryLabel, eX + 8, entryY + 4);
        ctx.restore();
      }
    }

    // 2. Draw Liquidation Price Line (Hazard Orange/Red with glowing warning badge)
    if (pos.liquidationPrice && pos.liquidationPrice > 0) {
      const liqY = this.padding.top + priceH * (1 - (pos.liquidationPrice - minPrice) / adjustedRange);
      if (liqY >= this.padding.top - 2 && liqY <= this.padding.top + priceH + 2) {
        ctx.save();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(this.padding.left, liqY);
        ctx.lineTo(w - this.padding.right, liqY);
        ctx.stroke();
        ctx.setLineDash([]);

        const distPct = pos.markPrice ? ((pos.liquidationPrice - pos.markPrice) / pos.markPrice * 100).toFixed(1) : '';
        const liqLabel = `LIQ PRICE $${pos.liquidationPrice.toLocaleString()} (${distPct > 0 ? '+' : ''}${distPct}%)`;
        ctx.font = '800 10.5px "Plus Jakarta Sans", "Outfit", sans-serif';
        const lLabelW = ctx.measureText(liqLabel).width + 18;
        const lX = this.padding.left + 6;
        const lY = liqY - 10;

        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.38)';
        ctx.strokeStyle = '#ff6b7d';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(lX, lY, lLabelW, 20, 4);
        else ctx.rect(lX, lY, lLabelW, 20);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.fillText(liqLabel, lX + 8, liqY + 4);

        // Right Y-axis hazard badge
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(w - this.padding.right + 1, liqY - 8, 80, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 10px "JetBrains Mono", monospace';
        ctx.fillText('LIQ ' + pos.liquidationPrice.toLocaleString(), w - this.padding.right + 3, liqY + 4);
        ctx.restore();
      }
    }
  }

  // 8.7 Order Flow Delta Footprint (Buyer vs Seller Pressure)
  _drawFootprint(ctx, candleWidth, candleSpacing, minPrice, adjustedRange, priceH, candles) {
    ctx.save();
    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const x = this.padding.left + i * candleSpacing + candleSpacing / 2;
      const range = (c.high - c.low) || 1;
      const deltaRatio = Math.max(-1, Math.min(1, (c.close - c.open) / range));
      const deltaVol = Math.round(c.volume * deltaRatio);

      const y = this.padding.top + priceH * (1 - (c.high - minPrice) / adjustedRange) - 6;
      ctx.fillStyle = deltaVol >= 0 ? '#10b981' : '#f43f5e';
      const label = deltaVol >= 0 
        ? `+${deltaVol > 1000 ? (deltaVol / 1000).toFixed(1) + 'k' : deltaVol}` 
        : `${deltaVol < -1000 ? (deltaVol / 1000).toFixed(1) + 'k' : deltaVol}`;
      ctx.fillText(label, x, y);
    }
    ctx.restore();
  }

  // 8.8 Institutional Volume Profile (Point of Control POC, Value Area High/Low)
  _drawVolumeProfile(ctx, w, chartW, minPrice, adjustedRange, priceH, candles) {
    ctx.save();
    const buckets = 28;
    const bucketHeights = new Array(buckets).fill(0);
    const bucketStep = adjustedRange / buckets;

    for (const c of candles) {
      const avgPrice = (c.open + c.close + c.high + c.low) / 4;
      const idx = Math.min(buckets - 1, Math.max(0, Math.floor((avgPrice - minPrice) / bucketStep)));
      bucketHeights[idx] += c.volume;
    }

    const maxProfileVol = Math.max(...bucketHeights, 1);
    let pocIdx = 0;
    let maxBucket = 0;
    for (let i = 0; i < buckets; i++) {
      if (bucketHeights[i] > maxBucket) {
        maxBucket = bucketHeights[i];
        pocIdx = i;
      }
    }

    const profileMaxW = 85;
    const rightEdge = w - this.padding.right;

    for (let i = 0; i < buckets; i++) {
      const vol = bucketHeights[i];
      const barW = (vol / maxProfileVol) * profileMaxW;
      const barY = this.padding.top + priceH * (1 - (i + 1) / buckets);
      const barH = Math.max(2, (priceH / buckets) - 1);

      ctx.fillStyle = i === pocIdx ? 'rgba(245, 158, 11, 0.45)' : 'rgba(56, 189, 248, 0.2)';
      ctx.fillRect(rightEdge - barW, barY, barW, barH);
    }

    // Point of Control (POC) Line
    const pocY = this.padding.top + priceH * (1 - (pocIdx + 0.5) / buckets);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(rightEdge - profileMaxW - 20, pocY);
    ctx.lineTo(rightEdge, pocY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText('POC', rightEdge - profileMaxW - 44, pocY + 3);

    ctx.restore();
  }

  // 8.9 Fibonacci Retracement Grid (Golden Pocket 0.618, 0.5 Equilibrium)
  _drawFibonacciRetracement(ctx, w, minPrice, adjustedRange, priceH, minIndex, maxIndex, candles) {
    if (candles.length < 2) return;
    ctx.save();
    const lowC = candles[minIndex];
    const highC = candles[maxIndex];
    if (!lowC || !highC) { ctx.restore(); return; }

    const isUptrend = maxIndex > minIndex;
    const baseLow = lowC.low;
    const baseHigh = highC.high;
    const diff = baseHigh - baseLow;
    if (diff <= 0) { ctx.restore(); return; }

    const fibLevels = [
      { level: 0.0, color: '#94a3b8', label: '0.0% (Base)' },
      { level: 0.236, color: '#38bdf8', label: '23.6%' },
      { level: 0.382, color: '#818cf8', label: '38.2%' },
      { level: 0.500, color: '#10b981', label: '50.0% (Eq)' },
      { level: 0.618, color: '#f59e0b', label: '61.8% (Golden Pocket)' },
      { level: 0.786, color: '#ec4899', label: '78.6%' },
      { level: 1.0, color: '#e2e8f0', label: '100.0% (Peak)' }
    ];

    const rightEdge = w - this.padding.right;

    fibLevels.forEach(fib => {
      const fibPrice = isUptrend 
        ? baseHigh - (diff * fib.level) 
        : baseLow + (diff * fib.level);
      const fibY = this.padding.top + priceH * (1 - (fibPrice - minPrice) / adjustedRange);

      if (fibY >= this.padding.top && fibY <= this.padding.top + priceH) {
        ctx.strokeStyle = fib.color;
        ctx.lineWidth = fib.level === 0.618 || fib.level === 0.5 ? 1.4 : 0.8;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(this.padding.left, fibY);
        ctx.lineTo(rightEdge, fibY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = fib.color;
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(`Fib ${fib.label} $${this._formatPrice(fibPrice)}`, this.padding.left + 8, fibY - 3);
      }
    });

    ctx.restore();
  }
}

window.OmniCandleChart = OmniCandleChart;
window.OmniChart = OmniCandleChart;
