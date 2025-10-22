import { Candle, StrategyPerformance } from '@/types/trading';
import { CustomStrategy } from './custom-strategy';
import CustomStrategyRepository from './db/custom-strategy-repository';
import StrategyRepository from './db/strategy-repository';

// Global singleton instance - created ONCE at server startup
let globalStrategyManagerInstance: StrategyManager | null = null;

/**
 * Strategy Manager - Multi-Timeframe Support
 * Simple singleton pattern - one instance for all timeframes
 * Key format: "strategyName:timeframe" (e.g., "RSI Strategy:1m", "RSI Strategy:5m")
 */
export class StrategyManager {
  private strategies: Map<string, {
    strategy: CustomStrategy;
    type: 'CUSTOM';
    isActive: boolean;
    timeframe: string; // '1m', '5m', '15m', '1h', '4h', '1d'
    userEmail: string; // User email
    activatedAt?: number | null;
    totalActiveTime?: number;
  }>;

  constructor() {
    this.strategies = new Map();
    
    // Store as global singleton
    if (!globalStrategyManagerInstance) {
      globalStrategyManagerInstance = this;
      console.log('🚀 StrategyManager: Created singleton instance');
      
      // Load custom strategies from database FIRST
      this.loadCustomStrategies().then(() => {
        // Then load strategy states (is_active, activated_at, configs)
        this.loadFromDatabase();
      });
    }
  }
  
  /**
   * Get the global singleton instance (simple getter)
   */
  static getGlobalInstance(): StrategyManager | null {
    return globalStrategyManagerInstance;
  }
  
  /**
   * Force reload of all data (call after reset)
   */
  async reloadAllData(): Promise<void> {
    console.log('🔄 Reloading all strategy data...');
    this.strategies.clear();
    await this.loadCustomStrategies();
    await this.loadFromDatabase();
    console.log('✅ Strategy data reloaded');
  }

  /**
   * Add a new strategy without reloading everything (OPTIMIZED)
   */
  async addNewStrategy(config: CustomStrategyConfig, timeframes: string[] = ['1m']): Promise<void> {
    console.log(`➕ Adding new strategy: ${config.name} on ${timeframes.join(', ')}`);
    
    // Create strategy instance
    const strategy = new CustomStrategy(config);
    
    // Add to each timeframe
    for (const timeframe of timeframes) {
      const key = this.getStrategyKey(config.name, timeframe);
      
      this.strategies.set(key, {
        strategy,
        type: 'CUSTOM',
        isActive: false, // Start inactive
        timeframe,
        userEmail: (config as any).userEmail || 'system@trading.bot',
        activatedAt: null,
        totalActiveTime: 0
      });
      
      console.log(`✅ Added ${config.name} [${timeframe}] (no full reload needed)`);
    }
    
    // Clear cache to force refresh on next getAllStrategies()
    StrategyRepository.clearCache();
    CustomStrategyRepository.clearCache();
    
    console.log(`✅ Strategy "${config.name}" added to ${timeframes.length} timeframe(s) instantly`);
  }

  /**
   * Helper: Generate strategy key for Map storage
   */
  private getStrategyKey(name: string, timeframe: string): string {
    return `${name}:${timeframe}`;
  }

  /**
   * Helper: Parse strategy key back to name and timeframe
   */
  private parseStrategyKey(key: string): { name: string; timeframe: string } {
    const [name, timeframe] = key.split(':');
    return { name, timeframe: timeframe || '1m' };
  }

  /**
   * Load strategy states from database
   * Each timeframe is INDEPENDENT (no shared timers)
   */
  private async loadFromDatabase(): Promise<void> {
    try {
      // Load strategy activation states and configs (per timeframe, independent)
      // Pass null to get ALL users' strategies (for daemon)
      const strategies = await StrategyRepository.getAllStrategies(true, null);
      strategies.forEach((dbStrategy: any) => {
        const strategyName = dbStrategy.name;
        const timeframe = dbStrategy.timeframe || '1m';
        const key = this.getStrategyKey(strategyName, timeframe);
        const isActive = dbStrategy.is_active;
        const config = dbStrategy.config || {};
        const userEmail = dbStrategy.user_email || 'system@trading.bot';
        
        if (this.strategies.has(key)) {
          const strategyData = this.strategies.get(key)!;
          strategyData.isActive = isActive;
          strategyData.userEmail = userEmail;
          
          // Use LOCAL state for timer (independent per timeframe)
          strategyData.totalActiveTime = dbStrategy.total_active_time || 0;
          const activatedAtDb = dbStrategy.activated_at;
          
          if (isActive && activatedAtDb) {
            // Checkpoint logic for server restart
            const oldActivatedAt = new Date(activatedAtDb).getTime();
            const elapsedBeforeRestart = Math.floor((Date.now() - oldActivatedAt) / 1000);
            
            if (elapsedBeforeRestart < 600) {
              strategyData.totalActiveTime = (strategyData.totalActiveTime || 0) + elapsedBeforeRestart;
              console.log(`⏱️ Checkpoint: Added ${elapsedBeforeRestart}s to "${strategyName}" [${timeframe}]`);
            }
            
            strategyData.activatedAt = Date.now();
          } else if (isActive) {
            strategyData.activatedAt = Date.now();
          } else {
            strategyData.activatedAt = null;
          }
          
          // Apply config if available (TP/SL/MaxPos/Cooldown)
          const strategy = strategyData.strategy as any;
          if (strategy.config) {
            if (config.profitTargetPercent !== undefined) {
              strategy.config.profitTargetPercent = config.profitTargetPercent;
            }
            if (config.stopLossPercent !== undefined) {
              strategy.config.stopLossPercent = config.stopLossPercent;
            }
            if (config.maxPositionTime !== undefined) {
              strategy.config.maxPositionTime = config.maxPositionTime * 60 * 1000;
            }
            if (config.cooldownPeriod !== undefined) {
              strategy.config.cooldownPeriod = config.cooldownPeriod;
            }
          }
          
          const totalMinutes = Math.floor((strategyData.totalActiveTime || 0) / 60);
          const currentMinutes = strategyData.activatedAt ? Math.floor((Date.now() - strategyData.activatedAt) / 60000) : 0;
          console.log(`📊 Loaded strategy state: ${strategyName} [${timeframe}] = ${isActive ? 'ON' : 'OFF'} (independent timer: ${totalMinutes}m${currentMinutes > 0 ? ' + current: ' + currentMinutes + 'm' : ''})`);
        }
      });

      // OPTIMIZATION: Load ALL trades and positions in TWO queries (instead of 21+21)
      console.log('📊 Loading ALL trades in single query (optimization)...');
      const { CompletedTradeRepository } = await import('./db/completed-trade-repository');
      const { default: OpenPositionRepository } = await import('./db/open-position-repository');
      
      // Load all data in parallel
      const [allTrades, allPositions] = await Promise.all([
        CompletedTradeRepository.getAllCompletedTrades(0), // 0 = no limit
        OpenPositionRepository.getAllOpenPositions()
      ]);
      
      console.log(`✅ Loaded ${allTrades.length} total trades and ${allPositions.size} open positions`);
      
      // Group trades by strategy name
      const tradesByStrategy = new Map<string, any[]>();
      allTrades.forEach(trade => {
        if (!tradesByStrategy.has(trade.strategyName)) {
          tradesByStrategy.set(trade.strategyName, []);
        }
        tradesByStrategy.get(trade.strategyName)!.push(trade);
      });
      
      // Restore completed trades and open positions for all strategies
      for (const [key, strategyData] of this.strategies) {
        const { name } = this.parseStrategyKey(key);
        try {
          // Get pre-loaded data
          const strategyTrades = tradesByStrategy.get(name) || [];
          const positionKey = key; // "strategyName:timeframe"
          const openPosition = allPositions.get(positionKey);
          
          // Restore with pre-loaded data
          if ('restoreFromDatabaseWithTrades' in strategyData.strategy) {
            await (strategyData.strategy as any).restoreFromDatabaseWithTrades(strategyTrades, openPosition);
          }
        } catch (error) {
          console.error(`❌ Error restoring ${name} [${strategyData.timeframe}]:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error loading strategy states from database:', error);
    }
  }

  /**
   * Load custom strategies from database
   * Each timeframe is INDEPENDENT (no shared timers)
   */
  private async loadCustomStrategies(): Promise<void> {
    try {
      // Pass null to get ALL users' custom strategies (for daemon)
      const customConfigs = await CustomStrategyRepository.getAllCustomStrategies(true, null);
      
      // Get activated_at and total_active_time from strategies table (per timeframe)
      const strategiesData = await StrategyRepository.getAllStrategies(true, null);
      const activatedAtMap = new Map<string, number | null>();
      const totalActiveTimeMap = new Map<string, number>();
      const userEmailMap = new Map<string, string>();
      
      strategiesData.forEach((dbStrategy: any) => {
        const key = this.getStrategyKey(dbStrategy.name, dbStrategy.timeframe || '1m');
        if (dbStrategy.activated_at) {
          activatedAtMap.set(key, new Date(dbStrategy.activated_at).getTime());
        } else {
          activatedAtMap.set(key, null);
        }
        totalActiveTimeMap.set(key, dbStrategy.total_active_time || 0);
        userEmailMap.set(key, dbStrategy.user_email || 'system@trading.bot');
      });
      
      for (const config of customConfigs) {
        const timeframe = config.timeframe || '1m';
        const key = this.getStrategyKey(config.name, timeframe);
        console.log(`📦 Loading custom strategy: ${config.name} [${timeframe}]`);
        const strategy = new CustomStrategy(config);
        const isActive = config.isActive !== undefined ? config.isActive : true;
        
        // Use LOCAL state for timer (independent per timeframe)
        const totalActiveTime = totalActiveTimeMap.get(key) || 0;
        const activatedAt = isActive ? Date.now() : null;
        const userEmail = userEmailMap.get(key) || 'system@trading.bot';
        
        this.strategies.set(key, {
          strategy,
          type: 'CUSTOM',
          isActive,
          timeframe,
          userEmail,
          activatedAt,
          totalActiveTime
        });
        
        // Update database to reset activatedAt for active strategies
        if (isActive) {
          StrategyRepository.updateStrategyStatusWithTime(
            config.name,
            true,
            activatedAt,
            totalActiveTime,
            timeframe
          ).catch(err => console.error('Failed to update activatedAt on load:', err));
        }
        
        console.log(`✅ Added custom strategy: ${config.name} [${timeframe}] (${isActive ? 'ACTIVE' : 'INACTIVE'}) - Independent timer: ${Math.floor(totalActiveTime / 60)}m${isActive ? ' (session restarted)' : ''}`);
      }
      
      console.log(`✅ Loaded ${customConfigs.length} custom strategies`);
    } catch (error) {
      console.error('❌ Error loading custom strategies:', error);
    }
  }

  /**
   * Add a new strategy for a specific timeframe
   */
  addStrategy(
    name: string,
    strategy: CustomStrategy,
    type: 'CUSTOM',
    timeframe: string = '1m',
    isActive: boolean = true
  ): void {
    const key = this.getStrategyKey(name, timeframe);
    this.strategies.set(key, { strategy, type, isActive, timeframe });
    console.log(`✅ Strategy "${name}" [${timeframe}] added (${type})`);
  }

  /**
   * Remove a strategy from a specific timeframe
   */
  removeStrategy(name: string, timeframe: string = '1m'): boolean {
    const key = this.getStrategyKey(name, timeframe);
    const removed = this.strategies.delete(key);
    if (removed) {
      console.log(`🗑️ Strategy "${name}" [${timeframe}] removed`);
    }
    return removed;
  }

  /**
   * Toggle strategy active state for a specific timeframe
   * Each timeframe is now INDEPENDENT (no shared timer)
   */
  async toggleStrategy(name: string, timeframe: string = '1m'): Promise<boolean> {
    const key = this.getStrategyKey(name, timeframe);
    const strategyData = this.strategies.get(key);
    if (!strategyData) return false;

    const wasActive = strategyData.isActive;
    const newState = !strategyData.isActive;
    
    // Get current time for THIS timeframe only (independent)
    let localTotalTime = strategyData.totalActiveTime || 0;
    let localActivatedAt = strategyData.activatedAt || null;
    
    if (newState) {
      // Activating: Start timer for THIS timeframe
      localActivatedAt = Date.now();
      strategyData.activatedAt = localActivatedAt;
      strategyData.isActive = true;
      console.log(`🔄 Strategy "${name}" [${timeframe}] ACTIVATED (independent timer: ${Math.floor(localTotalTime / 60)}m)`);
    } else {
      // Deactivating: Add elapsed time to THIS timeframe's total
      if (localActivatedAt) {
        const elapsedSeconds = Math.floor((Date.now() - localActivatedAt) / 1000);
        localTotalTime = localTotalTime + elapsedSeconds;
        console.log(`⏸️ Strategy "${name}" [${timeframe}] PAUSED (session: ${elapsedSeconds}s, total: ${localTotalTime}s)`);
      }
      localActivatedAt = null;
      strategyData.activatedAt = null;
      strategyData.isActive = false;
    }
    
    // Update local time for THIS timeframe only
    strategyData.totalActiveTime = localTotalTime;
    
    // Save to database (per-timeframe, independent)
    await StrategyRepository.updateStrategyStatusWithTime(
      name,
      newState,
      localActivatedAt,
      localTotalTime,
      timeframe
    );
    
    return newState;
  }

  /**
   * Synchronous version for backward compatibility
   */
  toggleStrategySync(name: string, timeframe: string = '1m'): boolean {
    this.toggleStrategy(name, timeframe).catch(err => {
      console.error('Error toggling strategy:', err);
    });
    
    const key = this.getStrategyKey(name, timeframe);
    const strategyData = this.strategies.get(key);
    return strategyData?.isActive || false;
  }

  /**
   * Update strategy configuration for a specific timeframe
   */
  updateStrategyConfig(
    name: string,
    config: {
      profitTarget?: number | null;
      stopLoss?: number | null;
      maxPositionTime?: number | null;
      cooldownPeriod?: number | null;
    },
    timeframe: string = '1m'
  ): boolean {
    const key = this.getStrategyKey(name, timeframe);
    const strategyData = this.strategies.get(key);
    if (strategyData) {
      const strategy = strategyData.strategy as any;
      if (strategy.config) {
        if (config.profitTarget !== undefined && config.profitTarget !== null) {
          strategy.config.profitTargetPercent = config.profitTarget;
        }
        if (config.stopLoss !== undefined && config.stopLoss !== null) {
          strategy.config.stopLossPercent = config.stopLoss;
        }
        if (config.maxPositionTime !== undefined && config.maxPositionTime !== null) {
          strategy.config.maxPositionTime = config.maxPositionTime * 60 * 1000;
        }
        // Handle cooldownPeriod: null = disabled (0), otherwise use the value
        if (config.cooldownPeriod !== undefined) {
          strategy.config.cooldownPeriod = config.cooldownPeriod === null ? 0 : config.cooldownPeriod;
        }
        
        console.log(`⚙️ Updated config for "${name}" [${timeframe}]:`, {
          TP: config.profitTarget,
          SL: config.stopLoss,
          MaxPosMin: config.maxPositionTime,
          MaxPosMs: config.maxPositionTime ? config.maxPositionTime * 60 * 1000 : null,
          CooldownMs: config.cooldownPeriod
        });
        
        // If there's an active position, log that new params will be applied
        const positionInfo = strategy.getPositionInfo();
        if (positionInfo.position && positionInfo.position.type !== 'NONE') {
          console.log(`🔄 Active ${positionInfo.position.type} position detected - New TP/SL will be applied on next price update`);
        }
        
        return true;
      }
    }
    return false;
  }

  /**
   * Analyze market with all active strategies for a specific timeframe
   */
  async analyzeStrategiesForTimeframe(candles: Candle[], timeframe: string = '1m'): Promise<void> {
    for (const [key, strategyData] of this.strategies) {
      // Only analyze strategies for this timeframe
      if (strategyData.timeframe !== timeframe) continue;
      if (!strategyData.isActive) continue;

      const { name } = this.parseStrategyKey(key);
      const signal = strategyData.strategy.analyzeMarket(candles);
      if (signal && signal.type !== 'HOLD') {
        console.log(`[${name}] [${timeframe}] Signal: ${signal.type} at $${signal.price.toFixed(2)} | ${signal.reason}`);
        
        const isPositionSignal = signal.type === 'BUY' || signal.type === 'SELL' || 
                                 signal.type === 'CLOSE_LONG' || signal.type === 'CLOSE_SHORT';
        
        if (isPositionSignal) {
          const positionInfo = strategyData.strategy.getPositionInfo();
          const currentPosition = positionInfo.position;
          
          // Check if trying to enter duplicate position
          const isEntrySignal = signal.type === 'BUY' || signal.type === 'SELL';
          const hasPosition = currentPosition && currentPosition.type !== 'NONE';
          const isDuplicateEntry = isEntrySignal && hasPosition && 
                                   ((signal.type === 'BUY' && currentPosition.type === 'LONG') ||
                                    (signal.type === 'SELL' && currentPosition.type === 'SHORT'));
          
          if (isDuplicateEntry) {
            console.log(`⏭️  Already in ${currentPosition.type} position, skipping ${signal.type} @ ${signal.price.toFixed(2)}`);
            continue;
          }
          
          // Execute trade directly
              strategyData.strategy.executeTrade(signal);
        } else {
          strategyData.strategy.executeTrade(signal);
        }
      }
    }
  }

  /**
   * Legacy method: Analyze all strategies (defaults to 1m timeframe for backward compatibility)
   */
  async analyzeAllStrategies(candles: Candle[]): Promise<void> {
    await this.analyzeStrategiesForTimeframe(candles, '1m');
  }

  /**
   * Update all strategies with current market price for a specific timeframe
   */
  updateStrategiesWithCurrentPrice(currentPrice: number, timeframe: string = '1m'): void {
    this.strategies.forEach((strategyData, key) => {
      if (strategyData.timeframe !== timeframe) return;
      if (strategyData.isActive && 'updatePositionWithCurrentPrice' in strategyData.strategy) {
        (strategyData.strategy as any).updatePositionWithCurrentPrice(currentPrice);
      }
    });
  }

  /**
   * Legacy method: Update all strategies (defaults to 1m timeframe for backward compatibility)
   */
  updateAllStrategiesWithCurrentPrice(currentPrice: number): void {
    this.updateStrategiesWithCurrentPrice(currentPrice, '1m');
  }

  /**
   * Get performance of all strategies
   */
  getAllPerformances(): StrategyPerformance[] {
    const performances: StrategyPerformance[] = [];

    this.strategies.forEach((strategyData, key) => {
      const { name } = this.parseStrategyKey(key);
      const positionInfo = strategyData.strategy.getPositionInfo();
      const winRate = positionInfo.totalTrades > 0 
        ? (positionInfo.winningTrades / positionInfo.totalTrades) * 100 
        : 0;

      const strategy = strategyData.strategy as any;
      const strategyConfig = strategy.config ? {
        profitTargetPercent: strategy.config.profitTargetPercent,
        stopLossPercent: strategy.config.stopLossPercent,
        maxPositionTime: strategy.config.maxPositionTime ? strategy.config.maxPositionTime / (60 * 1000) : undefined
      } : undefined;

      const customConfig = strategy.config ? strategy.config : undefined;

      performances.push({
        strategyName: name,
        strategyType: 'CUSTOM',
        timeframe: strategyData.timeframe, // Add timeframe to performance
        userEmail: strategyData.userEmail, // Add userEmail to performance
        totalPnL: positionInfo.totalPnL,
        totalTrades: positionInfo.totalTrades,
        winningTrades: positionInfo.winningTrades,
        winRate,
        currentPosition: positionInfo.position,
        completedTrades: 'completedTrades' in positionInfo ? (positionInfo as any).completedTrades : undefined,
        isActive: strategyData.isActive,
        activatedAt: strategyData.activatedAt,
        totalActiveTime: strategyData.totalActiveTime || 0,
        currentCapital: positionInfo.currentCapital || 100000,
        config: strategyConfig,
        customConfig
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
   * Get strategy by name and timeframe
   */
  getStrategy(name: string, timeframe: string = '1m'): CustomStrategy | undefined {
    const key = this.getStrategyKey(name, timeframe);
    return this.strategies.get(key)?.strategy;
  }

  /**
   * Get all strategy names (returns keys in "name:timeframe" format)
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
   * Reset a specific strategy for a specific timeframe
   */
  async resetStrategy(name: string, timeframe: string = '1m'): Promise<boolean> {
    const key = this.getStrategyKey(name, timeframe);
    const strategyData = this.strategies.get(key);
    if (!strategyData) {
      console.error(`Strategy "${name}" [${timeframe}] not found`);
      return false;
    }

    try {
      // Delete ONLY trades and positions for THIS specific timeframe
      const { CompletedTradeRepository } = await import('./db/completed-trade-repository');
      await CompletedTradeRepository.deleteStrategyCompletedTrades(name, timeframe);
      const { default: OpenPositionRepository } = await import('./db/open-position-repository');
      await OpenPositionRepository.deleteOpenPosition(name, timeframe);

      const wasActive = strategyData.isActive;
      
      // Reset total active time in database
      await StrategyRepository.updateStrategyStatusWithTime(
        name,
        wasActive,
        wasActive ? Date.now() : null,
        0, // Reset cumulative time to 0
        timeframe
      );
      
      this.strategies.delete(key);

      const cfg = await CustomStrategyRepository.loadCustomStrategy(name);
      if (cfg) {
        // Ensure the config has the correct timeframe
        cfg.timeframe = timeframe;
        const fresh = new CustomStrategy(cfg);
        this.strategies.set(key, {
          strategy: fresh,
          type: 'CUSTOM',
          isActive: wasActive,
          timeframe,
          activatedAt: wasActive ? Date.now() : null,
          totalActiveTime: 0
        });
      }

      console.log(`✅ Strategy "${name}" [${timeframe}] has been reset to initial state (active time: 0)`);
      return true;
    } catch (error) {
      console.error(`❌ Error resetting strategy "${name}" [${timeframe}]:`, error);
      return false;
    }
  }
}
