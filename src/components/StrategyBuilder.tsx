'use client';

import { CustomStrategyConfig } from '@/lib/custom-strategy';
import { useState } from 'react';
import {
    HiAdjustments,
    HiArrowDown,
    HiArrowUp,
    HiBeaker,
    HiChartBar,
    HiCheck,
    HiCheckCircle,
    HiClock,
    HiCog,
    HiColorSwatch,
    HiCube,
    HiCurrencyDollar,
    HiDocumentText,
    HiInformationCircle,
    HiLightningBolt,
    HiPlay,
    HiPlus,
    HiRefresh,
    HiScale,
    HiTag,
    HiTemplate,
    HiTrash,
    HiTrendingDown,
    HiTrendingUp,
    HiX,
    HiXCircle
} from 'react-icons/hi';
import {
    RiBarChartBoxLine,
    RiLineChartLine,
    RiStockLine
} from 'react-icons/ri';

interface StrategyBuilderProps {
  onSave: (config: CustomStrategyConfig) => void;
  onClose: () => void;
  initialConfig?: Partial<CustomStrategyConfig>;
  currentTimeframe?: string;
}

type ConditionType = 'longEntry' | 'shortEntry' | 'longExit' | 'shortExit';

// Essential indicators for basic trading strategies
const ESSENTIAL_INDICATOR_CATEGORIES = {
  price: {
    id: 'price',
    label: 'Price & Volume',
    icon: HiCurrencyDollar,
    color: 'text-yellow-400',
    description: 'Basic price data and volume analysis',
    indicators: [
      { key: 'price', label: 'Current Price', type: 'comparison' as const, description: 'Current market price' },
      { key: 'volume', label: 'Volume', type: 'comparison' as const, description: 'Trading volume' },
      { key: 'priceChangePercent', label: 'Price Change %', type: 'comparison' as const, description: 'Percentage price change' },
    ]
  },
  movingAverages: {
    id: 'movingAverages',
    label: 'Moving Averages',
    icon: RiLineChartLine,
    color: 'text-blue-400',
    description: 'Basic trend-following indicators',
    indicators: [
      { key: 'sma20', label: 'SMA 20', type: 'comparison' as const, description: 'Simple Moving Average 20 periods' },
      { key: 'sma50', label: 'SMA 50', type: 'comparison' as const, description: 'Simple Moving Average 50 periods' },
      { key: 'sma200', label: 'SMA 200', type: 'comparison' as const, description: 'Simple Moving Average 200 periods' },
      { key: 'ema12', label: 'EMA 12', type: 'comparison' as const, description: 'Exponential Moving Average 12 periods' },
      { key: 'ema26', label: 'EMA 26', type: 'comparison' as const, description: 'Exponential Moving Average 26 periods' },
      { key: 'ema50', label: 'EMA 50', type: 'comparison' as const, description: 'Exponential Moving Average 50 periods' },
      { key: 'isGoldenCross', label: 'Golden Cross', type: 'boolean' as const, description: 'SMA50 > SMA200 (bullish signal)' },
      { key: 'isDeathCross', label: 'Death Cross', type: 'boolean' as const, description: 'SMA50 < SMA200 (bearish signal)' },
    ]
  },
  oscillators: {
    id: 'oscillators',
    label: 'Momentum Oscillators',
    icon: RiStockLine,
    color: 'text-purple-400',
    description: 'Basic momentum and overbought/oversold indicators',
    indicators: [
      { key: 'rsi', label: 'RSI (14)', type: 'comparison' as const, description: 'Relative Strength Index 14 periods' },
      { key: 'stochK', label: 'Stochastic %K', type: 'comparison' as const, description: 'Stochastic oscillator %K' },
      { key: 'stochD', label: 'Stochastic %D', type: 'comparison' as const, description: 'Stochastic oscillator %D (signal)' },
      { key: 'cci', label: 'CCI', type: 'comparison' as const, description: 'Commodity Channel Index' },
    ]
  },
  macd: {
    id: 'macd',
    label: 'MACD System',
    icon: RiBarChartBoxLine,
    color: 'text-orange-400',
    description: 'Moving Average Convergence Divergence system',
    indicators: [
      { key: 'macd', label: 'MACD Line', type: 'comparison' as const, description: 'MACD line (EMA12 - EMA26)' },
      { key: 'macdSignal', label: 'MACD Signal', type: 'comparison' as const, description: 'MACD signal line (EMA of MACD)' },
      { key: 'isMACDBullish', label: 'MACD Bullish', type: 'boolean' as const, description: 'MACD > Signal (bullish crossover)' },
      { key: 'isMACDBearish', label: 'MACD Bearish', type: 'boolean' as const, description: 'MACD < Signal (bearish crossover)' },
    ]
  },
  bollinger: {
    id: 'bollinger',
    label: 'Bollinger Bands',
    icon: HiLightningBolt,
    color: 'text-teal-400',
    description: 'Volatility and mean reversion indicators',
    indicators: [
      { key: 'bbUpper', label: 'BB Upper', type: 'comparison' as const, description: 'Bollinger Bands upper band' },
      { key: 'bbLower', label: 'BB Lower', type: 'comparison' as const, description: 'Bollinger Bands lower band' },
      { key: 'isAboveBBUpper', label: 'Above BB Upper', type: 'boolean' as const, description: 'Price above upper band (overbought)' },
      { key: 'isBelowBBLower', label: 'Below BB Lower', type: 'boolean' as const, description: 'Price below lower band (oversold)' },
    ]
  }
};

// Advanced indicators for sophisticated trading strategies
const ADVANCED_INDICATOR_CATEGORIES = {
  advancedMA: {
    id: 'advancedMA',
    label: 'Advanced Moving Averages',
    icon: RiLineChartLine,
    color: 'text-blue-400',
    description: 'Advanced moving average indicators',
    indicators: [
      { key: 'sma5', label: 'SMA 5', type: 'comparison' as const, description: 'Simple Moving Average 5 periods' },
      { key: 'sma10', label: 'SMA 10', type: 'comparison' as const, description: 'Simple Moving Average 10 periods' },
      { key: 'sma30', label: 'SMA 30', type: 'comparison' as const, description: 'Simple Moving Average 30 periods' },
      { key: 'sma100', label: 'SMA 100', type: 'comparison' as const, description: 'Simple Moving Average 100 periods' },
      { key: 'ema5', label: 'EMA 5', type: 'comparison' as const, description: 'Exponential Moving Average 5 periods' },
      { key: 'ema10', label: 'EMA 10', type: 'comparison' as const, description: 'Exponential Moving Average 10 periods' },
      { key: 'ema20', label: 'EMA 20', type: 'comparison' as const, description: 'Exponential Moving Average 20 periods' },
      { key: 'ema30', label: 'EMA 30', type: 'comparison' as const, description: 'Exponential Moving Average 30 periods' },
      { key: 'ema100', label: 'EMA 100', type: 'comparison' as const, description: 'Exponential Moving Average 100 periods' },
      { key: 'wma10', label: 'WMA 10', type: 'comparison' as const, description: 'Weighted Moving Average 10 periods' },
      { key: 'wma20', label: 'WMA 20', type: 'comparison' as const, description: 'Weighted Moving Average 20 periods' },
      { key: 'hma10', label: 'HMA 10', type: 'comparison' as const, description: 'Hull Moving Average 10 periods' },
      { key: 'hma20', label: 'HMA 20', type: 'comparison' as const, description: 'Hull Moving Average 20 periods' },
      { key: 'dema10', label: 'DEMA 10', type: 'comparison' as const, description: 'Double EMA 10 periods' },
      { key: 'dema20', label: 'DEMA 20', type: 'comparison' as const, description: 'Double EMA 20 periods' },
      { key: 'tema10', label: 'TEMA 10', type: 'comparison' as const, description: 'Triple EMA 10 periods' },
      { key: 'tema20', label: 'TEMA 20', type: 'comparison' as const, description: 'Triple EMA 20 periods' },
      { key: 'kama10', label: 'KAMA 10', type: 'comparison' as const, description: 'Kaufman Adaptive MA 10 periods' },
      { key: 'kama20', label: 'KAMA 20', type: 'comparison' as const, description: 'Kaufman Adaptive MA 20 periods' },
      { key: 'vwma10', label: 'VWMA 10', type: 'comparison' as const, description: 'Volume Weighted MA 10 periods' },
      { key: 'vwma20', label: 'VWMA 20', type: 'comparison' as const, description: 'Volume Weighted MA 20 periods' },
    ]
  },
  advancedOscillators: {
    id: 'advancedOscillators',
    label: 'Advanced Oscillators',
    icon: RiStockLine,
    color: 'text-purple-400',
    description: 'Advanced momentum and oscillators',
    indicators: [
      { key: 'rsi9', label: 'RSI (9)', type: 'comparison' as const, description: 'RSI 9 periods (faster)' },
      { key: 'rsi21', label: 'RSI (21)', type: 'comparison' as const, description: 'RSI 21 periods (slower)' },
      { key: 'roc', label: 'ROC', type: 'comparison' as const, description: 'Rate of Change' },
      { key: 'momentum', label: 'Momentum', type: 'comparison' as const, description: 'Price momentum indicator' },
      { key: 'ultimateOscillator', label: 'Ultimate Oscillator', type: 'comparison' as const, description: 'Ultimate Oscillator' },
      { key: 'awesomeOscillator', label: 'Awesome Oscillator', type: 'comparison' as const, description: 'Awesome Oscillator' },
      { key: 'cmo', label: 'CMO', type: 'comparison' as const, description: 'Chande Momentum Oscillator' },
      { key: 'fisherTransform', label: 'Fisher Transform', type: 'comparison' as const, description: 'Fisher Transform' },
      { key: 'coppockCurve', label: 'Coppock Curve', type: 'comparison' as const, description: 'Coppock Curve' },
      { key: 'dpo', label: 'DPO', type: 'comparison' as const, description: 'Detrended Price Oscillator' },
    ]
  },
  advancedMACD: {
    id: 'advancedMACD',
    label: 'Advanced MACD',
    icon: RiBarChartBoxLine,
    color: 'text-orange-400',
    description: 'Advanced MACD and momentum systems',
    indicators: [
      { key: 'ppo', label: 'PPO', type: 'comparison' as const, description: 'Percentage Price Oscillator' },
      { key: 'ppoSignal', label: 'PPO Signal', type: 'comparison' as const, description: 'PPO signal line' },
      { key: 'ppoHistogram', label: 'PPO Histogram', type: 'comparison' as const, description: 'PPO histogram' },
      { key: 'trix', label: 'TRIX', type: 'comparison' as const, description: 'Triple smoothed rate of change' },
      { key: 'viPlus', label: 'VI+', type: 'comparison' as const, description: 'Vertical Horizontal Filter +' },
      { key: 'viMinus', label: 'VI-', type: 'comparison' as const, description: 'Vertical Horizontal Filter -' },
    ]
  },
  advancedBollinger: {
    id: 'advancedBollinger',
    label: 'Advanced Bollinger',
    icon: HiLightningBolt,
    color: 'text-teal-400',
    description: 'Advanced Bollinger Bands and volatility',
    indicators: [
      { key: 'bbWidth', label: 'BB Width', type: 'comparison' as const, description: 'Bollinger Bands width (volatility)' },
      { key: 'bbPercent', label: 'BB %B', type: 'comparison' as const, description: 'Position within bands (0-1)' },
      { key: 'isBBExpansion', label: 'BB Expansion', type: 'boolean' as const, description: 'Bands expanding (volatility increase)' },
      { key: 'isBBContraction', label: 'BB Contraction', type: 'boolean' as const, description: 'Bands contracting (volatility decrease)' },
    ]
  },
  volatility: {
    id: 'volatility',
    label: 'Volatility',
    icon: HiLightningBolt,
    color: 'text-red-400',
    description: 'Market volatility and range indicators',
    indicators: [
      { key: 'atr', label: 'ATR', type: 'comparison' as const, description: 'Average True Range (volatility)' },
      { key: 'atr14', label: 'ATR 14', type: 'comparison' as const, description: 'ATR 14 periods' },
      { key: 'atr21', label: 'ATR 21', type: 'comparison' as const, description: 'ATR 21 periods' },
      { key: 'isHighVolatility', label: 'High Volatility', type: 'boolean' as const, description: 'ATR above average' },
      { key: 'isLowVolatility', label: 'Low Volatility', type: 'boolean' as const, description: 'ATR below average' },
      { key: 'chaikinVolatility', label: 'Chaikin Volatility', type: 'comparison' as const, description: 'Volume-based volatility' },
      { key: 'massIndex', label: 'Mass Index', type: 'comparison' as const, description: 'Volatility trend indicator' },
    ]
  },
  volume: {
    id: 'volume',
    label: 'Volume Analysis',
    icon: HiClock,
    color: 'text-indigo-400',
    description: 'Volume and money flow indicators',
    indicators: [
      { key: 'vwap', label: 'VWAP', type: 'comparison' as const, description: 'Volume Weighted Average Price' },
      { key: 'vwapUpper', label: 'VWAP Upper', type: 'comparison' as const, description: 'VWAP upper band' },
      { key: 'vwapLower', label: 'VWAP Lower', type: 'comparison' as const, description: 'VWAP lower band' },
      { key: 'obv', label: 'OBV', type: 'comparison' as const, description: 'On Balance Volume' },
      { key: 'volumeSMA20', label: 'Volume SMA20', type: 'comparison' as const, description: 'Volume 20-period SMA' },
      { key: 'volumeRatio', label: 'Volume Ratio', type: 'comparison' as const, description: 'Current vs average volume' },
      { key: 'isHighVolume', label: 'High Volume', type: 'boolean' as const, description: 'Volume above average' },
      { key: 'isLowVolume', label: 'Low Volume', type: 'boolean' as const, description: 'Volume below average' },
      { key: 'isPriceAboveVWAP', label: 'Price > VWAP', type: 'boolean' as const, description: 'Price above VWAP' },
      { key: 'isPriceBelowVWAP', label: 'Price < VWAP', type: 'boolean' as const, description: 'Price below VWAP' },
      { key: 'adLine', label: 'AD Line', type: 'comparison' as const, description: 'Accumulation/Distribution Line' },
      { key: 'cmf', label: 'CMF', type: 'comparison' as const, description: 'Chaikin Money Flow' },
      { key: 'mfi', label: 'MFI', type: 'comparison' as const, description: 'Money Flow Index' },
    ]
  },
  ichimoku: {
    id: 'ichimoku',
    label: 'Ichimoku System',
    icon: RiBarChartBoxLine,
    color: 'text-cyan-400',
    description: 'Complete Ichimoku Kinko Hyo system',
    indicators: [
      { key: 'tenkanSen', label: 'Tenkan Sen', type: 'comparison' as const, description: 'Conversion Line (9-period)' },
      { key: 'kijunSen', label: 'Kijun Sen', type: 'comparison' as const, description: 'Base Line (26-period)' },
      { key: 'chikouSpan', label: 'Chikou Span', type: 'comparison' as const, description: 'Lagging Span' },
      { key: 'senkouSpanA', label: 'Senkou Span A', type: 'comparison' as const, description: 'Leading Span A' },
      { key: 'senkouSpanB', label: 'Senkou Span B', type: 'comparison' as const, description: 'Leading Span B' },
      { key: 'kumoTop', label: 'Kumo Top', type: 'comparison' as const, description: 'Cloud top boundary' },
      { key: 'kumoBottom', label: 'Kumo Bottom', type: 'comparison' as const, description: 'Cloud bottom boundary' },
      { key: 'isPriceAboveCloud', label: 'Price Above Cloud', type: 'boolean' as const, description: 'Bullish cloud position' },
      { key: 'isPriceBelowCloud', label: 'Price Below Cloud', type: 'boolean' as const, description: 'Bearish cloud position' },
      { key: 'isPriceInCloud', label: 'Price In Cloud', type: 'boolean' as const, description: 'Neutral cloud position' },
      { key: 'isTenkanAboveKijun', label: 'Tenkan > Kijun', type: 'boolean' as const, description: 'Bullish Ichimoku signal' },
      { key: 'isTenkanBelowKijun', label: 'Tenkan < Kijun', type: 'boolean' as const, description: 'Bearish Ichimoku signal' },
    ]
  },
  systems: {
    id: 'systems',
    label: 'Trading Systems',
    icon: RiBarChartBoxLine,
    color: 'text-pink-400',
    description: 'Advanced trading systems and signals',
    indicators: [
      { key: 'parabolicSAR', label: 'Parabolic SAR', type: 'comparison' as const, description: 'Stop and Reverse system' },
      { key: 'supertrend', label: 'Supertrend', type: 'comparison' as const, description: 'Trend following system' },
      { key: 'aroonUp', label: 'Aroon Up', type: 'comparison' as const, description: 'Aroon Up oscillator' },
      { key: 'aroonDown', label: 'Aroon Down', type: 'comparison' as const, description: 'Aroon Down oscillator' },
      { key: 'aroonOscillator', label: 'Aroon Oscillator', type: 'comparison' as const, description: 'Aroon Up - Aroon Down' },
    ]
  },
  structure: {
    id: 'structure',
    label: 'Market Structure',
    icon: HiCurrencyDollar,
    color: 'text-gray-400',
    description: 'Support, resistance, and market levels',
    indicators: [
      { key: 'pivotPoint', label: 'Pivot Point', type: 'comparison' as const, description: 'Standard pivot point' },
      { key: 'r1', label: 'R1', type: 'comparison' as const, description: 'Resistance 1' },
      { key: 'r2', label: 'R2', type: 'comparison' as const, description: 'Resistance 2' },
      { key: 'r3', label: 'R3', type: 'comparison' as const, description: 'Resistance 3' },
      { key: 's1', label: 'S1', type: 'comparison' as const, description: 'Support 1' },
      { key: 's2', label: 'S2', type: 'comparison' as const, description: 'Support 2' },
      { key: 's3', label: 'S3', type: 'comparison' as const, description: 'Support 3' },
      { key: 'fib236', label: 'Fibonacci 23.6%', type: 'comparison' as const, description: 'Fibonacci retracement level' },
      { key: 'fib382', label: 'Fibonacci 38.2%', type: 'comparison' as const, description: 'Fibonacci retracement level' },
      { key: 'fib500', label: 'Fibonacci 50%', type: 'comparison' as const, description: 'Fibonacci retracement level' },
      { key: 'fib618', label: 'Fibonacci 61.8%', type: 'comparison' as const, description: 'Fibonacci retracement level' },
      { key: 'fib786', label: 'Fibonacci 78.6%', type: 'comparison' as const, description: 'Fibonacci retracement level' },
    ]
  }
};

interface SimpleCondition {
  type: 'comparison' | 'boolean';
  indicator: string;
  operator?: 'LT' | 'GT' | 'EQ' | 'LTE' | 'GTE';
  value?: number | string; // Can be a number or an indicator key
  compareType?: 'number' | 'indicator'; // What to compare against
}

const AVAILABLE_COLORS = [
  // Rouge (du plus clair au plus foncé)
  { value: 'red-100', label: 'Red 100', class: 'bg-red-100' },
  { value: 'red-200', label: 'Red 200', class: 'bg-red-200' },
  { value: 'red-300', label: 'Red 300', class: 'bg-red-300' },
  { value: 'red-400', label: 'Red 400', class: 'bg-red-400' },
  { value: 'red-500', label: 'Red 500', class: 'bg-red-500' },
  { value: 'red-600', label: 'Red 600', class: 'bg-red-600' },
  { value: 'red-700', label: 'Red 700', class: 'bg-red-700' },
  { value: 'red-800', label: 'Red 800', class: 'bg-red-800' },
  { value: 'red-900', label: 'Red 900', class: 'bg-red-900' },
  
  // Orange (du plus clair au plus foncé)
  { value: 'orange-100', label: 'Orange 100', class: 'bg-orange-100' },
  { value: 'orange-200', label: 'Orange 200', class: 'bg-orange-200' },
  { value: 'orange-300', label: 'Orange 300', class: 'bg-orange-300' },
  { value: 'orange-400', label: 'Orange 400', class: 'bg-orange-400' },
  { value: 'orange-500', label: 'Orange 500', class: 'bg-orange-500' },
  { value: 'orange-600', label: 'Orange 600', class: 'bg-orange-600' },
  { value: 'orange-700', label: 'Orange 700', class: 'bg-orange-700' },
  { value: 'orange-800', label: 'Orange 800', class: 'bg-orange-800' },
  { value: 'orange-900', label: 'Orange 900', class: 'bg-orange-900' },
  
  // Amber (du plus clair au plus foncé)
  { value: 'amber-100', label: 'Amber 100', class: 'bg-amber-100' },
  { value: 'amber-200', label: 'Amber 200', class: 'bg-amber-200' },
  { value: 'amber-300', label: 'Amber 300', class: 'bg-amber-300' },
  { value: 'amber-400', label: 'Amber 400', class: 'bg-amber-400' },
  { value: 'amber-500', label: 'Amber 500', class: 'bg-amber-500' },
  { value: 'amber-600', label: 'Amber 600', class: 'bg-amber-600' },
  { value: 'amber-700', label: 'Amber 700', class: 'bg-amber-700' },
  { value: 'amber-800', label: 'Amber 800', class: 'bg-amber-800' },
  { value: 'amber-900', label: 'Amber 900', class: 'bg-amber-900' },
  
  // Jaune (du plus clair au plus foncé)
  { value: 'yellow-100', label: 'Yellow 100', class: 'bg-yellow-100' },
  { value: 'yellow-200', label: 'Yellow 200', class: 'bg-yellow-200' },
  { value: 'yellow-300', label: 'Yellow 300', class: 'bg-yellow-300' },
  { value: 'yellow-400', label: 'Yellow 400', class: 'bg-yellow-400' },
  { value: 'yellow-500', label: 'Yellow 500', class: 'bg-yellow-500' },
  { value: 'yellow-600', label: 'Yellow 600', class: 'bg-yellow-600' },
  { value: 'yellow-700', label: 'Yellow 700', class: 'bg-yellow-700' },
  { value: 'yellow-800', label: 'Yellow 800', class: 'bg-yellow-800' },
  { value: 'yellow-900', label: 'Yellow 900', class: 'bg-yellow-900' },
  
  // Lime (du plus clair au plus foncé)
  { value: 'lime-100', label: 'Lime 100', class: 'bg-lime-100' },
  { value: 'lime-200', label: 'Lime 200', class: 'bg-lime-200' },
  { value: 'lime-300', label: 'Lime 300', class: 'bg-lime-300' },
  { value: 'lime-400', label: 'Lime 400', class: 'bg-lime-400' },
  { value: 'lime-500', label: 'Lime 500', class: 'bg-lime-500' },
  { value: 'lime-600', label: 'Lime 600', class: 'bg-lime-600' },
  { value: 'lime-700', label: 'Lime 700', class: 'bg-lime-700' },
  { value: 'lime-800', label: 'Lime 800', class: 'bg-lime-800' },
  { value: 'lime-900', label: 'Lime 900', class: 'bg-lime-900' },
  
  // Vert (du plus clair au plus foncé)
  { value: 'green-100', label: 'Green 100', class: 'bg-green-100' },
  { value: 'green-200', label: 'Green 200', class: 'bg-green-200' },
  { value: 'green-300', label: 'Green 300', class: 'bg-green-300' },
  { value: 'green-400', label: 'Green 400', class: 'bg-green-400' },
  { value: 'green-500', label: 'Green 500', class: 'bg-green-500' },
  { value: 'green-600', label: 'Green 600', class: 'bg-green-600' },
  { value: 'green-700', label: 'Green 700', class: 'bg-green-700' },
  { value: 'green-800', label: 'Green 800', class: 'bg-green-800' },
  { value: 'green-900', label: 'Green 900', class: 'bg-green-900' },
  
  // Emerald (du plus clair au plus foncé)
  { value: 'emerald-100', label: 'Emerald 100', class: 'bg-emerald-100' },
  { value: 'emerald-200', label: 'Emerald 200', class: 'bg-emerald-200' },
  { value: 'emerald-300', label: 'Emerald 300', class: 'bg-emerald-300' },
  { value: 'emerald-400', label: 'Emerald 400', class: 'bg-emerald-400' },
  { value: 'emerald-500', label: 'Emerald 500', class: 'bg-emerald-500' },
  { value: 'emerald-600', label: 'Emerald 600', class: 'bg-emerald-600' },
  { value: 'emerald-700', label: 'Emerald 700', class: 'bg-emerald-700' },
  { value: 'emerald-800', label: 'Emerald 800', class: 'bg-emerald-800' },
  { value: 'emerald-900', label: 'Emerald 900', class: 'bg-emerald-900' },
  
  // Teal (du plus clair au plus foncé)
  { value: 'teal-100', label: 'Teal 100', class: 'bg-teal-100' },
  { value: 'teal-200', label: 'Teal 200', class: 'bg-teal-200' },
  { value: 'teal-300', label: 'Teal 300', class: 'bg-teal-300' },
  { value: 'teal-400', label: 'Teal 400', class: 'bg-teal-400' },
  { value: 'teal-500', label: 'Teal 500', class: 'bg-teal-500' },
  { value: 'teal-600', label: 'Teal 600', class: 'bg-teal-600' },
  { value: 'teal-700', label: 'Teal 700', class: 'bg-teal-700' },
  { value: 'teal-800', label: 'Teal 800', class: 'bg-teal-800' },
  { value: 'teal-900', label: 'Teal 900', class: 'bg-teal-900' },
  
  // Cyan (du plus clair au plus foncé)
  { value: 'cyan-100', label: 'Cyan 100', class: 'bg-cyan-100' },
  { value: 'cyan-200', label: 'Cyan 200', class: 'bg-cyan-200' },
  { value: 'cyan-300', label: 'Cyan 300', class: 'bg-cyan-300' },
  { value: 'cyan-400', label: 'Cyan 400', class: 'bg-cyan-400' },
  { value: 'cyan-500', label: 'Cyan 500', class: 'bg-cyan-500' },
  { value: 'cyan-600', label: 'Cyan 600', class: 'bg-cyan-600' },
  { value: 'cyan-700', label: 'Cyan 700', class: 'bg-cyan-700' },
  { value: 'cyan-800', label: 'Cyan 800', class: 'bg-cyan-800' },
  { value: 'cyan-900', label: 'Cyan 900', class: 'bg-cyan-900' },
  
  // Sky (du plus clair au plus foncé)
  { value: 'sky-100', label: 'Sky 100', class: 'bg-sky-100' },
  { value: 'sky-200', label: 'Sky 200', class: 'bg-sky-200' },
  { value: 'sky-300', label: 'Sky 300', class: 'bg-sky-300' },
  { value: 'sky-400', label: 'Sky 400', class: 'bg-sky-400' },
  { value: 'sky-500', label: 'Sky 500', class: 'bg-sky-500' },
  { value: 'sky-600', label: 'Sky 600', class: 'bg-sky-600' },
  { value: 'sky-700', label: 'Sky 700', class: 'bg-sky-700' },
  { value: 'sky-800', label: 'Sky 800', class: 'bg-sky-800' },
  { value: 'sky-900', label: 'Sky 900', class: 'bg-sky-900' },
  
  // Bleu (du plus clair au plus foncé)
  { value: 'blue-100', label: 'Blue 100', class: 'bg-blue-100' },
  { value: 'blue-200', label: 'Blue 200', class: 'bg-blue-200' },
  { value: 'blue-300', label: 'Blue 300', class: 'bg-blue-300' },
  { value: 'blue-400', label: 'Blue 400', class: 'bg-blue-400' },
  { value: 'blue-500', label: 'Blue 500', class: 'bg-blue-500' },
  { value: 'blue-600', label: 'Blue 600', class: 'bg-blue-600' },
  { value: 'blue-700', label: 'Blue 700', class: 'bg-blue-700' },
  { value: 'blue-800', label: 'Blue 800', class: 'bg-blue-800' },
  { value: 'blue-900', label: 'Blue 900', class: 'bg-blue-900' },
  
  // Indigo (du plus clair au plus foncé)
  { value: 'indigo-100', label: 'Indigo 100', class: 'bg-indigo-100' },
  { value: 'indigo-200', label: 'Indigo 200', class: 'bg-indigo-200' },
  { value: 'indigo-300', label: 'Indigo 300', class: 'bg-indigo-300' },
  { value: 'indigo-400', label: 'Indigo 400', class: 'bg-indigo-400' },
  { value: 'indigo-500', label: 'Indigo 500', class: 'bg-indigo-500' },
  { value: 'indigo-600', label: 'Indigo 600', class: 'bg-indigo-600' },
  { value: 'indigo-700', label: 'Indigo 700', class: 'bg-indigo-700' },
  { value: 'indigo-800', label: 'Indigo 800', class: 'bg-indigo-800' },
  { value: 'indigo-900', label: 'Indigo 900', class: 'bg-indigo-900' },
  
  // Violet (du plus clair au plus foncé)
  { value: 'violet-100', label: 'Violet 100', class: 'bg-violet-100' },
  { value: 'violet-200', label: 'Violet 200', class: 'bg-violet-200' },
  { value: 'violet-300', label: 'Violet 300', class: 'bg-violet-300' },
  { value: 'violet-400', label: 'Violet 400', class: 'bg-violet-400' },
  { value: 'violet-500', label: 'Violet 500', class: 'bg-violet-500' },
  { value: 'violet-600', label: 'Violet 600', class: 'bg-violet-600' },
  { value: 'violet-700', label: 'Violet 700', class: 'bg-violet-700' },
  { value: 'violet-800', label: 'Violet 800', class: 'bg-violet-800' },
  { value: 'violet-900', label: 'Violet 900', class: 'bg-violet-900' },
  
  // Purple (du plus clair au plus foncé)
  { value: 'purple-100', label: 'Purple 100', class: 'bg-purple-100' },
  { value: 'purple-200', label: 'Purple 200', class: 'bg-purple-200' },
  { value: 'purple-300', label: 'Purple 300', class: 'bg-purple-300' },
  { value: 'purple-400', label: 'Purple 400', class: 'bg-purple-400' },
  { value: 'purple-500', label: 'Purple 500', class: 'bg-purple-500' },
  { value: 'purple-600', label: 'Purple 600', class: 'bg-purple-600' },
  { value: 'purple-700', label: 'Purple 700', class: 'bg-purple-700' },
  { value: 'purple-800', label: 'Purple 800', class: 'bg-purple-800' },
  { value: 'purple-900', label: 'Purple 900', class: 'bg-purple-900' },
  
  // Fuchsia (du plus clair au plus foncé)
  { value: 'fuchsia-100', label: 'Fuchsia 100', class: 'bg-fuchsia-100' },
  { value: 'fuchsia-200', label: 'Fuchsia 200', class: 'bg-fuchsia-200' },
  { value: 'fuchsia-300', label: 'Fuchsia 300', class: 'bg-fuchsia-300' },
  { value: 'fuchsia-400', label: 'Fuchsia 400', class: 'bg-fuchsia-400' },
  { value: 'fuchsia-500', label: 'Fuchsia 500', class: 'bg-fuchsia-500' },
  { value: 'fuchsia-600', label: 'Fuchsia 600', class: 'bg-fuchsia-600' },
  { value: 'fuchsia-700', label: 'Fuchsia 700', class: 'bg-fuchsia-700' },
  { value: 'fuchsia-800', label: 'Fuchsia 800', class: 'bg-fuchsia-800' },
  { value: 'fuchsia-900', label: 'Fuchsia 900', class: 'bg-fuchsia-900' },
  
  // Pink (du plus clair au plus foncé)
  { value: 'pink-100', label: 'Pink 100', class: 'bg-pink-100' },
  { value: 'pink-200', label: 'Pink 200', class: 'bg-pink-200' },
  { value: 'pink-300', label: 'Pink 300', class: 'bg-pink-300' },
  { value: 'pink-400', label: 'Pink 400', class: 'bg-pink-400' },
  { value: 'pink-500', label: 'Pink 500', class: 'bg-pink-500' },
  { value: 'pink-600', label: 'Pink 600', class: 'bg-pink-600' },
  { value: 'pink-700', label: 'Pink 700', class: 'bg-pink-700' },
  { value: 'pink-800', label: 'Pink 800', class: 'bg-pink-800' },
  { value: 'pink-900', label: 'Pink 900', class: 'bg-pink-900' },
  
  // Rose (du plus clair au plus foncé)
  { value: 'rose-100', label: 'Rose 100', class: 'bg-rose-100' },
  { value: 'rose-200', label: 'Rose 200', class: 'bg-rose-200' },
  { value: 'rose-300', label: 'Rose 300', class: 'bg-rose-300' },
  { value: 'rose-400', label: 'Rose 400', class: 'bg-rose-400' },
  { value: 'rose-500', label: 'Rose 500', class: 'bg-rose-500' },
  { value: 'rose-600', label: 'Rose 600', class: 'bg-rose-600' },
  { value: 'rose-700', label: 'Rose 700', class: 'bg-rose-700' },
  { value: 'rose-800', label: 'Rose 800', class: 'bg-rose-800' },
  { value: 'rose-900', label: 'Rose 900', class: 'bg-rose-900' },
  
  // Gris (du plus clair au plus foncé)
  { value: 'slate-100', label: 'Slate 100', class: 'bg-slate-100' },
  { value: 'slate-200', label: 'Slate 200', class: 'bg-slate-200' },
  { value: 'slate-300', label: 'Slate 300', class: 'bg-slate-300' },
  { value: 'slate-400', label: 'Slate 400', class: 'bg-slate-400' },
  { value: 'slate-500', label: 'Slate 500', class: 'bg-slate-500' },
  { value: 'slate-600', label: 'Slate 600', class: 'bg-slate-600' },
  { value: 'slate-700', label: 'Slate 700', class: 'bg-slate-700' },
  { value: 'slate-800', label: 'Slate 800', class: 'bg-slate-800' },
  { value: 'slate-900', label: 'Slate 900', class: 'bg-slate-900' },
  
  { value: 'gray-100', label: 'Gray 100', class: 'bg-gray-100' },
  { value: 'gray-200', label: 'Gray 200', class: 'bg-gray-200' },
  { value: 'gray-300', label: 'Gray 300', class: 'bg-gray-300' },
  { value: 'gray-400', label: 'Gray 400', class: 'bg-gray-400' },
  { value: 'gray-500', label: 'Gray 500', class: 'bg-gray-500' },
  { value: 'gray-600', label: 'Gray 600', class: 'bg-gray-600' },
  { value: 'gray-700', label: 'Gray 700', class: 'bg-gray-700' },
  { value: 'gray-800', label: 'Gray 800', class: 'bg-gray-800' },
  { value: 'gray-900', label: 'Gray 900', class: 'bg-gray-900' },
  
  { value: 'zinc-100', label: 'Zinc 100', class: 'bg-zinc-100' },
  { value: 'zinc-200', label: 'Zinc 200', class: 'bg-zinc-200' },
  { value: 'zinc-300', label: 'Zinc 300', class: 'bg-zinc-300' },
  { value: 'zinc-400', label: 'Zinc 400', class: 'bg-zinc-400' },
  { value: 'zinc-500', label: 'Zinc 500', class: 'bg-zinc-500' },
  { value: 'zinc-600', label: 'Zinc 600', class: 'bg-zinc-600' },
  { value: 'zinc-700', label: 'Zinc 700', class: 'bg-zinc-700' },
  { value: 'zinc-800', label: 'Zinc 800', class: 'bg-zinc-800' },
  { value: 'zinc-900', label: 'Zinc 900', class: 'bg-zinc-900' },
  
  { value: 'neutral-100', label: 'Neutral 100', class: 'bg-neutral-100' },
  { value: 'neutral-200', label: 'Neutral 200', class: 'bg-neutral-200' },
  { value: 'neutral-300', label: 'Neutral 300', class: 'bg-neutral-300' },
  { value: 'neutral-400', label: 'Neutral 400', class: 'bg-neutral-400' },
  { value: 'neutral-500', label: 'Neutral 500', class: 'bg-neutral-500' },
  { value: 'neutral-600', label: 'Neutral 600', class: 'bg-neutral-600' },
  { value: 'neutral-700', label: 'Neutral 700', class: 'bg-neutral-700' },
  { value: 'neutral-800', label: 'Neutral 800', class: 'bg-neutral-800' },
  { value: 'neutral-900', label: 'Neutral 900', class: 'bg-neutral-900' },
  
  { value: 'stone-100', label: 'Stone 100', class: 'bg-stone-100' },
  { value: 'stone-200', label: 'Stone 200', class: 'bg-stone-200' },
  { value: 'stone-300', label: 'Stone 300', class: 'bg-stone-300' },
  { value: 'stone-400', label: 'Stone 400', class: 'bg-stone-400' },
  { value: 'stone-500', label: 'Stone 500', class: 'bg-stone-500' },
  { value: 'stone-600', label: 'Stone 600', class: 'bg-stone-600' },
  { value: 'stone-700', label: 'Stone 700', class: 'bg-stone-700' },
  { value: 'stone-800', label: 'Stone 800', class: 'bg-stone-800' },
  { value: 'stone-900', label: 'Stone 900', class: 'bg-stone-900' },
];

// Strategy templates to help users get started
const STRATEGY_TEMPLATES = [
  {
    name: 'RSI Mean Reversion',
    description: 'Buy when RSI is oversold, sell when overbought',
    color: 'emerald',
    conditions: {
      longEntry: [
        { indicator: 'rsi', type: 'comparison', operator: 'LT', value: 30, compareType: 'number' }
      ],
      shortEntry: [
        { indicator: 'rsi', type: 'comparison', operator: 'GT', value: 70, compareType: 'number' }
      ],
      longExit: [
        { indicator: 'rsi', type: 'comparison', operator: 'GT', value: 70, compareType: 'number' }
      ],
      shortExit: [
        { indicator: 'rsi', type: 'comparison', operator: 'LT', value: 30, compareType: 'number' }
      ]
    }
  },
  {
    name: 'MACD Crossover',
    description: 'Buy when MACD crosses above signal, sell when below',
    color: 'blue',
    conditions: {
      longEntry: [
        { indicator: 'isMACDBullish', type: 'boolean' }
      ],
      shortEntry: [
        { indicator: 'isMACDBearish', type: 'boolean' }
      ],
      longExit: [
        { indicator: 'isMACDBearish', type: 'boolean' }
      ],
      shortExit: [
        { indicator: 'isMACDBullish', type: 'boolean' }
      ]
    }
  },
  {
    name: 'Bollinger Bands Bounce',
    description: 'Buy at lower band, sell at upper band',
    color: 'teal',
    conditions: {
      longEntry: [
        { indicator: 'isBelowBBLower', type: 'boolean' }
      ],
      shortEntry: [
        { indicator: 'isAboveBBUpper', type: 'boolean' }
      ],
      longExit: [
        { indicator: 'isAboveBBUpper', type: 'boolean' }
      ],
      shortExit: [
        { indicator: 'isBelowBBLower', type: 'boolean' }
      ]
    }
  },
  {
    name: 'Trend Following',
    description: 'Follow the trend with moving averages',
    color: 'green',
    conditions: {
      longEntry: [
        { indicator: 'isBullishTrend', type: 'boolean' },
        { indicator: 'isUptrend', type: 'boolean' }
      ],
      shortEntry: [
        { indicator: 'isBearishTrend', type: 'boolean' },
        { indicator: 'isDowntrend', type: 'boolean' }
      ],
      longExit: [
        { indicator: 'isDowntrend', type: 'boolean' }
      ],
      shortExit: [
        { indicator: 'isUptrend', type: 'boolean' }
      ]
    }
  }
];

export default function StrategyBuilder({ onSave, onClose, initialConfig, currentTimeframe = '1m' }: StrategyBuilderProps) {
  const [config, setConfig] = useState<CustomStrategyConfig>({
    name: initialConfig?.name || '',
    description: initialConfig?.description || '',
    color: initialConfig?.color || 'emerald',
    timeframe: currentTimeframe,
    profitTargetPercent: initialConfig?.profitTargetPercent || 2.0,
    stopLossPercent: initialConfig?.stopLossPercent || 1.0,
    maxPositionTime: initialConfig?.maxPositionTime || 60,
    cooldownPeriod: initialConfig?.cooldownPeriod || 5,
    longEntryConditions: initialConfig?.longEntryConditions || { conditions: [], operator: 'AND' },
    shortEntryConditions: initialConfig?.shortEntryConditions || { conditions: [], operator: 'AND' },
    longExitConditions: initialConfig?.longExitConditions || { conditions: [], operator: 'AND' },
    shortExitConditions: initialConfig?.shortExitConditions || { conditions: [], operator: 'AND' },
    positionSize: initialConfig?.positionSize || 1,
    strategyType: initialConfig?.strategyType || 'CUSTOM',
    simulationMode: initialConfig?.simulationMode || true
  });

  const [activeTab, setActiveTab] = useState<'setup' | 'conditions' | 'templates'>('setup');
  const [selectedCategory, setSelectedCategory] = useState<string>('price');
  const [showIndicatorInfo, setShowIndicatorInfo] = useState<string | null>(null);
  const [indicatorType, setIndicatorType] = useState<'essential' | 'advanced'>('essential');

  const handleSave = () => {
    if (!config.name.trim()) {
      alert('Please enter a strategy name');
      return;
    }
    
    if (config.longEntryConditions.conditions.length === 0 && config.shortEntryConditions.conditions.length === 0) {
      alert('Please add at least one entry condition');
      return;
    }
    
    onSave(config);
  };

  const addCondition = (type: ConditionType, indicator: any) => {
    const newCondition: SimpleCondition = {
      indicator: indicator.key,
      type: indicator.type,
      operator: indicator.type === 'comparison' ? 'GT' : undefined,
      value: indicator.type === 'comparison' ? 50 : undefined,
        compareType: 'number'
    };

    const conditionTypeMap = {
      longEntry: 'longEntryConditions',
      shortEntry: 'shortEntryConditions', 
      longExit: 'longExitConditions',
      shortExit: 'shortExitConditions'
    } as const;

    const conditionKey = conditionTypeMap[type];
    
    setConfig(prev => ({
      ...prev,
      [conditionKey]: {
        ...(prev[conditionKey] || { conditions: [], operator: 'AND' }),
        conditions: [...(prev[conditionKey]?.conditions || []), newCondition]
      }
    }));
  };

  const removeCondition = (type: ConditionType, index: number) => {
    const conditionTypeMap = {
      longEntry: 'longEntryConditions',
      shortEntry: 'shortEntryConditions', 
      longExit: 'longExitConditions',
      shortExit: 'shortExitConditions'
    } as const;

    const conditionKey = conditionTypeMap[type];
    
    setConfig(prev => ({
      ...prev,
      [conditionKey]: {
        ...(prev[conditionKey] || { conditions: [], operator: 'AND' }),
        conditions: (prev[conditionKey]?.conditions || []).filter((_, i) => i !== index)
      }
    }));
  };

  const updateCondition = (type: ConditionType, index: number, field: keyof SimpleCondition, value: any) => {
    const conditionTypeMap = {
      longEntry: 'longEntryConditions',
      shortEntry: 'shortEntryConditions', 
      longExit: 'longExitConditions',
      shortExit: 'shortExitConditions'
    } as const;

    const conditionKey = conditionTypeMap[type];
    
    setConfig(prev => ({
      ...prev,
      [conditionKey]: {
        ...(prev[conditionKey] || { conditions: [], operator: 'AND' }),
        conditions: (prev[conditionKey]?.conditions || []).map((condition, i) => 
          i === index ? { ...condition, [field]: value } : condition
        )
      }
    }));
  };

  const updateConditionGroupOperator = (type: ConditionType, operator: 'AND' | 'OR') => {
    const conditionTypeMap = {
      longEntry: 'longEntryConditions',
      shortEntry: 'shortEntryConditions', 
      longExit: 'longExitConditions',
      shortExit: 'shortExitConditions'
    } as const;

    const conditionKey = conditionTypeMap[type];
    
    setConfig(prev => ({
      ...prev,
      [conditionKey]: {
        ...(prev[conditionKey] || { conditions: [], operator: 'AND' }),
        operator
      }
    }));
  };

  const createConditionSubgroup = (type: ConditionType) => {
    const conditionTypeMap = {
      longEntry: 'longEntryConditions',
      shortEntry: 'shortEntryConditions', 
      longExit: 'longExitConditions',
      shortExit: 'shortExitConditions'
    } as const;

    const conditionKey = conditionTypeMap[type];
    
    // Créer un nouveau sous-groupe vide
    const newSubgroup = {
      operator: 'AND' as const,
      conditions: [],
      description: 'Nouveau sous-groupe'
    };
    
    setConfig(prev => ({
      ...prev,
      [conditionKey]: {
        ...(prev[conditionKey] || { conditions: [], operator: 'AND' }),
        conditions: [...(prev[conditionKey]?.conditions || []), newSubgroup]
      }
    }));
  };

  const updateSubgroupOperator = (type: ConditionType, groupIndex: number, operator: 'AND' | 'OR') => {
    const conditionTypeMap = {
      longEntry: 'longEntryConditions',
      shortEntry: 'shortEntryConditions', 
      longExit: 'longExitConditions',
      shortExit: 'shortExitConditions'
    } as const;

    const conditionKey = conditionTypeMap[type];
    
    setConfig(prev => ({
      ...prev,
      [conditionKey]: {
        ...(prev[conditionKey] || { conditions: [], operator: 'AND' }),
        conditions: (prev[conditionKey]?.conditions || []).map((condition, index) => 
          index === groupIndex && 'operator' in condition 
            ? { ...condition, operator }
            : condition
        )
      }
    }));
  };

  const loadTemplate = (template: any) => {
    setConfig(prev => ({
      ...prev,
      name: template.name,
      color: template.color,
      longEntryConditions: template.conditions.longEntry ? { conditions: template.conditions.longEntry, operator: 'AND' } : { conditions: [], operator: 'AND' },
      shortEntryConditions: template.conditions.shortEntry ? { conditions: template.conditions.shortEntry, operator: 'AND' } : { conditions: [], operator: 'AND' },
      longExitConditions: template.conditions.longExit ? { conditions: template.conditions.longExit, operator: 'AND' } : { conditions: [], operator: 'AND' },
      shortExitConditions: template.conditions.shortExit ? { conditions: template.conditions.shortExit, operator: 'AND' } : { conditions: [], operator: 'AND' }
    }));
    setActiveTab('conditions');
  };

  const getIndicatorInfo = (indicatorKey: string) => {
    const categories = indicatorType === 'essential' ? ESSENTIAL_INDICATOR_CATEGORIES : ADVANCED_INDICATOR_CATEGORIES;
    for (const category of Object.values(categories)) {
      const indicator = (category as any).indicators.find((ind: any) => ind.key === indicatorKey);
      if (indicator) return indicator;
    }
    return null;
  };

  const getCurrentCategories = () => {
    return indicatorType === 'essential' ? ESSENTIAL_INDICATOR_CATEGORIES : ADVANCED_INDICATOR_CATEGORIES;
  };

  const getConditionGroup = (type: ConditionType) => {
    const conditionTypeMap = {
      longEntry: 'longEntryConditions',
      shortEntry: 'shortEntryConditions', 
      longExit: 'longExitConditions',
      shortExit: 'shortExitConditions'
    } as const;
    return config[conditionTypeMap[type]] || { conditions: [], operator: 'AND' };
  };

  const renderConditionEditor = (type: ConditionType, condition: any, index: number, depth: number = 0) => {
    // Si c'est un groupe de conditions
    if (condition.operator && condition.conditions) {
  return (
        <div key={index} className={`bg-gray-600/50 rounded p-2 border border-gray-500 ml-${depth * 4}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-purple-300 flex items-center gap-1">
                <HiCube className="w-3 h-3" />
                Groupe
              </span>
              <select
                value={condition.operator}
                onChange={(e) => updateSubgroupOperator(type, index, e.target.value as 'AND' | 'OR')}
                className="bg-gray-700 border border-gray-500 rounded px-2 py-1 text-xs text-gray-300"
              >
                <option value="AND">✅ ET (toutes)</option>
                <option value="OR">➕ OU (au moins une)</option>
              </select>
            </div>
            <button
              onClick={() => removeCondition(type, index)}
              className="text-red-400 hover:text-red-300 p-0.5"
            >
              <HiTrash className="w-3 h-3" />
            </button>
          </div>
          
          <div className="space-y-1">
            {condition.conditions.map((subCondition: any, subIndex: number) => (
              <div key={subIndex} className="flex items-center gap-2">
                {subIndex > 0 && (
                  <div className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded flex items-center gap-1">
                    {condition.operator === 'AND' ? (
                      <>
                        <HiCheck className="w-3 h-3" />
                        ET
                      </>
                    ) : (
                      <>
                        <HiPlus className="w-3 h-3" />
                        OU
                      </>
                    )}
                  </div>
                )}
          <div className="flex-1">
                  {renderConditionEditor(type, subCondition, subIndex, depth + 1)}
          </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    // Si c'est une condition simple
    const indicatorInfo = getIndicatorInfo(condition.indicator);
    
    return (
      <div key={index} className="bg-gray-700/50 rounded p-2 border border-gray-600">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-300 truncate">
            {indicatorInfo?.label || condition.indicator}
          </span>
          <button
            onClick={() => removeCondition(type, index)}
            className="text-red-400 hover:text-red-300 p-0.5"
          >
            <HiTrash className="w-3 h-3" />
          </button>
        </div>
        
        {condition.type === 'comparison' && (
          <div className="grid grid-cols-3 gap-1">
            <select
              value={condition.operator || 'GT'}
              onChange={(e) => updateCondition(type, index, 'operator', e.target.value)}
              className="bg-gray-600 border border-gray-500 rounded px-1.5 py-1 text-xs text-gray-300"
            >
              <option value="GT">&gt;</option>
              <option value="LT">&lt;</option>
              <option value="EQ">=</option>
              <option value="GTE">≥</option>
              <option value="LTE">≤</option>
            </select>
            
            <select
              value={condition.compareType || 'number'}
              onChange={(e) => updateCondition(type, index, 'compareType', e.target.value)}
              className="bg-gray-600 border border-gray-500 rounded px-1.5 py-1 text-xs text-gray-300"
            >
              <option value="number">Number</option>
              <option value="indicator">Indicator</option>
            </select>
            
            {condition.compareType === 'number' ? (
              <input
                type="number"
                value={condition.value as number || ''}
                onChange={(e) => updateCondition(type, index, 'value', parseFloat(e.target.value))}
                className="bg-gray-600 border border-gray-500 rounded px-1.5 py-1 text-xs text-gray-300"
                placeholder="0"
              />
            ) : (
              <select
                value={condition.value as string || ''}
                onChange={(e) => updateCondition(type, index, 'value', e.target.value)}
                className="bg-gray-600 border border-gray-500 rounded px-1.5 py-1 text-xs text-gray-300"
              >
                <option value="">Select</option>
                {Object.values(getCurrentCategories()).map((category: any) => 
                  category.indicators.map((indicator: any) => (
                    <option key={indicator.key} value={indicator.key}>
                      {indicator.label}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Create Custom Strategy</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2"
          >
            <HiX className="w-6 h-6" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'setup'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <HiCog className="w-4 h-4" />
            Strategy Setup
          </button>
          <button
            onClick={() => setActiveTab('conditions')}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'conditions'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <HiAdjustments className="w-4 h-4" />
            Conditions
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'templates'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <HiTemplate className="w-4 h-4" />
            Templates
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {activeTab === 'setup' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <HiTag className="w-4 h-4" />
                    Strategy Name
                  </label>
              <input
                type="text"
                    value={config.name}
                    onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    placeholder="Enter strategy name"
              />
            </div>
            
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <HiDocumentText className="w-4 h-4" />
                    Description
                  </label>
                  <input
                    type="text"
                    value={config.description}
                    onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    placeholder="Describe your strategy"
                  />
                </div>
          </div>
          
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <HiColorSwatch className="w-4 h-4" />
                  Color Theme
                </label>
                
                {/* Color Grid */}
                <div className="grid grid-cols-12 md:grid-cols-16 lg:grid-cols-20 xl:grid-cols-24 gap-1 max-h-40 overflow-y-auto">
                  {AVAILABLE_COLORS.map(color => (
              <button
                      key={color.value}
                      onClick={() => setConfig(prev => ({ ...prev, color: color.value }))}
                      className={`w-6 h-6 rounded border-2 ${
                        config.color === color.value ? 'border-white' : 'border-gray-600'
                      } ${color.class}`}
                      title={color.label}
                  />
                ))}
              </div>
                
                {/* Color Count */}
                <div className="mt-2 text-xs text-gray-400">
                  {AVAILABLE_COLORS.length} couleur{AVAILABLE_COLORS.length !== 1 ? 's' : ''} disponible{AVAILABLE_COLORS.length !== 1 ? 's' : ''}
              </div>
            </div>
            
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <HiTrendingUp className="w-4 h-4" />
                    Profit Target (%)
                  </label>
                <input
                  type="number"
                    value={config.profitTargetPercent}
                    onChange={(e) => setConfig(prev => ({ ...prev, profitTargetPercent: parseFloat(e.target.value) }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  step="0.1"
                    min="0.1"
                />
              </div>
              
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <HiTrendingDown className="w-4 h-4" />
                    Stop Loss (%)
                  </label>
                <input
                  type="number"
                    value={config.stopLossPercent}
                    onChange={(e) => setConfig(prev => ({ ...prev, stopLossPercent: parseFloat(e.target.value) }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  step="0.1"
                    min="0.1"
                />
              </div>
              
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <HiClock className="w-4 h-4" />
                    Max Position Time (min)
                  </label>
                <input
                  type="number"
                    value={config.maxPositionTime}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxPositionTime: parseInt(e.target.value) }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    min="1"
                />
              </div>
              
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <HiRefresh className="w-4 h-4" />
                    Cooldown Period (min)
                  </label>
                <input
                  type="number"
                    value={config.cooldownPeriod}
                    onChange={(e) => setConfig(prev => ({ ...prev, cooldownPeriod: parseInt(e.target.value) }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    min="1"
                />
              </div>
              </div>
              
            {/* Additional Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <HiScale className="w-4 h-4" />
                  Position Size
                </label>
                <input
                  type="number"
                  value={config.positionSize}
                  onChange={(e) => setConfig(prev => ({ ...prev, positionSize: parseFloat(e.target.value) }))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  step="0.1"
                  min="0.1"
              />
            </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <HiPlay className="w-4 h-4" />
                  Simulation Mode
                </label>
                <select
                  value={config.simulationMode ? 'true' : 'false'}
                  onChange={(e) => setConfig(prev => ({ ...prev, simulationMode: e.target.value === 'true' }))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="true">Simulation</option>
                  <option value="false">Live Trading</option>
                </select>
          </div>
            </div>
          </div>
                            )}
            
          {activeTab === 'conditions' && (
            <div className="space-y-6">
              {/* Indicator Type Selection */}
              <div className="flex gap-2 mb-4">
            <button
                  onClick={() => {
                    setIndicatorType('essential');
                    setSelectedCategory('price');
                  }}
                  className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                    indicatorType === 'essential'
                      ? 'bg-blue-900/30 border-blue-500 text-blue-400'
                      : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <HiChartBar className="w-4 h-4" />
                  Essentiels
                </button>
                <button
                  onClick={() => {
                    setIndicatorType('advanced');
                    setSelectedCategory('advancedMA');
                  }}
                  className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                    indicatorType === 'advanced'
                      ? 'bg-blue-900/30 border-blue-500 text-blue-400'
                      : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <HiBeaker className="w-4 h-4" />
                  Avancés
                </button>
                      </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Select Indicator Category
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {Object.values(getCurrentCategories()).map(category => {
                  const Icon = category.icon;
                  return (
            <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        selectedCategory === category.id
                            ? 'bg-blue-900/30 border-blue-500 text-blue-400'
                            : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-medium">{category.label}</span>
            </button>
                  );
                })}
      </div>
      
                {/* Category Description */}
                <div className="bg-gray-800/30 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-400">
                    <strong className="text-gray-300">{(getCurrentCategories() as any)[selectedCategory]?.label}:</strong>{' '}
                    {(getCurrentCategories() as any)[selectedCategory]?.description}
                  </p>
                </div>
              </div>

              {/* Indicators Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                {(getCurrentCategories() as any)[selectedCategory]?.indicators.map((indicator: any) => (
                  <div
                    key={indicator.key}
                    className="bg-gray-800/50 rounded-lg p-2 border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-300 truncate">{indicator.label}</span>
                    <button
                        onClick={() => setShowIndicatorInfo(showIndicatorInfo === indicator.key ? null : indicator.key)}
                        className="text-gray-500 hover:text-gray-400 p-0.5"
                    >
                        <HiInformationCircle className="w-3 h-3" />
                      </button>
                  </div>
                    
                    {showIndicatorInfo === indicator.key && (
                      <p className="text-xs text-gray-500 mb-1.5">{indicator.description}</p>
                            )}
            
                    <div className="grid grid-cols-2 gap-1">
                      <div className="flex gap-0.5">
              <button
                          onClick={() => addCondition('longEntry', indicator)}
                          className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-700 text-green-400 px-1 py-0.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                          title="Ajouter condition d'entrée LONG"
                        >
                          <HiArrowUp className="w-2 h-2" />
                          Long
                            </button>
                    <button
                          onClick={() => addCondition('longExit', indicator)}
                          className="flex-1 bg-green-800/30 hover:bg-green-800/50 border border-green-600 text-green-300 px-1 py-0.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                          title="Ajouter condition de sortie LONG"
                        >
                          <HiArrowUp className="w-2 h-2" />
                          Exit
                        </button>
                          </div>
                      <div className="flex gap-0.5">
              <button
                          onClick={() => addCondition('shortEntry', indicator)}
                          className="flex-1 bg-red-900/30 hover:bg-red-900/50 border border-red-700 text-red-400 px-1 py-0.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                          title="Ajouter condition d'entrée SHORT"
                        >
                          <HiArrowDown className="w-2 h-2" />
                          Short
                        </button>
                        <button
                          onClick={() => addCondition('shortExit', indicator)}
                          className="flex-1 bg-red-800/30 hover:bg-red-800/50 border border-red-600 text-red-300 px-1 py-0.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                          title="Ajouter condition de sortie SHORT"
                        >
                          <HiArrowDown className="w-2 h-2" />
                          Exit
              </button>
            </div>
        </div>
            </div>
                  ))}
            </div>
            
              {/* Conditions Display - Compact Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(['longEntry', 'shortEntry', 'longExit', 'shortExit'] as ConditionType[]).map(type => (
                  <div key={type} className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-white capitalize flex items-center gap-2">
                        {type === 'longEntry' && <span className="text-green-400"><HiTrendingUp className="w-4 h-4" /></span>}
                        {type === 'shortEntry' && <span className="text-red-400"><HiTrendingDown className="w-4 h-4" /></span>}
                        {type === 'longExit' && <span className="text-green-300"><HiXCircle className="w-4 h-4" /></span>}
                        {type === 'shortExit' && <span className="text-red-300"><HiCheckCircle className="w-4 h-4" /></span>}
                        {type.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                      <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                        {getConditionGroup(type).conditions.length} condition{getConditionGroup(type).conditions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {/* Advanced Logical Operators */}
                    {getConditionGroup(type).conditions.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs text-gray-400">
                            Opérateurs logiques :
                          </label>
                          <div className="flex gap-1">
                    <button
                              onClick={() => createConditionSubgroup(type)}
                              className="px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500 text-purple-300 rounded text-xs font-medium transition-colors flex items-center gap-1"
                              title="Créer un sous-groupe de conditions"
                            >
                              <HiCube className="w-3 h-3" />
                              Groupe
                    </button>
                            <button
                              onClick={() => addCondition(type, { key: 'placeholder', label: 'Nouvelle condition', type: 'comparison' })}
                              className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500 text-blue-300 rounded text-xs font-medium transition-colors flex items-center gap-1"
                              title="Ajouter une condition simple"
                            >
                              <HiPlus className="w-3 h-3" />
                              ➕ Condition
                            </button>
                          </div>
                      </div>
                      
                        {getConditionGroup(type).conditions.length > 1 && (
                          <div className="flex gap-2 mb-1">
                    <button
                              onClick={() => updateConditionGroupOperator(type, 'AND')}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                                getConditionGroup(type).operator === 'AND'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              <HiCheck className="w-3 h-3" />
                              ET (toutes)
                            </button>
                            <button
                              onClick={() => updateConditionGroupOperator(type, 'OR')}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                                getConditionGroup(type).operator === 'OR'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              <HiPlus className="w-3 h-3" />
                              OU (au moins une)
                            </button>
                      </div>
                        )}
                        
                        <p className="text-xs text-gray-500">
                          {getConditionGroup(type).operator === 'AND' 
                            ? 'Toutes les conditions doivent être vraies' 
                            : 'Au moins une condition doit être vraie'
                          }
                        </p>
                      </div>
                    )}
                    
                    {getConditionGroup(type).conditions.length === 0 ? (
                      <p className="text-gray-500 text-xs">No conditions added yet</p>
                    ) : (
                      <div className="space-y-1.5">
                        {getConditionGroup(type).conditions.map((condition, index) => (
                          <div key={index} className="flex items-center gap-2">
                            {index > 0 && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                                <span className="font-medium flex items-center gap-1">
                                  {getConditionGroup(type).operator === 'AND' ? (
                                    <>
                                      <HiCheck className="w-3 h-3" />
                                      ET
                                    </>
                                  ) : (
                                    <>
                                      <HiPlus className="w-3 h-3" />
                                      OU
                                    </>
                                  )}
                      </span>
                              </div>
                            )}
                            <div className="flex-1">
                              {renderConditionEditor(type, condition, index)}
                            </div>
                          </div>
                  ))}
                </div>
                    )}
              </div>
                ))}
            </div>
          </div>
          )}
            
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm mb-4">
                Choose a template to get started quickly, then customize the conditions as needed.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STRATEGY_TEMPLATES.map((template, index) => (
                  <div
                    key={index}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors"
                    onClick={() => loadTemplate(template)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-3 h-3 rounded-full bg-${template.color}-500`}></div>
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <HiTemplate className="w-4 h-4" />
                        {template.name}
                      </h3>
                    </div>
                    <p className="text-gray-400 text-sm">{template.description}</p>
          </div>
                ))}
              </div>
                          </div>
                        )}
            </div>
            
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
              <button
              onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <HiX className="w-4 h-4" />
                Cancel
              </button>
            <button
              onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
            <HiCheckCircle className="w-4 h-4" />
              Create Strategy
            </button>
        </div>
      </div>
    </div>
  );
}
