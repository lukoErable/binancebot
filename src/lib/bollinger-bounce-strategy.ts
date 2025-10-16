import { Candle, Position, TradingSignal } from '@/types/trading';
import { BollingerBands, RSI } from 'technicalindicators';

export interface BollingerBounceConfig {
  bbPeriod: number;        // Période des Bollinger Bands (défaut: 20)
  bbStdDev: number;        // Nombre d'écarts-types (défaut: 2)
  rsiPeriod: number;       // Période du RSI (défaut: 14)
  rsiBuyThreshold: number; // Seuil RSI pour acheter (défaut: 40)
  rsiSellThreshold: number; // Seuil RSI pour vendre (défaut: 60)
  stopLossPercent: number; // Stop loss en % (défaut: 2%)
  takeProfitPercent: number; // Take profit en % (défaut: 1.5%)
  volumeThreshold: number; // Seuil de volume pour confirmation (défaut: 1.2x moyenne)
}

export const defaultBollingerBounceConfig: BollingerBounceConfig = {
  bbPeriod: 20,
  bbStdDev: 2,
  rsiPeriod: 14,
  rsiBuyThreshold: 45,
  rsiSellThreshold: 60,
  stopLossPercent: 2.0,
  takeProfitPercent: 1.8,
  volumeThreshold: 1.1
};

export class BollingerBounceStrategy {
  private config: BollingerBounceConfig;
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
  private losingTrades: number = 0;
  private signalHistory: TradingSignal[] = [];
  private lastSignal: TradingSignal | null = null;
  private initialCapital: number = 100000; // 100,000 USDT

  constructor(config: BollingerBounceConfig = defaultBollingerBounceConfig) {
    this.config = config;
  }

  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(candles: Candle[]): { upper: number; middle: number; lower: number } | null {
    if (candles.length < this.config.bbPeriod) {
      return null;
    }

    const closePrices = candles.map(c => c.close);
    const bbValues = BollingerBands.calculate({
      period: this.config.bbPeriod,
      values: closePrices,
      stdDev: this.config.bbStdDev
    });

    if (bbValues.length === 0) return null;

    const lastBB = bbValues[bbValues.length - 1];
    return {
      upper: lastBB.upper,
      middle: lastBB.middle,
      lower: lastBB.lower
    };
  }

  /**
   * Calculate RSI
   */
  private calculateRSI(candles: Candle[]): number | null {
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
   * Calculate average volume
   */
  private calculateAverageVolume(candles: Candle[], period: number = 20): number {
    if (candles.length < period) {
      period = candles.length;
    }

    const recentCandles = candles.slice(-period);
    const totalVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0);
    return totalVolume / period;
  }

  /**
   * Check if price is bouncing off lower band
   */
  private isBounceOffLowerBand(candles: Candle[], bb: { upper: number; middle: number; lower: number }): boolean {
    if (candles.length < 3) return false;

    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    const twoBefore = candles[candles.length - 3];

    // Prix était en dessous ou proche de la bande inférieure
    const wasBelowOrNear = previous.low <= bb.lower * 1.002; // 0.2% de marge
    
    // Prix remonte maintenant
    const isBouncing = current.close > previous.close;
    
    // Prix reste proche de la bande inférieure
    const nearLowerBand = current.close <= bb.lower * 1.01; // 1% au-dessus max

    return wasBelowOrNear && isBouncing && nearLowerBand;
  }

  /**
   * Check if price is near or above upper band
   */
  private isNearUpperBand(price: number, bb: { upper: number; middle: number; lower: number }): boolean {
    return price >= bb.upper * 0.99; // À 1% de la bande supérieure
  }

  /**
   * Check if price reached middle band (take profit target)
   */
  private isNearMiddleBand(price: number, bb: { upper: number; middle: number; lower: number }): boolean {
    const distance = Math.abs(price - bb.middle) / bb.middle;
    return distance <= 0.003; // À 0.3% de la moyenne
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
   * Analyze market and generate signals
   */
  analyzeMarket(candles: Candle[]): TradingSignal | null {
    if (candles.length < Math.max(this.config.bbPeriod, this.config.rsiPeriod)) {
      return null;
    }

    const currentCandle = candles[candles.length - 1];
    const currentPrice = currentCandle.close;
    const currentTime = currentCandle.time;

    // Calculate indicators
    const bb = this.calculateBollingerBands(candles);
    const rsi = this.calculateRSI(candles);
    const avgVolume = this.calculateAverageVolume(candles);

    if (!bb || rsi === null) {
      return null;
    }

    // Calculate Bollinger Band width (volatility indicator)
    const bbWidth = ((bb.upper - bb.lower) / bb.middle) * 100;
    const isVolatile = bbWidth > 3; // BB width > 3%

    // Volume confirmation
    const volumeRatio = currentCandle.volume / avgVolume;
    const hasVolumeConfirmation = volumeRatio >= this.config.volumeThreshold;

    // Update unrealized PnL for existing position
    if (this.currentPosition.type === 'LONG') {
      const priceDiff = currentPrice - this.currentPosition.entryPrice;
      this.currentPosition.unrealizedPnL = priceDiff * this.currentPosition.quantity;
      this.currentPosition.unrealizedPnLPercent = (priceDiff / this.currentPosition.entryPrice) * 100;

      // Check stop loss
      const stopLossPrice = this.currentPosition.entryPrice * (1 - this.config.stopLossPercent / 100);
      if (currentPrice <= stopLossPrice) {
        const pnl = this.currentPosition.unrealizedPnL;
        this.totalPnL += pnl;
        this.totalTrades++;
        if (pnl < 0) this.losingTrades++;

        const signal: TradingSignal = {
          type: 'CLOSE_LONG',
          price: currentPrice,
          timestamp: currentTime,
          reason: `🛑 Stop Loss (${this.currentPosition.unrealizedPnLPercent.toFixed(2)}%)`,
          rsi,
          ema12: bb.upper,
          ema26: bb.middle,
          ema50: bb.middle,
          ema200: bb.lower,
          ma7: bb.upper,
          ma25: bb.middle,
          ma99: bb.lower,
          strength: 'HIGH'
        };

        this.currentPosition = {
          type: 'NONE',
          entryPrice: 0,
          entryTime: 0,
          quantity: 0,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0
        };

        this.recordSignal(signal);
        return signal;
      }

      // Check take profit conditions
      const takeProfitPrice = this.currentPosition.entryPrice * (1 + this.config.takeProfitPercent / 100);
      const reachedTakeProfit = currentPrice >= takeProfitPrice;
      const reachedUpperBand = this.isNearUpperBand(currentPrice, bb);
      const reachedMiddleBand = this.isNearMiddleBand(currentPrice, bb);
      const rsiOverbought = rsi > this.config.rsiSellThreshold;

      if (reachedTakeProfit || reachedUpperBand || (reachedMiddleBand && rsiOverbought)) {
        const pnl = this.currentPosition.unrealizedPnL;
        this.totalPnL += pnl;
        this.totalTrades++;
        if (pnl > 0) this.winningTrades++;
        else this.losingTrades++;

        let reason = '';
        if (reachedTakeProfit) reason = `🎯 Take Profit (${this.currentPosition.unrealizedPnLPercent.toFixed(2)}%)`;
        else if (reachedUpperBand) reason = `📊 Upper Band (${this.currentPosition.unrealizedPnLPercent.toFixed(2)}%)`;
        else reason = `📈 Middle Band + RSI ${rsi.toFixed(0)} (${this.currentPosition.unrealizedPnLPercent.toFixed(2)}%)`;

        const signal: TradingSignal = {
          type: 'CLOSE_LONG',
          price: currentPrice,
          timestamp: currentTime,
          reason,
          rsi,
          ema12: bb.upper,
          ema26: bb.middle,
          ema50: bb.middle,
          ema200: bb.lower,
          ma7: bb.upper,
          ma25: bb.middle,
          ma99: bb.lower,
          strength: 'MEDIUM'
        };

        this.currentPosition = {
          type: 'NONE',
          entryPrice: 0,
          entryTime: 0,
          quantity: 0,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0
        };

        this.recordSignal(signal);
        return signal;
      }
    }

    // Entry signals - only if no position
    if (this.currentPosition.type === 'NONE') {
      // BUY Signal: Bounce off lower band with RSI oversold
      const isBouncing = this.isBounceOffLowerBand(candles, bb);
      const isOversold = rsi < this.config.rsiBuyThreshold;
      
      if (isBouncing && isOversold && isVolatile) {
        const quantity = 0.001; // Fixed quantity for backtesting
        
        this.currentPosition = {
          type: 'LONG',
          entryPrice: currentPrice,
          entryTime: currentTime,
          quantity,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0
        };

        const volumeText = hasVolumeConfirmation ? '📊 Vol' : '';
        const signal: TradingSignal = {
          type: 'BUY',
          price: currentPrice,
          timestamp: currentTime,
          reason: `🎯 BB Bounce | RSI ${rsi.toFixed(0)} | BBW ${bbWidth.toFixed(1)}% ${volumeText}`,
          rsi,
          ema12: bb.upper,
          ema26: bb.middle,
          ema50: bb.middle,
          ema200: bb.lower,
          ma7: bb.upper,
          ma25: bb.middle,
          ma99: bb.lower,
          strength: hasVolumeConfirmation ? 'HIGH' : 'MEDIUM'
        };

        this.recordSignal(signal);
        return signal;
      }
    }

    // HOLD signal with current state
    return {
      type: 'HOLD',
      price: currentPrice,
      timestamp: currentTime,
      reason: `BB: ${bb.lower.toFixed(0)}-${bb.middle.toFixed(0)}-${bb.upper.toFixed(0)} | RSI ${rsi.toFixed(0)} | W ${bbWidth.toFixed(1)}%`,
      rsi,
      ema12: bb.upper,
      ema26: bb.middle,
      ema50: bb.middle,
      ema200: bb.lower,
      ma7: bb.upper,
      ma25: bb.middle,
      ma99: bb.lower,
      strength: 'LOW'
    };
  }

  /**
   * Get position info (required by StrategyManager)
   */
  getPositionInfo(): { 
    position: Position; 
    totalPnL: number; 
    totalTrades: number; 
    winningTrades: number; 
    winRate: number; 
    lastSignal: TradingSignal | null; 
    signalHistory: TradingSignal[]; 
    currentCapital: number;
  } {
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
      currentCapital
    };
  }

  /**
   * Execute trade (required by StrategyManager)
   */
  async executeTrade(signal: TradingSignal): Promise<void> {
    // In backtesting mode, we don't execute real trades
    // The signal is already processed in analyzeMarket
    console.log(`[Bollinger Bounce] ${signal.type} signal at $${signal.price.toFixed(2)}: ${signal.reason}`);
  }

  /**
   * Get current position (legacy method)
   */
  getCurrentPosition(): Position {
    return { ...this.currentPosition };
  }

  /**
   * Get performance metrics (legacy method)
   */
  getPerformanceMetrics() {
    return {
      totalPnL: this.totalPnL,
      totalTrades: this.totalTrades,
      winningTrades: this.winningTrades,
      losingTrades: this.losingTrades,
      winRate: this.totalTrades > 0 ? (this.winningTrades / this.totalTrades) * 100 : 0
    };
  }

  /**
   * Reset strategy state
   */
  reset(): void {
    this.currentPosition = {
      type: 'NONE',
      entryPrice: 0,
      entryTime: 0,
      quantity: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0
    };
    this.totalPnL = 0;
    this.totalTrades = 0;
    this.winningTrades = 0;
    this.losingTrades = 0;
    this.signalHistory = [];
    this.lastSignal = null;
  }
}

