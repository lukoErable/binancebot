import { StrategyState } from '@/types/trading';
import SharedBinanceWebSocket from './shared-binance-websocket';
import UserSessionManager from './user-session-manager';
import { getGlobalStrategyManager } from './websocket-manager';

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
      console.log(`⚠️  [USER ${this.userId}] Still no strategy manager, subscribing to primary timeframe only`);
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
    
    // Get strategy performances for THIS user
    // Use stored reference instead of calling getGlobalStrategyManager() which may return null in SSE context
    let strategyPerformances: any[] = [];
    
    if (this.strategyManagerRef) {
      // Get ALL performances (user-specific filtering would go here)
      strategyPerformances = this.strategyManagerRef.getAllPerformances();
      
      // Debug log first time
      if (strategyPerformances.length > 0 && !this.hasLoggedStrategies) {
        console.log(`📊 [USER ${this.userId}] Sending ${strategyPerformances.length} strategies to frontend`);
        this.hasLoggedStrategies = true;
      }
    } else {
      // Fallback to global getter if reference not set
      const strategyManager = getGlobalStrategyManager();
      if (strategyManager) {
        strategyPerformances = strategyManager.getAllPerformances();
      } else {
        console.log(`⚠️  [USER ${this.userId}] No StrategyManager available`);
      }
    }
    
    // Build state for this user with ALL indicators from shared data
    const ind = primaryData.indicators;
    const state: StrategyState = {
      currentPrice: primaryData.currentPrice,
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
    const strategyManager = getGlobalStrategyManager();
    if (!strategyManager) {
      console.error('No strategy manager found');
      return false;
    }
    
    const tf = timeframe || this.primaryTimeframe;
    const newState = await strategyManager.toggleStrategy(strategyName, tf);
    
    console.log(`✅ [USER ${this.userId}] Strategy "${strategyName}" [${tf}] is now ${newState ? 'ACTIVE' : 'INACTIVE'}`);
    
    return newState;
  }
  
  /**
   * Reset strategy
   */
  async resetStrategy(strategyName: string, timeframe?: string): Promise<boolean> {
    const strategyManager = getGlobalStrategyManager();
    if (!strategyManager) return false;
    
    const tf = timeframe || this.primaryTimeframe;
    return await strategyManager.resetStrategy(strategyName, tf);
  }
  
  /**
   * Update strategy config
   */
  updateStrategyConfig(
    strategyName: string,
    config: any,
    timeframe?: string
  ): boolean {
    const strategyManager = getGlobalStrategyManager();
    if (!strategyManager) return false;
    
    const tf = timeframe || this.primaryTimeframe;
    return strategyManager.updateStrategyConfig(strategyName, config, tf);
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

