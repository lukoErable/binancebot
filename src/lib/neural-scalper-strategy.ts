import { Candle, Position, StrategyConfig, TradingSignal } from '@/types/trading';

/**
 * NEURAL SCALPER STRATEGY - CYBORG MODE 🤖
 * 
 * Stratégie ultra-agressive de scalping basée sur la détection de micro-patterns
 * que seule une machine peut identifier et exécuter avec précision.
 * 
 * Concept révolutionnaire :
 * - Détecte les micro-retournements en analysant la vélocité du prix
 * - Utilise l'accélération du momentum (dérivée seconde du prix)
 * - Entre sur les pics de volatilité avec confirmation de direction
 * - Sort ultra-rapidement (15-30 secondes typiquement)
 * 
 * Entry Logic:
 * - LONG: Accélération haussière + Volume spike + RSI momentum positif + Prix > VWAP
 * - SHORT: Accélération baissière + Volume spike + RSI momentum négatif + Prix < VWAP
 * 
 * Exit Logic:
 * - Take profit: +1.5% (rapide !)
 * - Stop loss: -0.8% (serré !)
 * - Max position time: 2 minutes (ultra-court !)
 * - Momentum inverse détecté
 */
export class NeuralScalperStrategy {
  private config: StrategyConfig;
  private currentPosition: Position;
  private lastTradeTime: number = 0;
  private totalPnL: number = 0;
  private totalTrades: number = 0;
  private winningTrades: number = 0;
  private signalHistory: TradingSignal[] = [];
  private lastSignal: TradingSignal | null = null;
  private initialCapital: number = 100000; // 100,000 USDT
  
  // Neural detection flags
  private isPriceAccelerating: boolean = false;
  private isVolatilityHigh: boolean = false;
  private isMomentumStrong: boolean = false;
  
  // Neural detection values (for frontend display)
  private currentVelocity: number = 0;
  private currentAcceleration: number = 0;
  private currentRsiMomentum: number = 0;
  private currentVolumeSpike: boolean = false;
  
  // Price history for velocity calculation
  private priceHistory: number[] = [];

  constructor(config: StrategyConfig) {
    this.config = {
      ...config,
      // Ultra-aggressive scalping parameters
      profitTargetPercent: 1.5, // Quick 1.5% profit
      stopLossPercent: 0.8, // Tight 0.8% stop
      maxPositionTime: 2 * 60 * 1000, // 2 minutes max
      cooldownPeriod: 30 * 1000, // Only 30 seconds cooldown
    };
    this.currentPosition = {
      type: 'NONE',
      entryPrice: 0,
      entryTime: 0,
      quantity: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
    };
  }

  /**
   * Calculate price velocity (first derivative)
   */
  private calculateVelocity(prices: number[]): number {
    if (prices.length < 2) return 0;
    const recent = prices.slice(-5); // Last 5 prices
    let totalChange = 0;
    for (let i = 1; i < recent.length; i++) {
      totalChange += recent[i] - recent[i - 1];
    }
    return totalChange / (recent.length - 1);
  }

  /**
   * Calculate price acceleration (second derivative)
   */
  private calculateAcceleration(prices: number[]): number {
    if (prices.length < 3) return 0;
    const recent = prices.slice(-6);
    const velocities: number[] = [];
    
    for (let i = 1; i < recent.length; i++) {
      velocities.push(recent[i] - recent[i - 1]);
    }
    
    let totalAccel = 0;
    for (let i = 1; i < velocities.length; i++) {
      totalAccel += velocities[i] - velocities[i - 1];
    }
    
    return totalAccel / (velocities.length - 1);
  }

  /**
   * Calculate volatility (standard deviation of recent prices)
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 10) return 0;
    
    const recent = prices.slice(-10);
    const mean = recent.reduce((sum, p) => sum + p, 0) / recent.length;
    const squaredDiffs = recent.map(p => Math.pow(p - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / recent.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Calculate RSI momentum (rate of change of RSI)
   */
  private calculateRSIMomentum(candles: Candle[]): number {
    if (candles.length < 20) return 0;
    
    const rsi1 = this.calculateRSI(candles);
    const rsi2 = this.calculateRSI(candles.slice(0, -1));
    const rsi3 = this.calculateRSI(candles.slice(0, -2));
    
    if (rsi1 === null || rsi2 === null || rsi3 === null) return 0;
    
    // Calculate momentum as the rate of change
    return (rsi1 - rsi2) + ((rsi1 - rsi2) - (rsi2 - rsi3));
  }

  /**
   * Calculate RSI
   */
  private calculateRSI(candles: Candle[]): number | null {
    const period = 14;
    if (candles.length < period + 1) return null;

    let gains = 0;
    let losses = 0;

    for (let i = candles.length - period; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate VWAP
   */
  private calculateVWAP(candles: Candle[]): number | null {
    if (candles.length === 0) return null;

    const period = Math.min(20, candles.length);
    const recentCandles = candles.slice(-period);

    let totalPV = 0;
    let totalVolume = 0;

    recentCandles.forEach(candle => {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      totalPV += typicalPrice * candle.volume;
      totalVolume += candle.volume;
    });

    return totalVolume > 0 ? totalPV / totalVolume : null;
  }

  /**
   * Calculate average volume
   */
  private calculateAvgVolume(candles: Candle[], period: number = 10): number {
    const recentCandles = candles.slice(-period);
    return recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
  }

  /**
   * Calculate EMA
   */
  private calculateEMA(candles: Candle[], period: number): number | null {
    if (candles.length < period) return null;

    const multiplier = 2 / (period + 1);
    let ema = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;

    for (let i = period; i < candles.length; i++) {
      ema = (candles[i].close - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Calculate SMA
   */
  private calculateSMA(candles: Candle[], period: number): number | null {
    if (candles.length < period) return null;
    const recentCandles = candles.slice(-period);
    return recentCandles.reduce((sum, c) => sum + c.close, 0) / period;
  }

  /**
   * CYBORG ANALYSIS - Detect micro-opportunities
   */
  analyzeMarket(candles: Candle[]): TradingSignal | null {
    if (candles.length < 30) {
      console.log(`[Neural Scalper] Not enough data. Need 30, have ${candles.length}`);
      return null;
    }

    const currentCandle = candles[candles.length - 1];
    const currentPrice = currentCandle.close;
    const timestamp = Date.now();

    // Update price history
    this.priceHistory.push(currentPrice);
    if (this.priceHistory.length > 20) {
      this.priceHistory.shift();
    }

    // Calculate all indicators
    const rsi = this.calculateRSI(candles);
    const vwap = this.calculateVWAP(candles);
    const avgVolume = this.calculateAvgVolume(candles, 10);
    const currentVolume = currentCandle.volume;
    
    // Neural metrics
    const velocity = this.calculateVelocity(this.priceHistory);
    const acceleration = this.calculateAcceleration(this.priceHistory);
    const volatility = this.calculateVolatility(this.priceHistory);
    const rsiMomentum = this.calculateRSIMomentum(candles);

    // EMAs for display
    const ema12 = this.calculateEMA(candles, 12);
    const ema26 = this.calculateEMA(candles, 26);
    const ema50 = this.calculateEMA(candles, 50);
    const ema200 = this.calculateEMA(candles, 200);
    const ma7 = this.calculateSMA(candles, 7);
    const ma25 = this.calculateSMA(candles, 25);
    const ma99 = this.calculateSMA(candles, 99);

    if (!rsi || !vwap || !ema12 || !ema26 || !ema50 || !ema200 || !ma7 || !ma25 || !ma99) {
      console.log('[Neural Scalper] Unable to calculate indicators');
      return null;
    }

    // Neural detection flags (adjusted for better sensitivity)
    const avgVelocity = Math.abs(velocity);
    const volatilityThreshold = currentPrice * 0.0003; // 0.03% of price (was 0.05%)
    
    this.isVolatilityHigh = volatility > volatilityThreshold;
    this.isPriceAccelerating = Math.abs(acceleration) > avgVelocity * 0.3; // was 0.5
    this.isMomentumStrong = Math.abs(rsiMomentum) > 1.5; // was 2
    
    const volumeSpike = currentVolume > avgVolume * 1.3; // was 1.5
    
    // Store values for frontend display
    this.currentVelocity = velocity;
    this.currentAcceleration = acceleration;
    this.currentRsiMomentum = rsiMomentum;
    this.currentVolumeSpike = volumeSpike;

    // Handle existing position
    if (this.currentPosition.type !== 'NONE') {
      const exitCheck = this.shouldClosePosition(currentPrice, velocity, acceleration);
      if (exitCheck.shouldClose) {
        return this.closePosition(currentPrice, exitCheck.reason);
      }

      this.updatePositionPnL(currentPrice);
      return {
        type: 'HOLD',
        timestamp,
        price: currentPrice,
        rsi,
        ema12,
        ema26,
        ema50,
        ema200,
        ma7,
        ma25,
        ma99,
        reason: `In ${this.currentPosition.type} | PnL: ${this.currentPosition.unrealizedPnLPercent.toFixed(2)}% | Vel: ${velocity.toFixed(2)}`,
        position: { ...this.currentPosition }
      };
    }

    // Check cooldown
    if (!this.isCooldownPassed()) {
      return {
        type: 'HOLD',
        timestamp,
        price: currentPrice,
        rsi,
        ema12,
        ema26,
        ema50,
        ema200,
        ma7,
        ma25,
        ma99,
        reason: 'Cooldown (30s)'
      };
    }

    // Debug: Log conditions when they're close to being met
    const longConditions = {
      acceleration: acceleration > 0,
      velocity: velocity > 0,
      volumeOrVolatility: volumeSpike || this.isVolatilityHigh,
      priceVsVwap: currentPrice > vwap,
      rsiMomentum: rsiMomentum > 1.5
    };
    
    const shortConditions = {
      acceleration: acceleration < 0,
      velocity: velocity < 0,
      volumeOrVolatility: volumeSpike || this.isVolatilityHigh,
      priceVsVwap: currentPrice < vwap,
      rsiMomentum: rsiMomentum < -1.5
    };
    
    // Log when most conditions are met
    const longMet = Object.values(longConditions).filter(v => v).length;
    const shortMet = Object.values(shortConditions).filter(v => v).length;
    
    if (longMet >= 4 || shortMet >= 4) {
      console.log(`[Neural Scalper] Close to signal! LONG: ${longMet}/5 | SHORT: ${shortMet}/5`);
      console.log('  Conditions:', { 
        accel: acceleration.toFixed(4), 
        vel: velocity.toFixed(4), 
        rsiM: rsiMomentum.toFixed(2),
        volSpike: volumeSpike,
        volatilityHigh: this.isVolatilityHigh,
        priceVsVwap: (currentPrice - vwap).toFixed(2)
      });
    }
    
    // LONG entry: MEAN REVERSION - Buy when oversold (price drops fast below VWAP)
    // Inverse logic: Buy the dip, sell the rip
    if (acceleration < 0 && velocity < 0 && (volumeSpike || this.isVolatilityHigh) && currentPrice < vwap && rsiMomentum < -1.5) {
      this.currentPosition = {
        type: 'LONG',
        entryPrice: currentPrice,
        entryTime: timestamp,
        quantity: this.config.positionSize,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0
      };
      this.lastTradeTime = timestamp;

      const buySignal: TradingSignal = {
        type: 'BUY',
        timestamp,
        price: currentPrice,
        rsi,
        ema12,
        ema26,
        ema50,
        ema200,
        ma7,
        ma25,
        ma99,
        reason: `🚀 NEURAL LONG (Reversal) | Accel: ${acceleration.toFixed(4)} | Vol: ${volumeSpike ? 'SPIKE' : 'OK'} | RSI↘: ${rsiMomentum.toFixed(1)}`,
        position: { 
          ...this.currentPosition,
          currentCapital: this.initialCapital + this.totalPnL
        }
      };
      this.recordSignal(buySignal);
      return buySignal;
    }

    // SHORT entry: MEAN REVERSION - Sell when overbought (price rises fast above VWAP)
    // Inverse logic: Sell the rip, buy the dip
    if (acceleration > 0 && velocity > 0 && (volumeSpike || this.isVolatilityHigh) && currentPrice > vwap && rsiMomentum > 1.5) {
      this.currentPosition = {
        type: 'SHORT',
        entryPrice: currentPrice,
        entryTime: timestamp,
        quantity: this.config.positionSize,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0
      };
      this.lastTradeTime = timestamp;

      const sellSignal: TradingSignal = {
        type: 'SELL',
        timestamp,
        price: currentPrice,
        rsi,
        ema12,
        ema26,
        ema50,
        ema200,
        ma7,
        ma25,
        ma99,
        reason: `🔻 NEURAL SHORT (Reversal) | Accel: ${acceleration.toFixed(4)} | Vol: ${volumeSpike ? 'SPIKE' : 'OK'} | RSI↗: ${rsiMomentum.toFixed(1)}`,
        position: { 
          ...this.currentPosition,
          currentCapital: this.initialCapital + this.totalPnL
        }
      };
      this.recordSignal(sellSignal);
      return sellSignal;
    }

    // No signal
    return {
      type: 'HOLD',
      timestamp,
      price: currentPrice,
      rsi,
      ema12,
      ema26,
      ema50,
      ema200,
      ma7,
      ma25,
      ma99,
      reason: `Scanning... | Accel: ${acceleration.toFixed(4)} | Vol: ${(currentVolume/avgVolume).toFixed(1)}x | RSI-M: ${rsiMomentum.toFixed(1)}`
    };
  }

  /**
   * Check if position should be closed (ultra-reactive)
   */
  private shouldClosePosition(
    currentPrice: number,
    velocity: number,
    acceleration: number
  ): { shouldClose: boolean; reason: string } {
    const positionTime = Date.now() - this.currentPosition.entryTime;
    const pnlPercent = this.currentPosition.unrealizedPnLPercent;

    // Quick profit target (1.5%)
    if (pnlPercent >= this.config.profitTargetPercent) {
      return { shouldClose: true, reason: `⚡ Quick profit: +${pnlPercent.toFixed(2)}%` };
    }

    // Tight stop loss (0.8%)
    if (pnlPercent <= -this.config.stopLossPercent) {
      return { shouldClose: true, reason: `🛑 Stop loss: ${pnlPercent.toFixed(2)}%` };
    }

    // Max position time (2 minutes)
    if (positionTime > this.config.maxPositionTime) {
      return { shouldClose: true, reason: `⏱️ Timeout (2min): ${pnlPercent.toFixed(2)}%` };
    }

    // Exit on momentum reversal (CRITICAL for scalping)
    if (this.currentPosition.type === 'LONG') {
      // Exit LONG if velocity turns negative or acceleration becomes bearish
      if (velocity < 0 || acceleration < -0.5) {
        return { shouldClose: true, reason: `🔄 Momentum reversed: ${pnlPercent.toFixed(2)}%` };
      }
    }

    if (this.currentPosition.type === 'SHORT') {
      // Exit SHORT if velocity turns positive or acceleration becomes bullish
      if (velocity > 0 || acceleration > 0.5) {
        return { shouldClose: true, reason: `🔄 Momentum reversed: ${pnlPercent.toFixed(2)}%` };
      }
    }

    return { shouldClose: false, reason: '' };
  }

  /**
   * Close position with fees calculation
   */
  private closePosition(currentPrice: number, reason: string): TradingSignal {
    const fees = this.calculateFees(this.currentPosition.entryPrice, currentPrice, this.currentPosition.quantity);
    const grossPnL = this.currentPosition.unrealizedPnL;
    const netPnL = grossPnL - fees;
    
    this.totalPnL += netPnL;
    this.totalTrades++;
    
    if (netPnL > 0) {
      this.winningTrades++;
    }

    const signalType = this.currentPosition.type === 'LONG' ? 'CLOSE_LONG' : 'CLOSE_SHORT';
    const currentCapital = this.initialCapital + this.totalPnL;
    const closeSignal: TradingSignal = {
      type: signalType,
      timestamp: Date.now(),
      price: currentPrice,
      rsi: 0,
      ema12: 0,
      ema26: 0,
      ema50: 0,
      ema200: 0,
      ma7: 0,
      ma25: 0,
      ma99: 0,
      reason: `${reason} | Net: ${netPnL.toFixed(2)} USDT (${this.currentPosition.unrealizedPnLPercent.toFixed(2)}%) | Fees: ${fees.toFixed(2)}`,
      position: { 
        ...this.currentPosition,
        totalPnL: this.totalPnL,
        totalPnLPercent: (this.totalPnL / this.initialCapital) * 100,
        fees: fees,
        currentCapital: currentCapital
      }
    };

    this.currentPosition = {
      type: 'NONE',
      entryPrice: 0,
      entryTime: 0,
      quantity: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0
    };

    this.recordSignal(closeSignal);
    return closeSignal;
  }

  /**
   * Update position PnL
   */
  private updatePositionPnL(currentPrice: number): void {
    if (this.currentPosition.type === 'NONE') return;

    if (this.currentPosition.type === 'LONG') {
      this.currentPosition.unrealizedPnL = 
        (currentPrice - this.currentPosition.entryPrice) * this.currentPosition.quantity;
      this.currentPosition.unrealizedPnLPercent = 
        ((currentPrice - this.currentPosition.entryPrice) / this.currentPosition.entryPrice) * 100;
    } else if (this.currentPosition.type === 'SHORT') {
      this.currentPosition.unrealizedPnL = 
        (this.currentPosition.entryPrice - currentPrice) * this.currentPosition.quantity;
      this.currentPosition.unrealizedPnLPercent = 
        ((this.currentPosition.entryPrice - currentPrice) / this.currentPosition.entryPrice) * 100;
    }
  }

  /**
   * Calculate trading fees
   */
  private calculateFees(entryPrice: number, exitPrice: number, quantity: number): number {
    const entryFee = entryPrice * quantity * 0.001;
    const exitFee = exitPrice * quantity * 0.001;
    return entryFee + exitFee;
  }

  /**
   * Check if cooldown has passed
   */
  private isCooldownPassed(): boolean {
    return Date.now() - this.lastTradeTime > this.config.cooldownPeriod;
  }

  /**
   * Record signal in history
   */
  private recordSignal(signal: TradingSignal): void {
    if (signal.type !== 'HOLD') {
      this.signalHistory.push(signal);
      this.lastSignal = signal;
    }
  }

  /**
   * Get position info
   */
  getPositionInfo() {
    const currentCapital = this.initialCapital + this.totalPnL + this.currentPosition.unrealizedPnL;
    
    return {
      position: this.currentPosition,
      totalPnL: this.totalPnL,
      totalTrades: this.totalTrades,
      winningTrades: this.winningTrades,
      winRate: this.totalTrades > 0 ? (this.winningTrades / this.totalTrades) * 100 : 0,
      lastSignal: this.lastSignal,
      signalHistory: this.signalHistory,
      currentCapital,
      // Boolean flags
      isPriceAccelerating: this.isPriceAccelerating,
      isVolatilityHigh: this.isVolatilityHigh,
      isMomentumStrong: this.isMomentumStrong,
      // Numeric values for detailed display
      velocity: this.currentVelocity,
      acceleration: this.currentAcceleration,
      rsiMomentum: this.currentRsiMomentum,
      volumeSpike: this.currentVolumeSpike
    };
  }

  /**
   * Execute trade (compatibility)
   */
  executeTrade(signal: TradingSignal): void {
    if (this.config.simulationMode) {
      console.log(`🤖 [NEURAL SCALPER] ${signal.type} at ${signal.price.toFixed(2)} USDT`);
    } else {
      console.log(`🚨 [LIVE] ${signal.type} signal - Real trading not yet implemented`);
    }
  }

  /**
   * Restore strategy state from database trades
   */
  restoreFromDatabase(trades: any[]): void {
    if (trades.length === 0) return;

    console.log(`📥 Restoring Neural Scalper strategy from ${trades.length} trades...`);

    // Count closed trades
    const closeTrades = trades.filter((t: any) => 
      t.signal_type === 'CLOSE_LONG' || t.signal_type === 'CLOSE_SHORT'
    );

    this.totalTrades = closeTrades.length;
    
    // Get the most recent total_pnl (it's already cumulative)
    // Trades are sorted DESC by timestamp, so [0] is the most recent
    const mostRecentTrade = trades[0];
    this.totalPnL = mostRecentTrade && mostRecentTrade.total_pnl ? parseFloat(mostRecentTrade.total_pnl) : 0;
    
    // Count wins from individual trades (use pnl field, not total_pnl)
    this.winningTrades = closeTrades.filter((t: any) => {
      const tradePnl = parseFloat(t.pnl) || 0;
      return tradePnl > 0;
    }).length;

    const latestTrade = trades[0];
    if (latestTrade && (latestTrade.signal_type === 'BUY' || latestTrade.signal_type === 'SELL')) {
      const hasClosingTrade = trades.some((t: any) => 
        (t.signal_type === 'CLOSE_LONG' || t.signal_type === 'CLOSE_SHORT') &&
        new Date(t.timestamp) > new Date(latestTrade.timestamp)
      );

      if (!hasClosingTrade && latestTrade.position_type !== 'NONE') {
        this.currentPosition = {
          type: latestTrade.position_type,
          entryPrice: parseFloat(latestTrade.entry_price),
          entryTime: new Date(latestTrade.entry_time).getTime(),
          quantity: parseFloat(latestTrade.quantity),
          unrealizedPnL: parseFloat(latestTrade.unrealized_pnl) || 0,
          unrealizedPnLPercent: parseFloat(latestTrade.unrealized_pnl_percent) || 0
        };
        console.log(`   Restored open ${this.currentPosition.type} position @ ${this.currentPosition.entryPrice.toFixed(2)}`);
      }
    }

    // Restore signal history (last 50 signals)
    this.signalHistory = trades
      .filter((t: any) => t.signal_type !== 'HOLD')
      .slice(0, 50)
      .map((t: any) => ({
        type: t.signal_type,
        timestamp: new Date(t.timestamp).getTime(),
        price: parseFloat(t.price),
        rsi: 0,
        ema12: 0,
        ema26: 0,
        ema50: 0,
        ema200: 0,
        ma7: 0,
        ma25: 0,
        ma99: 0,
        reason: t.reason || '',
        position: t.position_type !== 'NONE' ? {
          type: t.position_type,
          entryPrice: parseFloat(t.entry_price),
          entryTime: new Date(t.entry_time).getTime(),
          quantity: parseFloat(t.quantity),
          unrealizedPnL: parseFloat(t.unrealized_pnl) || 0,
          unrealizedPnLPercent: parseFloat(t.unrealized_pnl_percent) || 0,
          totalPnL: parseFloat(t.total_pnl) || 0,
          totalPnLPercent: parseFloat(t.total_pnl_percent) || 0,
          fees: parseFloat(t.fees) || 0,
          currentCapital: parseFloat(t.current_capital) || 100000
        } : undefined
      }));

    if (this.signalHistory.length > 0) {
      this.lastSignal = this.signalHistory[0];
    }

    console.log(`   ✅ Restored: ${this.totalTrades} trades, ${this.winningTrades} wins, ${this.totalPnL.toFixed(2)} USDT total PnL, ${this.signalHistory.length} signals in history`);
  }
}

/**
 * Neural Scalper config - ULTRA AGGRESSIVE
 */
export const neuralScalperConfig: StrategyConfig = {
  rsiPeriod: 14,
  ema50Period: 50,
  ema200Period: 200,
  rsiBuyThreshold: 30,
  rsiSellThreshold: 70,
  cooldownPeriod: 30 * 1000, // 30 seconds only!
  simulationMode: true,
  profitTargetPercent: 1.5, // Quick 1.5% profit
  stopLossPercent: 0.8, // Tight 0.8% stop
  maxPositionTime: 2 * 60 * 1000, // 2 minutes
  positionSize: 0.015, // 0.015 BTC (~1,650 USDT) - 1.65% of capital (aggressive!)
  emaFastPeriod: 12,
  emaSlowPeriod: 26,
};

