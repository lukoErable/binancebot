import { Candle, Position, StrategyConfig, TradingSignal } from '@/types/trading';
import { EMA, RSI } from 'technicalindicators';

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
    if (netPnL > 0) this.winningTrades++;

    // Reset position
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
    
    return {
      type: signalType,
      timestamp: Date.now(),
      price: currentPrice,
      rsi: 0, // Will be calculated by caller
      ema50: 0, // Will be calculated by caller
      ema200: 0, // Will be calculated by caller
      ma7: 0, // Will be calculated by caller
      ma25: 0, // Will be calculated by caller
      ma99: 0, // Will be calculated by caller
      reason: `${reason} | Net PnL: ${netPnL.toFixed(2)} USDT (${netPnLPercent.toFixed(2)}%) | Fees: ${fees.toFixed(2)} USDT`,
      position: {
        ...closedPosition,
        unrealizedPnL: netPnL,
        unrealizedPnLPercent: netPnLPercent
      }
    };
  }

  /**
   * Get current position and statistics
   */
  getPositionInfo(): { position: Position; totalPnL: number; totalTrades: number; winningTrades: number; winRate: number } {
    const winRate = this.totalTrades > 0 ? (this.winningTrades / this.totalTrades) * 100 : 0;
    
    return {
      position: { ...this.currentPosition },
      totalPnL: this.totalPnL,
      totalTrades: this.totalTrades,
      winningTrades: this.winningTrades,
      winRate
    };
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
    const ema50 = this.calculateEMA(candles, this.config.ema50Period);
    const ema200 = this.calculateEMA(candles, this.config.ema200Period);
    
    // Calculate Binance-style moving averages
    const ma7 = this.calculateSMA(candles, 7);
    const ma25 = this.calculateSMA(candles, 25);
    const ma99 = this.calculateSMA(candles, 99);

    if (rsi === null || ema50 === null || ema200 === null || ma7 === null || ma25 === null || ma99 === null) {
      console.log('Unable to calculate indicators');
      return null;
    }

    const currentPrice = candles[candles.length - 1].close;
    const timestamp = Date.now();

    // First, check if we should close current position
    if (this.currentPosition.type !== 'NONE') {
      const exitCheck = this.shouldClosePosition(currentPrice);
      if (exitCheck.shouldClose) {
        return this.closePosition(currentPrice, exitCheck.reason);
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
      return {
        type: 'BUY',
        timestamp,
        price: currentPrice,
        rsi,
        ema50,
        ema200,
        ma7,
        ma25,
        ma99,
        reason: `RSI oversold (${rsi.toFixed(2)}) and uptrend (EMA50 > EMA200) - Opening LONG`,
        position: { ...this.currentPosition }
      };
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
      return {
        type: 'SELL',
        timestamp,
        price: currentPrice,
        rsi,
        ema50,
        ema200,
        ma7,
        ma25,
        ma99,
        reason: `RSI overbought (${rsi.toFixed(2)}) and downtrend (EMA50 < EMA200) - Opening SHORT`,
        position: { ...this.currentPosition }
      };
    }

    // HOLD - No signal
    return {
      type: 'HOLD',
      timestamp,
      price: currentPrice,
      rsi,
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
}

export const defaultStrategyConfig: StrategyConfig = {
  rsiPeriod: 14,
  ema50Period: 50,
  ema200Period: 200,
  rsiBuyThreshold: 30,
  rsiSellThreshold: 70,
  cooldownPeriod: 5 * 60 * 1000, // 5 minutes
  simulationMode: true,
  profitTargetPercent: 2.5, // Take profit at 2.5% (2% profit + 0.2% fees + 0.3% buffer)
  stopLossPercent: 1.5, // Stop loss at 1.5% (1% loss + 0.2% fees + 0.3% buffer)
  maxPositionTime: 60 * 60 * 1000, // Max 1 hour in position
  positionSize: 0.0001 // Trade 0.0001 BTC (~11.3 USDT per trade) - 1.13% of 1000€ capital
};

