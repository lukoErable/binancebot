import { Candle, StrategyPerformance } from '@/types/trading';
import { AtrTrendPullbackStrategy, atrPullbackDefaultConfig } from './atr-pullback-strategy';
import { BollingerBounceStrategy, defaultBollingerBounceConfig } from './bollinger-bounce-strategy';
import { CustomStrategy } from './custom-strategy';
import CustomStrategyRepository from './db/custom-strategy-repository';
import StrategyRepository from './db/strategy-repository';
import TradeRepository from './db/trade-repository';
import { TradingStrategy, defaultStrategyConfig } from './ema-rsi-strategy';
import { MomentumCrossoverStrategy, momentumStrategyConfig } from './momentum-strategy';
import { TrendFollowerStrategy, trendFollowerConfig } from './trend-follower-strategy';
import { VolumeMACDStrategy, volumeMACDStrategyConfig } from './volume-macd-strategy';

/**
 * Strategy Manager
 * Manages multiple trading strategies simultaneously and tracks their performance
 */
export class StrategyManager {
  private strategies: Map<string, {
    strategy: TradingStrategy | MomentumCrossoverStrategy | VolumeMACDStrategy | BollingerBounceStrategy | TrendFollowerStrategy | AtrTrendPullbackStrategy | CustomStrategy;
    type: 'RSI_EMA' | 'MOMENTUM_CROSSOVER' | 'VOLUME_MACD' | 'BOLLINGER_BOUNCE' | 'TREND_FOLLOWER' | 'ATR_PULLBACK' | 'CUSTOM';
    isActive: boolean;
  }>;
  private savingSignals: Set<string> = new Set(); // Verrou pour éviter les sauvegardes multiples

  constructor() {
    this.strategies = new Map();
    
    // Initialize default strategies (all OFF by default)
    this.addStrategy('RSI + EMA Strategy', new TradingStrategy(defaultStrategyConfig), 'RSI_EMA', false);
    this.addStrategy('Momentum Crossover', new MomentumCrossoverStrategy(momentumStrategyConfig), 'MOMENTUM_CROSSOVER', false);
    this.addStrategy('Volume Breakout', new VolumeMACDStrategy(volumeMACDStrategyConfig), 'VOLUME_MACD', false);
    this.addStrategy('Bollinger Bounce', new BollingerBounceStrategy(defaultBollingerBounceConfig), 'BOLLINGER_BOUNCE', false);
    this.addStrategy('Trend Follower', new TrendFollowerStrategy(trendFollowerConfig, 'Trend Follower'), 'TREND_FOLLOWER', false);
    this.addStrategy('ATR Trend Pullback', new AtrTrendPullbackStrategy(atrPullbackDefaultConfig), 'ATR_PULLBACK', false);
    
    // Load strategy states from database
    this.loadFromDatabase();

    // Best effort: ensure ATR strategy exists in DB
    StrategyRepository.ensureStrategyExists(
      'ATR Trend Pullback',
      'ATR_PULLBACK',
      false,
      { profitTargetPercent: atrPullbackDefaultConfig.profitTargetPercent, stopLossPercent: atrPullbackDefaultConfig.stopLossPercent, maxPositionTime: Math.floor(atrPullbackDefaultConfig.maxPositionTime / (60 * 1000)) }
    ).catch(() => {});

    // Load custom strategies from database
    this.loadCustomStrategies();
  }

  /**
   * Load strategy states from database
   */
  private async loadFromDatabase(): Promise<void> {
    try {
      // Load strategy activation states and configs
      const strategies = await StrategyRepository.getAllStrategies();
      strategies.forEach((dbStrategy: any) => {
        const strategyName = dbStrategy.name;
        const isActive = dbStrategy.is_active;
        const config = dbStrategy.config || {};
        
        if (this.strategies.has(strategyName)) {
          const strategyData = this.strategies.get(strategyName)!;
          strategyData.isActive = isActive;
          
          // Apply config if available
          if (config.profitTargetPercent !== undefined || config.stopLossPercent !== undefined || config.maxPositionTime !== undefined) {
            const strategy = strategyData.strategy as any;
            if (strategy.config) {
              if (config.profitTargetPercent !== undefined) {
                strategy.config.profitTargetPercent = config.profitTargetPercent;
              }
              if (config.stopLossPercent !== undefined) {
                strategy.config.stopLossPercent = config.stopLossPercent;
              }
              if (config.maxPositionTime !== undefined) {
                // Convert minutes to milliseconds for strategy config
                strategy.config.maxPositionTime = config.maxPositionTime * 60 * 1000;
              }
              console.log(`⚙️ Loaded custom config for ${strategyName}:`, {
                TP: config.profitTargetPercent,
                SL: config.stopLossPercent,
                MaxPosMin: config.maxPositionTime,
                MaxPosMs: config.maxPositionTime ? config.maxPositionTime * 60 * 1000 : undefined
              });
            }
          }
          
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
   * Load custom strategies from database
   */
  private async loadCustomStrategies(): Promise<void> {
    try {
      const customConfigs = await CustomStrategyRepository.getAllCustomStrategies();
      
      for (const config of customConfigs) {
        console.log(`📦 Loading custom strategy: ${config.name}`);
        const strategy = new CustomStrategy(config);
        // Use isActive from DB, default to true if not specified
        const isActive = config.isActive !== undefined ? config.isActive : true;
        this.addStrategy(config.name, strategy, 'CUSTOM' as any, isActive);
        
        // Load trade history for custom strategy
        try {
          const trades = await TradeRepository.getTradesByStrategy(config.name, 100);
          if (trades.length > 0 && 'restoreFromDatabase' in strategy) {
            console.log(`📈 Loaded ${trades.length} signals for custom strategy ${config.name}`);
            await (strategy as any).restoreFromDatabase(trades);
          }
        } catch (error) {
          console.error(`❌ Error loading trades for custom strategy ${config.name}:`, error);
        }
      }
      
      console.log(`✅ Loaded ${customConfigs.length} custom strategies`);
    } catch (error) {
      console.error('❌ Error loading custom strategies:', error);
    }
  }

  /**
   * Add a new strategy
   */
  addStrategy(
    name: string,
    strategy: TradingStrategy | MomentumCrossoverStrategy | VolumeMACDStrategy | BollingerBounceStrategy | TrendFollowerStrategy | AtrTrendPullbackStrategy | CustomStrategy,
    type: 'RSI_EMA' | 'MOMENTUM_CROSSOVER' | 'VOLUME_MACD' | 'BOLLINGER_BOUNCE' | 'TREND_FOLLOWER' | 'ATR_PULLBACK' | 'CUSTOM',
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
   * Update strategy configuration (TP, SL, Max Position Time)
   */
  updateStrategyConfig(
    name: string,
    config: {
      profitTarget?: number | null;
      stopLoss?: number | null;
      maxPositionTime?: number | null;
    }
  ): boolean {
    const strategyData = this.strategies.get(name);
    if (strategyData) {
      const strategy = strategyData.strategy as any;
      if (strategy.config) {
        // null = désactivé, on garde l'ancienne valeur mais on pourrait aussi mettre Infinity
        if (config.profitTarget !== undefined && config.profitTarget !== null) {
          strategy.config.profitTargetPercent = config.profitTarget;
        }
        if (config.stopLoss !== undefined && config.stopLoss !== null) {
          strategy.config.stopLossPercent = config.stopLoss;
        }
        if (config.maxPositionTime !== undefined && config.maxPositionTime !== null) {
          // Convert minutes to milliseconds for strategy config
          strategy.config.maxPositionTime = config.maxPositionTime * 60 * 1000;
        }
        
        console.log(`⚙️ Updated config for "${name}":`, {
          TP: config.profitTarget,
          SL: config.stopLoss,
          MaxPosMin: config.maxPositionTime,
          MaxPosMs: config.maxPositionTime ? config.maxPositionTime * 60 * 1000 : null
        });
        
        // If there's an active position, log that new params will be applied
        const positionInfo = strategy.getPositionInfo();
        if (positionInfo.position && positionInfo.position.type !== 'NONE') {
          console.log(`🔄 Active ${positionInfo.position.type} position detected - New TP/SL will be applied on next price update`);
          console.log(`   Entry: $${positionInfo.position.entryPrice.toFixed(2)}`);
          console.log(`   Current P&L: ${positionInfo.position.unrealizedPnLPercent?.toFixed(2)}%`);
          console.log(`   New TP: ${config.profitTarget}% | New SL: -${config.stopLoss}%`);
        }
        
        return true;
      }
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
          const currentPosition = positionInfo.position;
          
          // Duplicata = même type + même prix exact + moins de 2 secondes
          const isMemoryDuplicate = lastSignal && 
                                   lastSignal.type === signal.type && 
                                   Math.abs(lastSignal.price - signal.price) < 0.5 &&
                                   (signal.timestamp - lastSignal.timestamp) < 2000;
          
          // Check si on essaie d'ouvrir une position alors qu'on en a déjà une
          const isEntrySignal = signal.type === 'BUY' || signal.type === 'SELL';
          const hasPosition = currentPosition && currentPosition.type !== 'NONE';
          const isDuplicateEntry = isEntrySignal && hasPosition && 
                                   ((signal.type === 'BUY' && currentPosition.type === 'LONG') ||
                                    (signal.type === 'SELL' && currentPosition.type === 'SHORT'));
          
          if (isDuplicateEntry) {
            console.log(`⏭️  Already in ${currentPosition.type} position, skipping ${signal.type} @ ${signal.price.toFixed(2)}`);
            continue;
          }
          
          if (!isMemoryDuplicate) {
            // Créer une clé unique (sans timestamp pour éviter les doublons à la milliseconde près)
            const signalKey = `${name}-${signal.type}-${signal.price.toFixed(2)}`;
            
            // Vérifier si ce signal est déjà en cours de sauvegarde (ATOMIC CHECK + ADD)
            if (this.savingSignals.has(signalKey)) {
              console.log(`⏭️  Signal already being saved: ${signal.type} @ ${signal.price.toFixed(2)}`);
              continue; // Skip to next strategy (not return)
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
              // Remove from saving set if save failed
              this.savingSignals.delete(signalKey);
              continue; // Skip to next strategy
            } finally {
              // Retirer du verrou après un délai plus long (10 secondes pour les scalping strategies)
              setTimeout(() => this.savingSignals.delete(signalKey), 10000);
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
   * Update all strategies with current market price for real-time P&L calculation
   */
  updateAllStrategiesWithCurrentPrice(currentPrice: number): void {
    this.strategies.forEach((strategyData) => {
      if (strategyData.isActive && 'updatePositionWithCurrentPrice' in strategyData.strategy) {
        (strategyData.strategy as any).updatePositionWithCurrentPrice(currentPrice);
      }
    });
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

      // Extract config from strategy
      const strategy = strategyData.strategy as any;
      const strategyConfig = strategy.config ? {
        profitTargetPercent: strategy.config.profitTargetPercent,
        stopLossPercent: strategy.config.stopLossPercent,
        // Convert milliseconds back to minutes for display
        maxPositionTime: strategy.config.maxPositionTime ? strategy.config.maxPositionTime / (60 * 1000) : undefined
      } : undefined;

      // For CUSTOM strategies, include the full config for UI display
      const customConfig = strategyData.type === 'CUSTOM' && strategy.config ? strategy.config : undefined;

      performances.push({
        strategyName: name,
        strategyType: strategyData.type as 'RSI_EMA' | 'MOMENTUM_CROSSOVER' | 'VOLUME_MACD' | 'BOLLINGER_BOUNCE' | 'TREND_FOLLOWER' | 'ATR_PULLBACK' | 'CUSTOM',
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
        config: strategyConfig,
        customConfig: customConfig, // Full custom strategy config
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
  getStrategy(name: string): TradingStrategy | MomentumCrossoverStrategy | VolumeMACDStrategy | BollingerBounceStrategy | TrendFollowerStrategy | AtrTrendPullbackStrategy | CustomStrategy | undefined {
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
      
      // Delete open position from database
      const { default: OpenPositionRepository } = await import('./db/open-position-repository');
      await OpenPositionRepository.deleteOpenPosition(name);
      
      // Reset strategy state by removing and re-adding it
      const strategyType = strategyData.type;
      const strategy = strategyData.strategy;
      const wasActive = strategyData.isActive; // Conserver l'état actif
      
      // Remove old strategy
      this.strategies.delete(name);
      
      // Re-add fresh strategy based on type (keep active state)
      if (strategyType === 'RSI_EMA') {
        const { TradingStrategy, defaultStrategyConfig } = await import('./ema-rsi-strategy');
        this.addStrategy(name, new TradingStrategy(defaultStrategyConfig), 'RSI_EMA', wasActive);
      } else if (strategyType === 'MOMENTUM_CROSSOVER') {
        const { MomentumCrossoverStrategy, momentumStrategyConfig } = await import('./momentum-strategy');
        this.addStrategy(name, new MomentumCrossoverStrategy(momentumStrategyConfig), 'MOMENTUM_CROSSOVER', wasActive);
      } else if (strategyType === 'VOLUME_MACD') {
        const { VolumeMACDStrategy, volumeMACDStrategyConfig } = await import('./volume-macd-strategy');
        this.addStrategy(name, new VolumeMACDStrategy(volumeMACDStrategyConfig), 'VOLUME_MACD', wasActive);
      } else if (strategyType === 'BOLLINGER_BOUNCE') {
        const { BollingerBounceStrategy, defaultBollingerBounceConfig } = await import('./bollinger-bounce-strategy');
        this.addStrategy(name, new BollingerBounceStrategy(defaultBollingerBounceConfig), 'BOLLINGER_BOUNCE', wasActive);
      } else if (strategyType === 'TREND_FOLLOWER') {
        const { TrendFollowerStrategy, trendFollowerConfig } = await import('./trend-follower-strategy');
        this.addStrategy(name, new TrendFollowerStrategy(trendFollowerConfig, name), 'TREND_FOLLOWER', wasActive);
      } else if (strategyType === 'ATR_PULLBACK') {
        const { AtrTrendPullbackStrategy, atrPullbackDefaultConfig } = await import('./atr-pullback-strategy');
        this.addStrategy(name, new AtrTrendPullbackStrategy(atrPullbackDefaultConfig), 'ATR_PULLBACK', wasActive);
      } else if (strategyType === 'CUSTOM') {
        // For CUSTOM strategies, reload from database
        const { CustomStrategyRepository } = await import('./db/custom-strategy-repository');
        const customConfig = await CustomStrategyRepository.loadCustomStrategy(name);
        if (customConfig) {
          const { CustomStrategy } = await import('./custom-strategy');
          this.addStrategy(name, new CustomStrategy(customConfig), 'CUSTOM', wasActive);
        }
      }
      
      console.log(`✅ Strategy "${name}" has been reset to initial state`);
      return true;
    } catch (error) {
      console.error(`❌ Error resetting strategy "${name}":`, error);
      return false;
    }
  }
}

