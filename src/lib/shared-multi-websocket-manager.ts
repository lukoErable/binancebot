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
    
    console.log(`🚀 [USER ${this.userId}] Initializing shared multi-timeframe manager...`);
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
    
    console.log(`📊 [USER ${this.userId}] Active strategies on: ${Array.from(timeframesWithActiveStrategies).join(', ')}`);
    
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
        console.log(`📊 [USER ${this.userId}] (${userType}) Sending ${strategyPerformances.length} strategies to frontend (filtered from ${allPerformances.length} total)`);
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
          console.log(`📊 [USER ${this.userId}] (${userType}) Sending ${strategyPerformances.length} strategies to frontend (filtered from ${allPerformances.length} total)`);
          this.hasLoggedStrategies = true;
        }
      } else {
        console.log(`⚠️  [USER ${this.userId}] No StrategyManager available`);
      }
    }
    
    // Build state for this user with ALL indicators from shared data
    const ind = primaryData.indicators;
    
    // Fallback for currentPrice if undefined
    const currentPrice = primaryData.currentPrice ?? 
                        (primaryData.candles && primaryData.candles.length > 0 ? 
                         primaryData.candles[primaryData.candles.length - 1].close : 0);
    
    const state: StrategyState = {
      currentPrice: currentPrice,
      candles: primaryData.candles,
      
      // Basic indicators (legacy)
      rsi: ind.rsi,
      ema12: ind.ema12,
      ema26: ind.ema26,
      ema50: ind.ema50,
      ema200: ind.ema200,
      ma7: ind.sma7,
      ma25: ind.sma25,
      ma99: ind.sma99,
      
      // All IndicatorEngine values
      ema100: ind.ema100,
      sma7: ind.sma7,
      sma25: ind.sma25,
      sma50: ind.sma50,
      sma99: ind.sma99,
      sma200: ind.sma200,
      rsi9: ind.rsi9,
      rsi21: ind.rsi21,
      macd: ind.macd,
      macdSignal: ind.macdSignal,
      macdHistogram: ind.macdHistogram,
      atr: ind.atr,
      atr14: ind.atr14,
      atr21: ind.atr21,
      bbUpper: ind.bbUpper,
      bbMiddle: ind.bbMiddle,
      bbLower: ind.bbLower,
      bbWidth: ind.bbWidth,
      bbPercent: ind.bbPercent,
      stochK: ind.stochK,
      stochD: ind.stochD,
      adx: ind.adx,
      cci: ind.cci,
      obv: ind.obv,
      vwap: ind.vwap,
      volumeSMA20: ind.volumeSMA20,
      volumeRatio: ind.volumeRatio,
      
      // Boolean indicators
      isBullishTrend: ind.isBullishTrend,
      isBearishTrend: ind.isBearishTrend,
      isUptrend: ind.isUptrend,
      isDowntrend: ind.isDowntrend,
      isUptrendConfirmed3: ind.isUptrendConfirmed3,
      isDowntrendConfirmed3: ind.isDowntrendConfirmed3,
      isTrendReversalUp: ind.isTrendReversalUp,
      isTrendReversalDown: ind.isTrendReversalDown,
      isOversold: ind.isOversold,
      isOverbought: ind.isOverbought,
      isMACDBullish: ind.isMACDBullish,
      isMACDBearish: ind.isMACDBearish,
      isMACDCrossoverBullish: ind.isMACDCrossoverBullish,
      isMACDCrossoverBearish: ind.isMACDCrossoverBearish,
      isEMAFastSlowBullCross: ind.isEMAFastSlowBullCross,
      isEMAFastSlowBearCross: ind.isEMAFastSlowBearCross,
      isPriceCrossedAboveEMA50: ind.isPriceCrossedAboveEMA50,
      isPriceCrossedBelowEMA50: ind.isPriceCrossedBelowEMA50,
      isHighVolume: ind.isHighVolume,
      isLowVolume: ind.isLowVolume,
      isPriceAboveVWAP: ind.isPriceAboveVWAP,
      isPriceBelowVWAP: ind.isPriceBelowVWAP,
      isNearVWAP: ind.isNearVWAP,
      isNearBBLower: ind.isNearBBLower,
      isNearBBUpper: ind.isNearBBUpper,
      isBelowBBLower: ind.isBelowBBLower,
      isAboveBBUpper: ind.isAboveBBUpper,
      isBullishCandle: ind.isBullishCandle,
      isBearishCandle: ind.isBearishCandle,
      isBullishEngulfing: ind.isBullishEngulfing,
      isBearishEngulfing: ind.isBearishEngulfing,
      isDoji: ind.isDoji,
      isHammer: ind.isHammer,
      isShootingStar: ind.isShootingStar,
      
      // Metadata
      strategyPerformances,
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

