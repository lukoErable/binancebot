import { Candle, Position, StrategyConfig, TradingSignal } from '@/types/trading';

/**
 * Volume Breakout + MACD Strategy
 * 
 * Cette stratégie exploite les explosions de volume combinées au momentum MACD.
 * Parfaite pour un ordinateur car elle détecte des micro-signaux imperceptibles à l'œil humain.
 * 
 * Entry Logic:
 * - LONG: Volume > 2x moyenne ET MACD croise à la hausse ET prix > VWAP
 * - SHORT: Volume > 2x moyenne ET MACD croise à la baisse ET prix < VWAP
 * 
 * Exit Logic:
 * - Profit target: +2.5%
 * - Stop loss: -1.5%
 * - Max position time: 45 minutes (plus court pour capturer les micro-mouvements)
 * - MACD inverse ou volume faible
 */
export class VolumeMACDStrategy {
  private config: StrategyConfig;
  private currentPosition: Position;
  private lastTradeTime: number = 0;
  private totalPnL: number = 0;
  private totalTrades: number = 0;
  private winningTrades: number = 0;
  private signalHistory: TradingSignal[] = [];
  private lastSignal: TradingSignal | null = null;
  private initialCapital: number = 100000; // 100,000 USDT
  // Volume breakout detection flags
  private isVolumeBreakout: boolean = false;
  private isMACDBullish: boolean = false;
  private isMACDBearish: boolean = false;

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
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(candles: Candle[]): { macd: number; signal: number; histogram: number } | null {
    if (candles.length < 26) return null;

    const ema12 = this.calculateEMA(candles, 12);
    const ema26 = this.calculateEMA(candles, 26);

    if (ema12 === null || ema26 === null) return null;

    const macd = ema12 - ema26;

    // Calculate signal line (9-period EMA of MACD)
    const macdValues = [];
    for (let i = 26; i < candles.length; i++) {
      const slice = candles.slice(0, i + 1);
      const ema12Temp = this.calculateEMA(slice, 12);
      const ema26Temp = this.calculateEMA(slice, 26);
      if (ema12Temp !== null && ema26Temp !== null) {
        macdValues.push(ema12Temp - ema26Temp);
      }
    }

    if (macdValues.length < 9) return null;

    const signal = macdValues.slice(-9).reduce((sum, val) => sum + val, 0) / 9;
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  /**
   * Calculate VWAP (Volume Weighted Average Price)
   */
  private calculateVWAP(candles: Candle[]): number | null {
    if (candles.length === 0) return null;

    // Use last 50 candles for VWAP
    const period = Math.min(50, candles.length);
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
  private calculateAvgVolume(candles: Candle[], period: number = 20): number {
    const recentCandles = candles.slice(-period);
    return recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
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
   * Analyze market conditions and generate trading signal
   */
  analyzeMarket(candles: Candle[]): TradingSignal | null {
    if (candles.length < 50) {
      console.log(`[Volume-MACD] Not enough candles. Need 50, have ${candles.length}`);
      return null;
    }

    const currentCandle = candles[candles.length - 1];
    const previousCandle = candles[candles.length - 2];
    const currentPrice = currentCandle.close;
    const timestamp = Date.now();

    // Calculate all indicators
    const rsi = this.calculateRSI(candles);
    const macdData = this.calculateMACD(candles);
    const vwap = this.calculateVWAP(candles);
    const avgVolume = this.calculateAvgVolume(candles, 20);
    const currentVolume = currentCandle.volume;
    
    // Calculate previous MACD for crossover detection
    const previousMACD = this.calculateMACD(candles.slice(0, -1));

    // EMAs for display
    const ema12 = this.calculateEMA(candles, 12);
    const ema26 = this.calculateEMA(candles, 26);
    const ema50 = this.calculateEMA(candles, 50);
    const ema200 = this.calculateEMA(candles, 200);
    const ma7 = this.calculateSMA(candles, 7);
    const ma25 = this.calculateSMA(candles, 25);
    const ma99 = this.calculateSMA(candles, 99);

    if (!rsi || !macdData || !vwap || !previousMACD || !ema12 || !ema26 || !ema50 || !ema200 || !ma7 || !ma25 || !ma99) {
      console.log('[Volume-MACD] Unable to calculate indicators');
      return null;
    }

    // Volume breakout detection
    const volumeMultiplier = currentVolume / avgVolume;
    this.isVolumeBreakout = volumeMultiplier > 2.0;

    // MACD crossover detection
    const isMACDCrossUp = previousMACD.histogram < 0 && macdData.histogram > 0;
    const isMACDCrossDown = previousMACD.histogram > 0 && macdData.histogram < 0;
    this.isMACDBullish = isMACDCrossUp;
    this.isMACDBearish = isMACDCrossDown;

    // Handle existing position
    if (this.currentPosition.type !== 'NONE') {
      const exitCheck = this.shouldClosePosition(currentPrice, macdData, currentVolume, avgVolume);
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
        reason: `In ${this.currentPosition.type} position | PnL: ${this.currentPosition.unrealizedPnLPercent.toFixed(2)}% | Vol: ${volumeMultiplier.toFixed(1)}x`,
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
        reason: 'Cooldown period active'
      };
    }

    // LONG entry: Volume breakout + MACD bullish cross + price above VWAP
    if (this.isVolumeBreakout && isMACDCrossUp && currentPrice > vwap) {
      this.currentPosition = {
        type: 'LONG',
        entryPrice: currentPrice,
        entryTime: timestamp,
        quantity: this.config.positionSize,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0
      };
      this.lastTradeTime = timestamp;

      const currentCapital = this.initialCapital + this.totalPnL;
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
        reason: `Volume Breakout (${volumeMultiplier.toFixed(1)}x) + MACD Bullish + Above VWAP ($${vwap.toFixed(2)})`,
        position: { 
          ...this.currentPosition,
          currentCapital: currentCapital
        }
      };
      this.recordSignal(buySignal);
      return buySignal;
    }

    // SHORT entry: Volume breakout + MACD bearish cross + price below VWAP
    if (this.isVolumeBreakout && isMACDCrossDown && currentPrice < vwap) {
      this.currentPosition = {
        type: 'SHORT',
        entryPrice: currentPrice,
        entryTime: timestamp,
        quantity: this.config.positionSize,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0
      };
      this.lastTradeTime = timestamp;

      const currentCapital = this.initialCapital + this.totalPnL;
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
        reason: `Volume Breakout (${volumeMultiplier.toFixed(1)}x) + MACD Bearish + Below VWAP ($${vwap.toFixed(2)})`,
        position: { 
          ...this.currentPosition,
          currentCapital: currentCapital
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
      reason: `Waiting for signal | Vol: ${volumeMultiplier.toFixed(1)}x | MACD: ${macdData.histogram.toFixed(2)}`
    };
  }

  /**
   * Check if position should be closed
   */
  private shouldClosePosition(
    currentPrice: number,
    macdData: { macd: number; signal: number; histogram: number },
    currentVolume: number,
    avgVolume: number
  ): { shouldClose: boolean; reason: string } {
    const positionTime = Date.now() - this.currentPosition.entryTime;
    const pnlPercent = this.currentPosition.unrealizedPnLPercent;

    // Profit target
    if (pnlPercent >= this.config.profitTargetPercent) {
      return { shouldClose: true, reason: `Profit target reached: +${pnlPercent.toFixed(2)}%` };
    }

    // Stop loss
    if (pnlPercent <= -this.config.stopLossPercent) {
      return { shouldClose: true, reason: `Stop loss hit: ${pnlPercent.toFixed(2)}%` };
    }

    // Max position time (45 minutes for this strategy)
    if (positionTime > 45 * 60 * 1000) {
      return { shouldClose: true, reason: `Max position time (45min) exceeded` };
    }

    // Exit on MACD reversal
    if (this.currentPosition.type === 'LONG' && macdData.histogram < 0) {
      return { shouldClose: true, reason: 'MACD turned bearish' };
    }

    if (this.currentPosition.type === 'SHORT' && macdData.histogram > 0) {
      return { shouldClose: true, reason: 'MACD turned bullish' };
    }

    // Exit if volume drops below average (momentum lost)
    if (currentVolume < avgVolume * 0.5) {
      return { shouldClose: true, reason: 'Volume dried up - momentum lost' };
    }

    return { shouldClose: false, reason: '' };
  }

  /**
   * Close current position
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
      reason: `${reason} | Net P&L: ${netPnL.toFixed(2)} USDT (${this.currentPosition.unrealizedPnLPercent.toFixed(2)}%) | Fees: ${fees.toFixed(2)} USDT`,
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
   * Calculate trading fees (Binance: 0.1% maker + 0.1% taker)
   */
  private calculateFees(entryPrice: number, exitPrice: number, quantity: number): number {
    const entryFee = entryPrice * quantity * 0.001; // 0.1%
    const exitFee = exitPrice * quantity * 0.001;   // 0.1%
    return entryFee + exitFee;
  }

  /**
   * Check if cooldown period has passed
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
   * Get position info for display
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
      isVolumeBreakout: this.isVolumeBreakout,
      isMACDBullish: this.isMACDBullish,
      isMACDBearish: this.isMACDBearish
    };
  }

  /**
   * Execute a trade signal (for compatibility with StrategyManager)
   */
  executeTrade(signal: TradingSignal): void {
    if (this.config.simulationMode) {
      console.log(`💡 [SIMULATION] ${signal.type} signal - Price: ${signal.price.toFixed(2)} USDT`);
    } else {
      console.log(`🚨 [LIVE] ${signal.type} signal - Real trading not yet implemented`);
    }
  }

  /**
   * Restore strategy state from database trades
   */
  restoreFromDatabase(trades: any[]): void {
    if (trades.length === 0) return;

    console.log(`📥 Restoring Volume MACD strategy from ${trades.length} trades...`);
    console.log(`   All trades:`, trades.map(t => ({ type: t.signal_type, price: t.price, total_pnl: t.total_pnl })));

    // Count closed trades
    const closeTrades = trades.filter((t: any) => 
      t.signal_type === 'CLOSE_LONG' || t.signal_type === 'CLOSE_SHORT'
    );

    console.log(`   Close trades found: ${closeTrades.length}`);
    
    this.totalTrades = closeTrades.length;
    
    // Get the most recent total_pnl (it's already cumulative, not per-trade!)
    const mostRecentTrade = trades[0];
    this.totalPnL = mostRecentTrade && mostRecentTrade.total_pnl ? parseFloat(mostRecentTrade.total_pnl) : 0;
    console.log(`   Most recent total_pnl: ${this.totalPnL.toFixed(2)} USDT`);
    
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
 * Default config for Volume + MACD strategy
 */
export const volumeMACDStrategyConfig: StrategyConfig = {
  rsiPeriod: 14,
  ema50Period: 50,
  ema200Period: 200,
  rsiBuyThreshold: 30,
  rsiSellThreshold: 70,
  cooldownPeriod: 3 * 60 * 1000, // 3 minutes (plus court pour capturer plus d'opportunités)
  simulationMode: true,
  profitTargetPercent: 2.5,
  stopLossPercent: 1.5,
  maxPositionTime: 45 * 60 * 1000, // 45 minutes
  positionSize: 0.01, // Trade 0.01 BTC (~1,100 USDT per trade) - 1.1% of 100,000$ capital
  // MACD-specific parameters
  emaFastPeriod: 12,
  emaSlowPeriod: 26,
};

