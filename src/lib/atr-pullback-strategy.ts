import { Candle, CompletedTrade, Position, TradingSignal } from '@/types/trading';
import CompletedTradeRepository from './db/completed-trade-repository';

export interface AtrPullbackConfig {
  rsiPeriod: number;
  ema50Period: number;
  ema200Period: number;
  atrPeriod: number;
  cooldownPeriod: number;
  simulationMode: boolean;
  profitTargetPercent: number;
  stopLossPercent: number;
  maxPositionTime: number;
  positionSize: number;
}

export const atrPullbackDefaultConfig: AtrPullbackConfig = {
  rsiPeriod: 14,
  ema50Period: 50,
  ema200Period: 200,
  atrPeriod: 14,
  // Plus conservateur: éviter le sur-trading (quelques trades/jour)
  cooldownPeriod: 60 * 60 * 1000, // 60 min
  simulationMode: true,
  // SL/TP prudents (incluent un coussin pour les frais 0.1%)
  profitTargetPercent: 1.2,
  stopLossPercent: 0.8,
  maxPositionTime: 180 * 60 * 1000, // 180 min
  positionSize: 0.05 // ~5% de 100k$ sur BTC (Balanced)
};

export class AtrTrendPullbackStrategy {
  public config: AtrPullbackConfig;

  private currentPosition: Position;
  private totalPnL: number = 0;
  private totalTrades: number = 0;
  private winningTrades: number = 0;
  private lastTradeTime: number = 0;
  private signalHistory: TradingSignal[] = [];
  private lastSignal: TradingSignal | null = null;
  private completedTrades: CompletedTrade[] = [];
  private entrySignal: TradingSignal | null = null;
  private initialCapital: number = 100000;

  constructor(config: AtrPullbackConfig = atrPullbackDefaultConfig) {
    this.config = config;
    this.currentPosition = {
      type: 'NONE',
      entryPrice: 0,
      entryTime: 0,
      quantity: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0
    };
  }

  // ----- Indicators -----
  private calculateEMA(candles: Candle[], period: number): number | null {
    if (candles.length < period) return null;
    const k = 2 / (period + 1);
    let ema = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;
    for (let i = period; i < candles.length; i++) {
      ema = candles[i].close * k + ema * (1 - k);
    }
    return ema;
  }

  private calculateSMA(candles: Candle[], period: number): number | null {
    if (candles.length < period) return null;
    const recent = candles.slice(-period);
    return recent.reduce((sum, c) => sum + c.close, 0) / period;
  }

  private calculateRSI(candles: Candle[], period: number = this.config.rsiPeriod): number | null {
    if (candles.length < period + 1) return null;
    let gains = 0;
    let losses = 0;
    const closes = candles.map(c => c.close);
    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change; else losses += Math.abs(change);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  private calculateATR(candles: Candle[], period: number = this.config.atrPeriod): number | null {
    if (candles.length < period + 1) return null;
    const trs: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const cur = candles[i];
      const prev = candles[i - 1];
      const tr = Math.max(
        cur.high - cur.low,
        Math.abs(cur.high - prev.close),
        Math.abs(cur.low - prev.close)
      );
      trs.push(tr);
    }
    const recent = trs.slice(-period);
    return recent.reduce((s, v) => s + v, 0) / period;
  }

  // ----- Position helpers -----
  private isCooldownPassed(): boolean {
    return Date.now() - this.lastTradeTime >= this.config.cooldownPeriod;
  }

  private updatePositionPnL(currentPrice: number): void {
    if (this.currentPosition.type === 'NONE') return;
    const diff = currentPrice - this.currentPosition.entryPrice;
    if (this.currentPosition.type === 'LONG') {
      this.currentPosition.unrealizedPnL = diff * this.currentPosition.quantity;
      this.currentPosition.unrealizedPnLPercent = (diff / this.currentPosition.entryPrice) * 100;
    } else {
      this.currentPosition.unrealizedPnL = -diff * this.currentPosition.quantity;
      this.currentPosition.unrealizedPnLPercent = (-diff / this.currentPosition.entryPrice) * 100;
    }
  }

  private calculateFees(entryPrice: number, exitPrice: number, quantity: number): number {
    const feeRate = 0.001; // 0.1% + 0.1%
    return entryPrice * quantity * feeRate + exitPrice * quantity * feeRate;
  }

  private shouldClosePosition(currentPrice: number): { shouldClose: boolean; reason: string } {
    if (this.currentPosition.type === 'NONE') return { shouldClose: false, reason: '' };
    this.updatePositionPnL(currentPrice);
    const now = Date.now();
    if (this.currentPosition.unrealizedPnLPercent >= this.config.profitTargetPercent) {
      return { shouldClose: true, reason: `TP hit: +${this.currentPosition.unrealizedPnLPercent.toFixed(2)}%` };
    }
    if (this.currentPosition.unrealizedPnLPercent <= -this.config.stopLossPercent) {
      return { shouldClose: true, reason: `SL hit: ${this.currentPosition.unrealizedPnLPercent.toFixed(2)}%` };
    }
    if (now - this.currentPosition.entryTime >= this.config.maxPositionTime) {
      return { shouldClose: true, reason: `Max time reached` };
    }
    return { shouldClose: false, reason: '' };
  }

  private closePosition(currentPrice: number, reason: string): TradingSignal {
    const closed = { ...this.currentPosition };
    const timestamp = Date.now();
    this.updatePositionPnL(currentPrice);
    const grossPnL = this.currentPosition.unrealizedPnL;
    const fees = this.calculateFees(this.currentPosition.entryPrice, currentPrice, this.currentPosition.quantity);
    const netPnL = grossPnL - fees;
    const netPnLPercent = this.currentPosition.unrealizedPnLPercent - (fees / (this.currentPosition.entryPrice * this.currentPosition.quantity)) * 100;

    this.totalPnL += netPnL;
    this.totalTrades++;
    if (netPnL > 0) this.winningTrades++;

    const completed: CompletedTrade = {
      strategyName: 'ATR Trend Pullback',
      strategyType: 'ATR_PULLBACK',
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
      fees,
      duration: timestamp - this.currentPosition.entryTime,
      isWin: netPnL > 0
    };
    CompletedTradeRepository.saveCompletedTrade(completed).catch(err => console.error('Failed to save completed trade:', err));
    this.completedTrades.unshift(completed);

    const signalType = closed.type === 'LONG' ? 'CLOSE_LONG' : 'CLOSE_SHORT';
    const currentCapital = this.initialCapital + this.totalPnL;
    const closeSignal: TradingSignal = {
      type: signalType,
      timestamp,
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
        ...closed,
        unrealizedPnL: netPnL,
        unrealizedPnLPercent: netPnLPercent,
        totalPnL: this.totalPnL,
        totalPnLPercent: (this.totalPnL / this.initialCapital) * 100,
        fees,
        currentCapital
      }
    };

    // Reset
    this.currentPosition = { type: 'NONE', entryPrice: 0, entryTime: 0, quantity: 0, unrealizedPnL: 0, unrealizedPnLPercent: 0 };
    this.lastTradeTime = timestamp;
    this.entrySignal = null;
    return closeSignal;
  }

  private recordSignal(signal: TradingSignal): void {
    if (signal.type === 'HOLD') return;
    this.lastSignal = signal;
    this.signalHistory.push(signal);
    if (this.signalHistory.length > 50) this.signalHistory.shift();
  }

  // ----- Core logic -----
  analyzeMarket(candles: Candle[]): TradingSignal | null {
    const minNeeded = Math.max(this.config.ema200Period, this.config.atrPeriod + 1, this.config.rsiPeriod + 1, 100);
    if (candles.length < minNeeded) return null;

    const current = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const price = current.close;
    const timestamp = Date.now();

    const rsi = this.calculateRSI(candles) as number;
    const ema12 = this.calculateEMA(candles, 12) as number;
    const ema26 = this.calculateEMA(candles, 26) as number;
    const ema50 = this.calculateEMA(candles, this.config.ema50Period) as number;
    const ema200 = this.calculateEMA(candles, this.config.ema200Period) as number;
    const ma7 = this.calculateSMA(candles, 7) as number;
    const ma25 = this.calculateSMA(candles, 25) as number;
    const ma99 = this.calculateSMA(candles, 99) as number;
    const atr = this.calculateATR(candles) as number;

    if ([rsi, ema12, ema26, ema50, ema200, ma7, ma25, ma99, atr].some(v => v === null || v === undefined)) return null;

    // If in position, check exits first
    if (this.currentPosition.type !== 'NONE') {
      const exitCheck = this.shouldClosePosition(price);
      if (exitCheck.shouldClose) {
        const sig = this.closePosition(price, exitCheck.reason);
        // Enrich with indicators for UI
        sig.rsi = rsi; sig.ema12 = ema12; sig.ema26 = ema26; sig.ema50 = ema50; sig.ema200 = ema200; sig.ma7 = ma7; sig.ma25 = ma25; sig.ma99 = ma99;
        return sig;
      }

      // Hold and update PnL
      this.updatePositionPnL(price);
      return {
        type: 'HOLD', timestamp, price,
        rsi, ema12, ema26, ema50, ema200, ma7, ma25, ma99,
        reason: `In ${this.currentPosition.type} | PnL ${this.currentPosition.unrealizedPnLPercent.toFixed(2)}%`,
        position: { ...this.currentPosition }
      };
    }

    // No position → entries
    if (!this.isCooldownPassed()) {
      return { type: 'HOLD', timestamp, price, rsi, ema12, ema26, ema50, ema200, ma7, ma25, ma99, reason: 'Cooldown active' };
    }

    const inUptrend = ema50 > ema200; // conservative trend filter
    const inDowntrend = ema50 < ema200;
    const nearEma50Long = price >= ema50 - 0.5 * atr && price <= ema50 + 0.2 * atr;
    const nearEma50Short = price <= ema50 + 0.5 * atr && price >= ema50 - 0.2 * atr; // mirror around ema50
    const rsiLongOk = rsi >= 35 && rsi <= 55;
    const rsiShortOk = rsi >= 45 && rsi <= 65;
    const bullishReversal = prev.close < prev.open && current.close > current.open;
    const bearishReversal = prev.close > prev.open && current.close < current.open;

    // LONG entry: Uptrend + pullback to EMA50 within ATR band + mild RSI + reversal candle
    if (inUptrend && nearEma50Long && rsiLongOk && bullishReversal) {
      this.currentPosition = {
        type: 'LONG', entryPrice: price, entryTime: timestamp, quantity: this.config.positionSize,
        unrealizedPnL: 0, unrealizedPnLPercent: 0
      };
      this.lastTradeTime = timestamp;
      const signal: TradingSignal = {
        type: 'BUY', timestamp, price,
        rsi, ema12, ema26, ema50, ema200, ma7, ma25, ma99,
        reason: `ATR pullback LONG | Uptrend + near EMA50 (${(price - ema50).toFixed(2)}) + RSI ${rsi.toFixed(1)} + reversal`,
        position: { ...this.currentPosition, currentCapital: this.initialCapital + this.totalPnL }
      };
      this.entrySignal = signal;
      return signal;
    }

    // SHORT entry: Downtrend + pullback to EMA50 within ATR band + mild RSI + reversal candle
    if (inDowntrend && nearEma50Short && rsiShortOk && bearishReversal) {
      this.currentPosition = {
        type: 'SHORT', entryPrice: price, entryTime: timestamp, quantity: this.config.positionSize,
        unrealizedPnL: 0, unrealizedPnLPercent: 0
      };
      this.lastTradeTime = timestamp;
      const signal: TradingSignal = {
        type: 'SELL', timestamp, price,
        rsi, ema12, ema26, ema50, ema200, ma7, ma25, ma99,
        reason: `ATR pullback SHORT | Downtrend + near EMA50 (${(price - ema50).toFixed(2)}) + RSI ${rsi.toFixed(1)} + reversal`,
        position: { ...this.currentPosition, currentCapital: this.initialCapital + this.totalPnL }
      };
      this.entrySignal = signal;
      return signal;
    }

    // HOLD
    return { type: 'HOLD', timestamp, price, rsi, ema12, ema26, ema50, ema200, ma7, ma25, ma99, reason: 'No setup' };
  }

  executeTrade(signal: TradingSignal): void {
    this.recordSignal(signal);
    if (this.config.simulationMode) {
      console.log(`[ATR Pullback] ${signal.type} @ ${signal.price.toFixed(2)} | ${signal.reason}`);
    } else {
      console.log(`🚨 [LIVE] ${signal.type} signal - Real trading not yet implemented`);
    }
  }

  updatePositionWithCurrentPrice(currentPrice: number): void {
    if (this.currentPosition.type !== 'NONE') this.updatePositionPnL(currentPrice);
  }

  getPositionInfo() {
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
      completedTrades: this.completedTrades
    };
  }

  async restoreFromDatabase(_trades: any[]): Promise<void> {
    // Optional: could load completed trades for stats
    // Keep minimal for now; StrategyManager will handle history rendering from CompletedTradeRepository if needed
    this.completedTrades = await CompletedTradeRepository.getCompletedTradesByStrategy('ATR Trend Pullback', 100);
    this.totalTrades = this.completedTrades.length;
    this.winningTrades = this.completedTrades.filter(t => t.isWin).length;
    this.totalPnL = this.completedTrades.reduce((s, t) => s + t.pnl, 0);
  }
}


