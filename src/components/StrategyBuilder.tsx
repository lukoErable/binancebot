'use client';

import { CustomStrategyConfig } from '@/lib/custom-strategy';
import { useState } from 'react';
import { FaChartLine } from 'react-icons/fa';
import {
  HiArrowDown,
  HiArrowUp,
  HiCheckCircle,
  HiClock,
  HiCurrencyDollar,
  HiLightningBolt,
  HiPlus,
  HiTrash,
  HiX
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
}

type ConditionType = 'longEntry' | 'shortEntry' | 'longExit' | 'shortExit';

// Indicator categories for easy selection
const INDICATOR_CATEGORIES = {
  price: {
    id: 'price',
    label: 'Price',
    icon: HiCurrencyDollar,
    color: 'text-yellow-400',
    indicators: [
      { key: 'price', label: 'Current Price', type: 'comparison' as const },
      { key: 'open', label: 'Open', type: 'comparison' as const },
      { key: 'high', label: 'High', type: 'comparison' as const },
      { key: 'low', label: 'Low', type: 'comparison' as const },
      { key: 'volume', label: 'Volume', type: 'comparison' as const },
    ]
  },
  movingAverages: {
    id: 'movingAverages',
    label: 'Moving Averages',
    icon: RiLineChartLine,
    color: 'text-blue-400',
    indicators: [
      { key: 'ema12', label: 'EMA 12', type: 'comparison' as const },
      { key: 'ema26', label: 'EMA 26', type: 'comparison' as const },
      { key: 'ema50', label: 'EMA 50', type: 'comparison' as const },
      { key: 'ema100', label: 'EMA 100', type: 'comparison' as const },
      { key: 'ema200', label: 'EMA 200', type: 'comparison' as const },
      { key: 'sma7', label: 'SMA 7', type: 'comparison' as const },
      { key: 'sma25', label: 'SMA 25', type: 'comparison' as const },
      { key: 'sma50', label: 'SMA 50', type: 'comparison' as const },
      { key: 'sma99', label: 'SMA 99', type: 'comparison' as const },
      { key: 'sma200', label: 'SMA 200', type: 'comparison' as const },
    ]
  },
  oscillators: {
    id: 'oscillators',
    label: 'Oscillators',
    icon: RiStockLine,
    color: 'text-purple-400',
    indicators: [
      { key: 'rsi', label: 'RSI (14)', type: 'comparison' as const },
      { key: 'rsi9', label: 'RSI (9)', type: 'comparison' as const },
      { key: 'rsi21', label: 'RSI (21)', type: 'comparison' as const },
      { key: 'stochK', label: 'Stochastic %K', type: 'comparison' as const },
      { key: 'stochD', label: 'Stochastic %D', type: 'comparison' as const },
      { key: 'cci', label: 'CCI', type: 'comparison' as const },
    ]
  },
  macd: {
    id: 'macd',
    label: 'MACD',
    icon: RiBarChartBoxLine,
    color: 'text-orange-400',
    indicators: [
      { key: 'macd', label: 'MACD', type: 'comparison' as const },
      { key: 'macdSignal', label: 'MACD Signal', type: 'comparison' as const },
      { key: 'macdHistogram', label: 'MACD Histogram', type: 'comparison' as const },
      { key: 'isMACDBullish', label: 'MACD Bullish', type: 'boolean' as const },
      { key: 'isMACDBearish', label: 'MACD Bearish', type: 'boolean' as const },
    ]
  },
  trend: {
    id: 'trend',
    label: 'Trend',
    icon: FaChartLine,
    color: 'text-green-400',
    indicators: [
      { key: 'isUptrend', label: 'Uptrend', type: 'boolean' as const },
      { key: 'isDowntrend', label: 'Downtrend', type: 'boolean' as const },
      { key: 'isBullishTrend', label: 'Bullish Trend', type: 'boolean' as const },
      { key: 'isBearishTrend', label: 'Bearish Trend', type: 'boolean' as const },
      { key: 'adx', label: 'ADX', type: 'comparison' as const },
    ]
  },
  bollinger: {
    id: 'bollinger',
    label: 'Bollinger Bands',
    icon: HiLightningBolt,
    color: 'text-teal-400',
    indicators: [
      { key: 'bbUpper', label: 'BB Upper', type: 'comparison' as const },
      { key: 'bbMiddle', label: 'BB Middle', type: 'comparison' as const },
      { key: 'bbLower', label: 'BB Lower', type: 'comparison' as const },
      { key: 'isAboveBBUpper', label: 'Above BB Upper', type: 'boolean' as const },
      { key: 'isBelowBBLower', label: 'Below BB Lower', type: 'boolean' as const },
    ]
  },
  volume: {
    id: 'volume',
    label: 'Volume & VWAP',
    icon: HiClock,
    color: 'text-indigo-400',
    indicators: [
      { key: 'vwap', label: 'VWAP', type: 'comparison' as const },
      { key: 'obv', label: 'OBV', type: 'comparison' as const },
      { key: 'isHighVolume', label: 'High Volume', type: 'boolean' as const },
      { key: 'isLowVolume', label: 'Low Volume', type: 'boolean' as const },
      { key: 'isPriceAboveVWAP', label: 'Price > VWAP', type: 'boolean' as const },
      { key: 'isPriceBelowVWAP', label: 'Price < VWAP', type: 'boolean' as const },
    ]
  },
};

interface SimpleCondition {
  indicator: string;
  type: 'comparison' | 'boolean';
  operator?: 'LT' | 'GT' | 'EQ' | 'LTE' | 'GTE';
  value?: number | string; // Can be a number or an indicator key
  compareType?: 'number' | 'indicator'; // What to compare against
}

const AVAILABLE_COLORS = [
  { value: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
  { value: 'rose', label: 'Rose', class: 'bg-rose-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'violet', label: 'Violet', class: 'bg-violet-500' },
  { value: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { value: 'lime', label: 'Lime', class: 'bg-lime-500' },
  { value: 'sky', label: 'Sky', class: 'bg-sky-500' },
  { value: 'fuchsia', label: 'Fuchsia', class: 'bg-fuchsia-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'slate', label: 'Slate', class: 'bg-slate-500' },
];

export default function StrategyBuilder({ onSave, onClose, initialConfig }: StrategyBuilderProps) {
  const [name, setName] = useState(initialConfig?.name || '');
  const [description, setDescription] = useState(initialConfig?.description || '');
  const [color, setColor] = useState(initialConfig?.color || 'emerald');
  
  // Conditions for each type
  const [longEntryConditions, setLongEntryConditions] = useState<SimpleCondition[]>([]);
  const [shortEntryConditions, setShortEntryConditions] = useState<SimpleCondition[]>([]);
  const [longExitConditions, setLongExitConditions] = useState<SimpleCondition[]>([]);
  const [shortExitConditions, setShortExitConditions] = useState<SimpleCondition[]>([]);
  
  // Risk management
  const [profitTarget, setProfitTarget] = useState(initialConfig?.profitTargetPercent || 2.0);
  const [stopLoss, setStopLoss] = useState(initialConfig?.stopLossPercent || 1.5);
  const [maxPositionTime, setMaxPositionTime] = useState((initialConfig?.maxPositionTime || 120 * 60 * 1000) / 60000);
  const [cooldownPeriod, setCooldownPeriod] = useState((initialConfig?.cooldownPeriod || 0) / 60000);
  const [positionSize, setPositionSize] = useState(initialConfig?.positionSize || 0.05);
  
  // UI state
  const [activeSection, setActiveSection] = useState<ConditionType>('longEntry');
  const [selectedCategory, setSelectedCategory] = useState<string>('price');

  const addCondition = (indicator: any) => {
    const newCondition: SimpleCondition = {
      indicator: indicator.key,
      type: indicator.type,
      ...(indicator.type === 'comparison' && {
        operator: 'GT',
        value: 0,
        compareType: 'number'
      })
    };

    switch (activeSection) {
      case 'longEntry':
        setLongEntryConditions([...longEntryConditions, newCondition]);
        break;
      case 'shortEntry':
        setShortEntryConditions([...shortEntryConditions, newCondition]);
        break;
      case 'longExit':
        setLongExitConditions([...longExitConditions, newCondition]);
        break;
      case 'shortExit':
        setShortExitConditions([...shortExitConditions, newCondition]);
        break;
    }
  };

  const removeCondition = (index: number, type: ConditionType) => {
    switch (type) {
      case 'longEntry':
        setLongEntryConditions(longEntryConditions.filter((_, i) => i !== index));
        break;
      case 'shortEntry':
        setShortEntryConditions(shortEntryConditions.filter((_, i) => i !== index));
        break;
      case 'longExit':
        setLongExitConditions(longExitConditions.filter((_, i) => i !== index));
        break;
      case 'shortExit':
        setShortExitConditions(shortExitConditions.filter((_, i) => i !== index));
        break;
    }
  };

  const updateCondition = (index: number, type: ConditionType, updates: Partial<SimpleCondition>) => {
    const updateArray = (conditions: SimpleCondition[]) => 
      conditions.map((cond, i) => i === index ? { ...cond, ...updates } : cond);

    switch (type) {
      case 'longEntry':
        setLongEntryConditions(updateArray(longEntryConditions));
        break;
      case 'shortEntry':
        setShortEntryConditions(updateArray(shortEntryConditions));
        break;
      case 'longExit':
        setLongExitConditions(updateArray(longExitConditions));
        break;
      case 'shortExit':
        setShortExitConditions(updateArray(shortExitConditions));
        break;
    }
  };

  const convertToConditionGroup = (conditions: SimpleCondition[]) => {
    return {
      operator: 'AND' as const,
      conditions: conditions.map(cond => {
        if (cond.type === 'comparison') {
          return {
            type: 'comparison' as const,
            indicator: cond.indicator as any,
            operator: cond.operator!,
            value: (typeof cond.value === 'string' ? cond.value : cond.value!) as any
          };
        } else {
          return {
            type: 'boolean' as const,
            indicator: cond.indicator as any,
            value: true
          };
        }
      })
    } as any; // Cast to bypass TypeScript strict checking for dynamic indicator keys
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a strategy name');
      return;
    }

    if (longEntryConditions.length === 0 || shortEntryConditions.length === 0) {
      alert('Please add at least one condition for both Long and Short entry');
      return;
    }

    const config: CustomStrategyConfig = {
      name: name.trim(),
      description: description.trim(),
      color,
      strategyType: 'CUSTOM',
      longEntryConditions: convertToConditionGroup(longEntryConditions),
      shortEntryConditions: convertToConditionGroup(shortEntryConditions),
      ...(longExitConditions.length > 0 && {
        longExitConditions: convertToConditionGroup(longExitConditions)
      }),
      ...(shortExitConditions.length > 0 && {
        shortExitConditions: convertToConditionGroup(shortExitConditions)
      }),
      profitTargetPercent: profitTarget,
      stopLossPercent: stopLoss,
      maxPositionTime: maxPositionTime * 60 * 1000,
      positionSize,
      cooldownPeriod: cooldownPeriod * 60 * 1000,
      timeframe: '1m', // Default timeframe for new strategies
      simulationMode: true
    };

    onSave(config);
  };

  const getCurrentConditions = () => {
    switch (activeSection) {
      case 'longEntry': return longEntryConditions;
      case 'shortEntry': return shortEntryConditions;
      case 'longExit': return longExitConditions;
      case 'shortExit': return shortExitConditions;
    }
  };

  const getIndicatorLabel = (key: string) => {
    for (const category of Object.values(INDICATOR_CATEGORIES)) {
      const indicator = category.indicators.find(ind => ind.key === key);
      if (indicator) return indicator.label;
    }
    return key;
  };

  // Get all numeric indicators for comparison selection
  const getAllNumericIndicators = () => {
    const indicators: { key: string; label: string; category: string }[] = [];
    Object.values(INDICATOR_CATEGORIES).forEach(category => {
      category.indicators
        .filter(ind => ind.type === 'comparison')
        .forEach(ind => {
          indicators.push({
            key: ind.key,
            label: ind.label,
            category: category.label
          });
        });
    });
    return indicators;
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-[90vw] max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">Create Custom Strategy</h2>
            <p className="text-sm text-gray-400">Build your trading strategy by selecting indicators and conditions</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <HiX className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Configuration */}
          <div className="w-80 border-r border-gray-700 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Strategy Info</h3>
            
            {/* Name */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2">Strategy Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Custom Strategy"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-gray-600"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-gray-600 resize-none"
              />
            </div>

            {/* Color */}
            <div className="mb-6">
              <label className="block text-xs text-gray-400 mb-2">Color</label>
              <div className="grid grid-cols-4 gap-2">
                {AVAILABLE_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`h-8 rounded ${c.class} ${color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : 'opacity-50 hover:opacity-100'} transition-all`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <h3 className="text-lg font-semibold text-white mb-4 pt-4 border-t border-gray-700">Risk Management</h3>
            
            {/* Take Profit */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2">Take Profit (%)</label>
              <input
                type="number"
                value={profitTarget}
                onChange={(e) => setProfitTarget(parseFloat(e.target.value))}
                step="0.1"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-gray-600"
              />
            </div>

            {/* Stop Loss */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2">Stop Loss (%)</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value))}
                step="0.1"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-gray-600"
              />
            </div>

            {/* Max Position Time */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2">Max Position Time (min)</label>
              <input
                type="number"
                value={maxPositionTime}
                onChange={(e) => setMaxPositionTime(parseFloat(e.target.value))}
                step="1"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-gray-600"
              />
            </div>

            {/* Cooldown */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2">Cooldown (min)</label>
              <input
                type="number"
                value={cooldownPeriod}
                onChange={(e) => setCooldownPeriod(parseFloat(e.target.value))}
                step="1"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-gray-600"
              />
            </div>

            {/* Position Size */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2">Position Size (0-1)</label>
              <input
                type="number"
                value={positionSize}
                onChange={(e) => setPositionSize(parseFloat(e.target.value))}
                step="0.01"
                min="0"
                max="1"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-gray-600"
              />
            </div>
          </div>

          {/* Middle: Condition Builder */}
          <div className="flex-1 flex flex-col">
            {/* Section Tabs */}
            <div className="border-b border-gray-700 p-4">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'longEntry', label: 'Long Entry', icon: HiArrowUp, color: 'text-green-400', count: longEntryConditions.length },
                  { id: 'shortEntry', label: 'Short Entry', icon: HiArrowDown, color: 'text-red-400', count: shortEntryConditions.length },
                  { id: 'longExit', label: 'Exit Long', icon: HiArrowDown, color: 'text-orange-400', count: longExitConditions.length },
                  { id: 'shortExit', label: 'Exit Short', icon: HiArrowUp, color: 'text-orange-400', count: shortExitConditions.length },
                ].map(section => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id as ConditionType)}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all ${
                        activeSection === section.id
                          ? 'bg-gray-800 border-gray-600'
                          : 'bg-gray-900/50 border-gray-700/50 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${section.color}`} />
                        <span className="text-sm font-medium text-white">{section.label}</span>
                      </div>
                      <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">{section.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Conditions */}
            <div className="p-6 border-b border-gray-700">
              <h4 className="text-sm font-semibold text-white mb-3">
                {activeSection === 'longEntry' && 'Long Entry Conditions (BUY)'}
                {activeSection === 'shortEntry' && 'Short Entry Conditions (SELL)'}
                {activeSection === 'longExit' && 'Long Exit Conditions (CLOSE LONG)'}
                {activeSection === 'shortExit' && 'Short Exit Conditions (CLOSE SHORT)'}
              </h4>
              
              {getCurrentConditions().length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No conditions yet. Select indicators below to add conditions.
                </div>
              ) : (
                <div className="space-y-2">
                  {getCurrentConditions().map((condition, index) => {
                    const operatorSymbol = 
                      condition.operator === 'GT' ? '>' :
                      condition.operator === 'LT' ? '<' :
                      condition.operator === 'GTE' ? '≥' :
                      condition.operator === 'LTE' ? '≤' :
                      condition.operator === 'EQ' ? '=' : '?';
                    
                    return (
                      <div key={index} className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                        {/* Left side: Indicator name */}
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <span className="text-xs text-gray-500 font-mono">{index + 1}.</span>
                          <span className="text-sm text-white font-medium">{getIndicatorLabel(condition.indicator)}</span>
                        </div>
                        
                        {condition.type === 'comparison' && (
                          <>
                            {/* Operator */}
                            <select
                              value={condition.operator}
                              onChange={(e) => updateCondition(index, activeSection, { operator: e.target.value as any })}
                              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm font-mono focus:outline-none hover:bg-gray-600 transition-colors"
                            >
                              <option value="GT">&gt;</option>
                              <option value="LT">&lt;</option>
                              <option value="GTE">≥</option>
                              <option value="LTE">≤</option>
                              <option value="EQ">=</option>
                            </select>
                            
                            {/* Value input or indicator selector */}
                            {condition.compareType === 'number' ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={typeof condition.value === 'number' ? condition.value : 0}
                                  onChange={(e) => updateCondition(index, activeSection, { value: parseFloat(e.target.value) })}
                                  className="w-28 px-3 py-1.5 bg-gray-700 border border-blue-600/50 rounded text-white text-sm font-mono focus:outline-none focus:border-blue-500 transition-colors"
                                  placeholder="Value"
                                />
                                <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded font-semibold">NUM</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select
                                  value={typeof condition.value === 'string' ? condition.value : 'price'}
                                  onChange={(e) => updateCondition(index, activeSection, { value: e.target.value })}
                                  className="px-3 py-1.5 bg-gray-700 border border-purple-600/50 rounded text-white text-sm focus:outline-none focus:border-purple-500 min-w-[160px] transition-colors"
                                >
                                  {getAllNumericIndicators().map(ind => (
                                    <option key={ind.key} value={ind.key}>
                                      {ind.label}
                                    </option>
                                  ))}
                                </select>
                                <span className="text-xs text-purple-400 bg-purple-900/30 px-2 py-1 rounded font-semibold">IND</span>
                              </div>
                            )}
                            
                            {/* Toggle button */}
                            <button
                              onClick={() => updateCondition(index, activeSection, { 
                                compareType: condition.compareType === 'number' ? 'indicator' : 'number',
                                value: condition.compareType === 'number' ? 'price' : 0
                              })}
                              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                                condition.compareType === 'number'
                                  ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border border-blue-600/50'
                                  : 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50 border border-purple-600/50'
                              }`}
                              title={condition.compareType === 'number' 
                                ? 'Click to compare with indicator' 
                                : 'Click to compare with number'}
                            >
                              {condition.compareType === 'number' ? '123→IND' : 'IND→123'}
                            </button>
                          </>
                        )}
                        
                        {condition.type === 'boolean' && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">=</span>
                            <span className="text-xs text-green-400 bg-green-900/30 px-3 py-1.5 rounded font-semibold">TRUE</span>
                          </div>
                        )}
                        
                        <button
                          onClick={() => removeCondition(index, activeSection)}
                          className="ml-auto p-1.5 hover:bg-red-900/20 border border-transparent hover:border-red-600/50 rounded transition-all"
                          title="Remove condition"
                        >
                          <HiTrash className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Indicator Selection */}
            <div className="flex-1 overflow-hidden flex flex-col p-6">
              <h4 className="text-sm font-semibold text-white mb-3">Add Indicator</h4>
              
              {/* Category Tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {Object.values(INDICATOR_CATEGORIES).map(category => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border whitespace-nowrap transition-all ${
                        selectedCategory === category.id
                          ? 'bg-gray-800 border-gray-600'
                          : 'bg-gray-900/50 border-gray-700/50 hover:border-gray-600'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${category.color}`} />
                      <span className="text-xs text-white">{category.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Indicators Grid */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2">
                  {INDICATOR_CATEGORIES[selectedCategory as keyof typeof INDICATOR_CATEGORIES].indicators.map(indicator => (
                    <button
                      key={indicator.key}
                      onClick={() => addCondition(indicator)}
                      className="flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg transition-all group"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <HiPlus className="w-3 h-3 text-gray-500 group-hover:text-gray-300" />
                        <span className="text-xs text-gray-300 truncate">{indicator.label}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        indicator.type === 'comparison' ? 'bg-blue-900/20 text-blue-400' : 'bg-green-900/20 text-green-400'
                      }`}>
                        {indicator.type === 'comparison' ? 'NUM' : 'BOOL'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            Strategy must have at least Long Entry and Short Entry conditions
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
            >
              <HiCheckCircle className="w-5 h-5" />
              Create Strategy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
