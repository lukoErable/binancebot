import { Candle, StrategyPerformance } from '@/types/trading';
import { BollingerBounceStrategy, defaultBollingerBounceConfig } from './bollinger-bounce-strategy';
import StrategyRepository from './db/strategy-repository';
import TradeRepository from './db/trade-repository';
import { TradingStrategy, defaultStrategyConfig } from './ema-rsi-strategy';
import { MomentumCrossoverStrategy, momentumStrategyConfig } from './momentum-strategy';
import { NeuralScalperStrategy, neuralScalperConfig } from './neural-scalper-strategy';
import { TrendFollowerStrategy, trendFollowerConfig } from './trend-follower-strategy';
import { VolumeMACDStrategy, volumeMACDStrategyConfig } from './volume-macd-strategy';

/**
 * Strategy Manager
 * Manages multiple trading strategies simultaneously and tracks their performance
 */
export class StrategyManager {
  private strategies: Map<string, {
    strategy: TradingStrategy | MomentumCrossoverStrategy | VolumeMACDStrategy | NeuralScalperStrategy | BollingerBounceStrategy | TrendFollowerStrategy;
    type: 'RSI_EMA' | 'MOMENTUM_CROSSOVER' | 'VOLUME_MACD' | 'NEURAL_SCALPER' | 'BOLLINGER_BOUNCE' | 'TREND_FOLLOWER';
    isActive: boolean;
  }>;
  private savingSignals: Set<string> = new Set(); // Verrou pour éviter les sauvegardes multiples

  constructor() {
    this.strategies = new Map();
    
    // Initialize default strategies (all OFF by default)
    this.addStrategy('RSI + EMA Strategy', new TradingStrategy(defaultStrategyConfig), 'RSI_EMA', false);
    this.addStrategy('Momentum Crossover', new MomentumCrossoverStrategy(momentumStrategyConfig), 'MOMENTUM_CROSSOVER', false);
    this.addStrategy('Volume Breakout', new VolumeMACDStrategy(volumeMACDStrategyConfig), 'VOLUME_MACD', false);
    this.addStrategy('Neural Scalper', new NeuralScalperStrategy(neuralScalperConfig), 'NEURAL_SCALPER', false);
    this.addStrategy('Bollinger Bounce', new BollingerBounceStrategy(defaultBollingerBounceConfig), 'BOLLINGER_BOUNCE', false);
    this.addStrategy('Trend Follower', new TrendFollowerStrategy(trendFollowerConfig), 'TREND_FOLLOWER', false);
    
    // Load strategy states from database
    this.loadFromDatabase();
  }

  /**
   * Load strategy states from database
   */
  private async loadFromDatabase(): Promise<void> {
    try {
      // Load strategy activation states
      const strategies = await StrategyRepository.getAllStrategies();
      strategies.forEach((dbStrategy: any) => {
        const strategyName = dbStrategy.name;
        const isActive = dbStrategy.is_active;
        
        if (this.strategies.has(strategyName)) {
          this.strategies.get(strategyName)!.isActive = isActive;
          console.log(`📊 Loaded strategy state: ${strategyName} = ${isActive ? 'ON' : 'OFF'}`);
        }
      });

      // Load trade history for each strategy
      for (const [strategyName, strategyData] of this.strategies) {
        try {
          const trades = await TradeRepository.getTradesByStrategy(strategyName, 100);
          if (trades.length > 0) {
            console.log(`📈 Loaded ${trades.length} signals for ${strategyName}`);
            // Restore strategy state from trades
            if ('restoreFromDatabase' in strategyData.strategy) {
              const restoreMethod = (strategyData.strategy as any).restoreFromDatabase;
              // Call with await if it returns a Promise
              const result = restoreMethod.call(strategyData.strategy, trades);
              if (result instanceof Promise) {
                await result;
              }
            }
          }
        } catch (error) {
          console.error(`❌ Error loading trades for ${strategyName}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error loading strategy states from database:', error);
    }
  }

  /**
   * Add a new strategy
   */
  addStrategy(
    name: string,
    strategy: TradingStrategy | MomentumCrossoverStrategy | VolumeMACDStrategy | NeuralScalperStrategy | BollingerBounceStrategy | TrendFollowerStrategy,
    type: 'RSI_EMA' | 'MOMENTUM_CROSSOVER' | 'VOLUME_MACD' | 'NEURAL_SCALPER' | 'BOLLINGER_BOUNCE' | 'TREND_FOLLOWER',
    isActive: boolean = true
  ): void {
    this.strategies.set(name, { strategy, type, isActive });
    console.log(`✅ Strategy "${name}" added (${type})`);
  }

  /**
   * Remove a strategy
   */
  removeStrategy(name: string): boolean {
    const removed = this.strategies.delete(name);
    if (removed) {
      console.log(`🗑️ Strategy "${name}" removed`);
    }
    return removed;
  }

  /**
   * Toggle strategy active state
   */
  toggleStrategy(name: string): boolean {
    const strategyData = this.strategies.get(name);
    if (strategyData) {
      strategyData.isActive = !strategyData.isActive;
      console.log(`🔄 Strategy "${name}" is now ${strategyData.isActive ? 'ACTIVE' : 'INACTIVE'}`);
      
      // Update status in database (async, non-blocking)
      StrategyRepository.updateStrategyStatus(name, strategyData.isActive).catch(err => {
        console.error(`Failed to update strategy status in DB:`, err);
      });
      
      return strategyData.isActive;
    }
    return false;
  }

  /**
   * Analyze market with all active strategies
   */
  async analyzeAllStrategies(candles: Candle[]): Promise<void> {
    for (const [name, strategyData] of this.strategies) {
      if (!strategyData.isActive) continue;

      const signal = strategyData.strategy.analyzeMarket(candles);
      if (signal && signal.type !== 'HOLD') {
        console.log(`[${name}] Signal: ${signal.type} at $${signal.price.toFixed(2)} | ${signal.reason}`);
        
        // Vérifier et sauvegarder AVANT d'exécuter le trade (pour ne pas modifier lastSignal)
        const isPositionSignal = signal.type === 'BUY' || signal.type === 'SELL' || 
                                 signal.type === 'CLOSE_LONG' || signal.type === 'CLOSE_SHORT';
        
        if (isPositionSignal) {
          // Récupérer le lastSignal AVANT executeTrade
          const positionInfo = strategyData.strategy.getPositionInfo();
          const lastSignal = positionInfo.lastSignal;
          
          // Duplicata = même type + même prix exact + moins de 2 secondes
          const isMemoryDuplicate = lastSignal && 
                                   lastSignal.type === signal.type && 
                                   Math.abs(lastSignal.price - signal.price) < 0.5 &&
                                   (signal.timestamp - lastSignal.timestamp) < 2000;
          
          if (!isMemoryDuplicate) {
            // Créer une clé unique (sans timestamp pour éviter les doublons à la milliseconde près)
            const signalKey = `${name}-${signal.type}-${signal.price.toFixed(2)}`;
            
            // Vérifier si ce signal est déjà en cours de sauvegarde (ATOMIC CHECK + ADD)
            if (this.savingSignals.has(signalKey)) {
              console.log(`⏭️  Signal already being saved: ${signal.type} @ ${signal.price.toFixed(2)}`);
              return; // Skip immediately
            }
            
            // Marquer comme en cours de sauvegarde AVANT l'await (synchrone, donc atomic)
            this.savingSignals.add(signalKey);
            console.log(`💾 Saving ${signal.type} signal to DB: ${signal.type} @ ${signal.price.toFixed(2)}`);
            
            try {
              // Attendre que la sauvegarde soit terminée avant d'exécuter le trade
              await TradeRepository.saveTrade(name, strategyData.type, signal);
              
              // Exécuter le trade SEULEMENT après la sauvegarde
              strategyData.strategy.executeTrade(signal);
            } catch (err) {
              console.error(`Failed to save trade for ${name}:`, err);
            } finally {
              // Retirer du verrou après un délai plus long (5 secondes)
              setTimeout(() => this.savingSignals.delete(signalKey), 5000);
            }
          } else {
            console.log(`⏭️  Skipping duplicate: ${signal.type} @ ${signal.price.toFixed(2)} (saved ${((signal.timestamp - lastSignal.timestamp) / 1000).toFixed(1)}s ago)`);
            // Ne pas exécuter executeTrade pour les duplicatas
          }
        } else {
          // Pour les autres types de signaux, exécuter normalement
          strategyData.strategy.executeTrade(signal);
        }
      }
    }
  }

  /**
   * Get performance of all strategies
   */
  getAllPerformances(): StrategyPerformance[] {
    const performances: StrategyPerformance[] = [];

    this.strategies.forEach((strategyData, name) => {
      const positionInfo = strategyData.strategy.getPositionInfo();
      const winRate = positionInfo.totalTrades > 0 
        ? (positionInfo.winningTrades / positionInfo.totalTrades) * 100 
        : 0;

      performances.push({
        strategyName: name,
        strategyType: strategyData.type,
        totalPnL: positionInfo.totalPnL,
        totalTrades: positionInfo.totalTrades,
        winningTrades: positionInfo.winningTrades,
        winRate,
        currentPosition: positionInfo.position,
        lastSignal: positionInfo.lastSignal || null,
        signalHistory: positionInfo.signalHistory || [],
        completedTrades: 'completedTrades' in positionInfo ? (positionInfo as any).completedTrades : undefined,
        isActive: strategyData.isActive,
        currentCapital: positionInfo.currentCapital || 100000,
        // Include strategy-specific flags
        isBullishCrossover: 'isBullishCrossover' in positionInfo ? (positionInfo as any).isBullishCrossover : undefined,
        isBearishCrossover: 'isBearishCrossover' in positionInfo ? (positionInfo as any).isBearishCrossover : undefined,
        isVolumeBreakout: 'isVolumeBreakout' in positionInfo ? (positionInfo as any).isVolumeBreakout : undefined,
        isMACDBullish: 'isMACDBullish' in positionInfo ? (positionInfo as any).isMACDBullish : undefined,
        isMACDBearish: 'isMACDBearish' in positionInfo ? (positionInfo as any).isMACDBearish : undefined,
        isPriceAccelerating: 'isPriceAccelerating' in positionInfo ? (positionInfo as any).isPriceAccelerating : undefined,
        isVolatilityHigh: 'isVolatilityHigh' in positionInfo ? (positionInfo as any).isVolatilityHigh : undefined,
        isMomentumStrong: 'isMomentumStrong' in positionInfo ? (positionInfo as any).isMomentumStrong : undefined
      });
    });

    return performances;
  }

  /**
   * Get best performing strategy
   */
  getBestStrategy(): { name: string; performance: StrategyPerformance } | null {
    const performances = this.getAllPerformances();
    if (performances.length === 0) return null;

    let best = performances[0];
    let bestName = Array.from(this.strategies.keys())[0];

    performances.forEach((perf, index) => {
      if (perf.totalPnL > best.totalPnL) {
        best = perf;
        bestName = Array.from(this.strategies.keys())[index];
      }
    });

    return { name: bestName, performance: best };
  }

  /**
   * Get strategy by name
   */
  getStrategy(name: string): TradingStrategy | MomentumCrossoverStrategy | VolumeMACDStrategy | NeuralScalperStrategy | BollingerBounceStrategy | TrendFollowerStrategy | undefined {
    return this.strategies.get(name)?.strategy;
  }

  /**
   * Get all strategy names
   */
  getStrategyNames(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Clear all strategies
   */
  clearAll(): void {
    this.strategies.clear();
    console.log('🗑️ All strategies cleared');
  }

  /**
   * Reset a specific strategy (clear its state and database records)
   */
  async resetStrategy(name: string): Promise<boolean> {
    const strategyData = this.strategies.get(name);
    if (!strategyData) {
      console.error(`Strategy "${name}" not found`);
      return false;
    }

    try {
      // Delete all signals from database
      await TradeRepository.deleteStrategyTrades(name);
      
      // Delete all completed trades from database
      const { CompletedTradeRepository } = await import('./db/completed-trade-repository');
      await CompletedTradeRepository.deleteStrategyCompletedTrades(name);
      
      // Reset strategy state by removing and re-adding it
      const strategyType = strategyData.type;
      const strategy = strategyData.strategy;
      
      // Remove old strategy
      this.strategies.delete(name);
      
      // Re-add fresh strategy based on type
      if (strategyType === 'RSI_EMA') {
        const { TradingStrategy, defaultStrategyConfig } = await import('./ema-rsi-strategy');
        this.addStrategy(name, new TradingStrategy(defaultStrategyConfig), 'RSI_EMA', false);
      } else if (strategyType === 'MOMENTUM_CROSSOVER') {
        const { MomentumCrossoverStrategy, momentumStrategyConfig } = await import('./momentum-strategy');
        this.addStrategy(name, new MomentumCrossoverStrategy(momentumStrategyConfig), 'MOMENTUM_CROSSOVER', false);
      } else if (strategyType === 'VOLUME_MACD') {
        const { VolumeMACDStrategy, volumeMACDStrategyConfig } = await import('./volume-macd-strategy');
        this.addStrategy(name, new VolumeMACDStrategy(volumeMACDStrategyConfig), 'VOLUME_MACD', false);
      } else if (strategyType === 'NEURAL_SCALPER') {
        const { NeuralScalperStrategy, neuralScalperConfig } = await import('./neural-scalper-strategy');
        this.addStrategy(name, new NeuralScalperStrategy(neuralScalperConfig), 'NEURAL_SCALPER', false);
      } else if (strategyType === 'BOLLINGER_BOUNCE') {
        const { BollingerBounceStrategy, defaultBollingerBounceConfig } = await import('./bollinger-bounce-strategy');
        this.addStrategy(name, new BollingerBounceStrategy(defaultBollingerBounceConfig), 'BOLLINGER_BOUNCE', false);
      } else if (strategyType === 'TREND_FOLLOWER') {
        const { TrendFollowerStrategy, trendFollowerConfig } = await import('./trend-follower-strategy');
        this.addStrategy(name, new TrendFollowerStrategy(trendFollowerConfig), 'TREND_FOLLOWER', false);
      }
      
      console.log(`✅ Strategy "${name}" has been reset to initial state`);
      return true;
    } catch (error) {
      console.error(`❌ Error resetting strategy "${name}":`, error);
      return false;
    }
  }
}

