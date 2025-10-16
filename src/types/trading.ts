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
}

export interface StrategyState {
  candles: Candle[];
  currentPrice: number;
  rsi: number;
  ema12: number;
  ema26: number;
  ema50: number;
  ema200: number;
  // Binance-style moving averages
  ma7: number;
  ma25: number;
  ma99: number;
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
  strategyType: 'RSI_EMA' | 'MOMENTUM_CROSSOVER' | 'VOLUME_MACD' | 'NEURAL_SCALPER' | 'BOLLINGER_BOUNCE' | 'TREND_FOLLOWER';
  totalPnL: number;
  totalTrades: number;
  winningTrades: number;
  winRate: number;
  currentPosition: Position;
  lastSignal: TradingSignal | null;
  signalHistory: TradingSignal[];
  completedTrades?: CompletedTrade[]; // Trades complets (entrée + sortie)
  isActive: boolean;
  currentCapital: number; // Capital actuel (initial + P&L)
  // Strategy-specific flags
  isBullishCrossover?: boolean; // Momentum Crossover
  isBearishCrossover?: boolean; // Momentum Crossover
  isVolumeBreakout?: boolean; // Volume MACD
  isMACDBullish?: boolean; // Volume MACD
  isMACDBearish?: boolean; // Volume MACD
  isPriceAccelerating?: boolean; // Neural Scalper
  isVolatilityHigh?: boolean; // Neural Scalper
  isMomentumStrong?: boolean; // Neural Scalper
  // Neural Scalper detailed values
  velocity?: number; // Vélocité du prix
  acceleration?: number; // Accélération du prix
  rsiMomentum?: number; // Momentum RSI
  volumeSpike?: boolean; // Pic de volume
}

