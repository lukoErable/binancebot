import { Candle } from '@/types/trading';
import {
    ADX,
    ATR,
    BollingerBands,
    CCI,
    EMA,
    MACD,
    OBV,
    RSI,
    Stochastic
} from 'technicalindicators';

/**
 * Centralized Indicator Engine
 * Calculates all technical indicators once per candle update
 * Avoids duplicate calculations across multiple strategies
 */

export interface IndicatorValues {
  // Price-based
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  
  // Moving Averages
  ema12: number;
  ema26: number;
  ema50: number;
  ema100: number;
  ema200: number;
  sma7: number;
  sma25: number;
  sma50: number;
  sma99: number;
  sma200: number;
  
  // Momentum Indicators
  rsi: number;
  rsi9: number;
  rsi21: number;
  
  // MACD
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  
  // Bollinger Bands
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbWidth: number; // Volatility measure
  bbPercent: number; // %B - Where price is within bands
  
  // Volatility
  atr: number;
  atr14: number;
  atr21: number;
  
  // Stochastic
  stochK: number;
  stochD: number;
  
  // Trend Strength
  adx: number;
  
  // Others
  cci: number;
  obv: number;
  
  // Volume Analysis
  volumeSMA20: number;
  volumeRatio: number; // Current volume vs average
  
  // Price Position
  priceChangePercent: number; // % change from previous candle
  priceChange24h: number; // % change over 24h (if available)
  vwap: number; // Volume Weighted Average Price (session)
  
  // Trend Detection
  isBullishTrend: boolean; // EMA50 > EMA200
  isBearishTrend: boolean; // EMA50 < EMA200
  isUptrend: boolean; // Price > EMA50
  isDowntrend: boolean; // Price < EMA50
  // Trend Confirmation (Price vs EMA50 for last 3 closes)
  isUptrendConfirmed3: boolean;
  isDowntrendConfirmed3: boolean;
  // Trend Reversals
  isTrendReversalUp: boolean; // Confirmed downtrend -> confirmed uptrend
  isTrendReversalDown: boolean; // Confirmed uptrend -> confirmed downtrend
  
  // Momentum
  isOversold: boolean; // RSI < 30
  isOverbought: boolean; // RSI > 70
  
  // MACD Signals
  isMACDBullish: boolean; // MACD > Signal
  isMACDBearish: boolean; // MACD < Signal
  isMACDCrossoverBullish: boolean; // Recent bullish crossover
  isMACDCrossoverBearish: boolean; // Recent bearish crossover
  // EMA Crossovers
  isEMAFastSlowBullCross: boolean; // EMA12 crossed above EMA26 this candle
  isEMAFastSlowBearCross: boolean; // EMA12 crossed below EMA26 this candle
  // Price/EMA Cross
  isPriceCrossedAboveEMA50: boolean;
  isPriceCrossedBelowEMA50: boolean;
  
  // Volume
  isHighVolume: boolean; // Volume > 1.5x average
  isLowVolume: boolean; // Volume < 0.5x average
  // VWAP Signals
  isPriceAboveVWAP: boolean;
  isPriceBelowVWAP: boolean;
  isNearVWAP: boolean; // within 0.5%
  
  // Bollinger Bands Signals
  isNearBBLower: boolean; // Price within 2% of lower band
  isNearBBUpper: boolean; // Price within 2% of upper band
  isBelowBBLower: boolean; // Price below lower band
  isAboveBBUpper: boolean; // Price above upper band
  
  // Candle Patterns (simplified)
  isBullishCandle: boolean;
  isBearishCandle: boolean;
  isBullishEngulfing: boolean; // Simple pattern detection
  isBearishEngulfing: boolean;
  isDoji: boolean;
  isHammer: boolean;
  isShootingStar: boolean;
}

export class IndicatorEngine {
  private lastIndicators: IndicatorValues | null = null;
  private previousCandles: Candle[] = [];
  
  /**
   * Calculate all indicators for the given candles
   * @param candles - Array of candles (minimum 200 for all indicators)
   * @returns IndicatorValues object with all calculated indicators
   */
  calculate(candles: Candle[]): IndicatorValues {
    if (candles.length < 200) {
      throw new Error(`Need at least 200 candles, got ${candles.length}`);
    }
    
    const currentCandle = candles[candles.length - 1];
    const previousCandle = candles.length > 1 ? candles[candles.length - 2] : currentCandle;
    const closePrices = candles.map(c => c.close);
    const highPrices = candles.map(c => c.high);
    const lowPrices = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);
    
    // === MOVING AVERAGES ===
    const ema12 = this.calculateEMA(closePrices, 12);
    const ema26 = this.calculateEMA(closePrices, 26);
    const ema50 = this.calculateEMA(closePrices, 50);
    const ema100 = this.calculateEMA(closePrices, 100);
    const ema200 = this.calculateEMA(closePrices, 200);
    
    const sma7 = this.calculateSMA(closePrices, 7);
    const sma25 = this.calculateSMA(closePrices, 25);
    const sma50 = this.calculateSMA(closePrices, 50);
    const sma99 = this.calculateSMA(closePrices, 99);
    const sma200 = this.calculateSMA(closePrices, 200);
    
    // === RSI ===
    const rsi = this.calculateRSI(closePrices, 14);
    const rsi9 = this.calculateRSI(closePrices, 9);
    const rsi21 = this.calculateRSI(closePrices, 21);
    
    // === MACD ===
    const macdResult = this.calculateMACD(closePrices);
    
    // === BOLLINGER BANDS ===
    const bbResult = this.calculateBollingerBands(closePrices, 20, 2);
    const bbWidth = ((bbResult.upper - bbResult.lower) / bbResult.middle) * 100;
    const bbPercent = ((currentCandle.close - bbResult.lower) / (bbResult.upper - bbResult.lower)) * 100;
    
    // === ATR ===
    const atr = this.calculateATR(candles, 14);
    const atr14 = atr;
    const atr21 = this.calculateATR(candles, 21);
    
    // === STOCHASTIC ===
    const stochResult = this.calculateStochastic(candles, 14, 3, 3);
    
    // === VWAP (session) ===
    let cumPV = 0;
    let cumVol = 0;
    for (const c of candles) {
      const typicalPrice = (c.high + c.low + c.close) / 3;
      cumPV += typicalPrice * c.volume;
      cumVol += c.volume;
    }
    const vwap = cumVol > 0 ? (cumPV / cumVol) : currentCandle.close;
    
    // === ADX ===
    const adx = this.calculateADX(candles, 14);
    
    // === CCI ===
    const cci = this.calculateCCI(candles, 20);
    
    // === OBV ===
    const obv = this.calculateOBV(candles);
    
    // === VOLUME ANALYSIS ===
    const volumeSMA20 = this.calculateSMA(volumes, 20);
    const volumeRatio = currentCandle.volume / volumeSMA20;
    
    // === PRICE CHANGES ===
    const priceChangePercent = ((currentCandle.close - previousCandle.close) / previousCandle.close) * 100;
    const candle24hAgo = candles.length >= 24 ? candles[candles.length - 24] : candles[0];
    const priceChange24h = ((currentCandle.close - candle24hAgo.close) / candle24hAgo.close) * 100;
    
    // === TREND DETECTION ===
    const isBullishTrend = ema50 > ema200;
    const isBearishTrend = ema50 < ema200;
    const isUptrend = currentCandle.close > ema50;
    const isDowntrend = currentCandle.close < ema50;
    // Confirmed trend on last 3 closes vs EMA50 of their respective candles
    const ema50Series = EMA.calculate({ values: closePrices, period: 50 });
    const ema50_last = ema50Series[ema50Series.length - 1] ?? ema50;
    const ema50_prev1 = ema50Series[ema50Series.length - 2] ?? ema50_last;
    const ema50_prev2 = ema50Series[ema50Series.length - 3] ?? ema50_prev1;
    const close1 = candles[candles.length - 1]?.close ?? currentCandle.close;
    const close2 = candles[candles.length - 2]?.close ?? close1;
    const close3 = candles[candles.length - 3]?.close ?? close2;
    const isUptrendConfirmed3 = close1 > ema50_last && close2 > ema50_prev1 && close3 > ema50_prev2;
    const isDowntrendConfirmed3 = close1 < ema50_last && close2 < ema50_prev1 && close3 < ema50_prev2;
    const prevConfirmedUp = this.lastIndicators?.isUptrendConfirmed3 || false;
    const prevConfirmedDown = this.lastIndicators?.isDowntrendConfirmed3 || false;
    const isTrendReversalUp = prevConfirmedDown && isUptrendConfirmed3;
    const isTrendReversalDown = prevConfirmedUp && isDowntrendConfirmed3;
    
    // === MOMENTUM ===
    const isOversold = rsi < 30;
    const isOverbought = rsi > 70;
    
    // === MACD SIGNALS ===
    const isMACDBullish = macdResult.macd > macdResult.signal;
    const isMACDBearish = macdResult.macd < macdResult.signal;
    
    // Detect crossovers (check previous values)
    const prevMACDResult = this.lastIndicators 
      ? { macd: this.lastIndicators.macd, signal: this.lastIndicators.macdSignal }
      : { macd: 0, signal: 0 };
    
    const isMACDCrossoverBullish = !this.lastIndicators || (
      prevMACDResult.macd <= prevMACDResult.signal && 
      macdResult.macd > macdResult.signal
    );
    
    const isMACDCrossoverBearish = !this.lastIndicators || (
      prevMACDResult.macd >= prevMACDResult.signal && 
      macdResult.macd < macdResult.signal
    );
    
    // === EMA FAST/SLOW CROSS (12/26) ===
    const prevEma12 = this.calculateEMA(closePrices.slice(0, -1), 12);
    const prevEma26 = this.calculateEMA(closePrices.slice(0, -1), 26);
    const isEMAFastSlowBullCross = prevEma12 <= prevEma26 && ema12 > ema26;
    const isEMAFastSlowBearCross = prevEma12 >= prevEma26 && ema12 < ema26;
    
    // === PRICE/EMA50 CROSS ===
    const prevClose = previousCandle.close;
    const prevEma50 = EMA.calculate({ values: closePrices.slice(0, -1), period: 50 }).slice(-1)[0] ?? ema50;
    const isPriceCrossedAboveEMA50 = prevClose <= prevEma50 && currentCandle.close > ema50;
    const isPriceCrossedBelowEMA50 = prevClose >= prevEma50 && currentCandle.close < ema50;
    
    // === VOLUME ===
    const isHighVolume = volumeRatio > 1.5;
    const isLowVolume = volumeRatio < 0.5;
    
    // === VWAP SIGNALS ===
    const isPriceAboveVWAP = currentCandle.close > vwap;
    const isPriceBelowVWAP = currentCandle.close < vwap;
    const isNearVWAP = Math.abs((currentCandle.close - vwap) / (vwap || 1)) < 0.005;
    
    // === BOLLINGER BANDS SIGNALS ===
    const distanceToLower = ((currentCandle.close - bbResult.lower) / bbResult.lower) * 100;
    const distanceToUpper = ((bbResult.upper - currentCandle.close) / bbResult.upper) * 100;
    
    const isNearBBLower = distanceToLower < 2 && distanceToLower > 0;
    const isNearBBUpper = distanceToUpper < 2 && distanceToUpper > 0;
    const isBelowBBLower = currentCandle.close < bbResult.lower;
    const isAboveBBUpper = currentCandle.close > bbResult.upper;
    
    // === CANDLE PATTERNS ===
    const bodySize = Math.abs(currentCandle.close - currentCandle.open);
    const candleRange = currentCandle.high - currentCandle.low;
    const upperWick = currentCandle.high - Math.max(currentCandle.open, currentCandle.close);
    const lowerWick = Math.min(currentCandle.open, currentCandle.close) - currentCandle.low;
    
    const isBullishCandle = currentCandle.close > currentCandle.open;
    const isBearishCandle = currentCandle.close < currentCandle.open;
    
    const prevBodySize = Math.abs(previousCandle.close - previousCandle.open);
    const isBullishEngulfing = isBullishCandle && 
      previousCandle.close < previousCandle.open &&
      currentCandle.open < previousCandle.close &&
      currentCandle.close > previousCandle.open;
    
    const isBearishEngulfing = isBearishCandle &&
      previousCandle.close > previousCandle.open &&
      currentCandle.open > previousCandle.close &&
      currentCandle.close < previousCandle.open;
    
    const isDoji = bodySize < (candleRange * 0.1);
    
    const isHammer = isBullishCandle &&
      lowerWick > (bodySize * 2) &&
      upperWick < (bodySize * 0.5);
    
    const isShootingStar = isBearishCandle &&
      upperWick > (bodySize * 2) &&
      lowerWick < (bodySize * 0.5);
    
    // Build result
    const indicators: IndicatorValues = {
      // Price
      price: currentCandle.close,
      open: currentCandle.open,
      high: currentCandle.high,
      low: currentCandle.low,
      volume: currentCandle.volume,
      
      // Moving Averages
      ema12,
      ema26,
      ema50,
      ema100,
      ema200,
      sma7,
      sma25,
      sma50,
      sma99,
      sma200,
      
      // RSI
      rsi,
      rsi9,
      rsi21,
      
      // MACD
      macd: macdResult.macd,
      macdSignal: macdResult.signal,
      macdHistogram: macdResult.histogram,
      
      // Bollinger Bands
      bbUpper: bbResult.upper,
      bbMiddle: bbResult.middle,
      bbLower: bbResult.lower,
      bbWidth,
      bbPercent,
      
      // ATR
      atr,
      atr14,
      atr21,
      
      // Stochastic
      stochK: stochResult.k,
      stochD: stochResult.d,
      
      // ADX
      adx,
      
      // Others
      cci,
      obv,
      
      // Volume
      volumeSMA20,
      volumeRatio,
      
      // Price Changes
      priceChangePercent,
      priceChange24h,
      vwap,
      
      // Trend
      isBullishTrend,
      isBearishTrend,
      isUptrend,
      isDowntrend,
      isUptrendConfirmed3,
      isDowntrendConfirmed3,
      isTrendReversalUp,
      isTrendReversalDown,
      
      // Momentum
      isOversold,
      isOverbought,
      
      // MACD Signals
      isMACDBullish,
      isMACDBearish,
      isMACDCrossoverBullish,
      isMACDCrossoverBearish,
      isEMAFastSlowBullCross,
      isEMAFastSlowBearCross,
      isPriceCrossedAboveEMA50,
      isPriceCrossedBelowEMA50,
      
      // Volume
      isHighVolume,
      isLowVolume,
      isPriceAboveVWAP,
      isPriceBelowVWAP,
      isNearVWAP,
      
      // Bollinger Bands
      isNearBBLower,
      isNearBBUpper,
      isBelowBBLower,
      isAboveBBUpper,
      
      // Candle Patterns
      isBullishCandle,
      isBearishCandle,
      isBullishEngulfing,
      isBearishEngulfing,
      isDoji,
      isHammer,
      isShootingStar
    };
    
    // Save for next iteration (for crossover detection)
    this.lastIndicators = indicators;
    this.previousCandles = candles;
    
    return indicators;
  }
  
  // === HELPER CALCULATION METHODS ===
  
  private calculateEMA(values: number[], period: number): number {
    if (values.length < period) return values[values.length - 1];
    
    const emaValues = EMA.calculate({ values, period });
    return emaValues[emaValues.length - 1];
  }
  
  private calculateSMA(values: number[], period: number): number {
    if (values.length < period) return values[values.length - 1];
    
    const recentValues = values.slice(-period);
    return recentValues.reduce((sum, v) => sum + v, 0) / period;
  }
  
  private calculateRSI(values: number[], period: number): number {
    if (values.length < period) return 50;
    
    const rsiValues = RSI.calculate({ values, period });
    return rsiValues[rsiValues.length - 1] || 50;
  }
  
  private calculateMACD(values: number[]): { macd: number; signal: number; histogram: number } {
    if (values.length < 26) return { macd: 0, signal: 0, histogram: 0 };
    
    const macdValues = MACD.calculate({
      values,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });
    
    if (macdValues.length === 0) return { macd: 0, signal: 0, histogram: 0 };
    
    const last = macdValues[macdValues.length - 1];
    return {
      macd: last.MACD || 0,
      signal: last.signal || 0,
      histogram: last.histogram || 0
    };
  }
  
  private calculateBollingerBands(values: number[], period: number, stdDev: number): { upper: number; middle: number; lower: number } {
    if (values.length < period) {
      const price = values[values.length - 1];
      return { upper: price, middle: price, lower: price };
    }
    
    const bbValues = BollingerBands.calculate({
      values,
      period,
      stdDev
    });
    
    if (bbValues.length === 0) {
      const price = values[values.length - 1];
      return { upper: price, middle: price, lower: price };
    }
    
    const last = bbValues[bbValues.length - 1];
    return {
      upper: last.upper,
      middle: last.middle,
      lower: last.lower
    };
  }
  
  private calculateATR(candles: Candle[], period: number): number {
    if (candles.length < period) return 0;
    
    const atrValues = ATR.calculate({
      high: candles.map(c => c.high),
      low: candles.map(c => c.low),
      close: candles.map(c => c.close),
      period
    });
    
    return atrValues[atrValues.length - 1] || 0;
  }
  
  private calculateStochastic(candles: Candle[], period: number, signalPeriod: number, smoothPeriod: number): { k: number; d: number } {
    if (candles.length < period) return { k: 50, d: 50 };
    
    const stochValues = Stochastic.calculate({
      high: candles.map(c => c.high),
      low: candles.map(c => c.low),
      close: candles.map(c => c.close),
      period,
      signalPeriod
    });
    
    if (stochValues.length === 0) return { k: 50, d: 50 };
    
    const last = stochValues[stochValues.length - 1];
    return {
      k: last.k || 50,
      d: last.d || 50
    };
  }
  
  private calculateADX(candles: Candle[], period: number): number {
    if (candles.length < period * 2) return 0;
    
    const adxValues = ADX.calculate({
      high: candles.map(c => c.high),
      low: candles.map(c => c.low),
      close: candles.map(c => c.close),
      period
    });
    
    return adxValues[adxValues.length - 1]?.adx || 0;
  }
  
  private calculateCCI(candles: Candle[], period: number): number {
    if (candles.length < period) return 0;
    
    const cciValues = CCI.calculate({
      high: candles.map(c => c.high),
      low: candles.map(c => c.low),
      close: candles.map(c => c.close),
      period
    });
    
    return cciValues[cciValues.length - 1] || 0;
  }
  
  private calculateOBV(candles: Candle[]): number {
    if (candles.length < 2) return 0;
    
    const obvValues = OBV.calculate({
      close: candles.map(c => c.close),
      volume: candles.map(c => c.volume)
    });
    
    return obvValues[obvValues.length - 1] || 0;
  }
  
  /**
   * Get the last calculated indicators (useful for comparison)
   */
  getLastIndicators(): IndicatorValues | null {
    return this.lastIndicators;
  }
}

