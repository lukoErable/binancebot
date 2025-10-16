import { Candle, Position, StrategyConfig, TradingSignal } from '@/types/trading';

/**
 * Momentum Crossover Strategy
 * 
 * Entry Logic:
 * - LONG: EMA(12) crosses above EMA(26) AND price > EMA(200)
 * - SHORT: EMA(12) crosses below EMA(26) AND price < EMA(200)
 * 
 * Exit Logic:
 * - Profit target reached
 * - Stop loss hit
 * - Max position time exceeded
 * - Reverse crossover signal
 */
export class MomentumCrossoverStrategy {
  private config: StrategyConfig;
  private currentPosition: Position;
  private lastTradeTime: number = 0;
  private totalPnL: number = 0;
  private totalTrades: number = 0;
  private winningTrades: number = 0;
  private signalHistory: TradingSignal[] = [];
  private lastSignal: TradingSignal | null = null;
  private initialCapital: number = 100000; // 100,000 USDT
  // Crossover detection flags (updated on each analysis)
  private isBullishCrossover: boolean = false;
  private isBearishCrossover: boolean = false;

  constructor(config: StrategyConfig) {
    this.config = {
      ...config,
      emaFastPeriod: config.emaFastPeriod || 12,
      emaSlowPeriod: config.emaSlowPeriod || 26,
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
   * Calculate RSI
   */
  private calculateRSI(candles: Candle[]): number | null {
    const period = this.config.rsiPeriod;
    if (candles.length < period + 1) return null;

    const closePrices = candles.map(c => c.close);
    let gains = 0;
    let losses = 0;

    for (let i = closePrices.length - period; i < closePrices.length; i++) {
      const change = closePrices[i] - closePrices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate EMA
   */
  private calculateEMA(candles: Candle[], period: number): number | null {
    if (candles.length < period) return null;

    const k = 2 / (period + 1);
    let ema = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;

    for (let i = period; i < candles.length; i++) {
      ema = candles[i].close * k + ema * (1 - k);
    }

    return ema;
  }

  /**
   * Calculate SMA
   */
  private calculateSMA(candles: Candle[], period: number): number | null {
    if (candles.length < period) return null;
    const closePrices = candles.map(c => c.close);
    const recentPrices = closePrices.slice(-period);
    const sum = recentPrices.reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  /**
   * Check if cooldown period has passed
   */
  private isCooldownPassed(): boolean {
    return Date.now() - this.lastTradeTime >= this.config.cooldownPeriod;
  }

  /**
   * Update unrealized PnL for current position
   */
  private updatePositionPnL(currentPrice: number): void {
    if (this.currentPosition.type === 'NONE') return;

    const priceDiff = this.currentPosition.type === 'LONG'
      ? currentPrice - this.currentPosition.entryPrice
      : this.currentPosition.entryPrice - currentPrice;

    this.currentPosition.unrealizedPnL = priceDiff * this.currentPosition.quantity;
    this.currentPosition.unrealizedPnLPercent = (priceDiff / this.currentPosition.entryPrice) * 100;
  }

  /**
   * Check if position should be closed
   */
  private shouldClosePosition(currentPrice: number): { shouldClose: boolean; reason: string } {
    if (this.currentPosition.type === 'NONE') {
      return { shouldClose: false, reason: '' };
    }

    this.updatePositionPnL(currentPrice);

    // Profit target
    if (this.currentPosition.unrealizedPnLPercent >= this.config.profitTargetPercent) {
      return { shouldClose: true, reason: 'Profit target reached' };
    }

    // Stop loss
    if (this.currentPosition.unrealizedPnLPercent <= -this.config.stopLossPercent) {
      return { shouldClose: true, reason: 'Stop loss hit' };
    }

    // Max position time
    const positionDuration = Date.now() - this.currentPosition.entryTime;
    if (positionDuration >= this.config.maxPositionTime) {
      return { shouldClose: true, reason: 'Max position time exceeded' };
    }

    return { shouldClose: false, reason: '' };
  }

  /**
   * Calculate Binance fees
   */
  private calculateFees(entryPrice: number, exitPrice: number, quantity: number): number {
    const binanceFeeRate = 0.001; // 0.1% per trade
    const entryFee = entryPrice * quantity * binanceFeeRate;
    const exitFee = exitPrice * quantity * binanceFeeRate;
    return entryFee + exitFee;
  }

  /**
   * Close current position
   */
  private closePosition(currentPrice: number, reason: string): TradingSignal {
    const closedPosition = { ...this.currentPosition };
    
    this.updatePositionPnL(currentPrice);
    const grossPnL = this.currentPosition.unrealizedPnL;
    const grossPnLPercent = this.currentPosition.unrealizedPnLPercent;
    
    const fees = this.calculateFees(this.currentPosition.entryPrice, currentPrice, this.currentPosition.quantity);
    const netPnL = grossPnL - fees;
    const netPnLPercent = grossPnLPercent - (fees / (this.currentPosition.entryPrice * this.currentPosition.quantity)) * 100;
    
    this.totalPnL += netPnL;
    this.totalTrades++;
    if (netPnL > 0) this.winningTrades++;

    this.currentPosition = {
      type: 'NONE',
      entryPrice: 0,
      entryTime: 0,
      quantity: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0
    };

    this.lastTradeTime = Date.now();

    const signalType = closedPosition.type === 'LONG' ? 'CLOSE_LONG' : 'CLOSE_SHORT';
    const currentCapital = this.initialCapital + this.totalPnL;
    
    return {
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
      reason: `${reason} | Net PnL: ${netPnL.toFixed(2)} USDT (${netPnLPercent.toFixed(2)}%) | Fees: ${fees.toFixed(2)} USDT`,
      position: {
        ...closedPosition,
        unrealizedPnL: netPnL,
        unrealizedPnLPercent: netPnLPercent,
        totalPnL: this.totalPnL,
        totalPnLPercent: (this.totalPnL / this.initialCapital) * 100,
        fees: fees,
        currentCapital: currentCapital
      }
    };
  }

  /**
   * Record a signal in history (only for actionable signals)
   */
  private recordSignal(signal: TradingSignal): void {
    if (signal.type !== 'HOLD') {
      this.lastSignal = signal;
      this.signalHistory.push(signal);
      // Keep only last 50 signals
      if (this.signalHistory.length > 50) {
        this.signalHistory.shift();
      }
    }
  }

  /**
   * Analyze market using Momentum Crossover strategy
   */
  analyzeMarket(candles: Candle[]): TradingSignal | null {
    console.log('[Momentum Crossover] 🔍 Analyzing market...');
    
    const requiredCandles = Math.max(
      this.config.ema200Period,
      this.config.emaSlowPeriod || 26
    );

    if (candles.length < requiredCandles) {
      console.log(`[Momentum] Not enough candles. Need ${requiredCandles}, have ${candles.length}`);
      return null;
    }

    // Calculate indicators
    const rsi = this.calculateRSI(candles);
    const emaFast = this.calculateEMA(candles, this.config.emaFastPeriod || 12);
    const emaSlow = this.calculateEMA(candles, this.config.emaSlowPeriod || 26);
    const ema200 = this.calculateEMA(candles, this.config.ema200Period);

    // Previous candles for crossover detection
    const previousCandles = candles.slice(0, candles.length - 1);
    const prevEmaFast = this.calculateEMA(previousCandles, this.config.emaFastPeriod || 12);
    const prevEmaSlow = this.calculateEMA(previousCandles, this.config.emaSlowPeriod || 26);

    // Calculate SMAs for display
    const ma7 = this.calculateSMA(candles, 7);
    const ma25 = this.calculateSMA(candles, 25);
    const ma99 = this.calculateSMA(candles, 99);

    if (rsi === null || emaFast === null || emaSlow === null || ema200 === null || 
        prevEmaFast === null || prevEmaSlow === null || ma7 === null || ma25 === null || ma99 === null) {
      console.log('[Momentum] Unable to calculate indicators');
      return null;
    }

    const currentPrice = candles[candles.length - 1].close;
    const timestamp = Date.now();

    // Check if we should close current position
    if (this.currentPosition.type !== 'NONE') {
      const exitCheck = this.shouldClosePosition(currentPrice);
      if (exitCheck.shouldClose) {
        const closeSignal = this.closePosition(currentPrice, exitCheck.reason);
        closeSignal.rsi = rsi;
        closeSignal.ema12 = emaFast;
        closeSignal.ema26 = emaSlow;
        closeSignal.ema50 = emaSlow;
        closeSignal.ema200 = ema200;
        closeSignal.ma7 = ma7;
        closeSignal.ma25 = ma25;
        closeSignal.ma99 = ma99;
        this.recordSignal(closeSignal);
        return closeSignal;
      }

      // Update PnL and return HOLD
      this.updatePositionPnL(currentPrice);
      return {
        type: 'HOLD',
        timestamp,
        price: currentPrice,
        rsi,
        ema12: emaFast,
        ema26: emaSlow,
        ema50: emaSlow,
        ema200,
        ma7,
        ma25,
        ma99,
        reason: `In ${this.currentPosition.type} position | PnL: ${this.currentPosition.unrealizedPnLPercent.toFixed(2)}%`,
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
        ema12: emaFast,
        ema26: emaSlow,
        ema50: emaSlow,
        ema200,
        ma7,
        ma25,
        ma99,
        reason: 'Cooldown period active'
      };
    }

    // Detect crossovers
    const isBullishCrossover = prevEmaFast < prevEmaSlow && emaFast > emaSlow;
    const isBearishCrossover = prevEmaFast > prevEmaSlow && emaFast < emaSlow;
    
    // Store crossover flags for frontend display
    this.isBullishCrossover = isBullishCrossover;
    this.isBearishCrossover = isBearishCrossover;

    // Debug logs for crossover detection
    console.log(`[Momentum] EMA12: ${emaFast.toFixed(2)} | EMA26: ${emaSlow.toFixed(2)} | EMA200: ${ema200.toFixed(2)}`);
    console.log(`[Momentum] Prev EMA12: ${prevEmaFast.toFixed(2)} | Prev EMA26: ${prevEmaSlow.toFixed(2)}`);
    console.log(`[Momentum] Price: ${currentPrice.toFixed(2)} | Above EMA200: ${currentPrice > ema200}`);
    console.log(`[Momentum] Bullish Crossover: ${isBullishCrossover} | Bearish Crossover: ${isBearishCrossover}`);

    // LONG entry: Bullish crossover above EMA200
    if (isBullishCrossover && currentPrice > ema200) {
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
        ema12: emaFast,
        ema26: emaSlow,
        ema50: emaSlow,
        ema200,
        ma7,
        ma25,
        ma99,
        reason: `Bullish Crossover (EMA${this.config.emaFastPeriod}/${this.config.emaSlowPeriod}) above EMA${this.config.ema200Period}`,
        position: { 
          ...this.currentPosition,
          currentCapital: this.initialCapital + this.totalPnL
        }
      };
      this.recordSignal(buySignal);
      return buySignal;
    }

    // SHORT entry: Bearish crossover below EMA200
    if (isBearishCrossover && currentPrice < ema200) {
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
        ema12: emaFast,
        ema26: emaSlow,
        ema50: emaSlow,
        ema200,
        ma7,
        ma25,
        ma99,
        reason: `Bearish Crossover (EMA${this.config.emaFastPeriod}/${this.config.emaSlowPeriod}) below EMA${this.config.ema200Period}`,
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
      ema12: emaFast,
      ema26: emaSlow,
      ema50: emaSlow,
      ema200,
      ma7,
      ma25,
      ma99,
      reason: 'No trading conditions met'
    };
  }

  /**
   * Execute trade (simulation mode)
   */
  executeTrade(signal: TradingSignal): void {
    if (!this.config.simulationMode) {
      console.log('⚠️ Real trading not implemented yet');
      return;
    }

    if (signal.type === 'BUY' || signal.type === 'SELL') {
      console.log(`[Momentum] 📊 ${signal.type} signal at $${signal.price.toFixed(2)} | ${signal.reason}`);
    } else if (signal.type === 'CLOSE_LONG' || signal.type === 'CLOSE_SHORT') {
      console.log(`[Momentum] 🔒 ${signal.type} at $${signal.price.toFixed(2)} | ${signal.reason}`);
    }
  }

  /**
   * Get position info
   */
  getPositionInfo() {
    const currentCapital = this.initialCapital + this.totalPnL + this.currentPosition.unrealizedPnL;
    
    return {
      position: { ...this.currentPosition },
      totalPnL: this.totalPnL,
      totalTrades: this.totalTrades,
      winningTrades: this.winningTrades,
      lastSignal: this.lastSignal,
      signalHistory: [...this.signalHistory],
      currentCapital,
      isBullishCrossover: this.isBullishCrossover,
      isBearishCrossover: this.isBearishCrossover
    };
  }

  /**
   * Restore strategy state from database trades
   */
  restoreFromDatabase(trades: any[]): void {
    if (trades.length === 0) return;

    console.log(`📥 Restoring Momentum Crossover strategy from ${trades.length} trades...`);

    // Count closed trades
    const closeTrades = trades.filter((t: any) => 
      t.signal_type === 'CLOSE_LONG' || t.signal_type === 'CLOSE_SHORT'
    );

    this.totalTrades = closeTrades.length;
    
    // Get the most recent total_pnl (it's already cumulative)
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
 * Default config for Momentum Crossover strategy
 */
export const momentumStrategyConfig: StrategyConfig = {
  rsiPeriod: 14,
  ema50Period: 50, // Not used in this strategy, but kept for compatibility
  ema200Period: 200,
  rsiBuyThreshold: 30, // Not used in this strategy
  rsiSellThreshold: 70, // Not used in this strategy
  cooldownPeriod: 5 * 60 * 1000, // 5 minutes
  simulationMode: true,
  profitTargetPercent: 2.5,
  stopLossPercent: 1.5,
  maxPositionTime: 60 * 60 * 1000, // 1 hour
  positionSize: 0.01, // Trade 0.01 BTC (~1,100 USDT per trade) - 1.1% of 100,000$ capital
  // Momentum-specific parameters
  emaFastPeriod: 12,
  emaSlowPeriod: 26,
};

