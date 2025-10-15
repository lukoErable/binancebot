import { BinanceKlineData, Candle, StrategyState } from '@/types/trading';
import WebSocket from 'ws';
import { TradingStrategy, defaultStrategyConfig } from './strategy';

export class BinanceWebSocketManager {
  private ws: WebSocket | null = null;
  private candles: Candle[] = [];
  private strategy: TradingStrategy;
  private state: StrategyState;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private onStateUpdate?: (state: StrategyState) => void;
  private isInitialized = false;
  private timeframe: string = '1m';
  private tradingMode: boolean = false;

  constructor(onStateUpdate?: (state: StrategyState) => void, timeframe: string = '1m', tradingMode: boolean = false) {
    this.timeframe = timeframe;
    this.tradingMode = tradingMode;
    this.strategy = new TradingStrategy(defaultStrategyConfig);
    this.onStateUpdate = onStateUpdate;
    this.state = {
      candles: [],
      currentPrice: 0,
      rsi: 0,
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
        
        // Only process closed candles
        if (kline.x) {
          // Candle is closed, add to our collection
          const newCandle: Candle = {
            time: kline.t,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
            volume: parseFloat(kline.v)
          };

          // Add new candle and keep last 200
          this.candles.push(newCandle);
          if (this.candles.length > 300) {
            this.candles.shift();
          }

          console.log(`📈 New candle closed: ${newCandle.close.toFixed(2)} USDT`);
          
          // Analyze market and check for signals
          this.analyzeAndExecute();
        } else {
          // Update current price in real-time for smooth display
          this.state.currentPrice = parseFloat(kline.c);
          this.state.lastUpdate = Date.now();
          
          // Update the last candle with current price for real-time display
          if (this.candles.length > 0) {
            this.candles[this.candles.length - 1] = {
              ...this.candles[this.candles.length - 1],
              close: parseFloat(kline.c),
              high: Math.max(this.candles[this.candles.length - 1].high, parseFloat(kline.c)),
              low: Math.min(this.candles[this.candles.length - 1].low, parseFloat(kline.c))
            };
          }
          
          // Update state smoothly without full re-analysis
          this.updateState();
        }
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
    }
  }

  /**
   * Analyze market and execute trades if signal detected
   */
  private analyzeAndExecute(): void {
    // Calculer les indicateurs pour l'affichage
    const signal = this.strategy.analyzeMarket(this.candles);
    
    if (signal) {
      // Update state with new signal
      if (signal.type !== 'HOLD') {
        this.state.signals.push(signal);
        // Keep only last 10 signals
        if (this.state.signals.length > 10) {
          this.state.signals.shift();
        }
        // Mettre à jour lastSignal seulement pour les signaux actionnables
        this.state.lastSignal = signal;
        
        // Execute trade seulement si le mode trading est activé
        if (this.tradingMode) {
          this.strategy.executeTrade(signal);
        }
      }
      
      // Toujours mettre à jour les indicateurs
      this.state.rsi = signal.rsi;
      this.state.ema50 = signal.ema50;
      this.state.ema200 = signal.ema200;
      this.state.ma7 = signal.ma7;
      this.state.ma25 = signal.ma25;
      this.state.ma99 = signal.ma99;
      this.state.currentPrice = signal.price;
      
      // Update position information
      const positionInfo = this.strategy.getPositionInfo();
      this.state.currentPosition = positionInfo.position;
      this.state.totalPnL = positionInfo.totalPnL;
      this.state.totalTrades = positionInfo.totalTrades;
      this.state.winningTrades = positionInfo.winningTrades;
      
      // Update state with full chart data
      this.updateState();
    }
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

