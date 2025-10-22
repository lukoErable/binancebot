'use client';

import { AdvancedIndicatorValues, INDICATOR_CATEGORIES } from '@/lib/advanced-indicators';
import { useMemo, useState } from 'react';
import {
    HiChartBar,
    HiChevronDown,
    HiChevronRight,
    HiInformationCircle
} from 'react-icons/hi';

interface AdvancedIndicatorPanelProps {
  indicators: AdvancedIndicatorValues;
  onIndicatorSelect?: (indicator: string, value: number) => void;
}

export default function AdvancedIndicatorPanel({ 
  indicators, 
  onIndicatorSelect 
}: AdvancedIndicatorPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['trend', 'momentum'])
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return Object.values(INDICATOR_CATEGORIES);
    
    return Object.values(INDICATOR_CATEGORIES).filter(category => {
      return category.indicators.some(indicator => 
        indicator.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [searchTerm]);

  const formatValue = (value: number, type: string = 'number'): string => {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A';
    
    switch (type) {
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'price':
        return `$${value.toFixed(2)}`;
      case 'ratio':
        return value.toFixed(3);
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return value.toFixed(2);
    }
  };

  const getIndicatorType = (indicator: string): string => {
    if (indicator.includes('Percent') || indicator.includes('Ratio')) return 'percentage';
    if (indicator.includes('Price') || indicator.includes('Upper') || indicator.includes('Lower')) return 'price';
    if (indicator.includes('is') || indicator.includes('has')) return 'boolean';
    return 'number';
  };

  const getIndicatorColor = (value: number, type: string): string => {
    if (type === 'boolean') return value ? 'text-green-400' : 'text-red-400';
    if (type === 'percentage') {
      if (value > 0) return 'text-green-400';
      if (value < 0) return 'text-red-400';
      return 'text-gray-400';
    }
    return 'text-blue-400';
  };

  const getIndicatorDescription = (indicator: string): string => {
    const descriptions: Record<string, string> = {
      // Trend Indicators
      'sma5': 'Simple Moving Average (5 periods)',
      'sma20': 'Simple Moving Average (20 periods)',
      'sma50': 'Simple Moving Average (50 periods)',
      'sma200': 'Simple Moving Average (200 periods)',
      'ema12': 'Exponential Moving Average (12 periods)',
      'ema26': 'Exponential Moving Average (26 periods)',
      'ema50': 'Exponential Moving Average (50 periods)',
      'hma10': 'Hull Moving Average (10 periods)',
      'dema10': 'Double Exponential Moving Average (10 periods)',
      'tema10': 'Triple Exponential Moving Average (10 periods)',
      'kama10': 'Kaufman Adaptive Moving Average (10 periods)',
      'alma10': 'Arnaud Legoux Moving Average (10 periods)',
      'vwma10': 'Volume Weighted Moving Average (10 periods)',
      'isGoldenCross': 'SMA50 crossed above SMA200',
      'isDeathCross': 'SMA50 crossed below SMA200',
      
      // Momentum Indicators
      'rsi': 'Relative Strength Index (14 periods)',
      'rsi9': 'Relative Strength Index (9 periods)',
      'rsi21': 'Relative Strength Index (21 periods)',
      'stochK': 'Stochastic %K',
      'stochD': 'Stochastic %D',
      'williamsR': 'Williams %R',
      'cci': 'Commodity Channel Index',
      'roc': 'Rate of Change',
      'momentum': 'Momentum indicator',
      'ultimateOscillator': 'Ultimate Oscillator',
      'awesomeOscillator': 'Awesome Oscillator',
      'cmo': 'Chande Momentum Oscillator',
      'fisherTransform': 'Fisher Transform',
      'coppockCurve': 'Coppock Curve',
      'dpo': 'Detrended Price Oscillator',
      'isOversold': 'RSI below 30 (oversold)',
      'isOverbought': 'RSI above 70 (overbought)',
      
      // Volatility Indicators
      'bbUpper': 'Bollinger Bands Upper',
      'bbMiddle': 'Bollinger Bands Middle',
      'bbLower': 'Bollinger Bands Lower',
      'bbWidth': 'Bollinger Bands Width',
      'bbPercent': 'Bollinger Bands %B',
      'atr': 'Average True Range',
      'atr14': 'Average True Range (14 periods)',
      'natr': 'Normalized Average True Range',
      'kcUpper': 'Keltner Channels Upper',
      'kcMiddle': 'Keltner Channels Middle',
      'kcLower': 'Keltner Channels Lower',
      'donchianUpper': 'Donchian Channels Upper',
      'donchianLower': 'Donchian Channels Lower',
      'chaikinVolatility': 'Chaikin Volatility',
      'massIndex': 'Mass Index',
      'isHighVolatility': 'High volatility detected',
      'isLowVolatility': 'Low volatility detected',
      
      // Volume Indicators
      'volume': 'Trading volume',
      'volumeSMA20': 'Volume 20-period SMA',
      'volumeRatio': 'Current volume vs average',
      'obv': 'On-Balance Volume',
      'vwap': 'Volume Weighted Average Price',
      'adLine': 'Accumulation/Distribution Line',
      'cmf': 'Chaikin Money Flow',
      'mfi': 'Money Flow Index',
      'eom': 'Ease of Movement',
      'forceIndex': 'Force Index',
      'nvi': 'Negative Volume Index',
      'pvi': 'Positive Volume Index',
      'isHighVolume': 'Volume above 1.5x average',
      'isLowVolume': 'Volume below 0.5x average',
      
      // Ichimoku System
      'tenkanSen': 'Tenkan-sen (Conversion Line)',
      'kijunSen': 'Kijun-sen (Base Line)',
      'chikouSpan': 'Chikou Span (Lagging Span)',
      'senkouSpanA': 'Senkou Span A (Leading Span A)',
      'senkouSpanB': 'Senkou Span B (Leading Span B)',
      'kumoTop': 'Ichimoku Cloud Top',
      'kumoBottom': 'Ichimoku Cloud Bottom',
      'isPriceAboveCloud': 'Price above Ichimoku cloud',
      'isPriceBelowCloud': 'Price below Ichimoku cloud',
      'isPriceInCloud': 'Price inside Ichimoku cloud',
      
      // Trading Systems
      'macd': 'MACD Line',
      'macdSignal': 'MACD Signal Line',
      'macdHistogram': 'MACD Histogram',
      'ppo': 'Percentage Price Oscillator',
      'adx': 'Average Directional Index',
      'plusDI': 'Positive Directional Indicator',
      'minusDI': 'Negative Directional Indicator',
      'parabolicSAR': 'Parabolic SAR',
      'supertrend': 'Supertrend',
      'aroonUp': 'Aroon Up',
      'aroonDown': 'Aroon Down',
      'aroonOscillator': 'Aroon Oscillator',
      
      // Market Structure
      'pivotPoint': 'Pivot Point',
      'r1': 'Resistance 1',
      'r2': 'Resistance 2',
      'r3': 'Resistance 3',
      's1': 'Support 1',
      's2': 'Support 2',
      's3': 'Support 3',
      'fib236': 'Fibonacci 23.6% retracement',
      'fib382': 'Fibonacci 38.2% retracement',
      'fib500': 'Fibonacci 50% retracement',
      'fib618': 'Fibonacci 61.8% retracement',
      'fib786': 'Fibonacci 78.6% retracement',
      'fractalHigh': 'Fractal High',
      'fractalLow': 'Fractal Low',
      'alligatorJaw': 'Alligator Jaw (SMMA 13)',
      'alligatorTeeth': 'Alligator Teeth (SMMA 8)',
      'alligatorLips': 'Alligator Lips (SMMA 5)',
      'gatorOscillator': 'Gator Oscillator'
    };
    
    return descriptions[indicator] || `${indicator} indicator`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <HiChartBar className="w-5 h-5 text-blue-400" />
          Advanced Indicators
        </h3>
        <div className="text-sm text-gray-400">
          {Object.keys(indicators).length} indicators
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search indicators..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Categories */}
      <div className="space-y-2">
        {filteredCategories.map((category) => {
          const isExpanded = expandedCategories.has(category.id);
          const categoryIndicators = category.indicators.filter(indicator => 
            indicators.hasOwnProperty(indicator) && 
            (searchTerm === '' || indicator.toLowerCase().includes(searchTerm.toLowerCase()))
          );

          if (categoryIndicators.length === 0) return null;

          return (
            <div key={category.id} className="bg-gray-700 rounded-lg">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${category.color}`}>
                    {category.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({categoryIndicators.length})
                  </span>
                </div>
                {isExpanded ? (
                  <HiChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <HiChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-1">
                  {categoryIndicators.map((indicator) => {
                    const value = indicators[indicator as keyof AdvancedIndicatorValues];
                    const type = getIndicatorType(indicator);
                    const formattedValue = formatValue(value as number, type);
                    const color = getIndicatorColor(value as number, type);
                    const description = getIndicatorDescription(indicator);
                    const isSelected = selectedIndicator === indicator;

                    return (
                      <div
                        key={indicator}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-gray-600'
                        }`}
                        onClick={() => {
                          setSelectedIndicator(isSelected ? null : indicator);
                          onIndicatorSelect?.(indicator, value as number);
                        }}
                        title={description}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-sm text-gray-300 truncate">
                            {indicator}
                          </span>
                          <HiInformationCircle className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        </div>
                        <span className={`text-sm font-medium ${color} ml-2`}>
                          {formattedValue}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Indicator Details */}
      {selectedIndicator && (
        <div className="mt-4 p-3 bg-blue-600/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-blue-400">
              {selectedIndicator}
            </h4>
            <button
              onClick={() => setSelectedIndicator(null)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-gray-300 mb-2">
            {getIndicatorDescription(selectedIndicator)}
          </p>
          <div className="text-sm text-blue-300">
            Current Value: {formatValue(indicators[selectedIndicator as keyof AdvancedIndicatorValues] as number, getIndicatorType(selectedIndicator))}
          </div>
        </div>
      )}

      {/* Market State Summary */}
      <div className="mt-4 p-3 bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-2">Market State</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Trend:</span>
            <span className={indicators.isBullMarket ? 'text-green-400' : indicators.isBearMarket ? 'text-red-400' : 'text-gray-400'}>
              {indicators.isBullMarket ? 'Bull' : indicators.isBearMarket ? 'Bear' : 'Neutral'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Momentum:</span>
            <span className={indicators.overallBullish ? 'text-green-400' : indicators.overallBearish ? 'text-red-400' : 'text-gray-400'}>
              {indicators.overallBullish ? 'Bullish' : indicators.overallBearish ? 'Bearish' : 'Neutral'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Volatility:</span>
            <span className={indicators.isHighVolatility ? 'text-yellow-400' : 'text-gray-400'}>
              {indicators.isHighVolatility ? 'High' : 'Normal'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Volume:</span>
            <span className={indicators.isHighVolume ? 'text-blue-400' : 'text-gray-400'}>
              {indicators.isHighVolume ? 'High' : 'Normal'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
