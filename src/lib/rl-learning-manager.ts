/**
 * RL Learning System - Manages reinforcement learning for trading strategies
 * Handles state collection, learning, and strategy adaptation
 */

import { Candle, CompletedTrade, StrategyPerformance } from '@/types/trading';
import RLStrategyRepository from './db/rl-strategy-repository';
import { PPOTradingAgent, RLAction, RLState, RLTrajectory } from './rl-agent';

export interface RLStrategyConfig {
  strategyName: string;
  timeframe: string;
  enabled: boolean;
  learningRate: number;
  evaluationPeriod: number; // minutes
  minTradesForEvaluation: number;
  adaptationThreshold: number; // minimum performance improvement to apply changes
}

export interface MarketState {
  price: number;
  volume: number;
  volatility: number;
  trend: 'bullish' | 'bearish' | 'sideways';
  rsi: number;
  ema12: number;
  ema26: number;
  bollingerUpper: number;
  bollingerLower: number;
  macd: number;
  atr: number;
}

/**
 * RL Learning Manager - Orchestrates the learning process
 */
export class RLLearningManager {
  private agents: Map<string, PPOTradingAgent> = new Map();
  private enabledStrategies: Set<string> = new Set();
  private learningInterval: NodeJS.Timeout | null = null;
  private evaluationInterval: NodeJS.Timeout | null = null;
  private rlRepository: RLStrategyRepository;
  
  // Configuration
  private config = {
    learningFrequency: 5 * 60 * 1000, // 5 minutes
    evaluationFrequency: 30 * 60 * 1000, // 30 minutes
    minTradesForLearning: 5,
    adaptationThreshold: 0.1 // 10% improvement required
  };

  constructor() {
    this.rlRepository = RLStrategyRepository.getInstance();
    console.log('🧠 RL Learning Manager initialized');
    this.loadPersistedStrategies();
  }

  /**
   * Load persisted RL strategies from database
   */
  private async loadPersistedStrategies(): Promise<void> {
    try {
      const persistedStrategies = await this.rlRepository.getAllEnabledRLStrategies();
      
      for (const config of persistedStrategies) {
        const key = `${config.strategyName}:${config.timeframe}`;
        
        // Create RL agent
        const agent = new PPOTradingAgent(config.strategyName, config.timeframe);
        this.agents.set(key, agent);
        
        // Add to enabled strategies
        this.enabledStrategies.add(key);
        
        console.log(`🧠 Loaded persisted RL strategy: ${config.strategyName} [${config.timeframe}]`);
      }
      
      // Start learning intervals if we have enabled strategies
      if (this.enabledStrategies.size > 0) {
        this.startLearningIntervals();
      }
    } catch (error) {
      console.error('❌ Error loading persisted RL strategies:', error);
    }
  }

  /**
   * Enable RL learning for a strategy
   */
  async enableStrategy(strategyName: string, timeframe: string): Promise<void> {
    const key = `${strategyName}:${timeframe}`;
    
    if (this.enabledStrategies.has(key)) {
      console.log(`🧠 RL already enabled for ${strategyName} [${timeframe}]`);
      return;
    }

    try {
      // Persist to database
      await this.rlRepository.enableRL(strategyName, timeframe);

      // Create RL agent if it doesn't exist
      if (!this.agents.has(key)) {
        const agent = new PPOTradingAgent(strategyName, timeframe);
        this.agents.set(key, agent);
        console.log(`🧠 Created RL agent for ${strategyName} [${timeframe}]`);
      }

      this.enabledStrategies.add(key);
      console.log(`🧠 RL learning enabled for ${strategyName} [${timeframe}]`);

      // Start learning intervals if not already running
      this.startLearningIntervals();
    } catch (error) {
      console.error(`❌ Error enabling RL for ${strategyName} [${timeframe}]:`, error);
      throw error;
    }
  }

  /**
   * Disable RL learning for a strategy
   */
  async disableStrategy(strategyName: string, timeframe: string): Promise<void> {
    const key = `${strategyName}:${timeframe}`;
    
    if (!this.enabledStrategies.has(key)) {
      console.log(`🧠 RL not enabled for ${strategyName} [${timeframe}]`);
      return;
    }

    try {
      // Persist to database
      await this.rlRepository.disableRL(strategyName, timeframe);

      this.enabledStrategies.delete(key);
      console.log(`🧠 RL learning disabled for ${strategyName} [${timeframe}]`);

      // Stop learning intervals if no strategies are enabled
      if (this.enabledStrategies.size === 0) {
        this.stopLearningIntervals();
      }
    } catch (error) {
      console.error(`❌ Error disabling RL for ${strategyName} [${timeframe}]:`, error);
      throw error;
    }
  }

  /**
   * Check if RL is enabled for a strategy
   */
  isEnabled(strategyName: string, timeframe: string): boolean {
    const key = `${strategyName}:${timeframe}`;
    return this.enabledStrategies.has(key);
  }

  /**
   * Start learning intervals
   */
  private startLearningIntervals(): void {
    if (this.learningInterval || this.evaluationInterval) {
      return; // Already running
    }

    // Learning interval - collect experiences and train
    this.learningInterval = setInterval(async () => {
      await this.performLearningCycle();
    }, this.config.learningFrequency);

    // Evaluation interval - evaluate and adapt strategies
    this.evaluationInterval = setInterval(async () => {
      await this.performEvaluationCycle();
    }, this.config.evaluationFrequency);

    console.log('🧠 RL learning intervals started');
  }

  /**
   * Stop learning intervals
   */
  private stopLearningIntervals(): void {
    if (this.learningInterval) {
      clearInterval(this.learningInterval);
      this.learningInterval = null;
    }

    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }

    console.log('🧠 RL learning intervals stopped');
  }

  /**
   * Perform learning cycle - collect experiences and train agents
   */
  private async performLearningCycle(): Promise<void> {
    if (this.enabledStrategies.size === 0) {
      return;
    }

    console.log(`🧠 Learning cycle: Training ${this.enabledStrategies.size} agents...`);

    for (const key of this.enabledStrategies) {
      try {
        const agent = this.agents.get(key);
        if (!agent) continue;

        // Train the agent
        await agent.train();

        // Log stats
        const stats = agent.getStats();
        if (stats.updateCount % 20 === 0) { // Log every 20 updates
          console.log(`🧠 ${key}: Memory=${stats.memorySize}, ε=${stats.epsilon.toFixed(3)}, Updates=${stats.updateCount}`);
        }
      } catch (error) {
        console.error(`🧠 Learning error for ${key}:`, error);
      }
    }
  }

  /**
   * Perform evaluation cycle - evaluate strategies and suggest adaptations
   */
  private async performEvaluationCycle(): Promise<void> {
    if (this.enabledStrategies.size === 0) {
      return;
    }

    console.log(`🧠 Evaluation cycle: Evaluating ${this.enabledStrategies.size} strategies...`);

    for (const key of this.enabledStrategies) {
      try {
        const agent = this.agents.get(key);
        if (!agent) continue;

        // Get current strategy performance
        const performance = await this.getStrategyPerformance(key);
        if (!performance) continue;

        // Check if we have enough trades for evaluation
        if (performance.totalTrades < this.config.minTradesForLearning) {
          continue;
        }

        // Generate adaptation suggestions
        const suggestions = await this.generateAdaptationSuggestions(agent, performance);
        
        if (suggestions.length > 0) {
          console.log(`🧠 ${key}: Generated ${suggestions.length} adaptation suggestions`);
          // Here you would apply the suggestions to the strategy
          // This would be integrated with the StrategyManager
        }
      } catch (error) {
        console.error(`🧠 Evaluation error for ${key}:`, error);
      }
    }
  }

  /**
   * Collect market state for RL
   */
  async collectMarketState(
    strategyName: string,
    timeframe: string,
    candles: Candle[],
    currentPrice: number
  ): Promise<RLState | null> {
    const key = `${strategyName}:${timeframe}`;
    
    if (!this.enabledStrategies.has(key)) {
      return null; // RL not enabled for this strategy
    }

    if (candles.length < 50) {
      return null; // Not enough data
    }

    try {
      // Calculate technical indicators
      const latestCandle = candles[candles.length - 1];
      const marketState = await this.calculateMarketState(candles, currentPrice);

      // Get strategy performance
      const performance = await this.getStrategyPerformance(key);
      if (!performance) return null;

      // Build RL state
      const rlState: RLState = {
        marketData: {
          price: currentPrice,
          volume: latestCandle.volume,
          volatility: marketState.volatility,
          trend: marketState.trend
        },
        technicalIndicators: {
          rsi: marketState.rsi,
          ema12: marketState.ema12,
          ema26: marketState.ema26,
          bollingerUpper: marketState.bollingerUpper,
          bollingerLower: marketState.bollingerLower,
          macd: marketState.macd,
          atr: marketState.atr
        },
        strategyState: {
          currentPosition: performance.currentPosition?.type || 'NONE',
          unrealizedPnL: performance.currentPosition?.unrealizedPnL || 0,
          tradesCount: performance.totalTrades,
          winRate: performance.winRate,
          drawdown: this.calculateDrawdown(performance),
          totalActiveTime: performance.totalActiveTime || 0
        },
        marketRegime: {
          volatilityRegime: this.getVolatilityRegime(marketState.volatility),
          trendStrength: this.getTrendStrength(marketState.trend),
          marketPhase: this.getMarketPhase(candles)
        }
      };

      return rlState;
    } catch (error) {
      console.error(`🧠 Error collecting market state for ${key}:`, error);
      return null;
    }
  }

  /**
   * Process trade result for RL learning
   */
  async processTradeResult(
    strategyName: string,
    timeframe: string,
    trade: CompletedTrade,
    previousState: RLState,
    action: RLAction
  ): Promise<void> {
    const key = `${strategyName}:${timeframe}`;
    
    if (!this.enabledStrategies.has(key)) {
      return; // RL not enabled
    }

    const agent = this.agents.get(key);
    if (!agent) return;

    try {
      // Calculate reward
      const reward = agent.calculateReward(previousState, action, previousState, trade);

      // Create trajectory
      const trajectory: RLTrajectory = {
        state: previousState,
        action: action,
        reward: reward,
        nextState: previousState, // Simplified for now
        done: false
      };

      // Add to agent's memory
      agent.addExperience(trajectory);

      console.log(`🧠 ${key}: Processed trade result, reward=${reward.toFixed(2)}`);
    } catch (error) {
      console.error(`🧠 Error processing trade result for ${key}:`, error);
    }
  }

  /**
   * Get adaptation suggestions for a strategy
   */
  async getAdaptationSuggestions(
    strategyName: string,
    timeframe: string
  ): Promise<RLAction[]> {
    const key = `${strategyName}:${timeframe}`;
    const agent = this.agents.get(key);
    
    if (!agent || !this.enabledStrategies.has(key)) {
      return [];
    }

    // Get current market state
    const currentState = await this.getCurrentMarketState(strategyName, timeframe);
    if (!currentState) return [];

    // Generate action suggestions
    const suggestions: RLAction[] = [];
    
    // Get best action from agent
    const bestAction = await agent.selectAction(currentState);
    suggestions.push(bestAction);

    // Generate alternative actions
    const alternatives = this.generateAlternativeActions(currentState);
    suggestions.push(...alternatives);

    return suggestions;
  }

  /**
   * Calculate market state from candles
   */
  private async calculateMarketState(candles: Candle[], currentPrice: number): Promise<MarketState> {
    const latestCandle = candles[candles.length - 1];
    
    // Calculate RSI
    const rsi = this.calculateRSI(candles.slice(-14));
    
    // Calculate EMAs
    const ema12 = this.calculateEMA(candles.slice(-12), 12);
    const ema26 = this.calculateEMA(candles.slice(-26), 26);
    
    // Calculate Bollinger Bands
    const { upper, lower } = this.calculateBollingerBands(candles.slice(-20));
    
    // Calculate MACD
    const macd = ema12 - ema26;
    
    // Calculate ATR
    const atr = this.calculateATR(candles.slice(-14));
    
    // Calculate volatility
    const volatility = this.calculateVolatility(candles.slice(-20));
    
    // Determine trend
    const trend = this.determineTrend(ema12, ema26, currentPrice);

    return {
      price: currentPrice,
      volume: latestCandle.volume,
      volatility: volatility,
      trend: trend,
      rsi: rsi,
      ema12: ema12,
      ema26: ema26,
      bollingerUpper: upper,
      bollingerLower: lower,
      macd: macd,
      atr: atr
    };
  }

  /**
   * Calculate RSI
   */
  private calculateRSI(candles: Candle[]): number {
    if (candles.length < 2) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / (candles.length - 1);
    const avgLoss = losses / (candles.length - 1);

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate EMA
   */
  private calculateEMA(candles: Candle[], period: number): number {
    if (candles.length === 0) return 0;

    const multiplier = 2 / (period + 1);
    let ema = candles[0].close;

    for (let i = 1; i < candles.length; i++) {
      ema = (candles[i].close * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(candles: Candle[]): { upper: number; lower: number } {
    if (candles.length === 0) return { upper: 0, lower: 0 };

    const prices = candles.map(c => c.close);
    const sma = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    return {
      upper: sma + (2 * stdDev),
      lower: sma - (2 * stdDev)
    };
  }

  /**
   * Calculate ATR
   */
  private calculateATR(candles: Candle[]): number {
    if (candles.length < 2) return 0;

    let trSum = 0;
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      trSum += tr;
    }

    return trSum / (candles.length - 1);
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(candles: Candle[]): number {
    if (candles.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < candles.length; i++) {
      const return_ = (candles[i].close - candles[i - 1].close) / candles[i - 1].close;
      returns.push(return_);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Determine trend
   */
  private determineTrend(ema12: number, ema26: number, currentPrice: number): 'bullish' | 'bearish' | 'sideways' {
    if (ema12 > ema26 && currentPrice > ema12) {
      return 'bullish';
    } else if (ema12 < ema26 && currentPrice < ema12) {
      return 'bearish';
    } else {
      return 'sideways';
    }
  }

  /**
   * Get volatility regime
   */
  private getVolatilityRegime(volatility: number): 'low' | 'medium' | 'high' {
    if (volatility < 0.01) return 'low';
    if (volatility < 0.03) return 'medium';
    return 'high';
  }

  /**
   * Get trend strength
   */
  private getTrendStrength(trend: 'bullish' | 'bearish' | 'sideways'): number {
    switch (trend) {
      case 'bullish': return 1;
      case 'bearish': return -1;
      case 'sideways': return 0;
    }
  }

  /**
   * Get market phase
   */
  private getMarketPhase(candles: Candle[]): 'accumulation' | 'trending' | 'distribution' {
    // Simplified market phase detection
    if (candles.length < 20) return 'trending';
    
    const recentPrices = candles.slice(-20).map(c => c.close);
    const firstHalf = recentPrices.slice(0, 10);
    const secondHalf = recentPrices.slice(10);
    
    const firstAvg = firstHalf.reduce((sum, p) => sum + p, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, p) => sum + p, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (Math.abs(change) < 0.02) return 'accumulation';
    if (change > 0.02) return 'trending';
    return 'distribution';
  }

  /**
   * Generate alternative actions
   */
  private generateAlternativeActions(state: RLState): RLAction[] {
    const alternatives: RLAction[] = [];
    
    // Conservative action
    alternatives.push({
      adjustProfitTarget: 0.05,
      adjustStopLoss: 0.05,
      adjustPositionSize: 0.9,
      adjustCooldown: 30,
      pauseStrategy: false
    });
    
    // Aggressive action
    alternatives.push({
      adjustProfitTarget: -0.1,
      adjustStopLoss: -0.05,
      adjustPositionSize: 1.1,
      adjustCooldown: -15,
      pauseStrategy: false
    });
    
    return alternatives;
  }

  /**
   * Calculate drawdown from strategy performance
   */
  private calculateDrawdown(performance: StrategyPerformance): number {
    // Simple drawdown calculation based on win rate and total trades
    // In a real implementation, this would be calculated from the equity curve
    if (performance.totalTrades === 0) return 0;
    
    const winRate = performance.winRate / 100; // Convert to decimal
    const losingTrades = performance.totalTrades - performance.winningTrades;
    
    // Estimate drawdown based on losing trades ratio
    // This is a simplified calculation - in reality you'd track peak-to-trough
    const estimatedDrawdown = losingTrades > 0 ? (losingTrades / performance.totalTrades) * 0.1 : 0;
    
    return Math.min(estimatedDrawdown, 0.2); // Cap at 20%
  }

  /**
   * Get strategy performance (real implementation with StrategyManager)
   */
  private async getStrategyPerformance(key: string): Promise<StrategyPerformance | null> {
    try {
      // Import StrategyManager dynamically to avoid circular dependencies
      const { StrategyManager } = await import('./strategy-manager');
      const strategyManager = StrategyManager.getGlobalInstance();
      
      if (!strategyManager) {
        console.error('🧠 StrategyManager not available');
        return null;
      }

      // Get all strategy performances
      const performances = strategyManager.getAllPerformances();
      
      // Find the specific strategy performance
      const [strategyName, timeframe] = key.split(':');
      const performance = performances.find((p: StrategyPerformance) => 
        p.strategyName === strategyName && p.timeframe === timeframe
      );

      if (!performance) {
        console.warn(`🧠 Strategy performance not found for ${key}`);
        return null;
      }

      return performance;
    } catch (error) {
      console.error(`🧠 Error getting strategy performance for ${key}:`, error);
      return null;
    }
  }

  /**
   * Get current market state (real implementation with WebSocket data)
   */
  private async getCurrentMarketState(strategyName: string, timeframe: string): Promise<RLState | null> {
    try {
      // Import SharedBinanceWebSocket to get real market data
      const { default: SharedBinanceWebSocket } = await import('./shared-binance-websocket');
      
      // Get WebSocket instance for the timeframe
      const ws = SharedBinanceWebSocket.getInstance(timeframe);
      if (!ws) {
        console.warn(`🧠 WebSocket not available for timeframe ${timeframe}`);
        return null;
      }

      // Get current market data
      const marketData = ws.getCurrentData();
      
      if (!marketData || !marketData.candles || marketData.candles.length < 50) {
        console.warn(`🧠 Insufficient market data for ${strategyName} [${timeframe}]`);
        return null;
      }

      // Use the existing collectMarketState method
      return await this.collectMarketState(strategyName, timeframe, marketData.candles, marketData.currentPrice);
    } catch (error) {
      console.error(`🧠 Error getting current market state for ${strategyName} [${timeframe}]:`, error);
      return null;
    }
  }

  /**
   * Generate adaptation suggestions (real implementation)
   */
  private async generateAdaptationSuggestions(agent: PPOTradingAgent, performance: StrategyPerformance): Promise<RLAction[]> {
    try {
      // Get current market state
      const currentState = await this.getCurrentMarketState(performance.strategyName, performance.timeframe);
      if (!currentState) {
        return [];
      }

      // Generate suggestions based on performance analysis
      const suggestions: RLAction[] = [];

      // Analyze performance and generate targeted suggestions
      if (performance.winRate < 50) {
        // Low win rate - suggest more conservative approach
        suggestions.push({
          adjustProfitTarget: 0.1, // Increase profit target
          adjustStopLoss: 0.05,     // Increase stop loss
          adjustPositionSize: 0.9,  // Reduce position size
          adjustCooldown: 30,       // Increase cooldown
          pauseStrategy: false
        });
      }

      if (performance.totalPnL < 0) {
        // Losing money - suggest pause or more conservative settings
        suggestions.push({
          adjustProfitTarget: 0.15,
          adjustStopLoss: 0.1,
          adjustPositionSize: 0.8,
          adjustCooldown: 60,
          pauseStrategy: performance.totalPnL < -500 // Pause if losing more than 500 USDT
        });
      }

      if (performance.winRate > 70) {
        // High win rate - suggest more aggressive approach
        suggestions.push({
          adjustProfitTarget: -0.05, // Decrease profit target
          adjustStopLoss: -0.02,     // Decrease stop loss
          adjustPositionSize: 1.1,   // Increase position size
          adjustCooldown: -15,       // Decrease cooldown
          pauseStrategy: false
        });
      }

      // Add agent's learned suggestions
      const agentAction = await agent.selectAction(currentState);
      suggestions.push(agentAction);

      return suggestions;
    } catch (error) {
      console.error('🧠 Error generating adaptation suggestions:', error);
      return [];
    }
  }

  /**
   * Get statistics for all agents
   */
  getStats(): { [key: string]: any } {
    const stats: { [key: string]: any } = {};
    
    for (const [key, agent] of this.agents) {
      stats[key] = agent.getStats();
    }
    
    return stats;
  }

  /**
   * Save all agent states
   */
  save(): { [key: string]: any } {
    const saved: { [key: string]: any } = {};
    
    for (const [key, agent] of this.agents) {
      saved[key] = agent.save();
    }
    
    return saved;
  }

  /**
   * Load agent states
   */
  load(data: { [key: string]: any }): void {
    for (const [key, agentData] of Object.entries(data)) {
      const agent = this.agents.get(key);
      if (agent) {
        agent.load(agentData);
      }
    }
  }
}

// Global instance
export const rlLearningManager = new RLLearningManager();
