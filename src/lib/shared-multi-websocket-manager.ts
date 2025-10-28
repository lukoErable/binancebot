import { StrategyState } from '@/types/trading';
import SharedBinanceWebSocket from './shared-binance-websocket';
import { StrategyManager } from './strategy-manager';
import UserSessionManager from './user-session-manager';

/**
 * Shared Multi-Timeframe WebSocket Manager
 * Uses shared WebSocket connections to reduce load and avoid Binance rate limits
 * Each user session subscribes to shared data streams
 */

export class SharedMultiTimeframeWebSocketManager {
  private userId: string;
  private userSession: UserSessionManager;
  private onStateUpdate?: (state: StrategyState) => void;
  private primaryTimeframe: string = '1m';
  private updateInterval: NodeJS.Timeout | null = null;
  private isActive: boolean = false;
  private hasLoggedStrategies: boolean = false;
  private strategyManagerRef: any = null; // Store reference to avoid repeated imports
  
  constructor(
    userId: string,
    onStateUpdate?: (state: StrategyState) => void,
    tradingMode: boolean = false
  ) {
    this.userId = userId || `user_${Date.now()}`; // Generate ID if not provided
    this.onStateUpdate = onStateUpdate;
    this.userSession = UserSessionManager.getInstance();
    
    console.log(`[USER ${this.userId}] Initializing shared multi-timeframe manager...`);
  }
  
  /**
   * Initialize and subscribe to timeframes with active strategies
   */
  async initialize(primaryTimeframe: string = '1m'): Promise<void> {
    this.primaryTimeframe = primaryTimeframe;
    this.isActive = true;
    
    // Create user session
    this.userSession.createSession(this.userId, primaryTimeframe);
    
    // Ensure StrategyManager is initialized and has loaded strategies
    const { StrategyManager } = await import('./strategy-manager');
    let strategyManager = StrategyManager.getGlobalInstance();
    
    if (!strategyManager) {
      console.log(`⚠️  [USER ${this.userId}] StrategyManager not found, waiting for daemon...`);
      // Wait for daemon to initialize StrategyManager
      let retries = 0;
      while (!strategyManager && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        strategyManager = StrategyManager.getGlobalInstance();
        retries++;
      }
    }
    
    if (!strategyManager) {
      console.error(`❌ [USER ${this.userId}] StrategyManager not initialized after retries!`);
      // Still store null ref and continue - templates might load later
      this.strategyManagerRef = null;
      await this.subscribeToTimeframe(primaryTimeframe);
      this.startPeriodicUpdates();
      return;
    }
    
    // Wait for strategies to be loaded
    let allPerformances = strategyManager.getAllPerformances();
    let waitCount = 0;
    while (allPerformances.length === 0 && waitCount < 20) {
      console.log(`⏳ [USER ${this.userId}] Waiting for strategies to load... (${waitCount + 1}/20)`);
      await new Promise(resolve => setTimeout(resolve, 500));
      allPerformances = strategyManager.getAllPerformances();
      waitCount++;
    }
    
    if (allPerformances.length === 0) {
      console.error(`❌ [USER ${this.userId}] No strategies loaded after 10 seconds!`);
      // Force reload
      await strategyManager.reloadAllData();
      allPerformances = strategyManager.getAllPerformances();
    }
    
    console.log(`✅ [USER ${this.userId}] StrategyManager ready with ${allPerformances.length} strategies`);
    
    // Store reference for later use
    this.strategyManagerRef = strategyManager;
    
    const timeframesWithActiveStrategies = new Set<string>();
    
    allPerformances.forEach(perf => {
      if (perf.isActive) {
        timeframesWithActiveStrategies.add(perf.timeframe);
      }
    });
    
    console.log(`[USER ${this.userId}] Active strategies on: ${Array.from(timeframesWithActiveStrategies).join(', ')}`);
    
    // Always subscribe to primary timeframe (for UI)
    timeframesWithActiveStrategies.add(primaryTimeframe);
    
    // Subscribe to all needed timeframes
    for (const tf of timeframesWithActiveStrategies) {
      await this.subscribeToTimeframe(tf);
    }
    
    // Wait a bit more to ensure all data is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send initial state immediately
    this.sendCombinedState();
    
    // Start sending periodic updates to this user
    this.startPeriodicUpdates();
    
    console.log(`✅ [USER ${this.userId}] Multi-timeframe system initialized`);
  }
  
  /**
   * Subscribe to a shared timeframe WebSocket
   */
  private async subscribeToTimeframe(timeframe: string): Promise<void> {
    this.userSession.subscribeToTimeframe(
      this.userId,
      timeframe,
      (data) => {
        // Data received from shared WebSocket
        // Will be processed and sent to user in periodic updates
      }
    );
  }
  
  /**
   * Start periodic updates to user (via SSE)
   */
  private startPeriodicUpdates(): void {
    this.updateInterval = setInterval(() => {
      if (this.isActive) {
        this.sendCombinedState();
      }
    }, 500);
  }
  
  /**
   * Get RL enabled strategies
   */
  private getRLEnabledStrategies(): string[] {
    const rlEnabledStrategies: string[] = [];
    
    if (this.strategyManagerRef) {
      try {
        const performances = this.strategyManagerRef.getAllPerformances();
        for (const perf of performances) {
          const key = `${perf.strategyName}:${perf.timeframe}`;
          if (this.strategyManagerRef.isRLEnabled(perf.strategyName, perf.timeframe)) {
            rlEnabledStrategies.push(key);
          }
        }
      } catch (error) {
        console.error('❌ Error getting RL enabled strategies:', error);
      }
    }
    
    return rlEnabledStrategies;
  }

  /**
   * Send combined state to user
   */
  private sendCombinedState(): void {
    // Get data from primary timeframe's shared WebSocket
    const sharedWS = SharedBinanceWebSocket.getInstance(this.primaryTimeframe);
    const primaryData = sharedWS.getCurrentData();
    
    if (!primaryData) {
      console.log(`⚠️  [USER ${this.userId}] No data from WebSocket ${this.primaryTimeframe}`);
      return;
    }
    
    // Debug: Check currentPrice value
    if (primaryData.currentPrice === undefined || primaryData.currentPrice === null) {
      console.error(`❌ [USER ${this.userId}] currentPrice is ${primaryData.currentPrice} in primaryData:`, {
        currentPrice: primaryData.currentPrice,
        candlesLength: primaryData.candles?.length,
        lastCandle: primaryData.candles?.[primaryData.candles.length - 1],
        indicators: primaryData.indicators ? 'present' : 'missing'
      });
    }
    
    // Get strategy performances for THIS user
    // Use stored reference instead of calling getGlobalStrategyManager() which may return null in SSE context
    let strategyPerformances: any[] = [];
    
    if (this.strategyManagerRef) {
      // Get ALL performances and filter by userEmail
      const allPerformances = this.strategyManagerRef.getAllPerformances();
      
      // Filter by userEmail based on authentication status
      if (this.userId && this.userId.includes('@') && this.userId !== 'anonymous') {
        // Authenticated user: show ONLY their strategies
        strategyPerformances = allPerformances.filter((perf: any) => perf.userEmail === this.userId);
      } else {
        // Anonymous user: show ONLY template strategies (for demo/preview)
        strategyPerformances = allPerformances.filter((perf: any) => perf.userEmail === 'template@system');
        
        // Force all templates to be inactive (no trading for anonymous users!)
        strategyPerformances = strategyPerformances.map(perf => ({
          ...perf,
          isActive: false
        }));
      }
      
      // Debug log first time
      if (strategyPerformances.length > 0 && !this.hasLoggedStrategies) {
        const userType = this.userId && this.userId.includes('@') && this.userId !== 'anonymous' ? 'authenticated' : 'anonymous';
        console.log(`[USER ${this.userId}] (${userType}) Sending ${strategyPerformances.length} strategies to frontend (filtered from ${allPerformances.length} total)`);
        this.hasLoggedStrategies = true;
      }
    } else {
      // Reference not set - try to get it now
      this.strategyManagerRef = StrategyManager.getGlobalInstance();
      
      if (this.strategyManagerRef) {
        const allPerformances = this.strategyManagerRef.getAllPerformances();
        
        if (this.userId && this.userId.includes('@') && this.userId !== 'anonymous') {
          strategyPerformances = allPerformances.filter((perf: any) => perf.userEmail === this.userId);
        } else {
          // Anonymous: templates only
          strategyPerformances = allPerformances
            .filter((perf: any) => perf.userEmail === 'template@system')
            .map((perf: any) => ({ ...perf, isActive: false }));
        }
        
        if (strategyPerformances.length > 0 && !this.hasLoggedStrategies) {
          const userType = this.userId && this.userId.includes('@') && this.userId !== 'anonymous' ? 'authenticated' : 'anonymous';
          console.log(`[USER ${this.userId}] (${userType}) Sending ${strategyPerformances.length} strategies to frontend (filtered from ${allPerformances.length} total)`);
          this.hasLoggedStrategies = true;
        }
      } else {
        console.log(`⚠️  [USER ${this.userId}] No StrategyManager available`);
      }
    }
    
    // Build state for this user with ALL indicators from shared data
    const ind = primaryData.indicators;
    
    // Debug: Check if advanced indicators are present
    // console.log(`🔍 [USER ${this.userId}] Advanced indicators debug:`, {
    //   hasIndicators: !!ind,
    //   indicatorsKeys: ind ? Object.keys(ind).length : 0,
    //   sampleAdvanced: {
    //     sma20: ind?.sma20,
    //     ema12: ind?.ema12,
    //     rsi: ind?.rsi,
    //     macd: ind?.macd,
    //     bbUpper: ind?.bbUpper,
    //     atr: ind?.atr,
    //     stochK: ind?.stochK,
    //     adx: ind?.adx,
    //     cci: ind?.cci,
    //     obv: ind?.obv,
    //     vwap: ind?.vwap,
    //     tenkanSen: ind?.tenkanSen,
    //     kijunSen: ind?.kijunSen,
    //     senkouSpanA: ind?.senkouSpanA,
    //     senkouSpanB: ind?.senkouSpanB,
    //     gatorOscillator: ind?.gatorOscillator
    //   }
    // });
    
    // Fallback for currentPrice if undefined
    const currentPrice = primaryData.currentPrice ?? 
                        (primaryData.candles && primaryData.candles.length > 0 ? 
                         primaryData.candles[primaryData.candles.length - 1].close : 0);
    
    const state: StrategyState = {
      currentPrice: currentPrice,
      candles: primaryData.candles,
      
      // Legacy properties for backward compatibility
      ma7: ind.sma7,
      ma25: ind.sma25,
      ma99: ind.sma99,
      
      // All indicators (legacy + advanced) - spread all from IndicatorEngine
      ...ind,
      
      // Metadata
      strategyPerformances,
      rlEnabledStrategies: this.getRLEnabledStrategies(),
      isConnected: true,
      lastUpdate: primaryData.lastUpdate,
      timeframe: this.primaryTimeframe,
      
      // Placeholder values for compatibility
      lastSignal: null,
      signals: [],
      currentPosition: { 
        type: 'NONE', 
        entryPrice: 0, 
        entryTime: 0, 
        quantity: 0,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0
      },
      totalPnL: 0,
      totalTrades: 0,
      winningTrades: 0
    };
    
    // Send to user via SSE callback
    if (this.onStateUpdate) {
      this.onStateUpdate(state);
    }
  }
  
  /**
   * Change primary timeframe
   */
  async changePrimaryTimeframe(newTimeframe: string): Promise<void> {
    console.log(`🔄 [USER ${this.userId}] Changing primary timeframe to ${newTimeframe}`);
    
    this.primaryTimeframe = newTimeframe;
    this.userSession.changePrimaryTimeframe(this.userId, newTimeframe);
    
    // Subscribe to new timeframe if not already
    const session = this.userSession.getSession(this.userId);
    if (session && !session.activeTimeframes.has(newTimeframe)) {
      await this.subscribeToTimeframe(newTimeframe);
    }
    
    // Send immediate update with new timeframe data
    this.sendCombinedState();
  }
  
  /**
   * Toggle strategy (delegate to StrategyManager)
   */
  async toggleStrategy(strategyName: string, timeframe?: string): Promise<boolean> {
    try {
      // Use stored reference instead of StrategyManager.getGlobalInstance()
      const strategyManager = this.strategyManagerRef || StrategyManager.getGlobalInstance();
      if (!strategyManager) {
        console.error(`❌ [USER ${this.userId}] No strategy manager found (ref: ${!!this.strategyManagerRef}, global: ${!!StrategyManager.getGlobalInstance()})`);
        return false;
      }
      
      const tf = timeframe || this.primaryTimeframe;
      const newState = await strategyManager.toggleStrategy(strategyName, tf);
      
      console.log(`✅ [USER ${this.userId}] Strategy "${strategyName}" [${tf}] is now ${newState ? 'ACTIVE' : 'INACTIVE'}`);
      
      // Send immediate update to frontend via SSE (always, even if toggle failed)
      this.sendCombinedState();
      
      return newState;
    } catch (error) {
      console.error(`❌ [USER ${this.userId}] Error toggling strategy "${strategyName}":`, error);
      
      // Still send update to frontend to refresh state
      this.sendCombinedState();
      
      return false;
    }
  }
  
  /**
   * Reset strategy
   */
  async resetStrategy(strategyName: string, timeframe?: string): Promise<boolean> {
    // Use stored reference instead of StrategyManager.getGlobalInstance()
    const strategyManager = this.strategyManagerRef || StrategyManager.getGlobalInstance();
    if (!strategyManager) {
      console.error(`❌ [USER ${this.userId}] No strategy manager found for reset`);
      return false;
    }
    
    const tf = timeframe || this.primaryTimeframe;
    const success = await strategyManager.resetStrategy(strategyName, tf);
    
    if (success) {
      // Send immediate update to frontend via SSE
      this.sendCombinedState();
    }
    
    return success;
  }
  
  /**
   * Update strategy config
   */
  updateStrategyConfig(
    strategyName: string,
    config: any,
    timeframe?: string
  ): boolean {
    // Use stored reference instead of StrategyManager.getGlobalInstance()
    const strategyManager = this.strategyManagerRef || StrategyManager.getGlobalInstance();
    if (!strategyManager) {
      console.error(`❌ [USER ${this.userId}] No strategy manager found for config update`);
      return false;
    }
    
    const tf = timeframe || this.primaryTimeframe;
    const success = strategyManager.updateStrategyConfig(strategyName, config, tf);
    
    if (success) {
      // Send immediate update to frontend via SSE
      this.sendCombinedState();
    }
    
    return success;
  }
  
  /**
   * Get statistics
   */
  getStats(): any {
    const session = this.userSession.getSession(this.userId);
    const globalStats = this.userSession.getStats();
    
    return {
      userId: this.userId,
      primaryTimeframe: this.primaryTimeframe,
      activeTimeframes: session ? Array.from(session.activeTimeframes) : [],
      lastActivity: session?.lastActivity,
      globalStats
    };
  }
  
  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    console.log(`🔌 [USER ${this.userId}] Disconnecting...`);
    
    this.isActive = false;
    
    // Stop periodic updates
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // Destroy user session (will unsubscribe from all timeframes)
    this.userSession.destroySession(this.userId);
    
    console.log(`✅ [USER ${this.userId}] Disconnected`);
  }
}

export default SharedMultiTimeframeWebSocketManager;

