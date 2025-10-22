'use client';

import { AdvancedIndicatorValues, INDICATOR_CATEGORIES } from '@/lib/advanced-indicators';
import { useState } from 'react';
import {
    HiChartBar,
    HiChartPie,
    HiChevronDown,
    HiChevronRight,
    HiCube,
    HiFire,
    HiLightningBolt,
    HiTrendingUp
} from 'react-icons/hi';

interface IndicatorCategoryTabsProps {
  indicators: AdvancedIndicatorValues;
  onIndicatorClick?: (indicator: string, value: number) => void;
  className?: string;
}

export default function IndicatorCategoryTabs({ 
  indicators, 
  onIndicatorClick,
  className = '' 
}: IndicatorCategoryTabsProps) {
  const [activeTab, setActiveTab] = useState('trend');
  const [expandedIndicators, setExpandedIndicators] = useState<Set<string>>(new Set());

  const getCategoryIcon = (categoryId: string) => {
    const icons = {
      trend: HiTrendingUp,
      momentum: HiLightningBolt,
      volatility: HiChartPie,
      volume: HiCube,
      ichimoku: HiFire,
      systems: HiChartBar
    };
    return icons[categoryId as keyof typeof icons] || HiChartBar;
  };

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
        return value ? '✓' : '✗';
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

  const toggleIndicator = (indicator: string) => {
    const newExpanded = new Set(expandedIndicators);
    if (newExpanded.has(indicator)) {
      newExpanded.delete(indicator);
    } else {
      newExpanded.add(indicator);
    }
    setExpandedIndicators(newExpanded);
  };

  const getKeyIndicators = (categoryId: string) => {
    const keyIndicators = {
      trend: ['sma20', 'sma50', 'sma200', 'ema12', 'ema26', 'ema50', 'isGoldenCross', 'isDeathCross'],
      momentum: ['rsi', 'rsi14', 'stochK', 'stochD', 'williamsR', 'cci', 'isOversold', 'isOverbought'],
      volatility: ['bbUpper', 'bbLower', 'bbPercent', 'atr', 'atr14', 'natr', 'isHighVolatility', 'isLowVolatility'],
      volume: ['volume', 'volumeRatio', 'obv', 'vwap', 'mfi', 'isHighVolume', 'isLowVolume'],
      ichimoku: ['tenkanSen', 'kijunSen', 'senkouSpanA', 'senkouSpanB', 'isPriceAboveCloud', 'isPriceBelowCloud'],
      systems: ['macd', 'macdSignal', 'macdHistogram', 'adx', 'plusDI', 'minusDI', 'parabolicSAR', 'supertrend']
    };
    return keyIndicators[categoryId as keyof typeof keyIndicators] || [];
  };

  const getIndicatorStatus = (indicator: string, value: number): { status: string; color: string } => {
    const type = getIndicatorType(indicator);
    
    if (type === 'boolean') {
      return {
        status: value ? 'Active' : 'Inactive',
        color: value ? 'text-green-400' : 'text-red-400'
      };
    }
    
    if (indicator.includes('rsi')) {
      if (value > 70) return { status: 'Overbought', color: 'text-red-400' };
      if (value < 30) return { status: 'Oversold', color: 'text-green-400' };
      return { status: 'Normal', color: 'text-gray-400' };
    }
    
    if (indicator.includes('bbPercent')) {
      if (value > 1) return { status: 'Above Upper', color: 'text-red-400' };
      if (value < 0) return { status: 'Below Lower', color: 'text-green-400' };
      return { status: 'In Bands', color: 'text-gray-400' };
    }
    
    if (indicator.includes('volume')) {
      if (value > 1.5) return { status: 'High', color: 'text-blue-400' };
      if (value < 0.5) return { status: 'Low', color: 'text-gray-400' };
      return { status: 'Normal', color: 'text-gray-400' };
    }
    
    return { status: 'Normal', color: 'text-gray-400' };
  };

  return (
    <div className={`bg-gray-800 rounded-lg ${className}`}>
      {/* Tab Headers */}
      <div className="flex flex-wrap border-b border-gray-700">
        {Object.values(INDICATOR_CATEGORIES).map((category) => {
          const Icon = getCategoryIcon(category.id);
          const isActive = activeTab === category.id;
          const keyIndicators = getKeyIndicators(category.id);
          const availableIndicators = keyIndicators.filter(ind => indicators.hasOwnProperty(ind));
          
          return (
            <button
              key={category.id}
              onClick={() => setActiveTab(category.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive 
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/10' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{category.name}</span>
              <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                {availableIndicators.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {Object.values(INDICATOR_CATEGORIES).map((category) => {
          if (activeTab !== category.id) return null;
          
          const keyIndicators = getKeyIndicators(category.id);
          const availableIndicators = keyIndicators.filter(ind => indicators.hasOwnProperty(ind));
          
          return (
            <div key={category.id} className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-white">{category.name}</h3>
                <span className="text-sm text-gray-400">{category.description}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableIndicators.map((indicator) => {
                  const value = indicators[indicator as keyof AdvancedIndicatorValues];
                  const type = getIndicatorType(indicator);
                  const formattedValue = formatValue(value as number, type);
                  const color = getIndicatorColor(value as number, type);
                  const status = getIndicatorStatus(indicator, value as number);
                  const isExpanded = expandedIndicators.has(indicator);
                  
                  return (
                    <div
                      key={indicator}
                      className="bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition-colors cursor-pointer"
                      onClick={() => {
                        toggleIndicator(indicator);
                        onIndicatorClick?.(indicator, value as number);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-300 truncate">
                          {indicator}
                        </span>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <HiChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <HiChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400">Value:</span>
                          <span className={`text-sm font-medium ${color}`}>
                            {formattedValue}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400">Status:</span>
                          <span className={`text-xs ${status.color}`}>
                            {status.status}
                          </span>
                        </div>
                        
                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-gray-600">
                            <div className="text-xs text-gray-400">
                              <div className="flex justify-between">
                                <span>Raw Value:</span>
                                <span>{(value as number).toFixed(6)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Type:</span>
                                <span className="capitalize">{type}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {availableIndicators.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p>No indicators available for this category</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Market Overview */}
      <div className="border-t border-gray-700 p-4 bg-gray-700/50">
        <h4 className="text-sm font-medium text-white mb-3">Market Overview</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="text-center">
            <div className="text-gray-400 mb-1">Trend</div>
            <div className={`font-medium ${
              indicators.isBullMarket ? 'text-green-400' : 
              indicators.isBearMarket ? 'text-red-400' : 'text-gray-400'
            }`}>
              {indicators.isBullMarket ? 'Bull' : indicators.isBearMarket ? 'Bear' : 'Neutral'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-gray-400 mb-1">Momentum</div>
            <div className={`font-medium ${
              indicators.overallBullish ? 'text-green-400' : 
              indicators.overallBearish ? 'text-red-400' : 'text-gray-400'
            }`}>
              {indicators.overallBullish ? 'Bullish' : indicators.overallBearish ? 'Bearish' : 'Neutral'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-gray-400 mb-1">Volatility</div>
            <div className={`font-medium ${
              indicators.isHighVolatility ? 'text-yellow-400' : 'text-gray-400'
            }`}>
              {indicators.isHighVolatility ? 'High' : 'Normal'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-gray-400 mb-1">Volume</div>
            <div className={`font-medium ${
              indicators.isHighVolume ? 'text-blue-400' : 'text-gray-400'
            }`}>
              {indicators.isHighVolume ? 'High' : 'Normal'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
