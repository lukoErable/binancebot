import { Candle, CompletedTrade, Position, StrategyConfig, TradingSignal } from '@/types/trading';
import CompletedTradeRepository from './db/completed-trade-repository';

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
  private completedTrades: CompletedTrade[] = [];
  private entrySignal: TradingSignal | null = null;
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
   * Update position PnL with current market price (for real-time updates)
   */
  updatePositionWithCurrentPrice(currentPrice: number): void {
    if (this.currentPosition.type !== 'NONE') {
      this.updatePositionPnL(currentPrice);
    }
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
    const timestamp = Date.now();
    
    this.updatePositionPnL(currentPrice);
    const grossPnL = this.currentPosition.unrealizedPnL;
    const grossPnLPercent = this.currentPosition.unrealizedPnLPercent;
    
    const fees = this.calculateFees(this.currentPosition.entryPrice, currentPrice, this.currentPosition.quantity);
    const netPnL = grossPnL - fees;
    const netPnLPercent = grossPnLPercent - (fees / (this.currentPosition.entryPrice * this.currentPosition.quantity)) * 100;
    
    this.totalPnL += netPnL;
    this.totalTrades++;
    const isWin = netPnL > 0;
    if (isWin) this.winningTrades++;

    // Create CompletedTrade
    const duration = timestamp - this.currentPosition.entryTime;
    const completedTrade: CompletedTrade = {
      strategyName: 'Momentum Crossover',
      strategyType: 'MOMENTUM_CROSSOVER',
      type: this.currentPosition.type as 'LONG' | 'SHORT',
      entryPrice: this.currentPosition.entryPrice,
      entryTime: this.currentPosition.entryTime,
      entryReason: this.entrySignal?.reason || 'Unknown',
      exitPrice: currentPrice,
      exitTime: timestamp,
      exitReason: reason,
      quantity: this.currentPosition.quantity,
      pnl: netPnL,
      pnlPercent: netPnLPercent,
      fees: fees,
      duration: duration,
      isWin: isWin
    };

    CompletedTradeRepository.saveCompletedTrade(completedTrade).catch(err => {
      console.error('Failed to save completed trade:', err);
    });
    
    this.completedTrades.unshift(completedTrade);

    this.currentPosition = {
      type: 'NONE',
      entryPrice: 0,
      entryTime: 0,
      quantity: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0
    };

    this.lastTradeTime = timestamp;
    this.entrySignal = null;

    const signalType = closedPosition.type === 'LONG' ? 'CLOSE_LONG' : 'CLOSE_SHORT';
    const currentCapital = this.initialCapital + this.totalPnL;
    
    return {
      type: signalType,
      timestamp: timestamp,
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
    // console.log('[Momentum Crossover] 🔍 Analyzing market...');
    
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

    // Detect crossovers early so they are available for both exit and entry logic
    const isBullishCrossover = prevEmaFast < prevEmaSlow && emaFast > emaSlow;
    const isBearishCrossover = prevEmaFast > prevEmaSlow && emaFast < emaSlow;
    this.isBullishCrossover = isBullishCrossover;
    this.isBearishCrossover = isBearishCrossover;

    // Check if we should close current position
    if (this.currentPosition.type !== 'NONE') {
      // Check TP/SL/MaxTime first
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
        return closeSignal;
      }

      // Check for reverse crossover (more flexible exit)
      if (this.currentPosition.type === 'LONG' && isBearishCrossover) {
        console.log('[Momentum] 🔄 Bearish crossover detected - Closing LONG position');
        const closeSignal = this.closePosition(currentPrice, 'Bearish crossover detected (exit signal)');
        closeSignal.rsi = rsi;
        closeSignal.ema12 = emaFast;
        closeSignal.ema26 = emaSlow;
        closeSignal.ema50 = emaSlow;
        closeSignal.ema200 = ema200;
        closeSignal.ma7 = ma7;
        closeSignal.ma25 = ma25;
        closeSignal.ma99 = ma99;
        return closeSignal;
      }

      if (this.currentPosition.type === 'SHORT' && isBullishCrossover) {
        console.log('[Momentum] 🔄 Bullish crossover detected - Closing SHORT position');
        const closeSignal = this.closePosition(currentPrice, 'Bullish crossover detected (exit signal)');
        closeSignal.rsi = rsi;
        closeSignal.ema12 = emaFast;
        closeSignal.ema26 = emaSlow;
        closeSignal.ema50 = emaSlow;
        closeSignal.ema200 = ema200;
        closeSignal.ma7 = ma7;
        closeSignal.ma25 = ma25;
        closeSignal.ma99 = ma99;
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

    // Crossovers already computed above

    // Debug logs for crossover detection
    // console.log(`[Momentum] EMA12: ${emaFast.toFixed(2)} | EMA26: ${emaSlow.toFixed(2)} | EMA200: ${ema200.toFixed(2)}`);
    // console.log(`[Momentum] Prev EMA12: ${prevEmaFast.toFixed(2)} | Prev EMA26: ${prevEmaSlow.toFixed(2)}`);
    // console.log(`[Momentum] Price: ${currentPrice.toFixed(2)} | Above EMA200: ${currentPrice > ema200}`);
    // console.log(`[Momentum] Bullish Crossover: ${isBullishCrossover} | Bearish Crossover: ${isBearishCrossover}`);

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
      this.entrySignal = buySignal;
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
      this.entrySignal = sellSignal;
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
    // Enregistrer le signal dans l'historique
    this.recordSignal(signal);
    
    if (!this.config.simulationMode) {
      console.log('⚠️ Real trading not implemented yet');
      return;
    }

    if (signal.type === 'BUY' || signal.type === 'SELL') {
      console.log(`[Momentum] 📊 ${signal.type} signal at $${signal.price.toFixed(2)} | ${signal.reason}`);
      
      // Open position
      this.currentPosition = {
        type: signal.type === 'BUY' ? 'LONG' : 'SHORT',
        entryPrice: signal.price,
        entryTime: signal.timestamp,
        quantity: 0.001, // Fixed quantity for simulation
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      };
    } else if (signal.type === 'CLOSE_LONG' || signal.type === 'CLOSE_SHORT') {
      console.log(`[Momentum] 🔒 ${signal.type} at $${signal.price.toFixed(2)} | ${signal.reason}`);
      
      // Close position and calculate P&L
      if (this.currentPosition.type !== 'NONE') {
        const entryPrice = this.currentPosition.entryPrice;
        const exitPrice = signal.price;
        const quantity = this.currentPosition.quantity;
        
        let tradePnL = 0;
        if (this.currentPosition.type === 'LONG') {
          tradePnL = (exitPrice - entryPrice) * quantity;
        } else {
          tradePnL = (entryPrice - exitPrice) * quantity;
        }
        
        // Update statistics
        this.totalTrades++;
        this.totalPnL += tradePnL;
        if (tradePnL > 0) {
          this.winningTrades++;
        }
        
        // Update signal with P&L information
        signal.position = {
          type: this.currentPosition.type,
          entryPrice: this.currentPosition.entryPrice,
          entryTime: this.currentPosition.entryTime,
          quantity: this.currentPosition.quantity,
          unrealizedPnL: tradePnL,
          unrealizedPnLPercent: (tradePnL / (entryPrice * quantity)) * 100,
          totalPnL: this.totalPnL,
          totalPnLPercent: (this.totalPnL / this.initialCapital) * 100,
          fees: 0,
          currentCapital: this.initialCapital + this.totalPnL
        };
        
        console.log(`[Momentum] 💰 Trade closed: P&L = ${tradePnL >= 0 ? '+' : ''}${tradePnL.toFixed(2)} USDT | Total: ${this.totalPnL >= 0 ? '+' : ''}${this.totalPnL.toFixed(2)} USDT`);
      }
      
      // Reset position
      this.currentPosition = {
        type: 'NONE',
        entryPrice: 0,
        entryTime: 0,
        quantity: 0,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      };
    }
  }

  /**
   * Restore strategy state from database trades
   */
  async restoreFromDatabase(trades: any[]): Promise<void> {
    console.log(`📥 Restoring Momentum Crossover strategy from ${trades.length} signals...`);

    this.totalTrades = 0;
    this.winningTrades = 0;
    this.totalPnL = 0;
    this.signalHistory = [];
    this.completedTrades = [];

    this.completedTrades = await CompletedTradeRepository.getCompletedTradesByStrategy('Momentum Crossover', 100);
    console.log(`📊 Loaded ${this.completedTrades.length} completed trades`);
    
    this.totalTrades = this.completedTrades.length;
    this.winningTrades = this.completedTrades.filter(t => t.isWin).length;
    this.totalPnL = this.completedTrades.reduce((sum, t) => sum + t.pnl, 0);

    if (trades.length > 0) {
      this.signalHistory = trades.filter((t: any) => t.signal_type !== 'HOLD').slice(0, 50).map((t: any) => ({
        type: t.signal_type,
        timestamp: parseInt(t.timestamp),
        price: parseFloat(t.price),
        rsi: 0,
        ema12: 0,
        ema26: 0,
        ema50: 0,
        ema200: 0,
        ma7: 0,
        ma25: 0,
        ma99: 0,
        reason: t.reason || ''
      }));

      if (this.signalHistory.length > 0) {
        this.lastSignal = this.signalHistory[0];
      }

      const latestTrade = trades[0];
      if (latestTrade && (latestTrade.signal_type === 'BUY' || latestTrade.signal_type === 'SELL')) {
        const hasClosingTrade = trades.some((t: any) => 
          (t.signal_type === 'CLOSE_LONG' || t.signal_type === 'CLOSE_SHORT') &&
          parseInt(t.timestamp) > parseInt(latestTrade.timestamp)
        );

        if (!hasClosingTrade && latestTrade.position_type !== 'NONE') {
          this.currentPosition = {
            type: latestTrade.position_type,
            entryPrice: parseFloat(latestTrade.entry_price),
            entryTime: latestTrade.entry_time ? new Date(latestTrade.entry_time).getTime() : parseInt(latestTrade.timestamp),
            quantity: parseFloat(latestTrade.quantity),
            unrealizedPnL: 0,
            unrealizedPnLPercent: 0
          };
          console.log(`   Restored open ${this.currentPosition.type} position @ ${this.currentPosition.entryPrice.toFixed(2)}`);
        }
      }
    }

    console.log(`   ✅ Restored: ${this.totalTrades} trades (${this.winningTrades} wins), Win Rate: ${this.totalTrades > 0 ? ((this.winningTrades/this.totalTrades)*100).toFixed(1) : 0}%, PnL: ${this.totalPnL.toFixed(2)} USDT`);
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
      completedTrades: this.completedTrades,
      isBullishCrossover: this.isBullishCrossover,
      isBearishCrossover: this.isBearishCrossover
    };
  }

  /**
   * Get all trades for this strategy
   */
  getAllTrades(): any[] {
    return [];
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
  positionSize: 0.05, // Trade 0.05 BTC (~5,000 USDT per trade) - 5% of 100,000$ capital (Balanced)
  // Momentum-specific parameters
  emaFastPeriod: 12,
  emaSlowPeriod: 26,
};

