import { BinanceKlineData, Candle, StrategyPerformance, StrategyState } from '@/types/trading';
import { EMA, RSI } from 'technicalindicators';
import WebSocket from 'ws';
import { TradingStrategy, defaultStrategyConfig } from './ema-rsi-strategy';
import { IndicatorEngine } from './indicator-engine';
import { StrategyManager } from './strategy-manager';

// Global strategyManager instance for access from API routes
let globalStrategyManager: StrategyManager | null = null;

export function getGlobalStrategyManager(): StrategyManager | null {
  return globalStrategyManager;
}

export class BinanceWebSocketManager {
  private ws: WebSocket | null = null;
  private candles: Candle[] = [];
  private strategy: TradingStrategy;
  private strategyManager: StrategyManager;
  private indicatorEngine: IndicatorEngine;
  private state: StrategyState;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private onStateUpdate?: (state: StrategyState) => void;
  private isInitialized = false;
  private timeframe: string = '1m';
  private tradingMode: boolean = false;
  private isAnalyzing = false; // Flag pour éviter les analyses parallèles

  constructor(onStateUpdate?: (state: StrategyState) => void, timeframe: string = '1m', tradingMode: boolean = false) {
    this.timeframe = timeframe;
    this.tradingMode = tradingMode;
    this.strategy = new TradingStrategy(defaultStrategyConfig);
    this.strategyManager = new StrategyManager();
    this.indicatorEngine = new IndicatorEngine();
    globalStrategyManager = this.strategyManager; // Expose globally
    this.onStateUpdate = onStateUpdate;
    this.state = {
      candles: [],
      currentPrice: 0,
      rsi: 0,
      ema12: 0,
      ema26: 0,
      ema50: 0,
      ema200: 0,
      // Binance-style moving averages
      ma7: 0,
      ma25: 0,
      ma99: 0,
      lastSignal: null,
      signals: [],
      isConnected: false,
      lastUpdate: Date.now(),
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
      winningTrades: 0,
      timeframe: this.timeframe
    };
  }

  /**
   * Initialize by fetching historical candles from Binance REST API
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('📊 Fetching historical candles from Binance...');
    
    try {
      // Charger plus de bougies pour avoir les indicateurs MA(99)
      const limit = 300; // Plus de données pour MA(99)
      
      // Fetch historical candles for the selected timeframe to have enough data for EMA200
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${this.timeframe}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Binance klines API returns array of arrays
      type BinanceKlineArray = [
        number, // Open time
        string, // Open
        string, // High
        string, // Low
        string, // Close
        string, // Volume
        ...unknown[] // Other fields we don't use
      ];
      
      this.candles = (data as BinanceKlineArray[]).map((k) => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }));

      console.log(`✅ Loaded ${this.candles.length} historical candles`);
      this.isInitialized = true;
      
      // Update state with initial data
      this.updateState();
    } catch (error) {
      console.error('❌ Error fetching historical data:', error);
      throw error;
    }
  }

  /**
   * Connect to Binance WebSocket
   */
  async connect(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const wsUrl = `wss://stream.binance.com:9443/ws/btcusdt@kline_${this.timeframe}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        console.log('✅ Connected to Binance WebSocket');
        this.reconnectAttempts = 0;
        this.state.isConnected = true;
        
        // Update P&L for any restored positions with current price
        if (this.state.currentPrice > 0) {
          this.strategyManager.updateAllStrategiesWithCurrentPrice(this.state.currentPrice);
        }
        
        this.updateState();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });

      this.ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        this.state.isConnected = false;
        this.updateState();
        this.handleReconnect();
      });
    } catch (error) {
      console.error('❌ Error connecting to WebSocket:', error);
      throw error;
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message: BinanceKlineData = JSON.parse(data.toString());
      
      if (message.e === 'kline') {
        const kline = message.k;
        
        // Process both closed and in-progress candles for real-time trading
        if (kline.x) {
          // Candle is CLOSED, finalize and add to our collection
          const newCandle: Candle = {
            time: kline.T, // Use close time instead of start time for accurate display
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
            volume: parseFloat(kline.v)
          };

          // Check if this candle already exists to avoid duplicates
          const lastCandle = this.candles[this.candles.length - 1];
          if (lastCandle && lastCandle.time === newCandle.time) {
            // This is a duplicate, just update the last candle
            this.candles[this.candles.length - 1] = newCandle;
            console.log(`📈 Updated candle: ${newCandle.close.toFixed(2)} USDT`);
          } else {
            // This is a new candle
            this.candles.push(newCandle);
            if (this.candles.length > 300) {
              this.candles.shift();
            }
            console.log(`📈 New candle closed: ${newCandle.close.toFixed(2)} USDT`);
          }
          
          // Analyze market and check for signals
          this.analyzeAndExecute().catch(error => {
            console.error('❌ Error in analyzeAndExecute:', error);
          });
        } else {
          // Candle is IN-PROGRESS (not closed yet) - update in real-time
          this.state.currentPrice = parseFloat(kline.c);
          this.state.lastUpdate = Date.now();
          
          // Update the last candle with current price for LIVE trading
          if (this.candles.length > 0) {
            this.candles[this.candles.length - 1] = {
              ...this.candles[this.candles.length - 1],
              close: parseFloat(kline.c),
              high: Math.max(this.candles[this.candles.length - 1].high, parseFloat(kline.h)),
              low: Math.min(this.candles[this.candles.length - 1].low, parseFloat(kline.l)),
              volume: parseFloat(kline.v)
            };
          }
          
          // Update all strategies with current price for real-time P&L calculation
          this.strategyManager.updateAllStrategiesWithCurrentPrice(parseFloat(kline.c));
          
          // REAL-TIME ANALYSIS: Analyze market on EVERY price update (not just closed candles)
          // This is critical for scalping strategies like Neural Scalper
          this.analyzeAndExecute().catch(error => {
            console.error('❌ Error in real-time analyzeAndExecute:', error);
          });
        }
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
    }
  }

  /**
   * Analyze market and execute trades if signal detected
   */
  private async analyzeAndExecute(): Promise<void> {
    // Éviter les exécutions parallèles (évite les duplicates lors du rechargement)
    if (this.isAnalyzing) {
      console.log('⏭️  Analysis already in progress, skipping...');
      return;
    }
    
    this.isAnalyzing = true;
    try {
      // Always analyze with strategy manager for multi-strategy support
      await this.strategyManager.analyzeAllStrategies(this.candles);
    } finally {
      this.isAnalyzing = false;
    }
    
    // Calculate ALL indicators using IndicatorEngine
    const indicators = this.indicatorEngine.calculate(this.candles);
    
    // Get the best performing strategy for display
    const performances = this.strategyManager.getAllPerformances();
    const bestStrategyData = this.strategyManager.getBestStrategy();
    const bestStrategy = bestStrategyData ? bestStrategyData.performance : null;
    
    // Signal saving is now handled by StrategyManager with duplicate checking
    
    // Always calculate and update indicators from the first active strategy
    const activeStrategy = performances.find(p => p.isActive);
    if (activeStrategy && activeStrategy.lastSignal) {
      const signal = activeStrategy.lastSignal;
      
      // Update state with new signal
      if (signal.type !== 'HOLD') {
        this.state.signals.push(signal);
        // Keep only last 10 signals
        if (this.state.signals.length > 10) {
          this.state.signals.shift();
        }
        // Mettre à jour lastSignal seulement pour les signaux actionnables
        this.state.lastSignal = signal;
      }
      
      // Toujours mettre à jour les indicateurs basiques (legacy)
      this.state.rsi = signal.rsi;
      this.state.ema50 = signal.ema50;
      this.state.ema200 = signal.ema200;
      this.state.ma7 = signal.ma7;
      this.state.ma25 = signal.ma25;
      this.state.ma99 = signal.ma99;
      this.state.currentPrice = signal.price;
    }
    
    // Update state with ALL indicators from IndicatorEngine
    this.state.ema12 = indicators.ema12;
    this.state.ema26 = indicators.ema26;
    this.state.ema50 = indicators.ema50;
    this.state.ema100 = indicators.ema100;
    this.state.ema200 = indicators.ema200;
    this.state.sma7 = indicators.sma7;
    this.state.sma25 = indicators.sma25;
    this.state.sma50 = indicators.sma50;
    this.state.sma99 = indicators.sma99;
    this.state.sma200 = indicators.sma200;
    this.state.rsi = indicators.rsi;
    this.state.rsi9 = indicators.rsi9;
    this.state.rsi21 = indicators.rsi21;
    this.state.macd = indicators.macd;
    this.state.macdSignal = indicators.macdSignal;
    this.state.macdHistogram = indicators.macdHistogram;
    this.state.bbUpper = indicators.bbUpper;
    this.state.bbMiddle = indicators.bbMiddle;
    this.state.bbLower = indicators.bbLower;
    this.state.bbWidth = indicators.bbWidth;
    this.state.bbPercent = indicators.bbPercent;
    this.state.atr = indicators.atr;
    this.state.atr14 = indicators.atr14;
    this.state.atr21 = indicators.atr21;
    this.state.stochK = indicators.stochK;
    this.state.stochD = indicators.stochD;
    this.state.adx = indicators.adx;
    this.state.cci = indicators.cci;
    this.state.obv = indicators.obv;
    this.state.volumeSMA20 = indicators.volumeSMA20;
    this.state.volumeRatio = indicators.volumeRatio;
    this.state.priceChangePercent = indicators.priceChangePercent;
    this.state.priceChange24h = indicators.priceChange24h;
    this.state.vwap = indicators.vwap;
    this.state.isBullishTrend = indicators.isBullishTrend;
    this.state.isBearishTrend = indicators.isBearishTrend;
    this.state.isUptrend = indicators.isUptrend;
    this.state.isDowntrend = indicators.isDowntrend;
    this.state.isUptrendConfirmed3 = indicators.isUptrendConfirmed3;
    this.state.isDowntrendConfirmed3 = indicators.isDowntrendConfirmed3;
    this.state.isTrendReversalUp = indicators.isTrendReversalUp;
    this.state.isTrendReversalDown = indicators.isTrendReversalDown;
    this.state.isOversold = indicators.isOversold;
    this.state.isOverbought = indicators.isOverbought;
    this.state.isMACDBullish = indicators.isMACDBullish;
    this.state.isMACDBearish = indicators.isMACDBearish;
    this.state.isMACDCrossoverBullish = indicators.isMACDCrossoverBullish;
    this.state.isMACDCrossoverBearish = indicators.isMACDCrossoverBearish;
    this.state.isEMAFastSlowBullCross = indicators.isEMAFastSlowBullCross;
    this.state.isEMAFastSlowBearCross = indicators.isEMAFastSlowBearCross;
    this.state.isPriceCrossedAboveEMA50 = indicators.isPriceCrossedAboveEMA50;
    this.state.isPriceCrossedBelowEMA50 = indicators.isPriceCrossedBelowEMA50;
    this.state.isHighVolume = indicators.isHighVolume;
    this.state.isLowVolume = indicators.isLowVolume;
    this.state.isPriceAboveVWAP = indicators.isPriceAboveVWAP;
    this.state.isPriceBelowVWAP = indicators.isPriceBelowVWAP;
    this.state.isNearVWAP = indicators.isNearVWAP;
    this.state.isNearBBLower = indicators.isNearBBLower;
    this.state.isNearBBUpper = indicators.isNearBBUpper;
    this.state.isBelowBBLower = indicators.isBelowBBLower;
    this.state.isAboveBBUpper = indicators.isAboveBBUpper;
    this.state.isBullishCandle = indicators.isBullishCandle;
    this.state.isBearishCandle = indicators.isBearishCandle;
    this.state.isBullishEngulfing = indicators.isBullishEngulfing;
    this.state.isBearishEngulfing = indicators.isBearishEngulfing;
    this.state.isDoji = indicators.isDoji;
    this.state.isHammer = indicators.isHammer;
    this.state.isShootingStar = indicators.isShootingStar;
    this.state.currentPrice = indicators.price;
    
    // Update position information from best strategy
    this.state.currentPosition = bestStrategy ? bestStrategy.currentPosition : this.state.currentPosition;
    this.state.totalPnL = bestStrategy ? bestStrategy.totalPnL : this.state.totalPnL;
    this.state.totalTrades = bestStrategy ? bestStrategy.totalTrades : this.state.totalTrades;
    this.state.winningTrades = bestStrategy ? bestStrategy.winningTrades : this.state.winningTrades;
    
    // Update state with full chart data
    this.updateState();
  }

  /**
   * Calculate indicators directly when no strategy signal is available
   */
  private calculateAndUpdateIndicators(): void {
    if (this.candles.length < 200) {
      return; // Need enough data for indicators
    }
    
    const currentPrice = this.candles[this.candles.length - 1].close;
    
    // Calculate RSI
    const rsi = this.calculateRSI(this.candles);
    if (rsi !== null) this.state.rsi = rsi;
    
    // Calculate EMAs (current)
    const ema12 = this.calculateEMA(this.candles, 12);
    if (ema12 !== null) this.state.ema12 = ema12;
    
    const ema26 = this.calculateEMA(this.candles, 26);
    if (ema26 !== null) this.state.ema26 = ema26;
    
    const ema50 = this.calculateEMA(this.candles, 50);
    if (ema50 !== null) this.state.ema50 = ema50;
    
    const ema200 = this.calculateEMA(this.candles, 200);
    if (ema200 !== null) this.state.ema200 = ema200;
    
    // Calculate SMAs
    const ma7 = this.calculateSMA(this.candles, 7);
    if (ma7 !== null) this.state.ma7 = ma7;
    
    const ma25 = this.calculateSMA(this.candles, 25);
    if (ma25 !== null) this.state.ma25 = ma25;
    
    const ma99 = this.calculateSMA(this.candles, 99);
    if (ma99 !== null) this.state.ma99 = ma99;
    
    this.state.currentPrice = currentPrice;
    this.updateState();
  }

  /**
   * Calculate RSI from candle data
   */
  private calculateRSI(candles: Candle[]): number | null {
    if (candles.length < 14) {
      return null;
    }

    const closePrices = candles.map(c => c.close);
    const rsiValues = RSI.calculate({
      values: closePrices,
      period: 14
    });

    return rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;
  }

  /**
   * Calculate EMA from candle data
   */
  private calculateEMA(candles: Candle[], period: number): number | null {
    if (candles.length < period) {
      return null;
    }

    const closePrices = candles.map(c => c.close);
    const emaValues = EMA.calculate({
      values: closePrices,
      period: period
    });

    return emaValues.length > 0 ? emaValues[emaValues.length - 1] : null;
  }

  /**
   * Calculate Simple Moving Average (SMA) like Binance
   */
  private calculateSMA(candles: Candle[], period: number): number | null {
    if (candles.length < period) {
      return null;
    }

    const closePrices = candles.map(c => c.close);
    const recentPrices = closePrices.slice(-period);
    const sum = recentPrices.reduce((acc, price) => acc + price, 0);
    
    return sum / period;
  }

  /**
   * Update and broadcast current state
   */
  private updateState(): void {
    // Garder toutes les bougies pour voir les MA complètes (MA(99) a besoin de 99+ bougies)
    let candlesToKeep = 300; // Toutes les bougies disponibles pour voir MA(99) complète
    
    switch (this.timeframe) {
      case '1m': candlesToKeep = 300; break;   // ~5 heures (MA(99) visible sur 201 bougies)
      case '5m': candlesToKeep = 300; break;   // ~25 heures
      case '15m': candlesToKeep = 300; break;  // ~75 heures  
      case '1h': candlesToKeep = 300; break;   // ~12.5 jours
      case '4h': candlesToKeep = 300; break;   // ~50 jours
      case '1d': candlesToKeep = 300; break;   // ~10 mois
    }
    
    this.state.candles = this.candles.slice(-candlesToKeep);
    this.state.lastUpdate = Date.now();
    
    // Add strategy performances to state
    this.state.strategyPerformances = this.strategyManager.getAllPerformances();
    
    this.notifyStateUpdate();
  }

  /**
   * Notify listeners of state update
   */
  private notifyStateUpdate(): void {
    if (this.onStateUpdate) {
      this.onStateUpdate({ ...this.state });
    }
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  /**
   * Change timeframe without restarting connection
   */
  async changeTimeframe(newTimeframe: string): Promise<void> {
    if (newTimeframe === this.timeframe) return;
    
    console.log(`🔄 Changing timeframe from ${this.timeframe} to ${newTimeframe}`);
    this.timeframe = newTimeframe;
    this.state.timeframe = newTimeframe;
    
    // Re-fetch historical data for new timeframe
    try {
      const limit = 300;
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${this.timeframe}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      type BinanceKlineArray = [
        number, string, string, string, string, string, ...unknown[]
      ];
      
      this.candles = (data as BinanceKlineArray[]).map((k) => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }));

      console.log(`✅ Loaded ${this.candles.length} historical candles for ${this.timeframe}`);
      
      // Keep the same WebSocket connection, just update the data
      // The WebSocket will continue to receive data for the current timeframe
      // and we'll filter/process it according to the new timeframe if needed
      
      // Update state
      this.updateState();
    } catch (error) {
      console.error('❌ Error changing timeframe:', error);
      throw error;
    }
  }

  /**
   * Set trading mode without reconnecting
   */
  setTradingMode(enabled: boolean): void {
    this.tradingMode = enabled;
    console.log(`🔄 Trading mode set to: ${enabled ? 'ACTIVE' : 'MONITORING'}`);
  }

  /**
   * Get all strategy performances
   */
  getStrategyPerformances(): StrategyPerformance[] {
    return this.strategyManager.getAllPerformances();
  }

  /**
   * Toggle a specific strategy
   */
  toggleStrategy(strategyName: string): boolean {
    return this.strategyManager.toggleStrategy(strategyName);
  }

  /**
   * Reset a specific strategy
   */
  async resetStrategy(strategyName: string): Promise<boolean> {
    return await this.strategyManager.resetStrategy(strategyName);
  }

  /**
   * Get current state
   */
  getState(): StrategyState {
    return { ...this.state };
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      console.log('🔌 Disconnected from Binance WebSocket');
    }
  }
}

