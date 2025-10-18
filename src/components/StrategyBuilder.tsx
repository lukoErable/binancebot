'use client';

import { ComparisonOperator, Condition, ConditionBuilder, getConditionDescription, IndicatorKey } from '@/lib/condition-system';
import { CustomStrategyConfig } from '@/lib/custom-strategy';
import { useState } from 'react';
import { HiPlus, HiTrash, HiX } from 'react-icons/hi';

interface StrategyBuilderProps {
  onSave: (config: CustomStrategyConfig) => void;
  onClose: () => void;
  initialConfig?: Partial<CustomStrategyConfig>;
}

// Available indicators for selection
const INDICATORS: { value: IndicatorKey; label: string; type: 'number' | 'boolean' }[] = [
  // Price
  { value: 'price', label: 'Current Price', type: 'number' },
  { value: 'open', label: 'Open Price', type: 'number' },
  { value: 'high', label: 'High Price', type: 'number' },
  { value: 'low', label: 'Low Price', type: 'number' },
  { value: 'volume', label: 'Volume', type: 'number' },
  
  // Moving Averages
  { value: 'ema12', label: 'EMA 12', type: 'number' },
  { value: 'ema26', label: 'EMA 26', type: 'number' },
  { value: 'ema50', label: 'EMA 50', type: 'number' },
  { value: 'ema100', label: 'EMA 100', type: 'number' },
  { value: 'ema200', label: 'EMA 200', type: 'number' },
  { value: 'sma7', label: 'SMA 7', type: 'number' },
  { value: 'sma25', label: 'SMA 25', type: 'number' },
  { value: 'sma50', label: 'SMA 50', type: 'number' },
  { value: 'sma99', label: 'SMA 99', type: 'number' },
  { value: 'sma200', label: 'SMA 200', type: 'number' },
  
  // RSI
  { value: 'rsi', label: 'RSI (14)', type: 'number' },
  { value: 'rsi9', label: 'RSI (9)', type: 'number' },
  { value: 'rsi21', label: 'RSI (21)', type: 'number' },
  
  // MACD
  { value: 'macd', label: 'MACD', type: 'number' },
  { value: 'macdSignal', label: 'MACD Signal', type: 'number' },
  { value: 'macdHistogram', label: 'MACD Histogram', type: 'number' },
  // VWAP
  { value: 'vwap', label: 'VWAP', type: 'number' },
  
  // Bollinger Bands
  { value: 'bbUpper', label: 'BB Upper', type: 'number' },
  { value: 'bbMiddle', label: 'BB Middle', type: 'number' },
  { value: 'bbLower', label: 'BB Lower', type: 'number' },
  { value: 'bbWidth', label: 'BB Width (%)', type: 'number' },
  { value: 'bbPercent', label: 'BB %B', type: 'number' },
  
  // Volatility
  { value: 'atr', label: 'ATR (14)', type: 'number' },
  { value: 'atr14', label: 'ATR (14)', type: 'number' },
  { value: 'atr21', label: 'ATR (21)', type: 'number' },
  
  // Stochastic
  { value: 'stochK', label: 'Stochastic K', type: 'number' },
  { value: 'stochD', label: 'Stochastic D', type: 'number' },
  
  // Others
  { value: 'adx', label: 'ADX', type: 'number' },
  { value: 'cci', label: 'CCI', type: 'number' },
  { value: 'obv', label: 'OBV', type: 'number' },
  
  // Volume
  { value: 'volumeSMA20', label: 'Volume SMA 20', type: 'number' },
  { value: 'volumeRatio', label: 'Volume Ratio', type: 'number' },
  
  // Trend (Boolean)
  { value: 'isBullishTrend', label: 'Bullish Trend (EMA50 > EMA200)', type: 'boolean' },
  { value: 'isBearishTrend', label: 'Bearish Trend (EMA50 < EMA200)', type: 'boolean' },
  { value: 'isUptrend', label: 'Price > EMA50', type: 'boolean' },
  { value: 'isDowntrend', label: 'Price < EMA50', type: 'boolean' },
  { value: 'isUptrendConfirmed3', label: 'Uptrend Confirmed (3 closes > EMA50)', type: 'boolean' },
  { value: 'isDowntrendConfirmed3', label: 'Downtrend Confirmed (3 closes < EMA50)', type: 'boolean' },
  { value: 'isTrendReversalUp', label: 'Trend Reversal Up', type: 'boolean' },
  { value: 'isTrendReversalDown', label: 'Trend Reversal Down', type: 'boolean' },
  
  // Momentum (Boolean)
  { value: 'isOversold', label: 'RSI Oversold (<30)', type: 'boolean' },
  { value: 'isOverbought', label: 'RSI Overbought (>70)', type: 'boolean' },
  
  // MACD Signals (Boolean)
  { value: 'isMACDBullish', label: 'MACD Bullish', type: 'boolean' },
  { value: 'isMACDBearish', label: 'MACD Bearish', type: 'boolean' },
  { value: 'isMACDCrossoverBullish', label: 'MACD Bullish Crossover', type: 'boolean' },
  { value: 'isMACDCrossoverBearish', label: 'MACD Bearish Crossover', type: 'boolean' },
  { value: 'isEMAFastSlowBullCross', label: 'EMA12>EMA26 Bull Cross', type: 'boolean' },
  { value: 'isEMAFastSlowBearCross', label: 'EMA12<EMA26 Bear Cross', type: 'boolean' },
  { value: 'isPriceCrossedAboveEMA50', label: 'Price Crossed Above EMA50', type: 'boolean' },
  { value: 'isPriceCrossedBelowEMA50', label: 'Price Crossed Below EMA50', type: 'boolean' },
  
  // Volume (Boolean)
  { value: 'isHighVolume', label: 'High Volume (>1.5x avg)', type: 'boolean' },
  { value: 'isLowVolume', label: 'Low Volume (<0.5x avg)', type: 'boolean' },
  { value: 'isPriceAboveVWAP', label: 'Price > VWAP', type: 'boolean' },
  { value: 'isPriceBelowVWAP', label: 'Price < VWAP', type: 'boolean' },
  { value: 'isNearVWAP', label: 'Near VWAP (±0.5%)', type: 'boolean' },
  
  // Bollinger Bands (Boolean)
  { value: 'isNearBBLower', label: 'Near BB Lower Band', type: 'boolean' },
  { value: 'isNearBBUpper', label: 'Near BB Upper Band', type: 'boolean' },
  { value: 'isBelowBBLower', label: 'Below BB Lower Band', type: 'boolean' },
  { value: 'isAboveBBUpper', label: 'Above BB Upper Band', type: 'boolean' },
  
  // Candle Patterns (Boolean)
  { value: 'isBullishCandle', label: 'Bullish Candle', type: 'boolean' },
  { value: 'isBearishCandle', label: 'Bearish Candle', type: 'boolean' },
  { value: 'isBullishEngulfing', label: 'Bullish Engulfing', type: 'boolean' },
  { value: 'isBearishEngulfing', label: 'Bearish Engulfing', type: 'boolean' },
  { value: 'isDoji', label: 'Doji', type: 'boolean' },
  { value: 'isHammer', label: 'Hammer', type: 'boolean' },
  { value: 'isShootingStar', label: 'Shooting Star', type: 'boolean' }
];

const COMPARISON_OPERATORS: { value: ComparisonOperator; label: string }[] = [
  { value: 'GT', label: '>' },
  { value: 'GTE', label: '>=' },
  { value: 'LT', label: '<' },
  { value: 'LTE', label: '<=' },
  { value: 'EQ', label: '=' },
  { value: 'NEQ', label: '≠' }
];

export default function StrategyBuilder({ onSave, onClose, initialConfig }: StrategyBuilderProps) {
  const [name, setName] = useState(initialConfig?.name || '');
  const [description, setDescription] = useState(initialConfig?.description || '');
  
  // Long entry conditions
  const [longEntryConditions, setLongEntryConditions] = useState<Condition[]>(
    initialConfig?.longEntryConditions?.conditions as Condition[] || []
  );
  
  // Short entry conditions
  const [shortEntryConditions, setShortEntryConditions] = useState<Condition[]>(
    initialConfig?.shortEntryConditions?.conditions as Condition[] || []
  );
  
  // Risk management
  const [profitTarget, setProfitTarget] = useState(initialConfig?.profitTargetPercent || 2.0);
  const [stopLoss, setStopLoss] = useState(initialConfig?.stopLossPercent || 1.5);
  const [maxPositionTime, setMaxPositionTime] = useState((initialConfig?.maxPositionTime || 60 * 60 * 1000) / (60 * 1000)); // Convert to minutes
  const [positionSize, setPositionSize] = useState(initialConfig?.positionSize || 0.01);
  const [cooldownPeriod, setCooldownPeriod] = useState((initialConfig?.cooldownPeriod || 5 * 60 * 1000) / (60 * 1000)); // Convert to minutes
  
  // AI Generation
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiType, setAiType] = useState<'aggressive' | 'balanced' | 'conservative'>('balanced');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Add condition modal
  const [showAddCondition, setShowAddCondition] = useState<'long' | 'short' | null>(null);
  const [newConditionType, setNewConditionType] = useState<'comparison' | 'boolean'>('comparison');
  const [newConditionIndicator, setNewConditionIndicator] = useState<IndicatorKey>('rsi');
  const [newConditionOperator, setNewConditionOperator] = useState<ComparisonOperator>('LT');
  const [newConditionValue, setNewConditionValue] = useState<number>(30);
  const [newConditionBoolValue, setNewConditionBoolValue] = useState<boolean>(true);
  
  const addCondition = (type: 'long' | 'short') => {
    let condition: Condition;
    
    const indicatorInfo = INDICATORS.find(i => i.value === newConditionIndicator);
    
    if (indicatorInfo?.type === 'boolean' || newConditionType === 'boolean') {
      condition = ConditionBuilder.boolean(newConditionIndicator, newConditionBoolValue);
    } else {
      condition = ConditionBuilder.compare(newConditionIndicator, newConditionOperator, newConditionValue);
    }
    
    if (type === 'long') {
      setLongEntryConditions([...longEntryConditions, condition]);
    } else {
      setShortEntryConditions([...shortEntryConditions, condition]);
    }
    
    setShowAddCondition(null);
  };
  
  const removeCondition = (type: 'long' | 'short', index: number) => {
    if (type === 'long') {
      setLongEntryConditions(longEntryConditions.filter((_, i) => i !== index));
    } else {
      setShortEntryConditions(shortEntryConditions.filter((_, i) => i !== index));
    }
  };
  
  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          type: aiType
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate strategy');
      }

      const strategy = data.strategy;

      // Populate form with AI-generated strategy
      setName(strategy.name || '');
      setDescription(strategy.description || '');
      setLongEntryConditions(strategy.longEntryConditions?.conditions || []);
      setShortEntryConditions(strategy.shortEntryConditions?.conditions || []);
      setProfitTarget(strategy.profitTargetPercent || 2.0);
      setStopLoss(strategy.stopLossPercent || 1.5);
      setMaxPositionTime((strategy.maxPositionTime || 60 * 60 * 1000) / (60 * 1000));
      setPositionSize(strategy.positionSize || 0.01);
      setCooldownPeriod((strategy.cooldownPeriod || 5 * 60 * 1000) / (60 * 1000));

      setShowAIModal(false);
      console.log('✨ Strategy generated by AI! Review and save when ready.');
    } catch (error: any) {
      console.error('Error generating strategy:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!name) {
      alert('Please enter a strategy name');
      return;
    }
    
    if (longEntryConditions.length === 0 && shortEntryConditions.length === 0) {
      alert('Please add at least one entry condition');
      return;
    }
    
    const config: CustomStrategyConfig = {
      name,
      description,
      strategyType: 'CUSTOM',
      longEntryConditions: {
        operator: 'AND',
        conditions: longEntryConditions
      },
      shortEntryConditions: {
        operator: 'AND',
        conditions: shortEntryConditions
      },
      profitTargetPercent: profitTarget,
      stopLossPercent: stopLoss,
      maxPositionTime: maxPositionTime * 60 * 1000, // Convert to milliseconds
      positionSize,
      cooldownPeriod: cooldownPeriod * 60 * 1000, // Convert to milliseconds
      simulationMode: true
    };
    
    onSave(config);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">🛠️ Strategy Builder</h2>
            <button
              onClick={() => setShowAIModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              title="Generate strategy with AI"
            >
              <span className="text-lg">🤖</span>
              Generate with AI
            </button>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <HiX className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">📋 Basic Information</h3>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Strategy Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="My Custom Strategy"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500 h-20 resize-none"
                placeholder="Describe your strategy..."
              />
            </div>
          </div>
          
          {/* Long Entry Conditions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-green-400">🟢 LONG Entry Conditions</h3>
              <button
                onClick={() => setShowAddCondition('long')}
                className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
              >
                <HiPlus className="w-4 h-4" />
                Add Condition
              </button>
            </div>
            
            {longEntryConditions.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded p-4 text-center text-gray-500">
                No conditions added yet. Click "Add Condition" to start.
              </div>
            ) : (
              <div className="space-y-2">
                {longEntryConditions.map((condition, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-800 border border-green-600/30 rounded p-3">
                    <span className="flex-1 text-white text-sm">
                      {getConditionDescription(condition)}
                    </span>
                    <button
                      onClick={() => removeCondition('long', index)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="text-xs text-gray-500 italic px-3">
                  All conditions must be true (AND logic)
                </div>
              </div>
            )}
          </div>
          
          {/* Short Entry Conditions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-red-400">🔴 SHORT Entry Conditions</h3>
              <button
                onClick={() => setShowAddCondition('short')}
                className="flex items-center gap-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
              >
                <HiPlus className="w-4 h-4" />
                Add Condition
              </button>
            </div>
            
            {shortEntryConditions.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded p-4 text-center text-gray-500">
                No conditions added yet. Click "Add Condition" to start.
              </div>
            ) : (
              <div className="space-y-2">
                {shortEntryConditions.map((condition, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-800 border border-red-600/30 rounded p-3">
                    <span className="flex-1 text-white text-sm">
                      {getConditionDescription(condition)}
                    </span>
                    <button
                      onClick={() => removeCondition('short', index)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="text-xs text-gray-500 italic px-3">
                  All conditions must be true (AND logic)
                </div>
              </div>
            )}
          </div>
          
          {/* Risk Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">⚠️ Risk Management</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Take Profit (%)</label>
                <input
                  type="number"
                  value={profitTarget}
                  onChange={(e) => setProfitTarget(parseFloat(e.target.value))}
                  step="0.1"
                  min="0.1"
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Stop Loss (%)</label>
                <input
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(parseFloat(e.target.value))}
                  step="0.1"
                  min="0.1"
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-red-500"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Max Position Time (minutes)</label>
                <input
                  type="number"
                  value={maxPositionTime}
                  onChange={(e) => setMaxPositionTime(parseInt(e.target.value))}
                  step="1"
                  min="1"
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Cooldown (minutes)</label>
                <input
                  type="number"
                  value={cooldownPeriod}
                  onChange={(e) => setCooldownPeriod(parseInt(e.target.value))}
                  step="1"
                  min="0"
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Position Size (BTC)</label>
                <input
                  type="number"
                  value={positionSize}
                  onChange={(e) => setPositionSize(parseFloat(e.target.value))}
                  step="0.001"
                  min="0.001"
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded transition-colors"
            >
              💾 Save Strategy
            </button>
            <button
              onClick={onClose}
              className="px-6 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
      
      {/* AI Generation Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full mx-4 border border-purple-500/50">
            <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-purple-900/20 to-pink-900/20">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                AI Strategy Generator
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Let AI create a complete trading strategy for you
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Strategy Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Strategy Type</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setAiType('aggressive')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      aiType === 'aggressive'
                        ? 'border-red-500 bg-red-900/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">⚡</div>
                    <div className="font-semibold text-white">Aggressive</div>
                    <div className="text-xs text-gray-400 mt-1">Fast scalping</div>
                  </button>
                  <button
                    onClick={() => setAiType('balanced')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      aiType === 'balanced'
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">⚖️</div>
                    <div className="font-semibold text-white">Balanced</div>
                    <div className="text-xs text-gray-400 mt-1">Medium term</div>
                  </button>
                  <button
                    onClick={() => setAiType('conservative')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      aiType === 'conservative'
                        ? 'border-green-500 bg-green-900/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">🛡️</div>
                    <div className="font-semibold text-white">Conservative</div>
                    <div className="text-xs text-gray-400 mt-1">Trend following</div>
                  </button>
                </div>
              </div>

              {/* Custom Instructions */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Custom Instructions (Optional)
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Focus on RSI and MACD, avoid Bollinger Bands, use tight stop losses..."
                  className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 h-24 resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 The AI will create a complete strategy based on your preferences
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✨</span>
                  <div className="text-sm text-gray-300">
                    <div className="font-semibold mb-1">What AI will generate:</div>
                    <ul className="list-disc list-inside space-y-1 text-gray-400">
                      <li>Complete LONG & SHORT entry conditions</li>
                      <li>Optimized TP/SL and risk management</li>
                      <li>Strategy name and description</li>
                      <li>All parameters configured</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button
                onClick={handleAIGenerate}
                disabled={isGenerating}
                className={`flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  isGenerating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="text-lg">🤖</span>
                    Generate Strategy
                  </>
                )}
              </button>
              <button
                onClick={() => setShowAIModal(false)}
                disabled={isGenerating}
                className="px-6 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Condition Modal */}
      {showAddCondition && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                Add {showAddCondition === 'long' ? 'LONG' : 'SHORT'} Condition
              </h3>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Indicator Selection */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Indicator</label>
                <select
                  value={newConditionIndicator}
                  onChange={(e) => {
                    const indicator = e.target.value as IndicatorKey;
                    setNewConditionIndicator(indicator);
                    const indicatorInfo = INDICATORS.find(i => i.value === indicator);
                    if (indicatorInfo?.type === 'boolean') {
                      setNewConditionType('boolean');
                    }
                  }}
                  className="w-full bg-gray-900 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  {INDICATORS.map(ind => (
                    <option key={ind.value} value={ind.value}>
                      {ind.label} {ind.type === 'boolean' ? '(Yes/No)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Condition Type */}
              {(() => {
                const indicatorInfo = INDICATORS.find(i => i.value === newConditionIndicator);
                
                if (indicatorInfo?.type === 'boolean') {
                  return (
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Value</label>
                      <select
                        value={newConditionBoolValue ? 'true' : 'false'}
                        onChange={(e) => setNewConditionBoolValue(e.target.value === 'true')}
                        className="w-full bg-gray-900 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                      >
                        <option value="true">True (Yes)</option>
                        <option value="false">False (No)</option>
                      </select>
                    </div>
                  );
                } else {
                  return (
                    <>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Operator</label>
                        <select
                          value={newConditionOperator}
                          onChange={(e) => setNewConditionOperator(e.target.value as ComparisonOperator)}
                          className="w-full bg-gray-900 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                        >
                          {COMPARISON_OPERATORS.map(op => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Value</label>
                        <input
                          type="number"
                          value={newConditionValue}
                          onChange={(e) => setNewConditionValue(parseFloat(e.target.value))}
                          step="0.1"
                          className="w-full bg-gray-900 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </>
                  );
                }
              })()}
            </div>
            
            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => addCondition(showAddCondition)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddCondition(null)}
                className="px-6 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

