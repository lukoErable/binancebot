import { CustomStrategyConfig } from './custom-strategy';
import CustomStrategyRepository from './db/custom-strategy-repository';

/**
 * Default strategies that are created for new users
 */
const DEFAULT_STRATEGIES: Omit<CustomStrategyConfig, 'timeframe'>[] = [
  {
    name: 'RSI Momentum',
    strategyType: 'CUSTOM',
    description: 'Simple RSI-based momentum strategy',
    longNotes: 'Buy when RSI is oversold (<30)',
    shortNotes: 'Sell when RSI is overbought (>70)',
    strategyLogic: 'BOTH',
    longEntryConditions: {
      conditions: [
        { type: 'comparison', indicator: 'rsi', operator: 'LT', value: 30 }
      ],
      operator: 'AND'
    },
    shortEntryConditions: {
      conditions: [
        { type: 'comparison', indicator: 'rsi', operator: 'GT', value: 70 }
      ],
      operator: 'AND'
    },
    longExitConditions: {
      conditions: [
        { type: 'comparison', indicator: 'rsi', operator: 'GT', value: 50 }
      ],
      operator: 'OR'
    },
    shortExitConditions: {
      conditions: [
        { type: 'comparison', indicator: 'rsi', operator: 'LT', value: 50 }
      ],
      operator: 'OR'
    },
    profitTargetPercent: 2,
    stopLossPercent: 1,
    maxPositionTime: 60 * 60 * 1000, // 1 hour
    positionSize: 0.1,
    cooldownPeriod: 5 * 60 * 1000, // 5 minutes
    simulationMode: false,
    color: 'blue'
  },
  {
    name: 'EMA Crossover',
    strategyType: 'CUSTOM',
    description: 'Classic EMA crossover strategy',
    longNotes: 'Buy when EMA12 crosses above EMA26',
    shortNotes: 'Sell when EMA12 crosses below EMA26',
    strategyLogic: 'BOTH',
    longEntryConditions: {
      conditions: [
        { type: 'comparison', indicator: 'ema12', operator: 'GT', value: 'ema26' }
      ],
      operator: 'AND'
    },
    shortEntryConditions: {
      conditions: [
        { type: 'comparison', indicator: 'ema12', operator: 'LT', value: 'ema26' }
      ],
      operator: 'AND'
    },
    longExitConditions: {
      conditions: [
        { type: 'comparison', indicator: 'ema12', operator: 'LT', value: 'ema26' }
      ],
      operator: 'OR'
    },
    shortExitConditions: {
      conditions: [
        { type: 'comparison', indicator: 'ema12', operator: 'GT', value: 'ema26' }
      ],
      operator: 'OR'
    },
    profitTargetPercent: 1.5,
    stopLossPercent: 0.75,
    maxPositionTime: 30 * 60 * 1000, // 30 minutes
    positionSize: 0.1,
    cooldownPeriod: 3 * 60 * 1000, // 3 minutes
    simulationMode: false,
    color: 'green'
  },
  {
    name: 'Trend Following',
    strategyType: 'CUSTOM',
    description: 'Multi-timeframe trend following',
    longNotes: 'Buy when price > EMA50 and RSI > 50',
    shortNotes: 'Sell when price < EMA50 and RSI < 50',
    strategyLogic: 'BOTH',
    longEntryConditions: {
      conditions: [
        { type: 'comparison', indicator: 'price', operator: 'GT', value: 'ema50' },
        { type: 'comparison', indicator: 'rsi', operator: 'GT', value: 50 }
      ],
      operator: 'AND'
    },
    shortEntryConditions: {
      conditions: [
        { type: 'comparison', indicator: 'price', operator: 'LT', value: 'ema50' },
        { type: 'comparison', indicator: 'rsi', operator: 'LT', value: 50 }
      ],
      operator: 'AND'
    },
    longExitConditions: {
      conditions: [
        { type: 'comparison', indicator: 'price', operator: 'LT', value: 'ema50' }
      ],
      operator: 'OR'
    },
    shortExitConditions: {
      conditions: [
        { type: 'comparison', indicator: 'price', operator: 'GT', value: 'ema50' }
      ],
      operator: 'OR'
    },
    profitTargetPercent: 3,
    stopLossPercent: 1.5,
    maxPositionTime: 120 * 60 * 1000, // 2 hours
    positionSize: 0.1,
    cooldownPeriod: 10 * 60 * 1000, // 10 minutes
    simulationMode: false,
    color: 'purple'
  }
];

/**
 * Initialize default strategies for a new user
 * Creates the 3 default strategies on the '1m' timeframe
 */
export async function initializeDefaultStrategies(userEmail: string): Promise<void> {
  try {
    console.log(`🎯 Initializing default strategies for ${userEmail}...`);
    
    for (const strategy of DEFAULT_STRATEGIES) {
      const config: CustomStrategyConfig = {
        ...strategy,
        timeframe: '1m',
        isActive: false // Start inactive
      };
      
      await CustomStrategyRepository.saveCustomStrategy(config, userEmail);
      console.log(`✅ Created default strategy: ${strategy.name} for ${userEmail}`);
    }
    
    console.log(`🎉 All default strategies created for ${userEmail}!`);
  } catch (error) {
    console.error(`❌ Error initializing default strategies for ${userEmail}:`, error);
    throw error;
  }
}

/**
 * Check if a user has any strategies
 */
export async function hasStrategies(userEmail: string): Promise<boolean> {
  try {
    const strategies = await CustomStrategyRepository.getAllCustomStrategies(true, userEmail);
    return strategies.length > 0;
  } catch (error) {
    console.error(`❌ Error checking strategies for ${userEmail}:`, error);
    return false;
  }
}

