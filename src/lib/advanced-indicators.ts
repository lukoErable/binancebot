
/**
 * Advanced Technical Indicators
 * Comprehensive collection of all major technical indicators
 * Organized by category for easy maintenance and usage
 */

// ============================================================================
// 1. TREND INDICATORS - MOVING AVERAGES
// ============================================================================

export interface TrendIndicators {
  // Basic Moving Averages
  sma5: number;
  sma10: number;
  sma20: number;
  sma30: number;
  sma50: number;
  sma100: number;
  sma200: number;
  
  ema5: number;
  ema10: number;
  ema20: number;
  ema30: number;
  ema50: number;
  ema100: number;
  ema200: number;
  
  // Advanced Moving Averages
  wma10: number;    // Weighted Moving Average
  wma20: number;
  hma10: number;    // Hull Moving Average
  hma20: number;
  dema10: number;   // Double EMA
  dema20: number;
  tema10: number;   // Triple EMA
  tema20: number;
  kama10: number;   // Kaufman's Adaptive MA
  kama20: number;
  smma10: number;   // Smoothed MA
  smma20: number;
  zlema10: number;  // Zero-Lag EMA
  zlema20: number;
  alma10: number;   // Arnaud Legoux MA
  alma20: number;
  vwma10: number;   // Volume Weighted MA
  vwma20: number;
  
  // MA Crossovers
  isGoldenCross: boolean;    // SMA50 > SMA200
  isDeathCross: boolean;     // SMA50 < SMA200
  isBullishMA: boolean;      // Price > SMA50
  isBearishMA: boolean;      // Price < SMA50
}

// ============================================================================
// 2. TREND SYSTEMS
// ============================================================================

export interface TrendSystems {
  // MACD Family
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  ppo: number;           // Percentage Price Oscillator
  ppoSignal: number;
  ppoHistogram: number;
  trix: number;          // TRIX indicator
  
  // Directional Movement
  adx: number;           // Average Directional Index
  plusDI: number;        // +DI
  minusDI: number;       // -DI
  viPlus: number;        // Vortex Indicator +
  viMinus: number;       // Vortex Indicator -
  
  // Trend Following
  parabolicSAR: number;  // Parabolic SAR
  supertrend: number;    // Supertrend
  
  // Aroon System
  aroonUp: number;
  aroonDown: number;
  aroonOscillator: number;
}

// ============================================================================
// 3. ICHIMOKU SYSTEM
// ============================================================================

export interface IchimokuIndicators {
  tenkanSen: number;     // Conversion Line
  kijunSen: number;       // Base Line
  chikouSpan: number;     // Lagging Span
  senkouSpanA: number;    // Leading Span A
  senkouSpanB: number;    // Leading Span B
  kumoTop: number;        // Cloud Top
  kumoBottom: number;     // Cloud Bottom
  
  // Ichimoku Signals
  isPriceAboveCloud: boolean;
  isPriceBelowCloud: boolean;
  isPriceInCloud: boolean;
  isTenkanAboveKijun: boolean;
  isTenkanBelowKijun: boolean;
  isBullishIchimoku: boolean;
  isBearishIchimoku: boolean;
}

// ============================================================================
// 4. MOMENTUM OSCILLATORS
// ============================================================================

export interface MomentumIndicators {
  // RSI Family
  rsi: number;
  rsi9: number;
  rsi14: number;
  rsi21: number;
  stochRSI: number;      // Stochastic RSI
  
  // Stochastic Family
  stochK: number;        // %K
  stochD: number;        // %D
  stochKSlow: number;    // Slow %K
  stochDSlow: number;    // Slow %D
  williamsR: number;     // Williams %R
  
  // Other Oscillators
  cci: number;           // Commodity Channel Index
  roc: number;           // Rate of Change
  momentum: number;      // Momentum
  ultimateOscillator: number;
  awesomeOscillator: number;
  cmo: number;           // Chande Momentum Oscillator
  fisherTransform: number;
  coppockCurve: number;
  dpo: number;           // Detrended Price Oscillator
  
  // Momentum Signals
  isOversold: boolean;   // RSI < 30
  isOverbought: boolean;  // RSI > 70
  isMomentumBullish: boolean;
  isMomentumBearish: boolean;
}

// ============================================================================
// 5. VOLATILITY INDICATORS
// ============================================================================

export interface VolatilityIndicators {
  // Bollinger Bands
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbWidth: number;       // Bandwidth
  bbPercent: number;      // %B
  bbSqueeze: boolean;     // Bollinger Squeeze
  
  // Standard Deviation
  standardDeviation: number;
  
  // True Range Family
  trueRange: number;
  atr: number;           // Average True Range
  atr14: number;
  atr21: number;
  natr: number;          // Normalized ATR
  
  // Keltner Channels
  kcUpper: number;
  kcMiddle: number;
  kcLower: number;
  
  // Donchian Channels
  donchianUpper: number;
  donchianMiddle: number;
  donchianLower: number;
  
  // Other Volatility
  chaikinVolatility: number;
  massIndex: number;
  
  // Volatility Signals
  isHighVolatility: boolean;
  isLowVolatility: boolean;
  isVolatilityExpanding: boolean;
  isVolatilityContracting: boolean;
}

// ============================================================================
// 6. VOLUME INDICATORS
// ============================================================================

export interface VolumeIndicators {
  // Basic Volume
  volume: number;
  volumeSMA20: number;
  volumeRatio: number;
  
  // Volume Analysis
  obv: number;           // On-Balance Volume
  vwap: number;          // Volume Weighted Average Price
  vwapUpper: number;     // VWAP + 2*StdDev
  vwapLower: number;      // VWAP - 2*StdDev
  adLine: number;        // Accumulation/Distribution Line
  cmf: number;           // Chaikin Money Flow
  chaikinOscillator: number;
  mfi: number;           // Money Flow Index
  eom: number;           // Ease of Movement
  forceIndex: number;
  nvi: number;           // Negative Volume Index
  pvi: number;           // Positive Volume Index
  
  // Volume Profile
  vpoc: number;          // Volume Point of Control
  vah: number;           // Value Area High
  val: number;           // Value Area Low
  
  // Volume Signals
  isHighVolume: boolean;
  isLowVolume: boolean;
  isVolumeIncreasing: boolean;
  isVolumeDecreasing: boolean;
  isVolumeAboveAverage: boolean;
  isVolumeBelowAverage: boolean;
}

// ============================================================================
// 7. MARKET STRUCTURE & LEVELS
// ============================================================================

export interface MarketStructure {
  // Pivot Points
  pivotPoint: number;
  r1: number;            // Resistance 1
  r2: number;            // Resistance 2
  r3: number;            // Resistance 3
  s1: number;            // Support 1
  s2: number;            // Support 2
  s3: number;            // Support 3
  
  // Fibonacci Levels
  fib236: number;         // 23.6% retracement
  fib382: number;         // 38.2% retracement
  fib500: number;         // 50% retracement
  fib618: number;         // 61.8% retracement
  fib786: number;         // 78.6% retracement
  fib1272: number;        // 127.2% extension
  fib1618: number;        // 161.8% extension
  fib2618: number;        // 261.8% extension
  
  // Fractals
  fractalHigh: number;
  fractalLow: number;
  isFractalHigh: boolean;
  isFractalLow: boolean;
  
  // Alligator (Bill Williams)
  alligatorJaw: number;   // SMMA(13) shifted 8
  alligatorTeeth: number; // SMMA(8) shifted 5
  alligatorLips: number;  // SMMA(5) shifted 3
  gatorOscillator: number;
  
  // Heikin Ashi
  heikinAshiOpen: number;
  heikinAshiHigh: number;
  heikinAshiLow: number;
  heikinAshiClose: number;
  
  // Correlation
  correlation: number;    // Correlation with another asset
  beta: number;          // Beta coefficient
}

// ============================================================================
// 8. COMBINED INDICATOR VALUES
// ============================================================================

export interface AdvancedIndicatorValues extends 
  TrendIndicators,
  TrendSystems,
  IchimokuIndicators,
  MomentumIndicators,
  VolatilityIndicators,
  VolumeIndicators,
  MarketStructure {
  
  // Price Data
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  
  // Price Changes
  priceChange: number;
  priceChangePercent: number;
  priceChange24h: number;
  
  // Market State
  isBullMarket: boolean;
  isBearMarket: boolean;
  isSidewaysMarket: boolean;
  isTrending: boolean;
  isRanging: boolean;
  
  // Overall Signals
  overallBullish: boolean;
  overallBearish: boolean;
  overallNeutral: boolean;
  
  // Strength Indicators
  trendStrength: number;    // 0-100
  momentumStrength: number;  // 0-100
  volatilityStrength: number; // 0-100
  volumeStrength: number;   // 0-100
}

// ============================================================================
// 9. INDICATOR CATEGORIES FOR UI
// ============================================================================

export const INDICATOR_CATEGORIES = {
  TREND: {
    id: 'trend',
    name: 'Trend Indicators',
    description: 'Moving averages and trend-following indicators',
    color: 'text-blue-400',
    indicators: [
      'sma5', 'sma10', 'sma20', 'sma50', 'sma100', 'sma200',
      'ema5', 'ema10', 'ema20', 'ema50', 'ema100', 'ema200',
      'wma10', 'wma20', 'hma10', 'hma20', 'dema10', 'dema20',
      'tema10', 'tema20', 'kama10', 'kama20', 'alma10', 'alma20',
      'vwma10', 'vwma20', 'isGoldenCross', 'isDeathCross'
    ]
  },
  
  MOMENTUM: {
    id: 'momentum',
    name: 'Momentum Oscillators',
    description: 'RSI, Stochastic, and momentum indicators',
    color: 'text-green-400',
    indicators: [
      'rsi', 'rsi9', 'rsi14', 'rsi21', 'stochRSI',
      'stochK', 'stochD', 'stochKSlow', 'stochDSlow',
      'williamsR', 'cci', 'roc', 'momentum', 'ultimateOscillator',
      'awesomeOscillator', 'cmo', 'fisherTransform', 'coppockCurve'
    ]
  },
  
  VOLATILITY: {
    id: 'volatility',
    name: 'Volatility Indicators',
    description: 'Bollinger Bands, ATR, and volatility measures',
    color: 'text-yellow-400',
    indicators: [
      'bbUpper', 'bbMiddle', 'bbLower', 'bbWidth', 'bbPercent',
      'standardDeviation', 'atr', 'atr14', 'atr21', 'natr',
      'kcUpper', 'kcMiddle', 'kcLower', 'donchianUpper', 'donchianMiddle',
      'donchianLower', 'chaikinVolatility', 'massIndex'
    ]
  },
  
  VOLUME: {
    id: 'volume',
    name: 'Volume Indicators',
    description: 'Volume analysis and money flow indicators',
    color: 'text-purple-400',
    indicators: [
      'volume', 'volumeSMA20', 'volumeRatio', 'obv', 'vwap',
      'vwapUpper', 'vwapLower', 'adLine', 'cmf', 'chaikinOscillator',
      'mfi', 'eom', 'forceIndex', 'nvi', 'pvi', 'vpoc', 'vah', 'val'
    ]
  },
  
  ICHIMOKU: {
    id: 'ichimoku',
    name: 'Ichimoku System',
    description: 'Complete Ichimoku Kinko Hyo system',
    color: 'text-cyan-400',
    indicators: [
      'tenkanSen', 'kijunSen', 'chikouSpan', 'senkouSpanA', 'senkouSpanB',
      'kumoTop', 'kumoBottom', 'isPriceAboveCloud', 'isPriceBelowCloud',
      'isPriceInCloud', 'isTenkanAboveKijun', 'isTenkanBelowKijun'
    ]
  },
  
  SYSTEMS: {
    id: 'systems',
    name: 'Trading Systems',
    description: 'MACD, ADX, and other trading systems',
    color: 'text-orange-400',
    indicators: [
      'macd', 'macdSignal', 'macdHistogram', 'ppo', 'ppoSignal', 'ppoHistogram',
      'trix', 'adx', 'plusDI', 'minusDI', 'viPlus', 'viMinus',
      'parabolicSAR', 'supertrend', 'aroonUp', 'aroonDown', 'aroonOscillator'
    ]
  },
  
  STRUCTURE: {
    id: 'structure',
    name: 'Market Structure',
    description: 'Pivot points, Fibonacci, and market levels',
    color: 'text-pink-400',
    indicators: [
      'pivotPoint', 'r1', 'r2', 'r3', 's1', 's2', 's3',
      'fib236', 'fib382', 'fib500', 'fib618', 'fib786',
      'fib1272', 'fib1618', 'fib2618', 'fractalHigh', 'fractalLow',
      'alligatorJaw', 'alligatorTeeth', 'alligatorLips', 'gatorOscillator'
    ]
  }
};

export default {
  INDICATOR_CATEGORIES
};
