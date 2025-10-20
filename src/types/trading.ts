export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  type: 'LONG' | 'SHORT' | 'NONE';
  entryPrice: number;
  entryTime: number;
  quantity: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  totalPnL?: number;
  totalPnLPercent?: number;
  fees?: number;
  currentCapital?: number;
}

export interface TradingSignal {
  type: 'BUY' | 'SELL' | 'HOLD' | 'CLOSE_LONG' | 'CLOSE_SHORT';
  timestamp: number;
  price: number;
  rsi: number;
  ema12: number;
  ema26: number;
  ema50: number;
  ema200: number;
  // Binance-style moving averages
  ma7: number;
  ma25: number;
  ma99: number;
  reason: string;
  position?: Position;
  // Optional signal metadata used by some strategies (e.g., Bollinger)
  strength?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface CompletedTrade {
  id?: number;
  strategyName: string;
  strategyType: string;
  type: 'LONG' | 'SHORT'; // Type de position
  entryPrice: number;
  entryTime: number;
  exitPrice: number;
  exitTime: number;
  quantity: number;
  pnl: number; // Profit/Loss en USDT
  pnlPercent: number; // Profit/Loss en %
  fees: number;
  duration: number; // Durée en ms
  exitReason: string; // TP, SL, Trend Reversal, etc.
  entryReason: string;
  isWin: boolean;
  timeframe: string; // Timeframe on which this trade was executed (1m, 5m, 15m, 1h, 4h, 1d)
}

export interface StrategyState {
  candles: Candle[];
  currentPrice: number;
  
  // Basic indicators (legacy)
  rsi: number;
  ema12: number;
  ema26: number;
  ema50: number;
  ema200: number;
  ma7: number;
  ma25: number;
  ma99: number;
  
  // All IndicatorEngine values (for CUSTOM strategies)
  // Moving Averages
  ema100?: number;
  sma7?: number;
  sma25?: number;
  sma50?: number;
  sma99?: number;
  sma200?: number;
  
  // Momentum Indicators
  rsi9?: number;
  rsi21?: number;
  
  // MACD
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  
  // Bollinger Bands
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  bbWidth?: number;
  bbPercent?: number;
  
  // Volatility
  atr?: number;
  atr14?: number;
  atr21?: number;
  
  // Stochastic
  stochK?: number;
  stochD?: number;
  
  // Trend Strength
  adx?: number;
  
  // Others
  cci?: number;
  obv?: number;
  
  // Volume Analysis
  volumeSMA20?: number;
  volumeRatio?: number;
  
  // Price Position
  priceChangePercent?: number;
  priceChange24h?: number;
  vwap?: number;
  
  // Trend Detection (Boolean)
  isBullishTrend?: boolean;
  isBearishTrend?: boolean;
  isUptrend?: boolean;
  isDowntrend?: boolean;
  // Trend Confirmation (Boolean)
  isUptrendConfirmed3?: boolean;
  isDowntrendConfirmed3?: boolean;
  // Trend Reversal (Boolean)
  isTrendReversalUp?: boolean;
  isTrendReversalDown?: boolean;
  
  // Momentum (Boolean)
  isOversold?: boolean;
  isOverbought?: boolean;
  
  // MACD Signals (Boolean)
  isMACDBullish?: boolean;
  isMACDBearish?: boolean;
  isMACDCrossoverBullish?: boolean;
  isMACDCrossoverBearish?: boolean;
  isEMAFastSlowBullCross?: boolean;
  isEMAFastSlowBearCross?: boolean;
  isPriceCrossedAboveEMA50?: boolean;
  isPriceCrossedBelowEMA50?: boolean;
  
  // Volume (Boolean)
  isHighVolume?: boolean;
  isLowVolume?: boolean;
  isPriceAboveVWAP?: boolean;
  isPriceBelowVWAP?: boolean;
  isNearVWAP?: boolean;
  
  // Bollinger Bands Signals (Boolean)
  isNearBBLower?: boolean;
  isNearBBUpper?: boolean;
  isBelowBBLower?: boolean;
  isAboveBBUpper?: boolean;
  
  // Candle Patterns (Boolean)
  isBullishCandle?: boolean;
  isBearishCandle?: boolean;
  isBullishEngulfing?: boolean;
  isBearishEngulfing?: boolean;
  isDoji?: boolean;
  isHammer?: boolean;
  isShootingStar?: boolean;
  
  lastSignal: TradingSignal | null;
  signals: TradingSignal[];
  isConnected: boolean;
  lastUpdate: number;
  currentPosition: Position;
  totalPnL: number;
  totalTrades: number;
  winningTrades: number;
  timeframe: string;
  strategyPerformances?: StrategyPerformance[];
}

export interface BinanceKlineData {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  k: {
    t: number; // Kline start time
    T: number; // Kline close time
    s: string; // Symbol
    i: string; // Interval
    f: number; // First trade ID
    L: number; // Last trade ID
    o: string; // Open price
    c: string; // Close price
    h: string; // High price
    l: string; // Low price
    v: string; // Base asset volume
    n: number; // Number of trades
    x: boolean; // Is this kline closed?
    q: string; // Quote asset volume
    V: string; // Taker buy base asset volume
    Q: string; // Taker buy quote asset volume
    B: string; // Ignore
  };
}

export interface StrategyConfig {
  rsiPeriod: number;
  ema50Period: number;
  ema200Period: number;
  rsiBuyThreshold: number;
  rsiSellThreshold: number;
  cooldownPeriod: number; // milliseconds between trades
  simulationMode: boolean;
  // Position management
  profitTargetPercent: number; // % profit to take
  stopLossPercent: number; // % loss to stop
  maxPositionTime: number; // max time in position (ms)
  positionSize: number; // quantity to trade
  // Momentum Crossover strategy parameters
  emaFastPeriod?: number; // Fast EMA for crossover (default: 12)
  emaSlowPeriod?: number; // Slow EMA for crossover (default: 26)
}

export interface StrategyPerformance {
  strategyName: string;
  strategyType: 'RSI_EMA' | 'MOMENTUM_CROSSOVER' | 'VOLUME_MACD' | 'BOLLINGER_BOUNCE' | 'TREND_FOLLOWER' | 'ATR_PULLBACK' | 'CUSTOM';
  timeframe: string; // Timeframe on which this strategy is running (e.g., '1m', '5m', '15m')
  totalPnL: number;
  totalTrades: number;
  winningTrades: number;
  winRate: number;
  currentPosition: Position;
  completedTrades?: CompletedTrade[]; // Trades complets (entrée + sortie)
  isActive: boolean;
  activatedAt?: number | null; // Timestamp when strategy was last activated (null if inactive)
  totalActiveTime?: number; // Cumulative active time in seconds
  currentCapital: number; // Capital actuel (initial + P&L)
  // Strategy config (TP, SL, Max Position) - null = désactivé
  config?: {
    profitTargetPercent?: number | null;
    stopLossPercent?: number | null;
    maxPositionTime?: number | null;
  };
  // CUSTOM strategy full config (for displaying indicators and color)
  customConfig?: any; // CustomStrategyConfig from custom-strategy.ts
  // Strategy-specific flags
  isBullishCrossover?: boolean; // Momentum Crossover
  isBearishCrossover?: boolean; // Momentum Crossover
  isVolumeBreakout?: boolean; // Volume MACD
  isMACDBullish?: boolean; // Volume MACD
  isMACDBearish?: boolean; // Volume MACD
  // Additional flags used by some strategies
  isPriceAccelerating?: boolean;
  isVolatilityHigh?: boolean;
  isMomentumStrong?: boolean;
}

