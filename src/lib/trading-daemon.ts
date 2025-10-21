/**
 * Trading Daemon - Runs 24/7 independently of user connections
 * 
 * This daemon:
 * - Maintains 6 WebSocket connections to Binance (one per timeframe)
 * - Analyzes all active strategies continuously
 * - Executes trades automatically
 * - Persists even when no users are connected
 */

import SharedBinanceWebSocket from './shared-binance-websocket';
import { StrategyManager } from './strategy-manager';

interface DaemonStats {
  startTime: number;
  uptime: number;
  totalAnalyses: number;
  tradesExecuted: number;
  activeWebSockets: number;
  activeStrategies: number;
}

class TradingDaemon {
  private static instance: TradingDaemon | null = null;
  private isRunning = false;
  private startTime = 0;
  private totalAnalyses = 0;
  private tradesExecuted = 0;
  
  private timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
  private websockets: Map<string, SharedBinanceWebSocket> = new Map();
  private strategyManager: StrategyManager | null = null;
  
  // Analysis control
  private analysisIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastAnalysisTime: Map<string, number> = new Map();
  
  private constructor() {
    console.log('🤖 TradingDaemon: Initializing...');
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): TradingDaemon {
    if (!TradingDaemon.instance) {
      TradingDaemon.instance = new TradingDaemon();
    }
    return TradingDaemon.instance;
  }
  
  /**
   * Start the daemon
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  TradingDaemon: Already running');
      return;
    }
    
    console.log('🚀 TradingDaemon: Starting 24/7 trading system...');
    this.startTime = Date.now();
    this.isRunning = true;
    
    // Step 1: Initialize StrategyManager
    await this.initializeStrategyManager();
    
    // Step 2: Start WebSocket connections for all timeframes
    await this.startWebSocketConnections();
    
    // Step 3: Start strategy analysis loops
    this.startStrategyAnalysis();
    
    console.log('✅ TradingDaemon: Running! Strategies will execute 24/7');
    this.logStatus();
  }
  
  /**
   * Stop the daemon
   */
  stop(): void {
    if (!this.isRunning) return;
    
    console.log('🛑 TradingDaemon: Stopping...');
    
    // Stop all analysis intervals
    this.analysisIntervals.forEach((interval) => clearInterval(interval));
    this.analysisIntervals.clear();
    
    // WebSockets will remain active (shared with frontend viewers)
    // Just unsubscribe from updates
    this.websockets.forEach((ws, tf) => {
      console.log(`  🔌 Unsubscribing from ${tf} WebSocket`);
    });
    
    this.isRunning = false;
    console.log('✅ TradingDaemon: Stopped');
  }
  
  /**
   * Initialize StrategyManager with all user strategies
   */
  private async initializeStrategyManager(): Promise<void> {
    console.log('📦 TradingDaemon: Initializing StrategyManager...');
    
    // Get or create the global singleton
    this.strategyManager = StrategyManager.getGlobalInstance();
    
    if (!this.strategyManager) {
      console.log('  Creating new StrategyManager singleton...');
      this.strategyManager = new StrategyManager();
      // Wait for strategies to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      this.strategyManager = StrategyManager.getGlobalInstance();
    }
    
    if (this.strategyManager) {
      const performances = this.strategyManager.getAllPerformances();
      console.log(`✅ StrategyManager ready with ${performances.length} strategies`);
    } else {
      console.error('❌ Failed to initialize StrategyManager');
      throw new Error('StrategyManager initialization failed');
    }
  }
  
  /**
   * Start WebSocket connections for all timeframes
   */
  private async startWebSocketConnections(): Promise<void> {
    console.log('🌐 TradingDaemon: Starting WebSocket connections...');
    
    for (const timeframe of this.timeframes) {
      try {
        // Get shared WebSocket instance (creates if doesn't exist)
        const ws = SharedBinanceWebSocket.getInstance(timeframe);
        this.websockets.set(timeframe, ws);
        
        // Subscribe to updates
        ws.subscribe((data) => {
          // Update strategies with current price
          if (this.strategyManager) {
            this.strategyManager.updateStrategiesWithCurrentPrice(data.currentPrice, timeframe);
          }
        });
        
        console.log(`  ✅ ${timeframe} WebSocket connected`);
      } catch (error) {
        console.error(`  ❌ Failed to connect ${timeframe} WebSocket:`, error);
      }
    }
    
    console.log(`✅ All ${this.websockets.size} WebSocket connections active`);
  }
  
  /**
   * Start continuous strategy analysis for all timeframes
   */
  private startStrategyAnalysis(): void {
    console.log('🔍 TradingDaemon: Starting strategy analysis loops...');
    
    // Different analysis intervals for different timeframes
    const analysisIntervals: Record<string, number> = {
      '1m': 5000,   // Every 5 seconds for 1m
      '5m': 10000,  // Every 10 seconds for 5m
      '15m': 30000, // Every 30 seconds for 15m
      '1h': 60000,  // Every 1 minute for 1h
      '4h': 120000, // Every 2 minutes for 4h
      '1d': 300000  // Every 5 minutes for 1d
    };
    
    for (const timeframe of this.timeframes) {
      const interval = analysisIntervals[timeframe] || 10000;
      
      const intervalId = setInterval(() => {
        this.analyzeTimeframe(timeframe);
      }, interval);
      
      this.analysisIntervals.set(timeframe, intervalId);
      console.log(`  ⏱️  ${timeframe}: Analysis every ${interval / 1000}s`);
    }
    
    console.log('✅ Strategy analysis loops started for all timeframes');
  }
  
  /**
   * Analyze strategies for a specific timeframe
   */
  private async analyzeTimeframe(timeframe: string): Promise<void> {
    if (!this.strategyManager) return;
    
    try {
      const ws = this.websockets.get(timeframe);
      if (!ws) return;
      
      const data = ws.getCurrentData();
      if (!data || data.candles.length < 50) {
        // Not enough data yet
        return;
      }
      
      // Track analysis time
      const startTime = Date.now();
      this.lastAnalysisTime.set(timeframe, startTime);
      
      // Analyze all active strategies for this timeframe
      await this.strategyManager.analyzeStrategiesForTimeframe(data.candles, timeframe);
      
      this.totalAnalyses++;
      
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.log(`⚠️  [${timeframe}] Analysis took ${duration}ms (slow)`);
      }
    } catch (error) {
      console.error(`❌ [${timeframe}] Analysis error:`, error);
    }
  }
  
  /**
   * Get daemon statistics
   */
  getStats(): DaemonStats {
    const uptime = this.isRunning ? Date.now() - this.startTime : 0;
    const activeStrategies = this.strategyManager?.getAllPerformances().filter(p => p.isActive).length || 0;
    
    return {
      startTime: this.startTime,
      uptime,
      totalAnalyses: this.totalAnalyses,
      tradesExecuted: this.tradesExecuted,
      activeWebSockets: this.websockets.size,
      activeStrategies
    };
  }
  
  /**
   * Check if daemon is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
  
  /**
   * Log current status
   */
  private logStatus(): void {
    const stats = this.getStats();
    console.log(`
╔════════════════════════════════════════════════════════════════
║ 🤖 TRADING DAEMON STATUS
╠════════════════════════════════════════════════════════════════
║ Status: ${this.isRunning ? '🟢 RUNNING' : '🔴 STOPPED'}
║ Uptime: ${Math.floor(stats.uptime / 1000 / 60)} minutes
║ Active WebSockets: ${stats.activeWebSockets}/6
║ Active Strategies: ${stats.activeStrategies}
║ Total Analyses: ${stats.totalAnalyses}
║ Trades Executed: ${stats.tradesExecuted}
╚════════════════════════════════════════════════════════════════
    `);
  }
  
  /**
   * Start periodic status logging (every 5 minutes)
   */
  startStatusLogging(): void {
    setInterval(() => {
      if (this.isRunning) {
        this.logStatus();
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }
}

// Export singleton instance
export const tradingDaemon = TradingDaemon.getInstance();

// Auto-start the daemon when module is imported
export async function initializeTradingDaemon(): Promise<void> {
  try {
    await tradingDaemon.start();
    tradingDaemon.startStatusLogging();
  } catch (error) {
    console.error('❌ Failed to start Trading Daemon:', error);
  }
}

