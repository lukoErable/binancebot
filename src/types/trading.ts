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
}

export interface TradingSignal {
  type: 'BUY' | 'SELL' | 'HOLD' | 'CLOSE_LONG' | 'CLOSE_SHORT';
  timestamp: number;
  price: number;
  rsi: number;
  ema50: number;
  ema200: number;
  // Binance-style moving averages
  ma7: number;
  ma25: number;
  ma99: number;
  reason: string;
  position?: Position;
}

export interface StrategyState {
  candles: Candle[];
  currentPrice: number;
  rsi: number;
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
}

