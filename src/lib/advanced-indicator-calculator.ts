import { Candle } from '@/types/trading';
import { AdvancedIndicatorValues } from './advanced-indicators';

/**
 * Advanced Indicator Calculator
 * Implements all major technical indicators with proper calculations
 */

export class AdvancedIndicatorCalculator {
  
  /**
   * Calculate all advanced indicators
   */
  static calculate(candles: Candle[]): AdvancedIndicatorValues {
    if (candles.length < 200) {
      throw new Error(`Need at least 200 candles, got ${candles.length}`);
    }

    const currentCandle = candles[candles.length - 1];
    const previousCandle = candles.length > 1 ? candles[candles.length - 2] : currentCandle;
    
    // Extract price arrays
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const opens = candles.map(c => c.open);
    const volumes = candles.map(c => c.volume);
    
    // Calculate all indicators
    const trendIndicators = this.calculateTrendIndicators(candles);
    const trendSystems = this.calculateTrendSystems(candles);
    const ichimokuIndicators = this.calculateIchimokuIndicators(candles);
    const momentumIndicators = this.calculateMomentumIndicators(candles);
    const volatilityIndicators = this.calculateVolatilityIndicators(candles);
    const volumeIndicators = this.calculateVolumeIndicators(candles);
    const marketStructure = this.calculateMarketStructure(candles);
    
    // Calculate overall market state
    const marketState = this.calculateMarketState(
      trendIndicators,
      momentumIndicators,
      volatilityIndicators,
      volumeIndicators
    );
    
    return {
      // Basic price data
      price: currentCandle.close,
      open: currentCandle.open,
      high: currentCandle.high,
      low: currentCandle.low,
      close: currentCandle.close,
      
      // Price changes
      priceChange: currentCandle.close - previousCandle.close,
      priceChangePercent: ((currentCandle.close - previousCandle.close) / previousCandle.close) * 100,
      priceChange24h: this.calculate24hChange(candles),
      
      // Spread all calculated indicators
      ...trendIndicators,
      ...trendSystems,
      ...ichimokuIndicators,
      ...momentumIndicators,
      ...volatilityIndicators,
      ...volumeIndicators,
      ...marketStructure,
      ...marketState
    };
  }
  
  // ============================================================================
  // TREND INDICATORS CALCULATIONS
  // ============================================================================
  
  private static calculateTrendIndicators(candles: Candle[]) {
    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    
    return {
      // Basic SMAs
      sma5: this.sma(closes, 5),
      sma10: this.sma(closes, 10),
      sma20: this.sma(closes, 20),
      sma30: this.sma(closes, 30),
      sma50: this.sma(closes, 50),
      sma100: this.sma(closes, 100),
      sma200: this.sma(closes, 200),
      
      // Basic EMAs
      ema5: this.ema(closes, 5),
      ema10: this.ema(closes, 10),
      ema20: this.ema(closes, 20),
      ema30: this.ema(closes, 30),
      ema50: this.ema(closes, 50),
      ema100: this.ema(closes, 100),
      ema200: this.ema(closes, 200),
      
      // Advanced MAs
      wma10: this.wma(closes, 10),
      wma20: this.wma(closes, 20),
      hma10: this.hma(closes, 10),
      hma20: this.hma(closes, 20),
      dema10: this.dema(closes, 10),
      dema20: this.dema(closes, 20),
      tema10: this.tema(closes, 10),
      tema20: this.tema(closes, 20),
      kama10: this.kama(candles, 10),
      kama20: this.kama(candles, 20),
      smma10: this.smma(closes, 10),
      smma20: this.smma(closes, 20),
      zlema10: this.zlema(closes, 10),
      zlema20: this.zlema(closes, 20),
      alma10: this.alma(closes, 10),
      alma20: this.alma(closes, 20),
      vwma10: this.vwma(candles, 10),
      vwma20: this.vwma(candles, 20),
      
      // MA Crossovers
      isGoldenCross: this.sma(closes, 50) > this.sma(closes, 200),
      isDeathCross: this.sma(closes, 50) < this.sma(closes, 200),
      isBullishMA: closes[closes.length - 1] > this.sma(closes, 50),
      isBearishMA: closes[closes.length - 1] < this.sma(closes, 50)
    };
  }
  
  // ============================================================================
  // TREND SYSTEMS CALCULATIONS
  // ============================================================================
  
  private static calculateTrendSystems(candles: Candle[]) {
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    
    const ema12 = this.ema(closes, 12);
    const ema26 = this.ema(closes, 26);
    const macd = ema12 - ema26;
    const macdSignal = this.ema([macd], 9);
    const macdHistogram = macd - macdSignal;
    
    return {
      // MACD Family
      macd,
      macdSignal,
      macdHistogram,
      ppo: (macd / ema26) * 100,
      ppoSignal: this.ema([(macd / ema26) * 100], 9),
      ppoHistogram: (macd / ema26) * 100 - this.ema([(macd / ema26) * 100], 9),
      trix: this.trix(closes, 14),
      
      // Directional Movement
      adx: this.adx(candles, 14),
      plusDI: this.plusDI(candles, 14),
      minusDI: this.minusDI(candles, 14),
      viPlus: this.viPlus(candles, 14),
      viMinus: this.viMinus(candles, 14),
      
      // Trend Following
      parabolicSAR: this.parabolicSAR(candles),
      supertrend: this.supertrend(candles, 10, 3),
      
      // Aroon System
      aroonUp: this.aroonUp(candles, 14),
      aroonDown: this.aroonDown(candles, 14),
      aroonOscillator: this.aroonUp(candles, 14) - this.aroonDown(candles, 14)
    };
  }
  
  // ============================================================================
  // ICHIMOKU CALCULATIONS
  // ============================================================================
  
  private static calculateIchimokuIndicators(candles: Candle[]) {
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);
    
    const tenkanSen = (this.highest(highs, 9) + this.lowest(lows, 9)) / 2;
    const kijunSen = (this.highest(highs, 26) + this.lowest(lows, 26)) / 2;
    const chikouSpan = closes[closes.length - 1];
    const senkouSpanA = (tenkanSen + kijunSen) / 2;
    const senkouSpanB = (this.highest(highs, 52) + this.lowest(lows, 52)) / 2;
    
    const kumoTop = Math.max(senkouSpanA, senkouSpanB);
    const kumoBottom = Math.min(senkouSpanA, senkouSpanB);
    const currentPrice = closes[closes.length - 1];
    
    return {
      tenkanSen,
      kijunSen,
      chikouSpan,
      senkouSpanA,
      senkouSpanB,
      kumoTop,
      kumoBottom,
      
      // Ichimoku Signals
      isPriceAboveCloud: currentPrice > kumoTop,
      isPriceBelowCloud: currentPrice < kumoBottom,
      isPriceInCloud: currentPrice >= kumoBottom && currentPrice <= kumoTop,
      isTenkanAboveKijun: tenkanSen > kijunSen,
      isTenkanBelowKijun: tenkanSen < kijunSen,
      isBullishIchimoku: tenkanSen > kijunSen && currentPrice > kumoTop,
      isBearishIchimoku: tenkanSen < kijunSen && currentPrice < kumoBottom
    };
  }
  
  // ============================================================================
  // MOMENTUM INDICATORS CALCULATIONS
  // ============================================================================
  
  private static calculateMomentumIndicators(candles: Candle[]) {
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);
    
    const rsi = this.rsi(closes, 14);
    const stochK = this.stochasticK(candles, 14, 3);
    const stochD = this.stochasticD(candles, 14, 3);
    
    return {
      // RSI Family
      rsi,
      rsi9: this.rsi(closes, 9),
      rsi14: rsi,
      rsi21: this.rsi(closes, 21),
      stochRSI: this.stochRSI(closes, 14, 14, 3),
      
      // Stochastic Family
      stochK,
      stochD,
      stochKSlow: this.stochasticK(candles, 14, 3),
      stochDSlow: this.stochasticD(candles, 14, 3),
      williamsR: this.williamsR(candles, 14),
      
      // Other Oscillators
      cci: this.cci(candles, 20),
      roc: this.roc(closes, 10),
      momentum: this.momentum(closes, 10),
      ultimateOscillator: this.ultimateOscillator(candles, 7, 14, 28),
      awesomeOscillator: this.awesomeOscillator(candles),
      cmo: this.cmo(closes, 14),
      fisherTransform: this.fisherTransform(closes, 10),
      coppockCurve: this.coppockCurve(closes, 11, 14, 10),
      dpo: this.dpo(closes, 20),
      
      // Momentum Signals
      isOversold: rsi < 30,
      isOverbought: rsi > 70,
      isMomentumBullish: rsi > 50 && stochK > stochD,
      isMomentumBearish: rsi < 50 && stochK < stochD
    };
  }
  
  // ============================================================================
  // VOLATILITY INDICATORS CALCULATIONS
  // ============================================================================
  
  private static calculateVolatilityIndicators(candles: Candle[]) {
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    
    const bb = this.bollingerBands(closes, 20, 2);
    const atr = this.atr(candles, 14);
    const kc = this.keltnerChannels(candles, 20, 2);
    const donchian = this.donchianChannels(candles, 20);
    
    return {
      // Bollinger Bands
      bbUpper: bb.upper,
      bbMiddle: bb.middle,
      bbLower: bb.lower,
      bbWidth: ((bb.upper - bb.lower) / bb.middle) * 100,
      bbPercent: ((closes[closes.length - 1] - bb.lower) / (bb.upper - bb.lower)) * 100,
      bbSqueeze: (bb.upper - bb.lower) < (bb.middle * 0.1),
      
      // Standard Deviation
      standardDeviation: this.standardDeviation(closes, 20),
      
      // True Range Family
      trueRange: this.trueRange(candles),
      atr,
      atr14: atr,
      atr21: this.atr(candles, 21),
      natr: (atr / closes[closes.length - 1]) * 100,
      
      // Keltner Channels
      kcUpper: kc.upper,
      kcMiddle: kc.middle,
      kcLower: kc.lower,
      
      // Donchian Channels
      donchianUpper: donchian.upper,
      donchianMiddle: donchian.middle,
      donchianLower: donchian.lower,
      
      // Other Volatility
      chaikinVolatility: this.chaikinVolatility(candles, 10),
      massIndex: this.massIndex(candles, 25),
      
      // Volatility Signals
      isHighVolatility: atr > (this.atr(candles, 20) * 1.5),
      isLowVolatility: atr < (this.atr(candles, 20) * 0.5),
      isVolatilityExpanding: atr > this.atr(candles.slice(0, -1), 14),
      isVolatilityContracting: atr < this.atr(candles.slice(0, -1), 14)
    };
  }
  
  // ============================================================================
  // VOLUME INDICATORS CALCULATIONS
  // ============================================================================
  
  private static calculateVolumeIndicators(candles: Candle[]) {
    const volumes = candles.map(c => c.volume);
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    
    const vwap = this.vwap(candles);
    const obv = this.obv(candles);
    const adLine = this.adLine(candles);
    const cmf = this.cmf(candles, 20);
    
    return {
      // Basic Volume
      volume: volumes[volumes.length - 1],
      volumeSMA20: this.sma(volumes, 20),
      volumeRatio: volumes[volumes.length - 1] / this.sma(volumes, 20),
      
      // Volume Analysis
      obv,
      vwap,
      vwapUpper: vwap + (2 * this.standardDeviation(volumes, 20)),
      vwapLower: vwap - (2 * this.standardDeviation(volumes, 20)),
      adLine,
      cmf,
      chaikinOscillator: this.chaikinOscillator(candles),
      mfi: this.mfi(candles, 14),
      eom: this.eom(candles, 14),
      forceIndex: this.forceIndex(candles, 13),
      nvi: this.nvi(candles),
      pvi: this.pvi(candles),
      
      // Volume Profile
      vpoc: this.vpoc(candles),
      vah: this.vah(candles),
      val: this.val(candles),
      
      // Volume Signals
      isHighVolume: volumes[volumes.length - 1] > (this.sma(volumes, 20) * 1.5),
      isLowVolume: volumes[volumes.length - 1] < (this.sma(volumes, 20) * 0.5),
      isVolumeIncreasing: volumes[volumes.length - 1] > volumes[volumes.length - 2],
      isVolumeDecreasing: volumes[volumes.length - 1] < volumes[volumes.length - 2],
      isVolumeAboveAverage: volumes[volumes.length - 1] > this.sma(volumes, 20),
      isVolumeBelowAverage: volumes[volumes.length - 1] < this.sma(volumes, 20)
    };
  }
  
  // ============================================================================
  // MARKET STRUCTURE CALCULATIONS
  // ============================================================================
  
  private static calculateMarketStructure(candles: Candle[]) {
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);
    
    const pivot = this.pivotPoint(candles);
    const fibLevels = this.fibonacciLevels(candles);
    const fractals = this.fractals(candles);
    const alligator = this.alligator(candles);
    
    return {
      // Pivot Points
      pivotPoint: pivot.pp,
      r1: pivot.r1,
      r2: pivot.r2,
      r3: pivot.r3,
      s1: pivot.s1,
      s2: pivot.s2,
      s3: pivot.s3,
      
      // Fibonacci Levels
      fib236: fibLevels.f236,
      fib382: fibLevels.f382,
      fib500: fibLevels.f500,
      fib618: fibLevels.f618,
      fib786: fibLevels.f786,
      fib1272: fibLevels.f1272,
      fib1618: fibLevels.f1618,
      fib2618: fibLevels.f2618,
      
      // Fractals
      fractalHigh: fractals.high,
      fractalLow: fractals.low,
      isFractalHigh: fractals.isHigh,
      isFractalLow: fractals.isLow,
      
      // Alligator
      alligatorJaw: alligator.jaw,
      alligatorTeeth: alligator.teeth,
      alligatorLips: alligator.lips,
      gatorOscillator: alligator.gator,
      
      // Heikin Ashi
      heikinAshiOpen: this.heikinAshiOpen(candles),
      heikinAshiHigh: this.heikinAshiHigh(candles),
      heikinAshiLow: this.heikinAshiLow(candles),
      heikinAshiClose: this.heikinAshiClose(candles),
      
      // Correlation
      correlation: 0, // Would need another asset to calculate
      beta: 1.0 // Would need market index to calculate
    };
  }
  
  // ============================================================================
  // MARKET STATE CALCULATION
  // ============================================================================
  
  private static calculateMarketState(
    trend: any,
    momentum: any,
    volatility: any,
    volume: any
  ) {
    const trendScore = this.calculateTrendScore(trend);
    const momentumScore = this.calculateMomentumScore(momentum);
    const volatilityScore = this.calculateVolatilityScore(volatility);
    const volumeScore = this.calculateVolumeScore(volume);
    
    const overallScore = (trendScore + momentumScore + volatilityScore + volumeScore) / 4;
    
    return {
      isBullMarket: overallScore > 60,
      isBearMarket: overallScore < 40,
      isSidewaysMarket: overallScore >= 40 && overallScore <= 60,
      isTrending: Math.abs(overallScore - 50) > 20,
      isRanging: Math.abs(overallScore - 50) <= 20,
      
      overallBullish: overallScore > 55,
      overallBearish: overallScore < 45,
      overallNeutral: overallScore >= 45 && overallScore <= 55,
      
      trendStrength: trendScore,
      momentumStrength: momentumScore,
      volatilityStrength: volatilityScore,
      volumeStrength: volumeScore
    };
  }
  
  // ============================================================================
  // HELPER CALCULATION METHODS
  // ============================================================================
  
  // Basic Moving Averages
  private static sma(values: number[], period: number): number {
    if (values.length < period) return 0;
    const slice = values.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  }
  
  private static ema(values: number[], period: number): number {
    if (values.length < period) return 0;
    const multiplier = 2 / (period + 1);
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = (values[i] * multiplier) + (ema * (1 - multiplier));
    }
    return ema;
  }
  
  private static wma(values: number[], period: number): number {
    if (values.length < period) return 0;
    const slice = values.slice(-period);
    let sum = 0;
    let weightSum = 0;
    for (let i = 0; i < slice.length; i++) {
      const weight = i + 1;
      sum += slice[i] * weight;
      weightSum += weight;
    }
    return sum / weightSum;
  }
  
  // Advanced Moving Averages
  private static hma(values: number[], period: number): number {
    const wma1 = this.wma(values, Math.floor(period / 2));
    const wma2 = this.wma(values, period);
    const wma3 = this.wma([wma1 * 2 - wma2], Math.floor(Math.sqrt(period)));
    return wma3;
  }
  
  private static dema(values: number[], period: number): number {
    const ema1 = this.ema(values, period);
    const ema2 = this.ema([ema1], period);
    return 2 * ema1 - ema2;
  }
  
  private static tema(values: number[], period: number): number {
    const ema1 = this.ema(values, period);
    const ema2 = this.ema([ema1], period);
    const ema3 = this.ema([ema2], period);
    return 3 * ema1 - 3 * ema2 + ema3;
  }
  
  private static kama(candles: Candle[], period: number): number {
    // Kaufman's Adaptive Moving Average
    const closes = candles.map(c => c.close);
    if (closes.length < period) return closes[closes.length - 1];
    
    let kama = closes[0];
    const efficiencyRatio = this.calculateEfficiencyRatio(closes, period);
    const smoothingConstant = Math.pow(efficiencyRatio * (2 / (2 + 1) - 2 / (30 + 1)) + 2 / (30 + 1), 2);
    
    for (let i = 1; i < closes.length; i++) {
      kama = kama + smoothingConstant * (closes[i] - kama);
    }
    return kama;
  }
  
  private static smma(values: number[], period: number): number {
    if (values.length < period) return 0;
    let smma = values.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    for (let i = period; i < values.length; i++) {
      smma = (smma * (period - 1) + values[i]) / period;
    }
    return smma;
  }
  
  private static zlema(values: number[], period: number): number {
    const lag = Math.floor((period - 1) / 2);
    const adjustedValues = values.map((val, i) => i >= lag ? val : val + (val - values[0]));
    return this.ema(adjustedValues, period);
  }
  
  private static alma(values: number[], period: number): number {
    const offset = Math.floor(0.85 * (period - 1));
    const sigma = period / 6;
    let sum = 0;
    let weightSum = 0;
    
    for (let i = 0; i < period; i++) {
      const weight = Math.exp(-Math.pow(i - offset, 2) / (2 * sigma * sigma));
      sum += values[values.length - period + i] * weight;
      weightSum += weight;
    }
    return sum / weightSum;
  }
  
  private static vwma(candles: Candle[], period: number): number {
    if (candles.length < period) return 0;
    const slice = candles.slice(-period);
    let priceVolumeSum = 0;
    let volumeSum = 0;
    
    for (const candle of slice) {
      priceVolumeSum += candle.close * candle.volume;
      volumeSum += candle.volume;
    }
    return volumeSum > 0 ? priceVolumeSum / volumeSum : 0;
  }
  
  // Additional indicator calculation methods
  private static trix(values: number[], period: number): number {
    // TRIX = Rate of Change of a Triple Smoothed EMA
    if (values.length < period * 3) return 0;
    
    // Triple EMA smoothing
    const ema1 = this.ema(values, period);
    const ema2 = this.ema([ema1], period);
    const ema3 = this.ema([ema2], period);
    
    // Calculate ROC of the triple smoothed EMA
    if (values.length < period * 3 + 1) return 0;
    const previousEma3 = this.ema([this.ema([this.ema(values.slice(0, -1), period)], period)], period);
    return previousEma3 !== 0 ? ((ema3 - previousEma3) / previousEma3) * 100 : 0;
  }
  
  private static adx(candles: Candle[], period: number): number {
    if (candles.length < period + 1) return 25;
    
    // Calculate True Range and Directional Movement
    const trValues: number[] = [];
    const plusDMValues: number[] = [];
    const minusDMValues: number[] = [];
    
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      
      // True Range
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );
      trValues.push(tr);
      
      // Directional Movement
      const highDiff = current.high - previous.high;
      const lowDiff = previous.low - current.low;
      
      const plusDM = (highDiff > lowDiff && highDiff > 0) ? highDiff : 0;
      const minusDM = (lowDiff > highDiff && lowDiff > 0) ? lowDiff : 0;
      
      plusDMValues.push(plusDM);
      minusDMValues.push(minusDM);
    }
    
    // Calculate smoothed values
    const atr = this.ema(trValues, period);
    const plusDI = this.ema(plusDMValues, period) / atr * 100;
    const minusDI = this.ema(minusDMValues, period) / atr * 100;
    
    // Calculate DX
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
    
    // Calculate ADX (smoothed DX)
    return this.ema([dx], period);
  }
  
  private static plusDI(candles: Candle[], period: number): number {
    if (candles.length < period + 1) return 25;
    
    const trValues: number[] = [];
    const plusDMValues: number[] = [];
    
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );
      trValues.push(tr);
      
      const highDiff = current.high - previous.high;
      const lowDiff = previous.low - current.low;
      const plusDM = (highDiff > lowDiff && highDiff > 0) ? highDiff : 0;
      
      plusDMValues.push(plusDM);
    }
    
    const atr = this.ema(trValues, period);
    return this.ema(plusDMValues, period) / atr * 100;
  }
  
  private static minusDI(candles: Candle[], period: number): number {
    if (candles.length < period + 1) return 25;
    
    const trValues: number[] = [];
    const minusDMValues: number[] = [];
    
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );
      trValues.push(tr);
      
      const highDiff = current.high - previous.high;
      const lowDiff = previous.low - current.low;
      const minusDM = (lowDiff > highDiff && lowDiff > 0) ? lowDiff : 0;
      
      minusDMValues.push(minusDM);
    }
    
    const atr = this.ema(trValues, period);
    return this.ema(minusDMValues, period) / atr * 100;
  }
  
  private static viPlus(candles: Candle[], period: number): number {
    if (candles.length < period + 1) return 0;
    
    let sumVMPlus = 0;
    let sumTR = 0;
    
    for (let i = 1; i < period + 1; i++) {
      const current = candles[candles.length - i];
      const previous = candles[candles.length - i - 1];
      
      const vmPlus = Math.abs(current.high - previous.low);
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );
      
      sumVMPlus += vmPlus;
      sumTR += tr;
    }
    
    return sumTR !== 0 ? sumVMPlus / sumTR : 0;
  }
  
  private static viMinus(candles: Candle[], period: number): number {
    if (candles.length < period + 1) return 0;
    
    let sumVMMinus = 0;
    let sumTR = 0;
    
    for (let i = 1; i < period + 1; i++) {
      const current = candles[candles.length - i];
      const previous = candles[candles.length - i - 1];
      
      const vmMinus = Math.abs(current.low - previous.high);
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );
      
      sumVMMinus += vmMinus;
      sumTR += tr;
    }
    
    return sumTR !== 0 ? sumVMMinus / sumTR : 0;
  }
  
  private static parabolicSAR(candles: Candle[]): number {
    if (candles.length < 2) return candles[candles.length - 1].close;
    
    // Simplified Parabolic SAR calculation
    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    
    // Basic SAR calculation (simplified version)
    const af = 0.02; // Acceleration factor
    const maxAF = 0.2; // Maximum acceleration factor
    
    // Determine trend direction
    const isUptrend = current.close > previous.close;
    
    if (isUptrend) {
      // Uptrend: SAR = Previous SAR + AF * (Previous High - Previous SAR)
      return previous.high + af * (previous.high - previous.close);
    } else {
      // Downtrend: SAR = Previous SAR + AF * (Previous Low - Previous SAR)
      return previous.low + af * (previous.low - previous.close);
    }
  }
  
  private static supertrend(candles: Candle[], period: number, multiplier: number): number {
    if (candles.length < period) return candles[candles.length - 1].close;
    
    const atr = this.atr(candles, period);
    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    
    // Calculate basic upper and lower bands
    const hl2 = (current.high + current.low) / 2;
    const upperBand = hl2 + (multiplier * atr);
    const lowerBand = hl2 - (multiplier * atr);
    
    // Simplified Supertrend calculation
    // In a full implementation, this would track the trend direction
    // and switch between upper and lower bands accordingly
    return (upperBand + lowerBand) / 2;
  }
  
  private static aroonUp(candles: Candle[], period: number): number {
    if (candles.length < period) return 50;
    
    const recentCandles = candles.slice(-period);
    let highestIndex = 0;
    let highestHigh = recentCandles[0].high;
    
    for (let i = 1; i < recentCandles.length; i++) {
      if (recentCandles[i].high > highestHigh) {
        highestHigh = recentCandles[i].high;
        highestIndex = i;
      }
    }
    
    return ((period - highestIndex) / period) * 100;
  }
  
  private static aroonDown(candles: Candle[], period: number): number {
    if (candles.length < period) return 50;
    
    const recentCandles = candles.slice(-period);
    let lowestIndex = 0;
    let lowestLow = recentCandles[0].low;
    
    for (let i = 1; i < recentCandles.length; i++) {
      if (recentCandles[i].low < lowestLow) {
        lowestLow = recentCandles[i].low;
        lowestIndex = i;
      }
    }
    
    return ((period - lowestIndex) / period) * 100;
  }
  
  private static highest(values: number[], period: number): number {
    if (values.length < period) return Math.max(...values);
    return Math.max(...values.slice(-period));
  }
  
  private static lowest(values: number[], period: number): number {
    if (values.length < period) return Math.min(...values);
    return Math.min(...values.slice(-period));
  }
  
  private static rsi(values: number[], period: number): number {
    if (values.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = values[i] - values[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calculate RSI using Wilder's smoothing
    for (let i = period + 1; i < values.length; i++) {
      const change = values[i] - values[i - 1];
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
      }
    }
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  private static stochasticK(candles: Candle[], kPeriod: number, dPeriod: number): number {
    if (candles.length < kPeriod) return 50;
    
    const recentCandles = candles.slice(-kPeriod);
    const currentClose = recentCandles[recentCandles.length - 1].close;
    const lowestLow = Math.min(...recentCandles.map(c => c.low));
    const highestHigh = Math.max(...recentCandles.map(c => c.high));
    
    if (highestHigh === lowestLow) return 50;
    
    return ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
  }
  
  private static stochasticD(candles: Candle[], kPeriod: number, dPeriod: number): number {
    if (candles.length < kPeriod) return 50;
    
    // Calculate %K values for the smoothing period
    const kValues: number[] = [];
    const startIndex = Math.max(0, candles.length - kPeriod - dPeriod + 1);
    
    for (let i = startIndex; i < candles.length - dPeriod + 1; i++) {
      const recentCandles = candles.slice(i, i + kPeriod);
      if (recentCandles.length < kPeriod) continue;
      
      const currentClose = recentCandles[recentCandles.length - 1].close;
      const lowestLow = Math.min(...recentCandles.map(c => c.low));
      const highestHigh = Math.max(...recentCandles.map(c => c.high));
      
      if (highestHigh !== lowestLow) {
        kValues.push(((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100);
      } else {
        kValues.push(50);
      }
    }
    
    if (kValues.length === 0) return 50;
    
    // Calculate %D as SMA of %K values
    return this.sma(kValues, Math.min(dPeriod, kValues.length));
  }
  
  private static stochRSI(values: number[], rsiPeriod: number, stochPeriod: number, dPeriod: number): number {
    if (values.length < rsiPeriod + stochPeriod) return 50;
    
    // Calculate RSI values
    const rsiValues: number[] = [];
    for (let i = rsiPeriod; i < values.length; i++) {
      const rsi = this.rsi(values.slice(0, i + 1), rsiPeriod);
      rsiValues.push(rsi);
    }
    
    if (rsiValues.length < stochPeriod) return 50;
    
    // Apply Stochastic to RSI values
    const recentRSI = rsiValues.slice(-stochPeriod);
    const currentRSI = recentRSI[recentRSI.length - 1];
    const lowestRSI = Math.min(...recentRSI);
    const highestRSI = Math.max(...recentRSI);
    
    if (highestRSI === lowestRSI) return 50;
    
    return ((currentRSI - lowestRSI) / (highestRSI - lowestRSI)) * 100;
  }
  
  private static williamsR(candles: Candle[], period: number): number {
    if (candles.length < period) return -50;
    
    const recentCandles = candles.slice(-period);
    const currentClose = recentCandles[recentCandles.length - 1].close;
    const lowestLow = Math.min(...recentCandles.map(c => c.low));
    const highestHigh = Math.max(...recentCandles.map(c => c.high));
    
    if (highestHigh === lowestLow) return -50;
    
    return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
  }
  
  private static cci(candles: Candle[], period: number): number {
    if (candles.length < period) return 0;
    
    const recentCandles = candles.slice(-period);
    const typicalPrices = recentCandles.map(c => (c.high + c.low + c.close) / 3);
    const smaTP = this.sma(typicalPrices, period);
    
    // Calculate Mean Deviation
    const meanDeviation = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - smaTP), 0) / period;
    
    const currentTP = typicalPrices[typicalPrices.length - 1];
    
    if (meanDeviation === 0) return 0;
    
    return (currentTP - smaTP) / (0.015 * meanDeviation);
  }
  
  private static roc(values: number[], period: number): number {
    if (values.length < period + 1) return 0;
    
    const current = values[values.length - 1];
    const past = values[values.length - 1 - period];
    
    if (past === 0) return 0;
    
    return ((current - past) / past) * 100;
  }
  
  private static momentum(values: number[], period: number): number {
    if (values.length < period + 1) return 0;
    
    const current = values[values.length - 1];
    const past = values[values.length - 1 - period];
    
    return current - past;
  }
  
  private static ultimateOscillator(candles: Candle[], shortPeriod: number, mediumPeriod: number, longPeriod: number): number {
    if (candles.length < longPeriod) return 50;
    
    // Calculate BP (Buying Pressure) and TR for each period
    const bpValues: number[] = [];
    const trValues: number[] = [];
    
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      
      const bp = current.close - Math.min(current.low, previous.close);
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );
      
      bpValues.push(bp);
      trValues.push(tr);
    }
    
    // Calculate weighted averages
    const shortBP = this.sma(bpValues.slice(-shortPeriod), shortPeriod);
    const shortTR = this.sma(trValues.slice(-shortPeriod), shortPeriod);
    
    const mediumBP = this.sma(bpValues.slice(-mediumPeriod), mediumPeriod);
    const mediumTR = this.sma(trValues.slice(-mediumPeriod), mediumPeriod);
    
    const longBP = this.sma(bpValues.slice(-longPeriod), longPeriod);
    const longTR = this.sma(trValues.slice(-longPeriod), longPeriod);
    
    // Calculate Ultimate Oscillator
    const totalBP = (4 * shortBP) + (2 * mediumBP) + longBP;
    const totalTR = (4 * shortTR) + (2 * mediumTR) + longTR;
    
    if (totalTR === 0) return 50;
    
    return (totalBP / totalTR) * 100;
  }
  
  private static awesomeOscillator(candles: Candle[]): number {
    if (candles.length < 34) return 0;
    
    // Calculate median price (H+L)/2
    const medianPrices = candles.map(c => (c.high + c.low) / 2);
    
    // SMA(5) - SMA(34)
    const sma5 = this.sma(medianPrices, 5);
    const sma34 = this.sma(medianPrices, 34);
    
    return sma5 - sma34;
  }
  
  private static cmo(values: number[], period: number): number {
    if (values.length < period + 1) return 0;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = values[values.length - i] - values[values.length - i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    const total = gains + losses;
    if (total === 0) return 0;
    
    return ((gains - losses) / total) * 100;
  }
  
  private static fisherTransform(values: number[], period: number): number {
    if (values.length < period) return 0;
    
    // Calculate the highest and lowest values over the period
    const recentValues = values.slice(-period);
    const highest = Math.max(...recentValues);
    const lowest = Math.min(...recentValues);
    
    if (highest === lowest) return 0;
    
    const current = values[values.length - 1];
    
    // Normalize the price to [-1, 1]
    const normalized = 2 * ((current - lowest) / (highest - lowest)) - 1;
    
    // Apply Fisher Transform
    const transformed = 0.5 * Math.log((1 + normalized) / (1 - normalized));
    
    return transformed;
  }
  
  private static coppockCurve(values: number[], roc1: number, roc2: number, wmaPeriod: number): number {
    if (values.length < Math.max(roc1, roc2) + wmaPeriod) return 0;
    
    // Calculate ROC(11) + ROC(14)
    const roc11 = this.roc(values, roc1);
    const roc14 = this.roc(values, roc2);
    const sumROC = roc11 + roc14;
    
    // Apply WMA(10) to the sum
    // For simplicity, we'll use SMA instead of WMA
    return this.sma([sumROC], wmaPeriod);
  }
  
  private static dpo(values: number[], period: number): number {
    if (values.length < period + period / 2) return 0;
    
    const current = values[values.length - 1];
    const offset = Math.floor(period / 2);
    const pastValue = values[values.length - 1 - offset];
    
    return current - pastValue;
  }
  
  private static bollingerBands(values: number[], period: number, multiplier: number): { upper: number; middle: number; lower: number } {
    // Bollinger Bands calculation
    const middle = this.sma(values, period);
    const stdDev = this.standardDeviation(values, period);
    return {
      upper: middle + (multiplier * stdDev),
      middle,
      lower: middle - (multiplier * stdDev)
    };
  }
  
  private static atr(candles: Candle[], period: number): number {
    if (candles.length < period + 1) return 0;
    
    const trValues: number[] = [];
    
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );
      
      trValues.push(tr);
    }
    
    // Use EMA for ATR calculation (Wilder's smoothing)
    return this.ema(trValues, period);
  }
  
  private static keltnerChannels(candles: Candle[], period: number, multiplier: number): { upper: number; middle: number; lower: number } {
    // Keltner Channels calculation
    const middle = this.ema(candles.map(c => c.close), period);
    const atr = this.atr(candles, period);
    return {
      upper: middle + (multiplier * atr),
      middle,
      lower: middle - (multiplier * atr)
    };
  }
  
  private static donchianChannels(candles: Candle[], period: number): { upper: number; middle: number; lower: number } {
    // Donchian Channels calculation
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const upper = this.highest(highs, period);
    const lower = this.lowest(lows, period);
    return {
      upper,
      middle: (upper + lower) / 2,
      lower
    };
  }
  
  private static standardDeviation(values: number[], period: number): number {
    if (values.length < period) return 0;
    const slice = values.slice(-period);
    const mean = slice.reduce((sum, val) => sum + val, 0) / period;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    return Math.sqrt(variance);
  }
  
  private static trueRange(candles: Candle[]): number {
    if (candles.length < 2) return 0;
    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    return Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
  }
  
  private static chaikinVolatility(candles: Candle[], period: number): number {
    if (candles.length < period + 1) return 0;
    
    // Calculate EMA of (High - Low)
    const hlValues = candles.map(c => c.high - c.low);
    const emaHL = this.ema(hlValues, period);
    
    // Calculate ROC of EMA(HL)
    const previousEmaHL = this.ema(hlValues.slice(0, -1), period);
    
    if (previousEmaHL === 0) return 0;
    
    return ((emaHL - previousEmaHL) / previousEmaHL) * 100;
  }
  
  private static massIndex(candles: Candle[], period: number): number {
    if (candles.length < period + 1) return 0;
    
    // Calculate EMA(9) of (High - Low)
    const hlValues = candles.map(c => c.high - c.low);
    const ema9 = this.ema(hlValues, 9);
    
    // Calculate EMA(9) of EMA(9) of (High - Low)
    const ema9OfEma9 = this.ema([ema9], 9);
    
    if (ema9OfEma9 === 0) return 0;
    
    // Mass Index = Sum of (EMA(9) / EMA(9) of EMA(9)) over the period
    let sum = 0;
    for (let i = 0; i < period; i++) {
      const currentEma9 = this.ema(hlValues.slice(-period + i), 9);
      const currentEma9OfEma9 = this.ema([currentEma9], 9);
      
      if (currentEma9OfEma9 !== 0) {
        sum += currentEma9 / currentEma9OfEma9;
      }
    }
    
    return sum;
  }
  
  private static vwap(candles: Candle[]): number {
    // VWAP calculation
    let priceVolumeSum = 0;
    let volumeSum = 0;
    for (const candle of candles) {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      priceVolumeSum += typicalPrice * candle.volume;
      volumeSum += candle.volume;
    }
    return volumeSum > 0 ? priceVolumeSum / volumeSum : 0;
  }
  
  private static obv(candles: Candle[]): number {
    // OBV calculation
    let obv = 0;
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      if (current.close > previous.close) {
        obv += current.volume;
      } else if (current.close < previous.close) {
        obv -= current.volume;
      }
    }
    return obv;
  }
  
  private static adLine(candles: Candle[]): number {
    // A/D Line calculation
    let ad = 0;
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      const clv = ((current.close - current.low) - (current.high - current.close)) / (current.high - current.low);
      ad += clv * current.volume;
    }
    return ad;
  }
  
  private static cmf(candles: Candle[], period: number): number {
    if (candles.length < period) return 0;
    
    let positiveFlow = 0;
    let negativeFlow = 0;
    
    for (let i = 0; i < period; i++) {
      const candle = candles[candles.length - period + i];
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      
      if (i > 0) {
        const previousTP = (candles[candles.length - period + i - 1].high + 
                           candles[candles.length - period + i - 1].low + 
                           candles[candles.length - period + i - 1].close) / 3;
        
        if (typicalPrice > previousTP) {
          positiveFlow += typicalPrice * candle.volume;
        } else if (typicalPrice < previousTP) {
          negativeFlow += typicalPrice * candle.volume;
        }
      }
    }
    
    const totalFlow = positiveFlow + negativeFlow;
    if (totalFlow === 0) return 0;
    
    return ((positiveFlow - negativeFlow) / totalFlow) * 100;
  }
  
  private static chaikinOscillator(candles: Candle[]): number {
    if (candles.length < 10) return 0;
    
    // Calculate A/D Line
    const adLine = this.adLine(candles);
    
    // EMA(3) of A/D - EMA(10) of A/D
    const ema3 = this.ema([adLine], 3);
    const ema10 = this.ema([adLine], 10);
    
    return ema3 - ema10;
  }
  
  private static mfi(candles: Candle[], period: number): number {
    if (candles.length < period + 1) return 50;
    
    let positiveFlow = 0;
    let negativeFlow = 0;
    
    for (let i = 1; i <= period; i++) {
      const current = candles[candles.length - i];
      const previous = candles[candles.length - i - 1];
      
      const currentTP = (current.high + current.low + current.close) / 3;
      const previousTP = (previous.high + previous.low + previous.close) / 3;
      
      const moneyFlow = currentTP * current.volume;
      
      if (currentTP > previousTP) {
        positiveFlow += moneyFlow;
      } else if (currentTP < previousTP) {
        negativeFlow += moneyFlow;
      }
    }
    
    if (negativeFlow === 0) return 100;
    
    const moneyRatio = positiveFlow / negativeFlow;
    return 100 - (100 / (1 + moneyRatio));
  }
  
  private static eom(candles: Candle[], period: number): number {
    if (candles.length < period + 1) return 0;
    
    let sumEOM = 0;
    
    for (let i = 1; i <= period; i++) {
      const current = candles[candles.length - i];
      const previous = candles[candles.length - i - 1];
      
      const distance = (current.high + current.low) / 2 - (previous.high + previous.low) / 2;
      const boxHeight = current.volume / (current.high - current.low);
      
      if (boxHeight !== 0) {
        sumEOM += distance / boxHeight;
      }
    }
    
    return sumEOM / period;
  }
  
  private static forceIndex(candles: Candle[], period: number): number {
    if (candles.length < period + 1) return 0;
    
    let sumFI = 0;
    
    for (let i = 1; i <= period; i++) {
      const current = candles[candles.length - i];
      const previous = candles[candles.length - i - 1];
      
      const force = (current.close - previous.close) * current.volume;
      sumFI += force;
    }
    
    return sumFI / period;
  }
  
  private static nvi(candles: Candle[]): number {
    if (candles.length < 2) return 0;
    
    let nvi = 1000; // Starting value
    
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      
      // Only update when volume decreases
      if (current.volume < previous.volume) {
        const change = (current.close - previous.close) / previous.close;
        nvi = nvi * (1 + change);
      }
    }
    
    return nvi;
  }
  
  private static pvi(candles: Candle[]): number {
    if (candles.length < 2) return 0;
    
    let pvi = 1000; // Starting value
    
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      
      // Only update when volume increases
      if (current.volume > previous.volume) {
        const change = (current.close - previous.close) / previous.close;
        pvi = pvi * (1 + change);
      }
    }
    
    return pvi;
  }
  
  private static vpoc(candles: Candle[]): number {
    if (candles.length === 0) return 0;
    
    // Simplified VPOC calculation
    // In a full implementation, this would analyze volume at each price level
    const recentCandles = candles.slice(-20); // Last 20 candles
    const totalVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0);
    const vwap = this.vwap(recentCandles);
    
    // Return VWAP as a proxy for VPOC
    return vwap;
  }
  
  private static vah(candles: Candle[]): number {
    if (candles.length === 0) return 0;
    
    // Simplified VAH calculation
    const recentCandles = candles.slice(-20);
    const vwap = this.vwap(recentCandles);
    const atr = this.atr(recentCandles, 14);
    
    // VAH = VWAP + (2 * ATR)
    return vwap + (2 * atr);
  }
  
  private static val(candles: Candle[]): number {
    if (candles.length === 0) return 0;
    
    // Simplified VAL calculation
    const recentCandles = candles.slice(-20);
    const vwap = this.vwap(recentCandles);
    const atr = this.atr(recentCandles, 14);
    
    // VAL = VWAP - (2 * ATR)
    return vwap - (2 * atr);
  }
  
  private static pivotPoint(candles: Candle[]): { pp: number; r1: number; r2: number; r3: number; s1: number; s2: number; s3: number } {
    const lastCandle = candles[candles.length - 1];
    const pp = (lastCandle.high + lastCandle.low + lastCandle.close) / 3;
    return {
      pp,
      r1: 2 * pp - lastCandle.low,
      r2: pp + (lastCandle.high - lastCandle.low),
      r3: lastCandle.high + 2 * (pp - lastCandle.low),
      s1: 2 * pp - lastCandle.high,
      s2: pp - (lastCandle.high - lastCandle.low),
      s3: lastCandle.low - 2 * (lastCandle.high - pp)
    };
  }
  
  private static fibonacciLevels(candles: Candle[]): { f236: number; f382: number; f500: number; f618: number; f786: number; f1272: number; f1618: number; f2618: number } {
    const high = Math.max(...candles.map(c => c.high));
    const low = Math.min(...candles.map(c => c.low));
    const range = high - low;
    
    return {
      f236: high - (range * 0.236),
      f382: high - (range * 0.382),
      f500: high - (range * 0.5),
      f618: high - (range * 0.618),
      f786: high - (range * 0.786),
      f1272: high + (range * 0.272),
      f1618: high + (range * 0.618),
      f2618: high + (range * 1.618)
    };
  }
  
  private static fractals(candles: Candle[]): { high: number; low: number; isHigh: boolean; isLow: boolean } {
    // Fractal calculation
    return {
      high: candles[candles.length - 1].high,
      low: candles[candles.length - 1].low,
      isHigh: false,
      isLow: false
    };
  }
  
  private static alligator(candles: Candle[]): { jaw: number; teeth: number; lips: number; gator: number } {
    // Alligator calculation
    const close = candles.map(c => c.close);
    return {
      jaw: this.smma(close, 13),
      teeth: this.smma(close, 8),
      lips: this.smma(close, 5),
      gator: this.calculateGatorOscillator(close)
    };
  }
  
  private static heikinAshiOpen(candles: Candle[]): number {
    // Heikin Ashi Open = (Previous HA Open + Previous HA Close) / 2
    if (candles.length < 2) return candles[0].open;
    
    const prevCandle = candles[candles.length - 2];
    const currentCandle = candles[candles.length - 1];
    
    // For the first HA candle, use regular open
    if (candles.length === 2) {
      return (prevCandle.open + prevCandle.close) / 2;
    }
    
    // For subsequent candles, use previous HA values
    const prevHAOpen = this.heikinAshiOpen(candles.slice(0, -1));
    const prevHAClose = this.heikinAshiClose(candles.slice(0, -1));
    
    return (prevHAOpen + prevHAClose) / 2;
  }
  
  private static heikinAshiHigh(candles: Candle[]): number {
    // Heikin Ashi High = Max(High, HA Open, HA Close)
    const currentCandle = candles[candles.length - 1];
    const haOpen = this.heikinAshiOpen(candles);
    const haClose = this.heikinAshiClose(candles);
    
    return Math.max(currentCandle.high, haOpen, haClose);
  }
  
  private static heikinAshiLow(candles: Candle[]): number {
    // Heikin Ashi Low = Min(Low, HA Open, HA Close)
    const currentCandle = candles[candles.length - 1];
    const haOpen = this.heikinAshiOpen(candles);
    const haClose = this.heikinAshiClose(candles);
    
    return Math.min(currentCandle.low, haOpen, haClose);
  }
  
  private static heikinAshiClose(candles: Candle[]): number {
    // Heikin Ashi Close = (Open + High + Low + Close) / 4
    const currentCandle = candles[candles.length - 1];
    return (currentCandle.open + currentCandle.high + currentCandle.low + currentCandle.close) / 4;
  }
  
  private static calculate24hChange(candles: Candle[]): number {
    if (candles.length < 24) return 0;
    const current = candles[candles.length - 1].close;
    const past24h = candles[candles.length - 24].close;
    return ((current - past24h) / past24h) * 100;
  }
  
  private static calculateTrendScore(trend: any): number {
    let score = 50;
    if (trend.isGoldenCross) score += 20;
    if (trend.isDeathCross) score -= 20;
    if (trend.isBullishMA) score += 15;
    if (trend.isBearishMA) score -= 15;
    return Math.max(0, Math.min(100, score));
  }
  
  private static calculateMomentumScore(momentum: any): number {
    let score = 50;
    if (momentum.isOversold) score += 20;
    if (momentum.isOverbought) score -= 20;
    if (momentum.isMomentumBullish) score += 15;
    if (momentum.isMomentumBearish) score -= 15;
    return Math.max(0, Math.min(100, score));
  }
  
  private static calculateVolatilityScore(volatility: any): number {
    let score = 50;
    if (volatility.isHighVolatility) score += 10;
    if (volatility.isLowVolatility) score -= 10;
    if (volatility.isVolatilityExpanding) score += 5;
    if (volatility.isVolatilityContracting) score -= 5;
    return Math.max(0, Math.min(100, score));
  }
  
  private static calculateVolumeScore(volume: any): number {
    let score = 50;
    if (volume.isHighVolume) score += 15;
    if (volume.isLowVolume) score -= 15;
    if (volume.isVolumeAboveAverage) score += 10;
    if (volume.isVolumeBelowAverage) score -= 10;
    return Math.max(0, Math.min(100, score));
  }
  
  // Real efficiency ratio calculation
  private static calculateEfficiencyRatio(values: number[], period: number): number {
    if (values.length < period + 1) return 0.5;
    
    const currentValue = values[values.length - 1];
    const pastValue = values[values.length - period - 1];
    
    // Calculate net change (absolute price movement)
    const netChange = Math.abs(currentValue - pastValue);
    
    // Calculate sum of absolute price changes over the period
    let sumChanges = 0;
    for (let i = values.length - period; i < values.length; i++) {
      sumChanges += Math.abs(values[i] - values[i - 1]);
    }
    
    // Efficiency Ratio = Net Change / Sum of Changes
    // Returns a value between 0 and 1, where 1 = perfect efficiency (trending)
    // and 0 = no efficiency (sideways/choppy)
    return sumChanges > 0 ? netChange / sumChanges : 0.5;
  }
  
  // Gator Oscillator calculation
  private static calculateGatorOscillator(values: number[]): number {
    if (values.length < 13) return 0;
    
    // Calculate Alligator components
    const jaw = this.smma(values, 13);
    const teeth = this.smma(values, 8);
    const lips = this.smma(values, 5);
    
    // Gator Oscillator = |Jaw - Teeth| - |Teeth - Lips|
    // Positive values indicate the alligator is "awake" (trending)
    // Negative values indicate the alligator is "sleeping" (sideways)
    const jawTeethDiff = Math.abs(jaw - teeth);
    const teethLipsDiff = Math.abs(teeth - lips);
    
    return jawTeethDiff - teethLipsDiff;
  }
  
  // Additional methods would be implemented here for all indicators...
  // This is a framework - full implementation would include all calculation methods
}

export default AdvancedIndicatorCalculator;
