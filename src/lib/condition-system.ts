import { IndicatorValues } from './indicator-engine';

/**
 * Condition System - Flexible rule-based trading conditions
 * Allows creating complex trading logic through composable conditions
 */

// === CONDITION TYPES ===

export type ComparisonOperator = 
  | 'GT'       // Greater than
  | 'GTE'      // Greater than or equal
  | 'LT'       // Less than
  | 'LTE'      // Less than or equal
  | 'EQ'       // Equal
  | 'NEQ';     // Not equal

export type LogicalOperator = 
  | 'AND'      // All conditions must be true
  | 'OR'       // At least one condition must be true
  | 'NOT';     // Inverse of condition

export type IndicatorKey = keyof IndicatorValues;

// === CONDITION INTERFACES ===

/**
 * Base condition that compares an indicator against a value or another indicator
 */
export interface ComparisonCondition {
  type: 'comparison';
  indicator: IndicatorKey;
  operator: ComparisonOperator;
  // Value can be a number or another indicator name
  value: number | IndicatorKey;
  description?: string;
}

/**
 * Boolean condition that checks if a boolean indicator is true/false
 */
export interface BooleanCondition {
  type: 'boolean';
  indicator: IndicatorKey;
  value: boolean; // Expected value (true or false)
  description?: string;
}

/**
 * Range condition - checks if indicator is within a range
 */
export interface RangeCondition {
  type: 'range';
  indicator: IndicatorKey;
  min: number;
  max: number;
  description?: string;
}

/**
 * Crossover condition - detects when one indicator crosses above/below another
 * Requires previous indicator values
 */
export interface CrossoverCondition {
  type: 'crossover';
  indicator1: IndicatorKey;
  indicator2: IndicatorKey;
  direction: 'above' | 'below'; // Cross above or cross below
  description?: string;
}

/**
 * Percent change condition - checks if indicator changed by a certain %
 */
export interface PercentChangeCondition {
  type: 'percent_change';
  indicator: IndicatorKey;
  operator: 'GT' | 'LT';
  percent: number; // e.g., 2 for 2%
  lookback: number; // Number of candles to look back (requires history)
  description?: string;
}

/**
 * Union type of all condition types
 */
export type Condition = 
  | ComparisonCondition
  | BooleanCondition
  | RangeCondition
  | CrossoverCondition
  | PercentChangeCondition;

/**
 * Group of conditions with logical operator
 */
export interface ConditionGroup {
  operator: LogicalOperator;
  conditions: (Condition | ConditionGroup)[];
  description?: string;
}

// === CONDITION EVALUATOR ===

export class ConditionEvaluator {
  private previousIndicators: IndicatorValues | null = null;
  
  /**
   * Evaluate a single condition
   */
  evaluateCondition(condition: Condition, indicators: IndicatorValues): boolean {
    switch (condition.type) {
      case 'comparison':
        return this.evaluateComparison(condition, indicators);
      
      case 'boolean':
        return this.evaluateBoolean(condition, indicators);
      
      case 'range':
        return this.evaluateRange(condition, indicators);
      
      case 'crossover':
        return this.evaluateCrossover(condition, indicators);
      
      case 'percent_change':
        return this.evaluatePercentChange(condition, indicators);
      
      default:
        console.warn('Unknown condition type:', (condition as any).type);
        return false;
    }
  }
  
  /**
   * Evaluate a condition group
   */
  evaluateGroup(group: ConditionGroup, indicators: IndicatorValues): boolean {
    // Validation: ensure group and conditions exist
    if (!group || !group.conditions || !Array.isArray(group.conditions)) {
      console.warn('Invalid condition group:', group);
      return false;
    }
    
    if (group.conditions.length === 0) return true;
    
    const results = group.conditions.map(item => {
      if (!item) {
        console.warn('Null/undefined condition in group');
        return false;
      }
      
      if ('operator' in item && 'conditions' in item) {
        // It's a nested group
        return this.evaluateGroup(item as ConditionGroup, indicators);
      } else {
        // It's a condition
        return this.evaluateCondition(item as Condition, indicators);
      }
    });
    
    switch (group.operator) {
      case 'AND':
        return results.every(r => r);
      
      case 'OR':
        return results.some(r => r);
      
      case 'NOT':
        // NOT should only have one condition
        return !results[0];
      
      default:
        return false;
    }
  }
  
  /**
   * Update previous indicators for crossover detection
   */
  updatePreviousIndicators(indicators: IndicatorValues): void {
    this.previousIndicators = { ...indicators };
  }
  
  // === PRIVATE EVALUATION METHODS ===
  
  private evaluateComparison(condition: ComparisonCondition, indicators: IndicatorValues): boolean {
    const leftValue = indicators[condition.indicator];
    
    // Get right value (either a number or another indicator value)
    const rightValue = typeof condition.value === 'number' 
      ? condition.value 
      : indicators[condition.value];
    
    // Handle boolean values
    if (typeof leftValue === 'boolean') {
      return leftValue === Boolean(rightValue);
    }
    
    // Convert to numbers for comparison
    const left = Number(leftValue);
    const right = Number(rightValue);
    
    if (isNaN(left) || isNaN(right)) {
      return false;
    }
    
    switch (condition.operator) {
      case 'GT':
        return left > right;
      case 'GTE':
        return left >= right;
      case 'LT':
        return left < right;
      case 'LTE':
        return left <= right;
      case 'EQ':
        return Math.abs(left - right) < 0.0001; // Floating point comparison
      case 'NEQ':
        return Math.abs(left - right) >= 0.0001;
      default:
        return false;
    }
  }
  
  private evaluateBoolean(condition: BooleanCondition, indicators: IndicatorValues): boolean {
    const value = indicators[condition.indicator];
    
    if (typeof value !== 'boolean') {
      console.warn(`Indicator ${condition.indicator} is not a boolean`);
      return false;
    }
    
    return value === condition.value;
  }
  
  private evaluateRange(condition: RangeCondition, indicators: IndicatorValues): boolean {
    const value = indicators[condition.indicator];
    const numValue = Number(value);
    
    if (isNaN(numValue)) {
      return false;
    }
    
    return numValue >= condition.min && numValue <= condition.max;
  }
  
  private evaluateCrossover(condition: CrossoverCondition, indicators: IndicatorValues): boolean {
    if (!this.previousIndicators) {
      // No previous data, can't detect crossover
      return false;
    }
    
    const currentValue1 = Number(indicators[condition.indicator1]);
    const currentValue2 = Number(indicators[condition.indicator2]);
    const previousValue1 = Number(this.previousIndicators[condition.indicator1]);
    const previousValue2 = Number(this.previousIndicators[condition.indicator2]);
    
    if (isNaN(currentValue1) || isNaN(currentValue2) || 
        isNaN(previousValue1) || isNaN(previousValue2)) {
      return false;
    }
    
    if (condition.direction === 'above') {
      // Indicator1 crosses above Indicator2
      return previousValue1 <= previousValue2 && currentValue1 > currentValue2;
    } else {
      // Indicator1 crosses below Indicator2
      return previousValue1 >= previousValue2 && currentValue1 < currentValue2;
    }
  }
  
  private evaluatePercentChange(condition: PercentChangeCondition, indicators: IndicatorValues): boolean {
    // Note: This requires historical data which we don't have in current implementation
    // For now, we'll use the built-in priceChangePercent if available
    if (condition.indicator === 'price' || condition.indicator === 'priceChangePercent') {
      const changePercent = indicators.priceChangePercent;
      
      if (condition.operator === 'GT') {
        return changePercent > condition.percent;
      } else {
        return changePercent < -condition.percent;
      }
    }
    
    console.warn(`Percent change not available for ${condition.indicator}`);
    return false;
  }
}

// === CONDITION BUILDER HELPERS ===

/**
 * Helper functions to create conditions more easily
 */
export const ConditionBuilder = {
  /**
   * Create a comparison condition
   */
  compare(indicator: IndicatorKey, operator: ComparisonOperator, value: number | IndicatorKey, description?: string): ComparisonCondition {
    return { type: 'comparison', indicator, operator, value, description };
  },
  
  /**
   * Create a boolean condition
   */
  boolean(indicator: IndicatorKey, value: boolean, description?: string): BooleanCondition {
    return { type: 'boolean', indicator, value, description };
  },
  
  /**
   * Create a range condition
   */
  range(indicator: IndicatorKey, min: number, max: number, description?: string): RangeCondition {
    return { type: 'range', indicator, min, max, description };
  },
  
  /**
   * Create a crossover condition
   */
  crossover(indicator1: IndicatorKey, indicator2: IndicatorKey, direction: 'above' | 'below', description?: string): CrossoverCondition {
    return { type: 'crossover', indicator1, indicator2, direction, description };
  },
  
  /**
   * Create a percent change condition
   */
  percentChange(indicator: IndicatorKey, operator: 'GT' | 'LT', percent: number, lookback: number, description?: string): PercentChangeCondition {
    return { type: 'percent_change', indicator, operator, percent, lookback, description };
  },
  
  /**
   * Create an AND group
   */
  and(...conditions: (Condition | ConditionGroup)[]): ConditionGroup {
    return { operator: 'AND', conditions };
  },
  
  /**
   * Create an OR group
   */
  or(...conditions: (Condition | ConditionGroup)[]): ConditionGroup {
    return { operator: 'OR', conditions };
  },
  
  /**
   * Create a NOT group
   */
  not(condition: Condition | ConditionGroup): ConditionGroup {
    return { operator: 'NOT', conditions: [condition] };
  }
};

// === PRESET CONDITIONS (Common patterns) ===

export const PresetConditions = {
  /**
   * RSI Oversold (RSI < 30)
   */
  rsiOversold: (): Condition => 
    ConditionBuilder.compare('rsi', 'LT', 30, 'RSI Oversold (<30)'),
  
  /**
   * RSI Overbought (RSI > 70)
   */
  rsiOverbought: (): Condition => 
    ConditionBuilder.compare('rsi', 'GT', 70, 'RSI Overbought (>70)'),
  
  /**
   * Golden Cross (EMA50 crosses above EMA200)
   */
  goldenCross: (): Condition =>
    ConditionBuilder.crossover('ema50', 'ema200', 'above', 'Golden Cross'),
  
  /**
   * Death Cross (EMA50 crosses below EMA200)
   */
  deathCross: (): Condition =>
    ConditionBuilder.crossover('ema50', 'ema200', 'below', 'Death Cross'),
  
  /**
   * Price above EMA50 (Uptrend)
   */
  priceAboveEMA50: (): Condition =>
    ConditionBuilder.compare('price', 'GT', 'ema50', 'Price > EMA50'),
  
  /**
   * Price below EMA50 (Downtrend)
   */
  priceBelowEMA50: (): Condition =>
    ConditionBuilder.compare('price', 'LT', 'ema50', 'Price < EMA50'),
  
  /**
   * Bullish trend (EMA50 > EMA200)
   */
  bullishTrend: (): Condition =>
    ConditionBuilder.boolean('isBullishTrend', true, 'Bullish Trend'),
  
  /**
   * Bearish trend (EMA50 < EMA200)
   */
  bearishTrend: (): Condition =>
    ConditionBuilder.boolean('isBearishTrend', true, 'Bearish Trend'),
  
  /**
   * High volume (> 1.5x average)
   */
  highVolume: (): Condition =>
    ConditionBuilder.boolean('isHighVolume', true, 'High Volume'),
  
  /**
   * MACD Bullish
   */
  macdBullish: (): Condition =>
    ConditionBuilder.boolean('isMACDBullish', true, 'MACD Bullish'),
  
  /**
   * MACD Bearish
   */
  macdBearish: (): Condition =>
    ConditionBuilder.boolean('isMACDBearish', true, 'MACD Bearish'),
  
  /**
   * Bollinger Bounce Long setup
   */
  bollingerBounceLong: (): ConditionGroup =>
    ConditionBuilder.and(
      ConditionBuilder.boolean('isNearBBLower', true, 'Near BB Lower'),
      ConditionBuilder.compare('rsi', 'LT', 45, 'RSI < 45')
    ),
  
  /**
   * Bollinger Bounce Short setup
   */
  bollingerBounceShort: (): ConditionGroup =>
    ConditionBuilder.and(
      ConditionBuilder.boolean('isNearBBUpper', true, 'Near BB Upper'),
      ConditionBuilder.compare('rsi', 'GT', 55, 'RSI > 55')
    ),
  
  /**
   * Strong momentum (ADX > 25 and trending)
   */
  strongMomentum: (): ConditionGroup =>
    ConditionBuilder.and(
      ConditionBuilder.compare('adx', 'GT', 25, 'ADX > 25'),
      ConditionBuilder.or(
        ConditionBuilder.boolean('isBullishTrend', true),
        ConditionBuilder.boolean('isBearishTrend', true)
      )
    )
};

/**
 * Get a human-readable description of a condition
 */
export function getConditionDescription(condition: Condition | ConditionGroup, indicators?: IndicatorValues): string {
  if ('operator' in condition && 'conditions' in condition) {
    // It's a ConditionGroup
    const subDescriptions = condition.conditions.map((c: Condition | ConditionGroup) => getConditionDescription(c, indicators));
    const connector = condition.operator === 'AND' ? ' AND ' : condition.operator === 'OR' ? ' OR ' : 'NOT ';
    return condition.description || `(${subDescriptions.join(connector)})`;
  }
  
  // It's a Condition
  const cond = condition as Condition;
  
  if (cond.description) {
    return cond.description;
  }
  
  switch (cond.type) {
    case 'comparison': {
      const compCond = cond as ComparisonCondition;
      const rightValue = typeof compCond.value === 'number' 
        ? compCond.value.toString()
        : compCond.value;
      return `${compCond.indicator} ${compCond.operator} ${rightValue}`;
    }
    
    case 'boolean': {
      const boolCond = cond as BooleanCondition;
      return `${boolCond.indicator} = ${boolCond.value}`;
    }
    
    case 'range': {
      const rangeCond = cond as RangeCondition;
      return `${rangeCond.indicator} between ${rangeCond.min} and ${rangeCond.max}`;
    }
    
    case 'crossover': {
      const crossCond = cond as CrossoverCondition;
      return `${crossCond.indicator1} crosses ${crossCond.direction} ${crossCond.indicator2}`;
    }
    
    case 'percent_change': {
      const pctCond = cond as PercentChangeCondition;
      return `${pctCond.indicator} changed ${pctCond.operator === 'GT' ? '>' : '<'} ${pctCond.percent}%`;
    }
    
    default:
      return 'Unknown condition';
  }
}

