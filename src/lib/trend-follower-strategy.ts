import { Candle, CompletedTrade, Position, TradingSignal } from '@/types/trading';
import CompletedTradeRepository from './db/completed-trade-repository';
import OpenPositionRepository from './db/open-position-repository';

/**
 * Simple Trend Follower Strategy
 * Suit la tendance et inverse automatiquement la position quand elle change
 * TP: +2% | SL: -2%
 */

export interface TrendFollowerConfig {
  profitTargetPercent: number;      // 2% profit target
  stopLossPercent: number;          // 2% stop loss
  maxPositionTime: number;          // Max position time in milliseconds
  trendPeriod: number;              // Période pour détecter la tendance (EMA)
  trendConfirmationCandles: number; // Number of candles to confirm trend
  simulationMode: boolean;
  positionSize: number;
}

export const trendFollowerConfig: TrendFollowerConfig = {
  profitTargetPercent: 2.0,          // 2%
  stopLossPercent: 2.0,              // 2%
  maxPositionTime: 240 * 60 * 1000,  // 240 minutes
  trendPeriod: 50,                   // EMA 50 pour la tendance
  trendConfirmationCandles: 3,       // Confirmation sur 3 bougies consécutives
  simulationMode: true,
  positionSize: 0.05 // 5% du capital (Balanced)
};

export class TrendFollowerStrategy {
  private config: TrendFollowerConfig;
  private currentPosition: Position;
  private totalPnL: number = 0;
  private totalTrades: number = 0;
  private winningTrades: number = 0;
  private initialCapital: number = 100000;
  private lastSignal: TradingSignal | null = null;
  private signalHistory: TradingSignal[] = [];
  private lastTrendDirection: 'UP' | 'DOWN' | null = null;
  private completedTrades: CompletedTrade[] = [];
  
  // Track entry information for creating CompletedTrade
  private entrySignal: TradingSignal | null = null;
  
  // Strategy name for database operations
  private strategyName: string = '';

  constructor(config: TrendFollowerConfig, strategyName: string = 'Trend Follower') {
    this.config = config;
    this.strategyName = strategyName;
    this.currentPosition = {
      type: 'NONE',
      entryPrice: 0,
      entryTime: 0,
      quantity: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0
    };
  }

  /**
   * Calculate EMA
   */
  private calculateEMA(candles: Candle[], period: number): number {
    if (candles.length < period) return candles[candles.length - 1].close;

    const k = 2 / (period + 1);
    let ema = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;

    for (let i = period; i < candles.length; i++) {
      ema = candles[i].close * k + ema * (1 - k);
    }

    return ema;
  }

  /**
   * Detect trend direction with confirmation
   */
  private detectTrend(candles: Candle[]): 'UP' | 'DOWN' | 'NONE' {
    if (candles.length < this.config.trendPeriod + this.config.trendConfirmationCandles) {
      return 'NONE'; // Pas assez de données
    }

    const ema = this.calculateEMA(candles, this.config.trendPeriod);
    
    // Vérifier les N dernières bougies pour confirmation
    const recentCandles = candles.slice(-this.config.trendConfirmationCandles);
    
    // Compter combien de bougies sont au-dessus/en-dessous de l'EMA
    let candlesAboveEMA = 0;
    let candlesBelowEMA = 0;
    
    recentCandles.forEach(candle => {
      if (candle.close > ema) {
        candlesAboveEMA++;
      } else {
        candlesBelowEMA++;
      }
    });

    // Confirmation de tendance haussière : toutes les bougies au-dessus de l'EMA
    if (candlesAboveEMA === this.config.trendConfirmationCandles) {
      return 'UP';
    }
    
    // Confirmation de tendance baissière : toutes les bougies en-dessous de l'EMA
    if (candlesBelowEMA === this.config.trendConfirmationCandles) {
      return 'DOWN';
    }

    // Pas de confirmation claire
    return 'NONE';
  }

  /**
   * Get trend strength (for display purposes)
   */
  getTrendInfo(candles: Candle[]): {
    trend: 'UP' | 'DOWN' | 'NONE';
    strength: 'STRONG' | 'WEAK' | 'NONE';
    ema50: number;
    currentPrice: number;
    candlesInTrend: number;
  } {
    if (candles.length < this.config.trendPeriod + this.config.trendConfirmationCandles) {
      return {
        trend: 'NONE',
        strength: 'NONE',
        ema50: 0,
        currentPrice: 0,
        candlesInTrend: 0
      };
    }

    const ema = this.calculateEMA(candles, this.config.trendPeriod);
    const currentPrice = candles[candles.length - 1].close;
    const trend = this.detectTrend(candles);
    
    // Calculer le nombre de bougies consécutives dans la tendance
    const recentCandles = candles.slice(-this.config.trendConfirmationCandles);
    let candlesInTrend = 0;
    
    if (trend === 'UP') {
      candlesInTrend = recentCandles.filter(c => c.close > ema).length;
    } else if (trend === 'DOWN') {
      candlesInTrend = recentCandles.filter(c => c.close < ema).length;
    }

    // Déterminer la force de la tendance
    const strength = candlesInTrend === this.config.trendConfirmationCandles ? 'STRONG' : 'WEAK';

    return {
      trend,
      strength,
      ema50: ema,
      currentPrice,
      candlesInTrend
    };
  }

  /**
   * Check if position should be closed (TP/SL)
   */
  private shouldClosePosition(currentPrice: number): { shouldClose: boolean; reason: string } {
    if (this.currentPosition.type === 'NONE') {
      return { shouldClose: false, reason: '' };
    }

    const entryPrice = this.currentPosition.entryPrice;
    const pnlPercent = this.currentPosition.type === 'LONG'
      ? ((currentPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - currentPrice) / entryPrice) * 100;

    // Take Profit
    if (pnlPercent >= this.config.profitTargetPercent) {
      return { shouldClose: true, reason: `TP Hit: +${pnlPercent.toFixed(2)}%` };
    }

    // Stop Loss
    if (pnlPercent <= -this.config.stopLossPercent) {
      return { shouldClose: true, reason: `SL Hit: ${pnlPercent.toFixed(2)}%` };
    }

    return { shouldClose: false, reason: '' };
  }

  /**
   * Close position
   */
  private closePosition(currentPrice: number, reason: string): TradingSignal {
    const pnl = this.currentPosition.type === 'LONG'
      ? (currentPrice - this.currentPosition.entryPrice) * this.currentPosition.quantity
      : (this.currentPosition.entryPrice - currentPrice) * this.currentPosition.quantity;
    
    const pnlPercent = this.currentPosition.type === 'LONG'
      ? ((currentPrice - this.currentPosition.entryPrice) / this.currentPosition.entryPrice) * 100
      : ((this.currentPosition.entryPrice - currentPrice) / this.currentPosition.entryPrice) * 100;

    this.totalPnL += pnl;
    this.totalTrades++;
    const isWin = pnl > 0;
    if (isWin) this.winningTrades++;

    const closeType = this.currentPosition.type === 'LONG' ? 'CLOSE_LONG' : 'CLOSE_SHORT';
    const timestamp = Date.now();
    const duration = timestamp - this.currentPosition.entryTime;

    // Créer le CompletedTrade
    const completedTrade: CompletedTrade = {
      strategyName: 'Trend Follower',
      strategyType: 'TREND_FOLLOWER',
      type: this.currentPosition.type as 'LONG' | 'SHORT', // Type assertion car on sait que ce n'est pas NONE ici
      entryPrice: this.currentPosition.entryPrice,
      entryTime: this.currentPosition.entryTime,
      entryReason: this.entrySignal?.reason || 'Unknown',
      exitPrice: currentPrice,
      exitTime: timestamp,
      exitReason: reason,
      quantity: this.currentPosition.quantity,
      pnl: pnl,
      pnlPercent: pnlPercent,
      fees: 0, // TODO: Calculate fees if needed
      duration: duration,
      isWin: isWin
    };

    // Sauvegarder le trade complet de manière asynchrone
    CompletedTradeRepository.saveCompletedTrade(completedTrade).catch(err => {
      console.error('Failed to save completed trade:', err);
    });
    
    // Ajouter aux trades en mémoire
    this.completedTrades.unshift(completedTrade); // Plus récent en premier

    const closeSignal: TradingSignal = {
      type: closeType,
      timestamp,
      price: currentPrice,
      rsi: 50,
      ema12: 0,
      ema26: 0,
      ema50: 0,
      ema200: 0,
      ma7: 0,
      ma25: 0,
      ma99: 0,
      reason: `${reason} | PnL: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USDT`,
      position: {
        ...this.currentPosition,
        unrealizedPnL: pnl,
        unrealizedPnLPercent: pnlPercent,
        totalPnL: this.totalPnL,
        currentCapital: this.initialCapital + this.totalPnL
      }
    };

    // Reset position
    this.currentPosition = {
      type: 'NONE',
      entryPrice: 0,
      entryTime: 0,
      quantity: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0
    };
    
    // Delete from database
    OpenPositionRepository.deleteOpenPosition(this.strategyName).catch(err => {
      console.error('Failed to delete open position:', err);
    });
    
    this.entrySignal = null;

    return closeSignal;
  }

  /**
   * Analyze market and generate signals
   */
  analyzeMarket(candles: Candle[]): TradingSignal | null {
    if (candles.length < this.config.trendPeriod) {
      return null;
    }

    const currentCandle = candles[candles.length - 1];
    const currentPrice = currentCandle.close;
    const timestamp = Date.now();
    const currentTrend = this.detectTrend(candles);

    // Update position PnL if in position
    if (this.currentPosition.type !== 'NONE') {
      this.updatePositionPnL(currentPrice);

      // Check TP/SL
      const exitCheck = this.shouldClosePosition(currentPrice);
      if (exitCheck.shouldClose) {
        return this.closePosition(currentPrice, exitCheck.reason);
      }

      // Check CONFIRMED trend reversal
      if (this.currentPosition.type === 'LONG' && currentTrend === 'DOWN') {
        // Close LONG - tendance confirmée à la baisse
        const closeSignal = this.closePosition(currentPrice, `Trend REVERSED to DOWN (${this.config.trendConfirmationCandles} candles confirmation)`);
        return closeSignal;
      }

      if (this.currentPosition.type === 'SHORT' && currentTrend === 'UP') {
        // Close SHORT - tendance confirmée à la hausse
        const closeSignal = this.closePosition(currentPrice, `Trend REVERSED to UP (${this.config.trendConfirmationCandles} candles confirmation)`);
        return closeSignal;
      }
      
      // Si la tendance n'est pas confirmée (NONE), on garde la position
      // Cela évite de fermer prématurément sur un simple pullback

      // Stay in position
      return {
        type: 'HOLD',
        timestamp,
        price: currentPrice,
        rsi: 50,
        ema12: 0,
        ema26: 0,
        ema50: 0,
        ema200: 0,
        ma7: 0,
        ma25: 0,
        ma99: 0,
        reason: 'Holding position',
        position: { ...this.currentPosition, currentCapital: this.initialCapital + this.totalPnL }
      };
    }

    // No position - enter based on CONFIRMED trend
    if (currentTrend === 'NONE') {
      // Pas de tendance confirmée, on attend
      return {
        type: 'HOLD',
        timestamp,
        price: currentPrice,
        rsi: 50,
        ema12: 0,
        ema26: 0,
        ema50: 0,
        ema200: 0,
        ma7: 0,
        ma25: 0,
        ma99: 0,
        reason: 'Waiting for trend confirmation',
        position: { ...this.currentPosition, currentCapital: this.initialCapital + this.totalPnL }
      };
    }
    
    if (currentTrend === 'UP') {
      // Open LONG
      this.currentPosition = {
        type: 'LONG',
        entryPrice: currentPrice,
        entryTime: timestamp,
        quantity: this.config.positionSize,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0
      };

      const buySignal: TradingSignal = {
        type: 'BUY',
        timestamp,
        price: currentPrice,
        rsi: 50,
        ema12: 0,
        ema26: 0,
        ema50: 0,
        ema200: 0,
        ma7: 0,
        ma25: 0,
        ma99: 0,
        reason: `📈 Trend UP CONFIRMED (${this.config.trendConfirmationCandles} candles) - Opening LONG (TP: +${this.config.profitTargetPercent}% | SL: -${this.config.stopLossPercent}%)`,
        position: {
          ...this.currentPosition,
          currentCapital: this.initialCapital + this.totalPnL
        }
      };

      // Sauvegarder le signal d'entrée pour créer le CompletedTrade plus tard
      this.entrySignal = buySignal;
      this.lastTrendDirection = 'UP';
      
      // Save open position to database
      OpenPositionRepository.saveOpenPosition(this.strategyName, this.currentPosition).catch(err => {
        console.error('Failed to save open position:', err);
      });
      
      return buySignal;
    }

    if (currentTrend === 'DOWN') {
      // Open SHORT
      this.currentPosition = {
        type: 'SHORT',
        entryPrice: currentPrice,
        entryTime: timestamp,
        quantity: this.config.positionSize,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0
      };

      const sellSignal: TradingSignal = {
        type: 'SELL',
        timestamp,
        price: currentPrice,
        rsi: 50,
        ema12: 0,
        ema26: 0,
        ema50: 0,
        ema200: 0,
        ma7: 0,
        ma25: 0,
        ma99: 0,
        reason: `📉 Trend DOWN CONFIRMED (${this.config.trendConfirmationCandles} candles) - Opening SHORT (TP: +${this.config.profitTargetPercent}% | SL: -${this.config.stopLossPercent}%)`,
        position: {
          ...this.currentPosition,
          currentCapital: this.initialCapital + this.totalPnL
        }
      };

      // Sauvegarder le signal d'entrée pour créer le CompletedTrade plus tard
      this.entrySignal = sellSignal;
      this.lastTrendDirection = 'DOWN';
      
      // Save open position to database
      OpenPositionRepository.saveOpenPosition(this.strategyName, this.currentPosition).catch(err => {
        console.error('Failed to save open position:', err);
      });
      
      return sellSignal;
    }

    return null;
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
    } else {
      this.currentPosition.unrealizedPnL = 
        (this.currentPosition.entryPrice - currentPrice) * this.currentPosition.quantity;
      this.currentPosition.unrealizedPnLPercent = 
        ((this.currentPosition.entryPrice - currentPrice) / this.currentPosition.entryPrice) * 100;
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
   * Execute trade
   */
  executeTrade(signal: TradingSignal): void {
    // Enregistrer le signal dans l'historique
    this.recordSignal(signal);

    if (this.config.simulationMode) {
      console.log(`📊 [TREND FOLLOWER] ${signal.type} at ${signal.price.toFixed(2)} USDT - ${signal.reason}`);
    } else {
      console.log(`🚨 [LIVE] ${signal.type} signal - Real trading not yet implemented`);
    }
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
    return {
      position: { ...this.currentPosition },
      totalPnL: this.totalPnL,
      totalTrades: this.totalTrades,
      winningTrades: this.winningTrades,
      lastSignal: this.lastSignal,
      signalHistory: this.signalHistory,
      completedTrades: this.completedTrades,
      currentCapital: this.initialCapital + this.totalPnL
    };
  }

  /**
   * Restore strategy state from database
   */
  async restoreFromDatabase(trades: any[]): Promise<void> {
    console.log(`📥 [Trend Follower] Restoring from ${trades.length} signals...`);
    
    // Reset counters avant de recalculer
    this.totalTrades = 0;
    this.winningTrades = 0;
    this.totalPnL = 0;
    this.signalHistory = [];
    this.completedTrades = [];
    
    // Restore open position from database if exists
    const openPosition = await OpenPositionRepository.getOpenPosition(this.strategyName);
    if (openPosition && openPosition.type !== 'NONE') {
      this.currentPosition = openPosition;
      console.log(`    📊 Restored open ${openPosition.type} position @ ${openPosition.entryPrice.toFixed(2)} USDT from database`);
    }

    // Charger les completed trades depuis la nouvelle table
    const completedTrades = await CompletedTradeRepository.getCompletedTradesByStrategy('Trend Follower', 100);
    this.completedTrades = completedTrades;
    
    // Calculer les stats depuis les completed trades
    this.totalTrades = completedTrades.length;
    this.winningTrades = completedTrades.filter(t => t.isWin).length;
    
    // Calculer le P&L total
    this.totalPnL = completedTrades.reduce((sum, t) => sum + t.pnl, 0);
    
    console.log(`📊 Loaded ${completedTrades.length} completed trades`);
    completedTrades.slice(0, 5).forEach((t, idx) => {
      console.log(`  ${idx + 1}. ${t.type} | Entry: $${t.entryPrice.toFixed(2)} → Exit: $${t.exitPrice.toFixed(2)} | PnL: ${t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)} USDT ${t.isWin ? '✅' : '❌'}`);
    });

    // Restaurer les signaux pour l'historique
    if (trades.length > 0) {
      trades.forEach((trade: any) => {
        const signal: TradingSignal = {
          type: trade.signal_type,
          timestamp: parseInt(trade.timestamp),
          price: parseFloat(trade.price),
          rsi: trade.rsi || 50,
          ema12: trade.ema12 || 0,
          ema26: trade.ema26 || 0,
          ema50: trade.ema50 || 0,
          ema200: trade.ema200 || 0,
          ma7: trade.ma7 || 0,
          ma25: trade.ma25 || 0,
          ma99: trade.ma99 || 0,
          reason: trade.reason || '',
          position: trade.position_data ? JSON.parse(trade.position_data) : undefined
        };

        this.signalHistory.push(signal);
      });

      const mostRecentSignal = this.signalHistory[0];
      this.lastSignal = mostRecentSignal;
      
      console.log(`📊 Signal history loaded: ${this.signalHistory.length} signals`);
      console.log(`   First 3 signals:`, this.signalHistory.slice(0, 3).map(s => ({
        type: s.type,
        price: s.price,
        timestamp: new Date(s.timestamp).toLocaleString()
      })));
      
      // Vérifier si le signal le plus récent est une ouverture de position (BUY/SELL)
      if (mostRecentSignal.type === 'BUY' || mostRecentSignal.type === 'SELL') {
        // Vérifier qu'il n'y a pas de signal de fermeture plus récent
        const hasClosingSignal = this.signalHistory.some(s => 
          (s.type === 'CLOSE_LONG' || s.type === 'CLOSE_SHORT') && 
          s.timestamp > mostRecentSignal.timestamp
        );
        
        if (!hasClosingSignal && mostRecentSignal.position) {
          // Restaurer la position ouverte
          this.currentPosition = {
            type: mostRecentSignal.type === 'BUY' ? 'LONG' : 'SHORT',
            entryPrice: mostRecentSignal.price,
            entryTime: mostRecentSignal.timestamp,
            quantity: mostRecentSignal.position.quantity || this.config.positionSize,
            unrealizedPnL: 0,
            unrealizedPnLPercent: 0
          };
          this.entrySignal = mostRecentSignal; // Restaurer aussi l'entrySignal
          console.log(`    📊 Restored open ${this.currentPosition.type} position @ ${this.currentPosition.entryPrice.toFixed(2)} USDT`);
        }
      }
    }

    const winRate = this.totalTrades > 0 ? (this.winningTrades / this.totalTrades) * 100 : 0;
    console.log(`✅ [Trend Follower] Restored: ${this.totalTrades} trades (${this.winningTrades} wins), Win Rate: ${winRate.toFixed(1)}%, PnL: ${this.totalPnL.toFixed(2)} USDT`);
  }
}

