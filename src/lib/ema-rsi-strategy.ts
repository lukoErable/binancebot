import { Candle, CompletedTrade, Position, StrategyConfig, TradingSignal } from '@/types/trading';
import { EMA, RSI } from 'technicalindicators';
import CompletedTradeRepository from './db/completed-trade-repository';

export class TradingStrategy {
  private config: StrategyConfig;
  private lastTradeTime: number = 0;
  private currentPosition: Position = {
    type: 'NONE',
    entryPrice: 0,
    entryTime: 0,
    quantity: 0,
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0
  };
  private totalPnL: number = 0;
  private totalTrades: number = 0;
  private winningTrades: number = 0;
  private signalHistory: TradingSignal[] = [];
  private lastSignal: TradingSignal | null = null;
  private initialCapital: number = 100000; // 100,000 USDT
  private completedTrades: CompletedTrade[] = [];
  private entrySignal: TradingSignal | null = null;

  constructor(config: StrategyConfig) {
    this.config = config;
  }

  /**
   * Calculate RSI from candle data
   */
  calculateRSI(candles: Candle[]): number | null {
    if (candles.length < this.config.rsiPeriod) {
      return null;
    }

    const closePrices = candles.map(c => c.close);
    const rsiValues = RSI.calculate({
      values: closePrices,
      period: this.config.rsiPeriod
    });

    return rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;
  }

  /**
   * Calculate EMA from candle data
   */
  calculateEMA(candles: Candle[], period: number): number | null {
    if (candles.length < period) {
      return null;
    }

    const closePrices = candles.map(c => c.close);
    const emaValues = EMA.calculate({
      values: closePrices,
      period: period
    });

    return emaValues.length > 0 ? emaValues[emaValues.length - 1] : null;
  }

  /**
   * Calculate Simple Moving Average (SMA) like Binance
   */
  calculateSMA(candles: Candle[], period: number): number | null {
    if (candles.length < period) {
      return null;
    }

    const closePrices = candles.map(c => c.close);
    const recentPrices = closePrices.slice(-period);
    const sum = recentPrices.reduce((acc, price) => acc + price, 0);
    
    return sum / period;
  }

  /**
   * Check if enough time has passed since last trade (cooldown)
   */
  private isCooldownPassed(): boolean {
    const now = Date.now();
    return now - this.lastTradeTime >= this.config.cooldownPeriod;
  }

  /**
   * Update position PnL
   */
  private updatePositionPnL(currentPrice: number): void {
    if (this.currentPosition.type === 'NONE') return;

    const priceDiff = currentPrice - this.currentPosition.entryPrice;
    
    if (this.currentPosition.type === 'LONG') {
      this.currentPosition.unrealizedPnL = priceDiff * this.currentPosition.quantity;
      this.currentPosition.unrealizedPnLPercent = (priceDiff / this.currentPosition.entryPrice) * 100;
    } else if (this.currentPosition.type === 'SHORT') {
      this.currentPosition.unrealizedPnL = -priceDiff * this.currentPosition.quantity;
      this.currentPosition.unrealizedPnLPercent = (-priceDiff / this.currentPosition.entryPrice) * 100;
    }
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
   * Check if position should be closed based on exit conditions
   */
  private shouldClosePosition(currentPrice: number): { shouldClose: boolean; reason: string } {
    if (this.currentPosition.type === 'NONE') {
      return { shouldClose: false, reason: '' };
    }

    this.updatePositionPnL(currentPrice);
    const now = Date.now();

    // Check profit target
    if (this.currentPosition.unrealizedPnLPercent >= this.config.profitTargetPercent) {
      return { 
        shouldClose: true, 
        reason: `Profit target reached: ${this.currentPosition.unrealizedPnLPercent.toFixed(2)}%` 
      };
    }

    // Check stop loss
    if (this.currentPosition.unrealizedPnLPercent <= -this.config.stopLossPercent) {
      return { 
        shouldClose: true, 
        reason: `Stop loss triggered: ${this.currentPosition.unrealizedPnLPercent.toFixed(2)}%` 
      };
    }

    // Check max position time
    if (now - this.currentPosition.entryTime >= this.config.maxPositionTime) {
      return { 
        shouldClose: true, 
        reason: `Max position time reached: ${Math.round((now - this.currentPosition.entryTime) / 60000)}min` 
      };
    }

    return { shouldClose: false, reason: '' };
  }

  /**
   * Calculate trading fees for a position
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
    
    // Calculate final PnL
    this.updatePositionPnL(currentPrice);
    const grossPnL = this.currentPosition.unrealizedPnL;
    const grossPnLPercent = this.currentPosition.unrealizedPnLPercent;
    
    // Calculate trading fees
    const fees = this.calculateFees(this.currentPosition.entryPrice, currentPrice, this.currentPosition.quantity);
    const netPnL = grossPnL - fees;
    const netPnLPercent = grossPnLPercent - (fees / (this.currentPosition.entryPrice * this.currentPosition.quantity)) * 100;
    
    // Update statistics with net PnL
    this.totalPnL += netPnL;
    this.totalTrades++;
    const isWin = netPnL > 0;
    if (isWin) this.winningTrades++;

    // Create CompletedTrade
    const duration = timestamp - this.currentPosition.entryTime;
    const completedTrade: CompletedTrade = {
      strategyName: 'RSI + EMA Strategy',
      strategyType: 'RSI_EMA',
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

    // Save to database
    CompletedTradeRepository.saveCompletedTrade(completedTrade).catch(err => {
      console.error('Failed to save completed trade:', err);
    });
    
    // Add to memory
    this.completedTrades.unshift(completedTrade);

    // Reset position
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
      rsi: 0, // Will be calculated by caller
      ema50: 0, // Will be calculated by caller
      ema200: 0, // Will be calculated by caller
      ma7: 0, // Will be calculated by caller
      ema12: 0, // Will be calculated by caller
      ema26: 0, // Will be calculated by caller
      ma25: 0, // Will be calculated by caller
      ma99: 0, // Will be calculated by caller
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
   * Get current position and statistics
   */
  getPositionInfo(): { position: Position; totalPnL: number; totalTrades: number; winningTrades: number; winRate: number; lastSignal: TradingSignal | null; signalHistory: TradingSignal[]; currentCapital: number; completedTrades: CompletedTrade[]; isBullishCrossover?: boolean; isBearishCrossover?: boolean } {
    const winRate = this.totalTrades > 0 ? (this.winningTrades / this.totalTrades) * 100 : 0;
    const currentCapital = this.initialCapital + this.totalPnL + this.currentPosition.unrealizedPnL;
    
    return {
      position: { ...this.currentPosition },
      totalPnL: this.totalPnL,
      totalTrades: this.totalTrades,
      winningTrades: this.winningTrades,
      winRate,
      lastSignal: this.lastSignal,
      signalHistory: [...this.signalHistory],
      currentCapital,
      completedTrades: this.completedTrades,
      // RSI+EMA strategy doesn't use crossovers
      isBullishCrossover: undefined,
      isBearishCrossover: undefined
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
   * Analyze market conditions and generate trading signal
   */
  analyzeMarket(candles: Candle[]): TradingSignal | null {
    if (candles.length < this.config.ema200Period) {
      console.log(`Not enough candles. Need ${this.config.ema200Period}, have ${candles.length}`);
      return null;
    }

    const rsi = this.calculateRSI(candles);
    const ema12 = this.calculateEMA(candles, 12);
    const ema26 = this.calculateEMA(candles, 26);
    const ema50 = this.calculateEMA(candles, this.config.ema50Period);
    const ema200 = this.calculateEMA(candles, this.config.ema200Period);
    
    // Calculate Binance-style moving averages
    const ma7 = this.calculateSMA(candles, 7);
    const ma25 = this.calculateSMA(candles, 25);
    const ma99 = this.calculateSMA(candles, 99);

    if (rsi === null || ema12 === null || ema26 === null || ema50 === null || ema200 === null || ma7 === null || ma25 === null || ma99 === null) {
      console.log('Unable to calculate indicators');
      return null;
    }

    const currentPrice = candles[candles.length - 1].close;
    const timestamp = Date.now();

    // First, check if we should close current position
    if (this.currentPosition.type !== 'NONE') {
      const exitCheck = this.shouldClosePosition(currentPrice);
      if (exitCheck.shouldClose) {
        const closeSignal = this.closePosition(currentPrice, exitCheck.reason);
        return closeSignal;
      }

      // Check for reverse signal (close and open opposite)
      if (this.currentPosition.type === 'LONG' && ema50 < ema200 && rsi > this.config.rsiSellThreshold) {
        const closeSignal = this.closePosition(currentPrice, 'Reverse signal detected');
        // Will open SHORT position in next call (after cooldown)
        return closeSignal;
      }

      if (this.currentPosition.type === 'SHORT' && ema50 > ema200 && rsi < this.config.rsiBuyThreshold) {
        const closeSignal = this.closePosition(currentPrice, 'Reverse signal detected');
        // Will open LONG position in next call (after cooldown)
        return closeSignal;
      }

      // If in position and no exit conditions, just update PnL and hold
      this.updatePositionPnL(currentPrice);
      return {
        type: 'HOLD',
        timestamp,
        price: currentPrice,
        rsi,
        ema50,
        ema200,
        ma7,
        ma25,
        ema12,
        ema26,
        ma99,
        reason: `In ${this.currentPosition.type} position | PnL: ${this.currentPosition.unrealizedPnLPercent.toFixed(2)}%`,
        position: { ...this.currentPosition }
      };
    }

    // No position - check for entry signals
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

    // BUY Signal (Open LONG): EMA50 > EMA200 AND RSI < 30
    if (ema50 > ema200 && rsi < this.config.rsiBuyThreshold) {
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
        reason: `RSI oversold (${rsi.toFixed(2)}) and uptrend (EMA50 > EMA200) - Opening LONG`,
        position: { 
          ...this.currentPosition,
          currentCapital: currentCapital
        }
      };
      this.entrySignal = buySignal; // Save entry signal for CompletedTrade
      return buySignal;
    }

    // SELL Signal (Open SHORT): EMA50 < EMA200 AND RSI > 70
    if (ema50 < ema200 && rsi > this.config.rsiSellThreshold) {
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
        reason: `RSI overbought (${rsi.toFixed(2)}) and downtrend (EMA50 < EMA200) - Opening SHORT`,
        position: { 
          ...this.currentPosition,
          currentCapital: currentCapital
        }
      };
      this.entrySignal = sellSignal; // Save entry signal for CompletedTrade
      return sellSignal;
    }

    // HOLD - No signal
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
      reason: 'No trading conditions met'
    };
  }

  /**
   * Execute trade (simulation or real)
   */
  async executeTrade(signal: TradingSignal): Promise<void> {
    if (signal.type === 'HOLD') {
      return;
    }

    // Enregistrer le signal dans l'historique
    this.recordSignal(signal);

    if (this.config.simulationMode) {
      const signalEmoji = signal.type === 'BUY' ? '📈' : 
                         signal.type === 'SELL' ? '📉' : 
                         signal.type === 'CLOSE_LONG' ? '🔴' : 
                         signal.type === 'CLOSE_SHORT' ? '🟢' : '⚪';
      
      console.log(`${signalEmoji} [SIMULATION] ${signal.type} signal at $${signal.price.toFixed(2)}`);
      console.log(`   RSI: ${signal.rsi.toFixed(2)} | EMA50: ${signal.ema50.toFixed(2)} | EMA200: ${signal.ema200.toFixed(2)}`);
      console.log(`   Reason: ${signal.reason}`);
      
      if (signal.position) {
        console.log(`   Position: ${signal.position.type} | Entry: $${signal.position.entryPrice.toFixed(2)} | Quantity: ${signal.position.quantity}`);
        if (signal.position.unrealizedPnL !== 0) {
          console.log(`   PnL: ${signal.position.unrealizedPnL.toFixed(2)} USDT (${signal.position.unrealizedPnLPercent.toFixed(2)}%)`);
        }
      }
      
      // Log statistics
      const stats = this.getPositionInfo();
      console.log(`   Stats: Total PnL: ${stats.totalPnL.toFixed(2)} USDT | Trades: ${stats.totalTrades} | Win Rate: ${stats.winRate.toFixed(1)}%`);
    } else {
      // TODO: Implement real trading with ccxt
      console.log(`🚨 [LIVE] ${signal.type} signal - Real trading not yet implemented`);
    }
  }

  /**
   * Restore strategy state from database trades
   */
  async restoreFromDatabase(trades: any[]): Promise<void> {
    if (trades.length === 0) return;

    console.log(`📥 Restoring RSI+EMA strategy from ${trades.length} signals...`);

    // Reset counters
    this.totalTrades = 0;
    this.winningTrades = 0;
    this.totalPnL = 0;
    this.signalHistory = [];
    this.completedTrades = [];

    // Load completed trades from the new table
    this.completedTrades = await CompletedTradeRepository.getCompletedTradesByStrategy('RSI + EMA Strategy', 100);
    console.log(`📊 Loaded ${this.completedTrades.length} completed trades`);
    
    // Calculate stats from completed trades
    this.totalTrades = this.completedTrades.length;
    this.winningTrades = this.completedTrades.filter(t => t.isWin).length;
    this.totalPnL = this.completedTrades.reduce((sum, t) => sum + t.pnl, 0);

    // Restore signal history from trades table (signals)
    this.signalHistory = trades
      .filter((t: any) => t.signal_type !== 'HOLD')
      .slice(0, 50)
      .map((t: any) => ({
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

    // Check for open position
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

    console.log(`   ✅ Restored: ${this.totalTrades} trades (${this.winningTrades} wins), Win Rate: ${this.totalTrades > 0 ? ((this.winningTrades/this.totalTrades)*100).toFixed(1) : 0}%, PnL: ${this.totalPnL.toFixed(2)} USDT`);
  }
}

export const defaultStrategyConfig: StrategyConfig = {
  rsiPeriod: 14,
  ema50Period: 50,
  ema200Period: 200,
  rsiBuyThreshold: 30,
  rsiSellThreshold: 70,
  cooldownPeriod: 5 * 60 * 1000, // 5 minutes
  simulationMode: true,
  // Position management (adjusted for Binance fees)
  profitTargetPercent: 2.5, // Take profit at 2.5% (2% profit + 0.2% fees + 0.3% buffer)
  stopLossPercent: 1.5, // Stop loss at 1.5% (1% loss + 0.2% fees + 0.3% buffer)
  maxPositionTime: 60 * 60 * 1000, // Max 1 hour in position
  positionSize: 0.01 // Trade 0.01 BTC (~1,100 USDT per trade) - 1.1% of 100,000$ capital
};

