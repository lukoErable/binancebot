import { Candle } from '@/types/trading';
import WebSocket from 'ws';
import { IndicatorEngine, IndicatorValues } from './indicator-engine';

/**
 * Shared Binance WebSocket - One connection per timeframe, shared among all users
 * This prevents hitting Binance rate limits and reduces server load
 */

interface WebSocketData {
  candles: Candle[];
  indicators: IndicatorValues;
  currentPrice: number;
  timeframe: string;
  lastUpdate: number;
}

type SubscriberCallback = (data: WebSocketData) => void;

class SharedBinanceWebSocket {
  private static instances: Map<string, SharedBinanceWebSocket> = new Map();
  
  private ws: WebSocket | null = null;
  private subscribers: Set<SubscriberCallback> = new Set();
  private candles: Candle[] = [];
  private indicators: IndicatorEngine;
  private latestData: WebSocketData | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private isConnecting = false;
  
  private constructor(private timeframe: string) {
    this.indicators = new IndicatorEngine();
    console.log(`🌐 [SHARED] Creating shared WebSocket for ${timeframe}`);
    this.initialize();
  }
  
  /**
   * Get singleton instance for a timeframe
   */
  static getInstance(timeframe: string): SharedBinanceWebSocket {
    if (!this.instances.has(timeframe)) {
      this.instances.set(timeframe, new SharedBinanceWebSocket(timeframe));
    }
    return this.instances.get(timeframe)!;
  }
  
  /**
   * Get all active instances
   */
  static getAllInstances(): Map<string, SharedBinanceWebSocket> {
    return this.instances;
  }
  
  /**
   * Initialize WebSocket connection
   */
  private async initialize(): Promise<void> {
    try {
      // Fetch historical candles first
      await this.fetchHistoricalCandles();
      
      // Then connect to live stream
      this.connect();
    } catch (error) {
      console.error(`❌ [SHARED ${this.timeframe}] Initialization failed:`, error);
    }
  }
  
  /**
   * Fetch historical candles from Binance
   */
  private async fetchHistoricalCandles(): Promise<void> {
    try {
      const limit = 300;
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${this.timeframe}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.candles = data.map((kline: any) => ({
        time: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5])
      }));
      
      console.log(`✅ [SHARED ${this.timeframe}] Loaded ${this.candles.length} historical candles`);
      
      // Calculate initial indicators
      if (this.candles.length >= 200) {
        const indicatorValues = this.indicators.calculate(this.candles);
        this.latestData = {
          candles: this.candles,
          indicators: indicatorValues,
          currentPrice: this.candles[this.candles.length - 1].close,
          timeframe: this.timeframe,
          lastUpdate: Date.now()
        };
      }
    } catch (error) {
      console.error(`❌ [SHARED ${this.timeframe}] Failed to fetch historical candles:`, error);
    }
  }
  
  /**
   * Connect to Binance WebSocket
   */
  private connect(): void {
    if (this.isConnecting) return;
    this.isConnecting = true;
    
    try {
      const stream = `btcusdt@kline_${this.timeframe}`;
      this.ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}`);
      
      this.ws.on('open', () => {
        console.log(`✅ [SHARED ${this.timeframe}] Connected to Binance (${this.subscribers.size} subscribers)`);
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      });
      
      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });
      
      this.ws.on('error', (error) => {
        console.error(`❌ [SHARED ${this.timeframe}] WebSocket error:`, error.message);
        this.isConnecting = false;
      });
      
      this.ws.on('close', () => {
        console.log(`🔌 [SHARED ${this.timeframe}] Connection closed`);
        this.isConnecting = false;
        this.attemptReconnect();
      });
    } catch (error) {
      console.error(`❌ [SHARED ${this.timeframe}] Connection failed:`, error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }
  
  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.e === 'kline') {
        const kline = message.k;
        const newCandle: Candle = {
          time: kline.t,
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
          volume: parseFloat(kline.v)
        };
        
        // Update or add candle
        const lastCandle = this.candles[this.candles.length - 1];
        if (lastCandle && lastCandle.time === newCandle.time) {
          this.candles[this.candles.length - 1] = newCandle;
        } else {
          this.candles.push(newCandle);
          if (this.candles.length > 300) {
            this.candles.shift();
          }
          console.log(`📈 [SHARED ${this.timeframe}] New candle: ${newCandle.close.toFixed(2)} USDT`);
        }
        
        // Calculate indicators ONCE for all users
        if (this.candles.length >= 200) {
          const indicatorValues = this.indicators.calculate(this.candles);
          
          this.latestData = {
            candles: this.candles,
            indicators: indicatorValues,
            currentPrice: newCandle.close,
            timeframe: this.timeframe,
            lastUpdate: Date.now()
          };
          
          // Broadcast to all subscribers
          this.broadcast(this.latestData);
        }
      }
    } catch (error) {
      console.error(`❌ [SHARED ${this.timeframe}] Error handling message:`, error);
    }
  }
  
  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ [SHARED ${this.timeframe}] Max reconnection attempts reached`);
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`🔄 [SHARED ${this.timeframe}] Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }
  
  /**
   * Subscribe to this shared WebSocket
   * Returns unsubscribe function
   */
  subscribe(callback: SubscriberCallback): () => void {
    this.subscribers.add(callback);
    console.log(`👤 [SHARED ${this.timeframe}] New subscriber (total: ${this.subscribers.size})`);
    
    // Send latest data immediately
    if (this.latestData) {
      callback(this.latestData);
    }
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
      console.log(`👋 [SHARED ${this.timeframe}] Subscriber left (remaining: ${this.subscribers.size})`);
      
      // If no more subscribers, we could close the WebSocket (optional)
      // For now, we keep it running to avoid reconnection overhead
    };
  }
  
  /**
   * Broadcast data to all subscribers
   */
  private broadcast(data: WebSocketData): void {
    // Always update latestData, even with no subscribers (for daemon)
    this.latestData = data;
    
    if (this.subscribers.size === 0) return;
    
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ [SHARED ${this.timeframe}] Error broadcasting to subscriber:`, error);
      }
    });
  }
  
  /**
   * Get current data (for immediate access)
   */
  getCurrentData(): WebSocketData | null {
    return this.latestData;
  }
  
  /**
   * Get subscriber count
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }
  
  /**
   * Disconnect (cleanup)
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    console.log(`🔌 [SHARED ${this.timeframe}] Disconnected`);
  }
}

export default SharedBinanceWebSocket;

