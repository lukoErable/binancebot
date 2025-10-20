import { StrategyPerformance, StrategyState } from '@/types/trading';
import { BinanceWebSocketManager, getGlobalStrategyManager } from './websocket-manager';

/**
 * Manages multiple WebSocket connections (one per timeframe)
 * Only connects to timeframes that have active strategies
 */
export class MultiTimeframeWebSocketManager {
  private wsManagers: Map<string, BinanceWebSocketManager> = new Map();
  private onStateUpdate?: (combinedState: StrategyState) => void;
  private tradingMode: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private primaryTimeframe: string = '1m'; // The UI's selected timeframe
  
  constructor(onStateUpdate?: (state: StrategyState) => void, tradingMode: boolean = false) {
    this.onStateUpdate = onStateUpdate;
    this.tradingMode = tradingMode;
  }

  /**
   * Initialize and start WebSockets for timeframes with active strategies
   */
  async initialize(primaryTimeframe: string = '1m'): Promise<void> {
    this.primaryTimeframe = primaryTimeframe;
    
    console.log('🚀 MultiTimeframeWebSocketManager initializing...');
    
    // Get all active strategies grouped by timeframe
    const strategyManager = getGlobalStrategyManager();
    if (!strategyManager) {
      console.log('⚠️  No strategy manager found, starting primary timeframe only');
      await this.startWebSocket(primaryTimeframe);
      return;
    }

    const allPerformances = strategyManager.getAllPerformances();
    const timeframesWithActiveStrategies = new Set<string>();
    
    allPerformances.forEach(perf => {
      if (perf.isActive) {
        timeframesWithActiveStrategies.add(perf.timeframe);
      }
    });

    console.log(`📊 Active strategies found on: ${Array.from(timeframesWithActiveStrategies).join(', ')}`);

    // Always start primary timeframe (for UI)
    if (!timeframesWithActiveStrategies.has(primaryTimeframe)) {
      timeframesWithActiveStrategies.add(primaryTimeframe);
    }

    // Start WebSocket for each timeframe with active strategies
    for (const timeframe of timeframesWithActiveStrategies) {
      await this.startWebSocket(timeframe);
    }

    // Start periodic state updates
    this.startPeriodicUpdates();
  }

  /**
   * Start a WebSocket for a specific timeframe
   */
  private async startWebSocket(timeframe: string): Promise<void> {
    if (this.wsManagers.has(timeframe)) {
      console.log(`⚠️  WebSocket for ${timeframe} already running`);
      return;
    }

    console.log(`🔌 Starting WebSocket for ${timeframe}...`);

    const wsManager = new BinanceWebSocketManager(
      (state) => {
        // Each WS updates independently, we'll combine them in periodic updates
        // This callback is for individual WS state tracking only
      },
      timeframe,
      this.tradingMode
    );

    await wsManager.connect();
    this.wsManagers.set(timeframe, wsManager);
    
    console.log(`✅ WebSocket for ${timeframe} started`);
  }

  /**
   * Stop a WebSocket for a specific timeframe
   */
  private stopWebSocket(timeframe: string): void {
    const wsManager = this.wsManagers.get(timeframe);
    if (wsManager) {
      console.log(`🔌 Stopping WebSocket for ${timeframe}...`);
      wsManager.disconnect();
      this.wsManagers.delete(timeframe);
    }
  }

  /**
   * Start periodic state updates to combine all WebSocket states
   */
  private startPeriodicUpdates(): void {
    // Send combined state every 500ms
    this.updateInterval = setInterval(() => {
      this.sendCombinedState();
    }, 500);
  }

  /**
   * Combine states from all active WebSockets and send to client
   */
  private sendCombinedState(): void {
    // Use the primary timeframe's state as base
    const primaryWS = this.wsManagers.get(this.primaryTimeframe);
    if (!primaryWS) return;

    const primaryState = primaryWS.getState();
    
    // Get all performances from all timeframes
    const strategyManager = getGlobalStrategyManager();
    if (strategyManager) {
      primaryState.strategyPerformances = strategyManager.getAllPerformances();
    }

    // Send combined state
    if (this.onStateUpdate) {
      this.onStateUpdate(primaryState);
    }
  }

  /**
   * Change the primary timeframe (for UI)
   */
  async changePrimaryTimeframe(newTimeframe: string): Promise<void> {
    console.log(`🔄 Changing primary timeframe to ${newTimeframe}`);
    this.primaryTimeframe = newTimeframe;
    
    // Ensure WebSocket exists for this timeframe
    if (!this.wsManagers.has(newTimeframe)) {
      await this.startWebSocket(newTimeframe);
    }
    
    // Send updated state immediately
    this.sendCombinedState();
  }

  /**
   * Update active WebSockets based on current active strategies
   */
  async syncWebSocketsWithStrategies(): Promise<void> {
    const strategyManager = getGlobalStrategyManager();
    if (!strategyManager) return;

    const allPerformances = strategyManager.getAllPerformances();
    const timeframesWithActiveStrategies = new Set<string>();
    
    allPerformances.forEach(perf => {
      if (perf.isActive) {
        timeframesWithActiveStrategies.add(perf.timeframe);
      }
    });

    // Always keep primary timeframe
    timeframesWithActiveStrategies.add(this.primaryTimeframe);

    // Start WebSockets for new active timeframes
    for (const timeframe of timeframesWithActiveStrategies) {
      if (!this.wsManagers.has(timeframe)) {
        await this.startWebSocket(timeframe);
      }
    }

    // Stop WebSockets for inactive timeframes (except primary)
    for (const [timeframe, _] of this.wsManagers) {
      if (!timeframesWithActiveStrategies.has(timeframe)) {
        this.stopWebSocket(timeframe);
      }
    }

    console.log(`🔄 Active WebSockets: ${Array.from(this.wsManagers.keys()).join(', ')}`);
  }

  /**
   * Toggle a strategy on ALL timeframes (global toggle with shared timer)
   */
  async toggleStrategy(strategyName: string, timeframe?: string): Promise<boolean> {
    const strategyManager = getGlobalStrategyManager();
    if (!strategyManager) {
      console.error('No strategy manager found');
      return false;
    }

    // Get all instances of this strategy across all timeframes
    const allPerformances = strategyManager.getAllPerformances();
    const strategyInstances = allPerformances.filter(p => p.strategyName === strategyName);
    
    if (strategyInstances.length === 0) {
      console.error(`Strategy "${strategyName}" not found on any timeframe`);
      return false;
    }

    // Toggle first instance to determine new state
    const firstInstance = strategyInstances[0];
    const targetTimeframe = timeframe || firstInstance.timeframe;
    const newState = strategyManager.toggleStrategy(strategyName, targetTimeframe);
    
    console.log(`🔄 Toggling "${strategyName}" to ${newState ? 'ACTIVE' : 'INACTIVE'} on all timeframes...`);
    
    // Get the global state after first toggle
    const { default: GlobalStrategyRepository } = await import('./db/global-strategy-repository');
    const globalState = await GlobalStrategyRepository.getGlobalState(strategyName);
    
    // Apply same state to all other timeframes
    for (const instance of strategyInstances) {
      if (instance.timeframe !== targetTimeframe) {
        const currentState = instance.isActive;
        if (currentState !== newState) {
          await strategyManager.toggleStrategy(strategyName, instance.timeframe);
          console.log(`  └─ ${instance.timeframe}: ${currentState ? 'ACTIVE' : 'INACTIVE'} → ${newState ? 'ACTIVE' : 'INACTIVE'}`);
        }
      }
    }
    
    // Sync global timer across all instances
    if (globalState) {
      await strategyManager.syncGlobalTimer(
        strategyName, 
        globalState.activatedAt, 
        globalState.totalActiveTime
      );
    }
    
    // Sync WebSockets after global toggle
    await this.syncWebSocketsWithStrategies();
    
    console.log(`✅ Strategy "${strategyName}" is now ${newState ? 'ACTIVE' : 'INACTIVE'} on ${strategyInstances.length} timeframe(s)`);
    console.log(`⏱️  Global timer: ${globalState ? Math.floor(globalState.totalActiveTime / 60) : 0}m`);
    
    return newState;
  }

  /**
   * Reset a strategy
   */
  async resetStrategy(strategyName: string, timeframe?: string): Promise<boolean> {
    const tf = timeframe || this.primaryTimeframe;
    const wsManager = this.wsManagers.get(tf);
    
    if (!wsManager) {
      console.error(`No WebSocket found for ${tf}`);
      return false;
    }

    const result = await wsManager.resetStrategy(strategyName, tf);
    
    // Sync WebSockets after reset
    await this.syncWebSocketsWithStrategies();
    
    return result;
  }

  /**
   * Get all strategy performances from all timeframes
   */
  getStrategyPerformances(): StrategyPerformance[] {
    const strategyManager = getGlobalStrategyManager();
    return strategyManager ? strategyManager.getAllPerformances() : [];
  }

  /**
   * Get current state (from primary timeframe)
   */
  getState(): StrategyState {
    const primaryWS = this.wsManagers.get(this.primaryTimeframe);
    if (primaryWS) {
      const state = primaryWS.getState();
      const strategyManager = getGlobalStrategyManager();
      if (strategyManager) {
        state.strategyPerformances = strategyManager.getAllPerformances();
      }
      return state;
    }
    
    // Return empty state if no primary WS
    return {
      candles: [],
      currentPrice: 0,
      rsi: 0,
      ema12: 0,
      ema26: 0,
      ema50: 0,
      ema200: 0,
      ma7: 0,
      ma25: 0,
      ma99: 0,
      lastSignal: null,
      signals: [],
      isConnected: false,
      lastUpdate: Date.now(),
      currentPosition: { type: 'NONE', entryPrice: 0, entryTime: 0, quantity: 0, unrealizedPnL: 0, unrealizedPnLPercent: 0 },
      totalPnL: 0,
      totalTrades: 0,
      winningTrades: 0,
      timeframe: this.primaryTimeframe,
      strategyPerformances: []
    };
  }

  /**
   * Set trading mode for all WebSockets
   */
  setTradingMode(enabled: boolean): void {
    this.tradingMode = enabled;
    this.wsManagers.forEach(ws => ws.setTradingMode(enabled));
    console.log(`🔄 Trading mode set to: ${enabled ? 'ACTIVE' : 'MONITORING'} for all timeframes`);
  }

  /**
   * Disconnect all WebSockets
   */
  disconnect(): void {
    console.log('🔌 Disconnecting all WebSockets...');
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.wsManagers.forEach((ws, timeframe) => {
      console.log(`  Disconnecting ${timeframe}...`);
      ws.disconnect();
    });
    
    this.wsManagers.clear();
    console.log('✅ All WebSockets disconnected');
  }

  /**
   * Get list of active timeframes
   */
  getActiveTimeframes(): string[] {
    return Array.from(this.wsManagers.keys());
  }
}

