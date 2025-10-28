import { BacktestConfig, BacktestResult, Candle, CompletedTrade, Position, TradingSignal } from '@/types/trading';
import { CustomStrategy } from './custom-strategy';
import { LocalDataLoader } from './local-data-loader';

export class LocalBacktestEngine {
  private strategy: CustomStrategy;
  private config: BacktestConfig;
  private dataLoader: LocalDataLoader;
  private candles: Candle[] = [];
  private completedTrades: CompletedTrade[] = [];
  private equityCurve: Array<{ timestamp: number; capital: number; pnl: number }> = [];
  private currentCapital: number;
  private currentPosition: Position = {
    type: 'NONE',
    entryPrice: 0,
    entryTime: 0,
    quantity: 0,
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0,
    currentCapital: 0
  };

  constructor(config: BacktestConfig, strategy: CustomStrategy, dataLoader: LocalDataLoader) {
    this.config = config;
    this.strategy = strategy;
    this.dataLoader = dataLoader;
    this.currentCapital = config.initialCapital;
  }

  /**
   * Exécute le backtest avec des données locales
   */
  async runBacktest(): Promise<BacktestResult> {
    console.log(`🚀 Starting local backtest for strategy: ${this.config.strategyName}`);
    
    // Vérifier si les données sont disponibles
    const hasData = await this.dataLoader.hasDataForPeriod(
      this.config.symbol,
      this.config.timeframe,
      this.config.startDate,
      this.config.endDate
    );

    if (!hasData) {
      throw new Error(`No local data available for ${this.config.symbol} ${this.config.timeframe} from ${this.config.startDate} to ${this.config.endDate}`);
    }

    // Charger les données historiques
    this.candles = await this.dataLoader.loadHistoricalData(
      this.config.symbol,
      this.config.timeframe,
      this.config.startDate,
      this.config.endDate
    );
    
    if (this.candles.length === 0) {
      throw new Error('No historical data available for the specified period');
    }

    console.log(`📊 Loaded ${this.candles.length} candles from local data`);

    // Initialiser l'equity curve
    this.equityCurve.push({
      timestamp: this.candles[0].time,
      capital: this.currentCapital,
      pnl: 0
    });

    // Filtrer les bougies invalides
    const validCandles = this.candles.filter(candle => 
      candle.time && !isNaN(candle.time) && 
      candle.open && !isNaN(candle.open) && 
      candle.high && !isNaN(candle.high) && 
      candle.low && !isNaN(candle.low) && 
      candle.close && !isNaN(candle.close) && 
      candle.volume && !isNaN(candle.volume)
    );
    
    console.log(`📊 Original candles: ${this.candles.length}`);
    console.log(`📊 Valid candles: ${validCandles.length}`);
    
    if (validCandles.length === 0) {
      throw new Error('No valid candles found in historical data');
    }
    
    // Utiliser seulement les bougies valides
    this.candles = validCandles;
    
    // Simuler la stratégie sur chaque bougie
    const totalCandles = this.candles.length;
    console.log(`🔄 Processing ${totalCandles} candles...`);
    console.log(`📊 First candle:`, this.candles[0]);
    console.log(`📊 Last candle:`, this.candles[this.candles.length - 1]);
    
    let signalCount = 0;
    let holdCount = 0;
    
    for (let i = 0; i < this.candles.length; i++) {
      const currentCandle = this.candles[i];
      const historicalCandles = this.candles.slice(0, i + 1);
      
      // Log de progression tous les 1000 bougies
      if (i % 1000 === 0) {
        console.log(`📊 Progress: ${i}/${totalCandles} (${((i/totalCandles)*100).toFixed(1)}%)`);
        console.log(`📊 Current candle:`, {
          time: currentCandle.time && !isNaN(currentCandle.time) ? new Date(currentCandle.time).toISOString() : 'Invalid time',
          open: currentCandle.open,
          high: currentCandle.high,
          low: currentCandle.low,
          close: currentCandle.close,
          volume: currentCandle.volume
        });
      }
      
      // Mettre à jour la position actuelle avec le prix actuel
      this.updateCurrentPosition(currentCandle.close);
      
      // Analyser le marché avec la stratégie
      const signal = this.strategy.analyzeMarket(historicalCandles);
      
      // Debug: Log les détails de la stratégie pour les premières bougies
      if (i < 5) {
        console.log(`🔍 Strategy analysis for candle ${i}:`, {
          candleTime: new Date(currentCandle.time).toISOString(),
          candleData: {
            open: currentCandle.open,
            high: currentCandle.high,
            low: currentCandle.low,
            close: currentCandle.close,
            volume: currentCandle.volume
          },
          historicalCandlesCount: historicalCandles.length,
          signal: signal ? {
            type: signal.type,
            reason: signal.reason
          } : null
        });
      }
      
      if (signal) {
        if (signal.type !== 'HOLD') {
          signalCount++;
          console.log(`🎯 Signal detected at ${new Date(currentCandle.time).toISOString()}:`, {
            type: signal.type,
            reason: signal.reason,
            price: currentCandle.close,
            position: this.currentPosition.type
          });
          this.executeSignal(signal, currentCandle);
        } else {
          holdCount++;
        }
      }
      
      // Vérifier les conditions de sortie (TP/SL/Max Time)
      this.checkExitConditions(currentCandle);
      
      // Mettre à jour l'equity curve (seulement tous les 10 points pour optimiser)
      if (i % 10 === 0 || i === this.candles.length - 1) {
        // Vérifier que le timestamp est valide
        const timestamp = currentCandle.time && currentCandle.time > 0 ? currentCandle.time : Date.now();
        this.equityCurve.push({
          timestamp: timestamp,
          capital: this.currentCapital,
          pnl: this.currentCapital - this.config.initialCapital
        });
      }
    }
    
    console.log(`📊 Backtest summary:`);
    console.log(`   - Total candles processed: ${totalCandles}`);
    console.log(`   - Signals detected: ${signalCount}`);
    console.log(`   - HOLD signals: ${holdCount}`);
    console.log(`   - Trades executed: ${this.completedTrades.length}`);
    console.log(`   - Final capital: ${this.currentCapital}`);

    // Fermer la position ouverte s'il y en a une
    if (this.currentPosition.type !== 'NONE') {
      const lastCandle = this.candles[this.candles.length - 1];
      this.closePosition(lastCandle.close, lastCandle.time, 'Backtest End');
    }

    // Calculer les métriques de performance
    return this.calculateResults();
  }

  /**
   * Met à jour la position actuelle avec le prix actuel
   */
  private updateCurrentPosition(currentPrice: number): void {
    if (this.currentPosition.type === 'NONE') return;

    const isLong = this.currentPosition.type === 'LONG';
    const priceChange = isLong 
      ? (currentPrice - this.currentPosition.entryPrice) / this.currentPosition.entryPrice
      : (this.currentPosition.entryPrice - currentPrice) / this.currentPosition.entryPrice;

    this.currentPosition.unrealizedPnL = this.currentPosition.quantity * currentPrice * priceChange;
    this.currentPosition.unrealizedPnLPercent = priceChange * 100;
    this.currentPosition.currentCapital = this.currentCapital;
  }

  /**
   * Exécute un signal de trading
   */
  private executeSignal(signal: TradingSignal, candle: Candle): void {
    const isEntrySignal = signal.type === 'BUY' || signal.type === 'SELL';
    const isExitSignal = signal.type === 'CLOSE_LONG' || signal.type === 'CLOSE_SHORT';
    
    if (isEntrySignal && this.currentPosition.type === 'NONE') {
      this.openPosition(signal, candle);
    } else if (isExitSignal && this.currentPosition.type !== 'NONE') {
      this.closePosition(candle.close, candle.time, signal.reason);
    }
  }

  /**
   * Ouvre une nouvelle position
   */
  private openPosition(signal: TradingSignal, candle: Candle): void {
    const positionType = signal.type === 'BUY' ? 'LONG' : 'SHORT';
    const quantity = (this.currentCapital * this.config.positionSize) / candle.close;
    
    this.currentPosition = {
      type: positionType,
      entryPrice: candle.close,
      entryTime: candle.time,
      quantity,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      currentCapital: this.currentCapital
    };

    console.log(`📈 Opened ${positionType} position at $${candle.close.toFixed(2)} (${candle.time})`);
  }

  /**
   * Ferme la position actuelle
   */
  private closePosition(exitPrice: number, exitTime: number, reason: string): void {
    if (this.currentPosition.type === 'NONE') return;

    const isLong = this.currentPosition.type === 'LONG';
    const priceChange = isLong 
      ? (exitPrice - this.currentPosition.entryPrice) / this.currentPosition.entryPrice
      : (this.currentPosition.entryPrice - exitPrice) / this.currentPosition.entryPrice;

    const pnl = this.currentPosition.quantity * exitPrice * priceChange;
    const pnlPercent = priceChange * 100;
    const fees = this.currentPosition.quantity * exitPrice * 0.001; // 0.1% fee
    const netPnl = pnl - fees;
    const duration = exitTime - this.currentPosition.entryTime;

    // Créer le trade complet
    const completedTrade: CompletedTrade = {
      strategyName: this.config.strategyName,
      strategyType: 'CUSTOM',
      type: this.currentPosition.type,
      entryPrice: this.currentPosition.entryPrice,
      entryTime: this.currentPosition.entryTime,
      exitPrice,
      exitTime,
      quantity: this.currentPosition.quantity,
      pnl: netPnl,
      pnlPercent,
      fees,
      duration,
      exitReason: reason,
      entryReason: 'Strategy Signal',
      isWin: netPnl > 0,
      timeframe: this.config.timeframe
    };

    this.completedTrades.push(completedTrade);
    this.currentCapital += netPnl;

    console.log(`📉 Closed ${this.currentPosition.type} position at $${exitPrice.toFixed(2)} | PnL: $${netPnl.toFixed(2)} (${pnlPercent.toFixed(2)}%) | Reason: ${reason}`);

    // Reset position
    this.currentPosition = {
      type: 'NONE',
      entryPrice: 0,
      entryTime: 0,
      quantity: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      currentCapital: this.currentCapital
    };
  }

  /**
   * Vérifie les conditions de sortie (TP/SL/Max Time)
   */
  private checkExitConditions(candle: Candle): void {
    if (this.currentPosition.type === 'NONE') return;

    const currentPrice = candle.close;
    const isLong = this.currentPosition.type === 'LONG';
    const priceChange = isLong 
      ? (currentPrice - this.currentPosition.entryPrice) / this.currentPosition.entryPrice
      : (this.currentPosition.entryPrice - currentPrice) / this.currentPosition.entryPrice;

    const pnlPercent = priceChange * 100;
    const timeInPosition = candle.time - this.currentPosition.entryTime;

    // Vérifier Take Profit
    const profitTarget = this.strategy.getProfitTargetPercent();
    if (profitTarget > 0 && pnlPercent >= profitTarget) {
      this.closePosition(currentPrice, candle.time, 'Take Profit');
      return;
    }

    // Vérifier Stop Loss
    const stopLoss = this.strategy.getStopLossPercent();
    if (stopLoss > 0 && pnlPercent <= -stopLoss) {
      this.closePosition(currentPrice, candle.time, 'Stop Loss');
      return;
    }

    // Vérifier Max Position Time
    const maxTime = this.strategy.getMaxPositionTime();
    if (maxTime > 0 && timeInPosition >= maxTime) {
      this.closePosition(currentPrice, candle.time, 'Max Position Time');
      return;
    }
  }

  /**
   * Calcule les résultats du backtest
   */
  private calculateResults(): BacktestResult {
    const totalTrades = this.completedTrades.length;
    const winningTrades = this.completedTrades.filter(t => t.isWin).length;
    const losingTrades = totalTrades - winningTrades;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    const totalReturn = this.currentCapital - this.config.initialCapital;
    const totalReturnPercent = (totalReturn / this.config.initialCapital) * 100;

    const winningTradesData = this.completedTrades.filter(t => t.isWin);
    const losingTradesData = this.completedTrades.filter(t => !t.isWin);

    const averageWin = winningTradesData.length > 0 
      ? winningTradesData.reduce((sum, t) => sum + t.pnl, 0) / winningTradesData.length 
      : 0;
    
    const averageLoss = losingTradesData.length > 0 
      ? Math.abs(losingTradesData.reduce((sum, t) => sum + t.pnl, 0) / losingTradesData.length)
      : 0;

    const profitFactor = averageLoss > 0 ? (averageWin * winningTrades) / (averageLoss * losingTrades) : 0;

    // Calculer le Max Drawdown
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let peak = this.config.initialCapital;

    for (const point of this.equityCurve) {
      if (point.capital > peak) {
        peak = point.capital;
      }
      const drawdown = peak - point.capital;
      const drawdownPercent = (drawdown / peak) * 100;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPercent;
      }
    }

    // Calculer le Sharpe Ratio (simplifié)
    const returns = this.equityCurve.slice(1).map((point, i) => {
      const prevPoint = this.equityCurve[i];
      return (point.capital - prevPoint.capital) / prevPoint.capital;
    });
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const sharpeRatio = Math.sqrt(variance) > 0 ? avgReturn / Math.sqrt(variance) : 0;

    // Calculer les métriques de performance
    const bestTrade = Math.max(...this.completedTrades.map(t => t.pnl), 0);
    const worstTrade = Math.min(...this.completedTrades.map(t => t.pnl), 0);
    const largestWin = Math.max(...winningTradesData.map(t => t.pnl), 0);
    const largestLoss = Math.min(...losingTradesData.map(t => t.pnl), 0);
    
    const totalFees = this.completedTrades.reduce((sum, t) => sum + t.fees, 0);
    const averageTradeDuration = totalTrades > 0 
      ? this.completedTrades.reduce((sum, t) => sum + t.duration, 0) / totalTrades 
      : 0;

    // Calculer les retours mensuels
    const monthlyReturns = this.calculateMonthlyReturns();

    return {
      strategyName: this.config.strategyName,
      timeframe: this.config.timeframe,
      startDate: this.config.startDate,
      endDate: this.config.endDate,
      initialCapital: this.config.initialCapital,
      finalCapital: this.currentCapital,
      totalReturn,
      totalReturnPercent,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      averageWin,
      averageLoss,
      profitFactor,
      maxDrawdown,
      maxDrawdownPercent,
      sharpeRatio,
      completedTrades: this.completedTrades,
      equityCurve: this.equityCurve,
      monthlyReturns,
      performanceMetrics: {
        bestTrade,
        worstTrade,
        largestWin,
        largestLoss,
        consecutiveWins: this.calculateConsecutiveWins(),
        consecutiveLosses: this.calculateConsecutiveLosses(),
        averageTradeDuration,
        totalFees
      }
    };
  }

  /**
   * Calcule les retours mensuels (optimisé)
   */
  private calculateMonthlyReturns(): Array<{ month: string; return: number; returnPercent: number }> {
    const monthlyData = new Map<string, { startCapital: number; endCapital: number }>();
    
    // Optimisation: traiter seulement un point sur 10 pour les calculs mensuels
    const step = Math.max(1, Math.floor(this.equityCurve.length / 100));
    
    for (let i = 0; i < this.equityCurve.length; i += step) {
      const point = this.equityCurve[i];
      const date = new Date(point.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { startCapital: point.capital, endCapital: point.capital });
      } else {
        const data = monthlyData.get(monthKey)!;
        data.endCapital = point.capital;
      }
    }

    return Array.from(monthlyData.entries()).map(([month, data]) => {
      const returnValue = data.endCapital - data.startCapital;
      const returnPercent = (returnValue / data.startCapital) * 100;
      return { month, return: returnValue, returnPercent };
    });
  }

  /**
   * Calcule le nombre maximum de victoires consécutives
   */
  private calculateConsecutiveWins(): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (const trade of this.completedTrades) {
      if (trade.isWin) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    return maxConsecutive;
  }

  /**
   * Calcule le nombre maximum de pertes consécutives
   */
  private calculateConsecutiveLosses(): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (const trade of this.completedTrades) {
      if (!trade.isWin) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    return maxConsecutive;
  }
}
