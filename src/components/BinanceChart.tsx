'use client';

import { StrategyPerformance, StrategyState } from '@/types/trading';
import { useEffect, useState } from 'react';
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';

interface BinanceChartProps {
  state: StrategyState;
  selectedStrategy?: string;
  strategyPerformances?: StrategyPerformance[];
}

export default function BinanceChart({ state, selectedStrategy = 'GLOBAL', strategyPerformances = [] }: BinanceChartProps) {
  const [showEMA12, setShowEMA12] = useState(true);
  const [showEMA26, setShowEMA26] = useState(true);
  const [showEMA50, setShowEMA50] = useState(true);
  const [showEMA200, setShowEMA200] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get strategy color based on type
  const getStrategyColor = (strategyType: string) => {
    switch (strategyType) {
      case 'RSI_EMA':
        return { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-400' };
      case 'MOMENTUM_CROSSOVER':
        return { bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-400' };
      case 'VOLUME_MACD':
        return { bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-400' };
      case 'NEURAL_SCALPER':
        return { bg: 'bg-pink-500', text: 'text-pink-400', border: 'border-pink-400' };
      case 'BOLLINGER_BOUNCE':
        return { bg: 'bg-teal-500', text: 'text-teal-400', border: 'border-teal-400' };
      default:
        return { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-400' };
    }
  };

  // Get current strategy data
  const currentStrategy = strategyPerformances.find(p => p.strategyName === selectedStrategy);
  const strategyColors = currentStrategy ? getStrategyColor(currentStrategy.strategyType) : { bg: 'bg-blue-600', text: 'text-blue-400', border: 'border-blue-400' };

  // Auto-activate relevant curves when strategy changes
  useEffect(() => {
    if (selectedStrategy === 'GLOBAL') {
      // Show all curves for global view
      setShowEMA12(true);
      setShowEMA26(true);
      setShowEMA50(true);
      setShowEMA200(true);
    } else if (selectedStrategy === 'RSI + EMA Strategy') {
      // Show EMA50 and EMA200 for RSI + EMA Strategy
      setShowEMA12(false);
      setShowEMA26(false);
      setShowEMA50(true);
      setShowEMA200(true);
    } else if (selectedStrategy === 'Momentum Crossover') {
      // Show EMA12, EMA26, and EMA200 for Momentum Crossover
      setShowEMA12(true);
      setShowEMA26(true);
      setShowEMA50(false);
      setShowEMA200(true);
    } else if (selectedStrategy === 'Volume Breakout') {
      // Show EMA50 (VWAP proxy), EMA200, and MACD-related EMAs
      setShowEMA12(true);
      setShowEMA26(true);
      setShowEMA50(true);
      setShowEMA200(true);
    } else if (selectedStrategy === 'Neural Scalper') {
      // Show EMA12, EMA26 (velocity/acceleration), EMA50 (VWAP proxy)
      setShowEMA12(true);
      setShowEMA26(true);
      setShowEMA50(true);
      setShowEMA200(false);
    } else if (selectedStrategy === 'Bollinger Bounce') {
      // Show EMA12 (upper band), EMA26 (middle band), EMA50 (lower band) for Bollinger Bounce
      setShowEMA12(true);
      setShowEMA26(true);
      setShowEMA50(true);
      setShowEMA200(false);
    }
  }, [selectedStrategy]);

  // Adapt curve visibility based on selected strategy
  // Always respect manual toggles - users can show/hide any curve they want
  const getCurveVisibility = () => {
    return { ema12: showEMA12, ema26: showEMA26, ema50: showEMA50, ema200: showEMA200 };
  };

  const curveVisibility = getCurveVisibility();

  if (!state.candles || state.candles.length === 0) {
    return (
      <div className="bg-gray-800 h-96 flex items-center justify-center">
        <div className="text-gray-400">Loading chart data...</div>
      </div>
    );
  }

  // Calculate EMA for each candle
  const calculateEMA = (candles: { close: number }[], period: number, index: number): number | null => {
    if (index < period - 1) return null;
    
    // For the first EMA value, use SMA
    if (index === period - 1) {
      const slice = candles.slice(0, period);
      const sum = slice.reduce((acc, candle) => acc + candle.close, 0);
      return sum / period;
    }
    
    // Calculate EMA: EMA = (Close - Previous EMA) * multiplier + Previous EMA
    const multiplier = 2 / (period + 1);
    const previousEMA = calculateEMA(candles, period, index - 1);
    if (previousEMA === null) return null;
    
    return (candles[index].close - previousEMA) * multiplier + previousEMA;
  };

  // Prepare signals for chart display
  const prepareSignalsForChart = (): Array<{
    timestamp: number;
    candleIndex: number;
    price: number;
    type: string;
    strategy: string;
    reason: string;
  }> => {
    if (!strategyPerformances || strategyPerformances.length === 0) return [];
    
    const allSignals: Array<{
      timestamp: number;
      candleIndex: number;
      price: number;
      type: string;
      strategy: string;
      reason: string;
    }> = [];
    
    strategyPerformances.forEach((perf) => {
      // If a specific strategy is selected, only show signals from that strategy
      if (selectedStrategy !== 'GLOBAL' && perf.strategyName !== selectedStrategy) {
        return;
      }
      
      if (perf.signalHistory && perf.signalHistory.length > 0) {
        // Limit to last 50 signals to prevent visual clutter
        const recentSignals = perf.signalHistory.slice(-50);
        
        recentSignals.forEach((signal) => {
          // Find the closest candle for this signal
          const signalTime = signal.timestamp;
          const closestCandleIndex = state.candles.findIndex(candle => 
            Math.abs(candle.time - signalTime) < 60000 // Within 1 minute
          );
          
          if (closestCandleIndex !== -1) {
            allSignals.push({
              timestamp: signalTime,
              candleIndex: closestCandleIndex,
              type: signal.type,
              price: signal.price,
              strategy: perf.strategyName,
              reason: signal.reason
            });
          }
        });
      }
    });
    
    return allSignals;
  };

  const tradingSignals = prepareSignalsForChart();
  
  // Debug: Log signals and chart data
  console.log(`📍 Chart Debug:`);
  console.log(`   Total signals prepared: ${tradingSignals.length}`);
  console.log(`   BUY: ${tradingSignals.filter(s => s.type === 'BUY').length}`);
  console.log(`   SELL: ${tradingSignals.filter(s => s.type === 'SELL').length}`);
  console.log(`   CLOSE_LONG: ${tradingSignals.filter(s => s.type === 'CLOSE_LONG').length}`);
  console.log(`   CLOSE_SHORT: ${tradingSignals.filter(s => s.type === 'CLOSE_SHORT').length}`);
  console.log(`   Strategy performances:`, strategyPerformances.map(p => ({
    name: p.strategyName,
    signals: p.signalHistory?.length || 0
  })));

  // Reduce data density for better readability
  const getDataReductionFactor = () => {
    const candleCount = state.candles.length;
    if (candleCount <= 50) return 1;      // Show all if few candles
    if (candleCount <= 100) return 2;     // Show every 2nd candle
    if (candleCount <= 200) return 3;     // Show every 3rd candle
    if (candleCount <= 300) return 4;     // Show every 4th candle
    return 5;                             // Show every 5th candle for large datasets
  };

  const reductionFactor = getDataReductionFactor();
  const filteredCandlesWithIndex = state.candles
    .map((candle, index) => ({ candle, originalIndex: index }))
    .filter(({ originalIndex }) => 
      originalIndex % reductionFactor === 0 || originalIndex === state.candles.length - 1
    );

  // Calculate price range for signal offset
  const avgPrice = state.candles.reduce((sum, c) => sum + c.close, 0) / state.candles.length;
  const signalOffset = avgPrice * 0.0015; // 0.15% of average price for signal offset

  // Prepare chart data with calculated EMAs
  const chartData = filteredCandlesWithIndex.map(({ candle, originalIndex }) => {
    // Separate entry and exit signals - use original index for signal matching
    const buySignalsForCandle = tradingSignals.filter(s => s.candleIndex === originalIndex && s.type === 'BUY');
    const sellSignalsForCandle = tradingSignals.filter(s => s.candleIndex === originalIndex && s.type === 'SELL');
    const closeLongSignalsForCandle = tradingSignals.filter(s => s.candleIndex === originalIndex && s.type === 'CLOSE_LONG');
    const closeShortSignalsForCandle = tradingSignals.filter(s => s.candleIndex === originalIndex && s.type === 'CLOSE_SHORT');
    
    // Add vertical offset for multiple signals on same candle
    const totalSignals = buySignalsForCandle.length + sellSignalsForCandle.length + closeLongSignalsForCandle.length + closeShortSignalsForCandle.length;
    
    return {
      time: new Date(candle.time).toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      timestamp: candle.time,
      price: candle.close,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      ema12: showEMA12 ? calculateEMA(state.candles, 12, originalIndex) : null,
      ema26: showEMA26 ? calculateEMA(state.candles, 26, originalIndex) : null,
      ema50: showEMA50 ? calculateEMA(state.candles, 50, originalIndex) : null,
      ema200: showEMA200 ? calculateEMA(state.candles, 200, originalIndex) : null,
      // For Scatter plot: use price if there's a signal, null otherwise
      // Position signals with dynamic offset based on price
      buySignalPrice: buySignalsForCandle.length > 0 ? buySignalsForCandle[0].price : null,
      sellSignalPrice: sellSignalsForCandle.length > 0 ? sellSignalsForCandle[0].price : null,
      closeLongSignalPrice: closeLongSignalsForCandle.length > 0 ? closeLongSignalsForCandle[0].price : null,
      closeShortSignalPrice: closeShortSignalsForCandle.length > 0 ? closeShortSignalsForCandle[0].price : null,
      // Keep arrays for tooltip
      buySignals: buySignalsForCandle.map(s => ({
        price: s.price,
        strategy: { name: s.strategy, type: s.type },
        reason: s.reason
      })),
      sellSignals: sellSignalsForCandle.map(s => ({
        price: s.price,
        strategy: { name: s.strategy, type: s.type },
        reason: s.reason
      })),
      closeLongSignals: closeLongSignalsForCandle.map(s => ({
        price: s.price,
        strategy: { name: s.strategy, type: 'EXIT' },
        reason: s.reason
      })),
      closeShortSignals: closeShortSignalsForCandle.map(s => ({
        price: s.price,
        strategy: { name: s.strategy, type: 'EXIT' },
        reason: s.reason
      }))
    };
  });

  // Debug: Check if signals are in chartData
  const chartDataWithSignals = chartData.filter(d => 
    d.buySignalPrice !== null || d.sellSignalPrice !== null || 
    d.closeLongSignalPrice !== null || d.closeShortSignalPrice !== null
  );
  console.log(`   Chart data points with signals: ${chartDataWithSignals.length}`);
  if (chartDataWithSignals.length > 0) {
    console.log(`   First signal in chart:`, chartDataWithSignals[0]);
  }

  // Calculate price range for better scaling
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const margin = priceRange * 0.1; // 10% margin

  interface TooltipPayload {
    value: number;
    dataKey: string;
    payload?: {
      time: string;
      price: number;
      ema12?: number;
      ema26?: number;
      ema50?: number;
      ema200?: number;
      buySignals?: Array<{ price: number; strategy: { name: string; type: string }; reason: string }>;
      sellSignals?: Array<{ price: number; strategy: { name: string; type: string }; reason: string }>;
      closeLongSignals?: Array<{ price: number; strategy: { name: string; type: string }; reason: string }>;
      closeShortSignals?: Array<{ price: number; strategy: { name: string; type: string }; reason: string }>;
    };
  }

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-white">
              Price: <span className="text-yellow-400">${payload[0]?.value?.toFixed(2)}</span>
            </p>
            {showEMA12 && payload.find(p => p.dataKey === 'ema12')?.value && (
              <p className="text-green-400">
                EMA(12): ${payload.find(p => p.dataKey === 'ema12')?.value?.toFixed(2)}
              </p>
            )}
            {showEMA26 && payload.find(p => p.dataKey === 'ema26')?.value && (
              <p className="text-orange-400">
                EMA(26): ${payload.find(p => p.dataKey === 'ema26')?.value?.toFixed(2)}
              </p>
            )}
            {showEMA50 && payload.find(p => p.dataKey === 'ema50')?.value && (
              <p className="text-blue-400">
                EMA(50): ${payload.find(p => p.dataKey === 'ema50')?.value?.toFixed(2)}
              </p>
            )}
            {showEMA200 && payload.find(p => p.dataKey === 'ema200')?.value && (
              <p className="text-purple-400">
                EMA(200): ${payload.find(p => p.dataKey === 'ema200')?.value?.toFixed(2)}
              </p>
            )}
            
            {/* Trading Signals */}
            {data?.buySignals && data.buySignals.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-600">
                <p className="text-green-400 font-semibold mb-1">📈 BUY Signals:</p>
                {data.buySignals.map((signal: { price: number; strategy: { name: string; type: string }; reason: string }, idx: number) => (
                  <div key={idx} className="text-xs text-green-300">
                    {signal.strategy.name}: ${signal.price.toFixed(2)} - {signal.reason}
                  </div>
                ))}
              </div>
            )}
            {data?.sellSignals && data.sellSignals.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-600">
                <p className="text-red-400 font-semibold mb-1">📉 SELL Signals:</p>
                {data.sellSignals.map((signal: { price: number; strategy: { name: string; type: string }; reason: string }, idx: number) => (
                  <div key={idx} className="text-xs text-red-300">
                    {signal.strategy.name}: ${signal.price.toFixed(2)} - {signal.reason}
                  </div>
                ))}
              </div>
            )}
            {data?.closeLongSignals && data.closeLongSignals.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-600">
                <p className="text-orange-400 font-semibold mb-1">🔶 EXIT LONG:</p>
                {data.closeLongSignals.map((signal: { price: number; strategy: { name: string; type: string }; reason: string }, idx: number) => (
                  <div key={idx} className="text-xs text-orange-300">
                    {signal.strategy.name}: ${signal.price.toFixed(2)} - {signal.reason}
                  </div>
                ))}
              </div>
            )}
            {data?.closeShortSignals && data.closeShortSignals.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-600">
                <p className="text-cyan-400 font-semibold mb-1">🔷 EXIT SHORT:</p>
                {data.closeShortSignals.map((signal: { price: number; strategy: { name: string; type: string }; reason: string }, idx: number) => (
                  <div key={idx} className="text-xs text-cyan-300">
                    {signal.strategy.name}: ${signal.price.toFixed(2)} - {signal.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
          {/* Fullscreen Header */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-white font-semibold text-lg" title="BTC/USDT: Paire de trading Bitcoin contre Tether (USD)">BTC/USDT</h3>
              {selectedStrategy !== 'GLOBAL' && (
                <div className={`px-3 py-1 ${strategyColors.bg} text-white text-sm rounded font-medium shadow-lg`} title={`Signaux filtrés pour la stratégie: ${selectedStrategy}`}>
                  📊 {selectedStrategy}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEMA12(!showEMA12)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    showEMA12 ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                  title="EMA(12): Moyenne mobile exponentielle sur 12 périodes - Indicateur de momentum rapide utilisé par Momentum Crossover"
                >
                  EMA(12)
                </button>
                <button
                  onClick={() => setShowEMA26(!showEMA26)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    showEMA26 ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                  title="EMA(26): Moyenne mobile exponentielle sur 26 périodes - Indicateur de momentum moyen utilisé par Momentum Crossover"
                >
                  EMA(26)
                </button>
                <button
                  onClick={() => setShowEMA50(!showEMA50)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    showEMA50 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                  title="EMA(50): Moyenne mobile exponentielle sur 50 périodes - Indicateur de tendance court terme utilisé par le bot"
                >
                  EMA(50)
                </button>
                <button
                  onClick={() => setShowEMA200(!showEMA200)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    showEMA200 ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                  title="EMA(200): Moyenne mobile exponentielle sur 200 périodes - Indicateur de tendance long terme utilisé par le bot"
                >
                  EMA(200)
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* EMA Values */}
              <div className="flex items-center gap-4 text-sm">
                {showEMA12 && chartData.length > 0 && chartData[chartData.length - 1].ema12 && (
                  <div className="flex items-center gap-1" title="EMA(12): Moyenne mobile exponentielle sur 12 périodes - Utilisée par Momentum Crossover pour détecter les croisements rapides">
                    <div className="w-3 h-0.5 bg-green-400"></div>
                    <span className="text-green-400 font-mono">EMA(12): {chartData[chartData.length - 1].ema12?.toFixed(2)}</span>
                  </div>
                )}
                {showEMA26 && chartData.length > 0 && chartData[chartData.length - 1].ema26 && (
                  <div className="flex items-center gap-1" title="EMA(26): Moyenne mobile exponentielle sur 26 périodes - Utilisée par Momentum Crossover pour détecter les croisements moyens">
                    <div className="w-3 h-0.5 bg-orange-400"></div>
                    <span className="text-orange-400 font-mono">EMA(26): {chartData[chartData.length - 1].ema26?.toFixed(2)}</span>
                  </div>
                )}
                {showEMA50 && chartData.length > 0 && chartData[chartData.length - 1].ema50 && (
                  <div className="flex items-center gap-1" title="EMA(50): Moyenne mobile exponentielle sur 50 périodes - Utilisée par le bot pour détecter les tendances">
                    <div className="w-3 h-0.5 bg-blue-400"></div>
                    <span className="text-blue-400 font-mono">EMA(50): {chartData[chartData.length - 1].ema50?.toFixed(2)}</span>
                  </div>
                )}
                {showEMA200 && chartData.length > 0 && chartData[chartData.length - 1].ema200 && (
                  <div className="flex items-center gap-1" title="EMA(200): Moyenne mobile exponentielle sur 200 périodes - Utilisée par le bot pour confirmer la tendance majeure">
                    <div className="w-3 h-0.5 bg-purple-400"></div>
                    <span className="text-purple-400 font-mono">EMA(200): {chartData[chartData.length - 1].ema200?.toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              
              {/* Close Fullscreen Button */}
              <button
                onClick={() => setIsFullscreen(false)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                title="Quitter le plein écran"
              >
                ✕ Fermer
              </button>
            </div>
          </div>
          
          {/* Fullscreen Chart */}
          <div className="flex-1 p-6">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  domain={[minPrice - margin, maxPrice + margin]}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Price Line - Smoothed for better readability */}
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#FCD34D"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* EMAs */}
                {curveVisibility.ema12 && state.candles.length >= 12 && (
                  <Line
                    type="monotone"
                    dataKey="ema12"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {curveVisibility.ema26 && state.candles.length >= 26 && (
                  <Line
                    type="monotone"
                    dataKey="ema26"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {curveVisibility.ema50 && state.candles.length >= 50 && (
                  <Line
                    type="monotone"
                    dataKey="ema50"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {curveVisibility.ema200 && state.candles.length >= 200 && (
                  <Line
                    type="monotone"
                    dataKey="ema200"
                    stroke="#A855F7"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                
                {/* Trading Signals - Entry */}
                <Scatter
                  dataKey="buySignalPrice"
                  fill="#10B981"
                  line={false}
                  shape={(props: { cx?: number; cy?: number; payload?: any }) => {
                    const { cx, cy, payload } = props;
                    if (cx === undefined || cy === undefined || !payload?.buySignals?.length) return <g />;
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={8} fill="#10B981" stroke="#fff" strokeWidth={2} opacity={0.9} />
                        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={14} fill="#fff" fontWeight="bold">▲</text>
                      </g>
                    );
                  }}
                />
                <Scatter
                  dataKey="sellSignalPrice"
                  fill="#EF4444"
                  line={false}
                  shape={(props: { cx?: number; cy?: number; payload?: any }) => {
                    const { cx, cy, payload } = props;
                    if (cx === undefined || cy === undefined || !payload?.sellSignals?.length) return <g />;
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={8} fill="#EF4444" stroke="#fff" strokeWidth={2} opacity={0.9} />
                        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={14} fill="#fff" fontWeight="bold">▼</text>
                      </g>
                    );
                  }}
                />
                
                {/* Trading Signals - Exit (Stop Loss / Take Profit) */}
                <Scatter
                  dataKey="closeLongSignalPrice"
                  fill="#F59E0B"
                  line={false}
                  shape={(props: { cx?: number; cy?: number; payload?: any }) => {
                    const { cx, cy, payload } = props;
                    if (cx === undefined || cy === undefined || !payload?.closeLongSignals?.length) return <g />;
                    return (
                      <g>
                        <rect x={cx - 6} y={cy - 6} width={12} height={12} fill="#F59E0B" stroke="#fff" strokeWidth={2} opacity={0.9} rx={2} />
                        <text x={cx} y={cy + 3} textAnchor="middle" fontSize={10} fill="#fff" fontWeight="bold">X</text>
                      </g>
                    );
                  }}
                />
                <Scatter
                  dataKey="closeShortSignalPrice"
                  fill="#06B6D4"
                  line={false}
                  shape={(props: { cx?: number; cy?: number; payload?: any }) => {
                    const { cx, cy, payload } = props;
                    if (cx === undefined || cy === undefined || !payload?.closeShortSignals?.length) return <g />;
                    return (
                      <g>
                        <rect x={cx - 6} y={cy - 6} width={12} height={12} fill="#06B6D4" stroke="#fff" strokeWidth={2} opacity={0.9} rx={2} />
                        <text x={cx} y={cy + 3} textAnchor="middle" fontSize={10} fill="#fff" fontWeight="bold">X</text>
                      </g>
                    );
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* Normal Chart */}
      <div className="bg-gray-900 h-[28rem]">
        {/* Chart Controls */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-white font-semibold" title="BTC/USDT: Paire de trading Bitcoin contre Tether (USD)">BTC/USDT</h3>
            {selectedStrategy !== 'GLOBAL' && (
              <div className={`px-2 py-1 ${strategyColors.bg} text-white text-xs rounded font-medium shadow-lg`} title={`Signaux filtrés pour la stratégie: ${selectedStrategy}`}>
                📊 {selectedStrategy}
              </div>
            )}
            {/* Chart Toggle Controls - separate row */}
        <div className="bg-gray-800 px-4 py-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEMA12(!showEMA12)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                showEMA12 ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
              title="EMA(12): Moyenne mobile exponentielle sur 12 périodes - Indicateur de momentum rapide utilisé par Momentum Crossover"
            >
              EMA(12)
            </button>
            <button
              onClick={() => setShowEMA26(!showEMA26)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                showEMA26 ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
              title="EMA(26): Moyenne mobile exponentielle sur 26 périodes - Indicateur de momentum moyen utilisé par Momentum Crossover"
            >
              EMA(26)
            </button>
            <button
              onClick={() => setShowEMA50(!showEMA50)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                showEMA50 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
              title="EMA(50): Moyenne mobile exponentielle sur 50 périodes - Indicateur de tendance court terme utilisé par le bot"
            >
              EMA(50)
            </button>
            <button
              onClick={() => setShowEMA200(!showEMA200)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                showEMA200 ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
              title="EMA(200): Moyenne mobile exponentielle sur 200 périodes - Indicateur de tendance long terme utilisé par le bot"
            >
              EMA(200)
            </button>
          </div>
        </div>
          </div>
        
        {/* EMA Values - moved to the right */}
        <div className="flex items-center gap-4 text-sm">
          {showEMA12 && chartData.length > 0 && chartData[chartData.length - 1].ema12 && (
            <div className="flex items-center gap-1" title="EMA(12): Moyenne mobile exponentielle sur 12 périodes - Utilisée par Momentum Crossover pour détecter les croisements rapides">
              <div className="w-3 h-0.5 bg-green-400"></div>
              <span className="text-green-400 font-mono">EMA(12): {chartData[chartData.length - 1].ema12?.toFixed(2)}</span>
            </div>
          )}
          {showEMA26 && chartData.length > 0 && chartData[chartData.length - 1].ema26 && (
            <div className="flex items-center gap-1" title="EMA(26): Moyenne mobile exponentielle sur 26 périodes - Utilisée par Momentum Crossover pour détecter les croisements moyens">
              <div className="w-3 h-0.5 bg-orange-400"></div>
              <span className="text-orange-400 font-mono">EMA(26): {chartData[chartData.length - 1].ema26?.toFixed(2)}</span>
            </div>
          )}
          {showEMA50 && chartData.length > 0 && chartData[chartData.length - 1].ema50 && (
            <div className="flex items-center gap-1" title="EMA(50): Moyenne mobile exponentielle sur 50 périodes - Utilisée par le bot pour détecter les tendances">
              <div className="w-3 h-0.5 bg-blue-400"></div>
              <span className="text-blue-400 font-mono">EMA(50): {chartData[chartData.length - 1].ema50?.toFixed(2)}</span>
            </div>
          )}
          {showEMA200 && chartData.length > 0 && chartData[chartData.length - 1].ema200 && (
            <div className="flex items-center gap-1" title="EMA(200): Moyenne mobile exponentielle sur 200 périodes - Utilisée par le bot pour confirmer la tendance majeure">
              <div className="w-3 h-0.5 bg-purple-400"></div>
              <span className="text-purple-400 font-mono">EMA(200): {chartData[chartData.length - 1].ema200?.toFixed(2)}</span>
            </div>
          )}
          
          
          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
            title="Afficher en plein écran"
          >
            ⛶ Plein écran
          </button>
        </div>
      </div>

      

      {/* Chart */}
      <div className="h-100 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="time" 
              stroke="#9CA3AF"
              fontSize={12}
              tickCount={6}
            />
            <YAxis 
              domain={[minPrice - margin, maxPrice + margin]}
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Price Line - Smoothed for better readability */}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#FCD34D"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* EMAs */}
            {curveVisibility.ema12 && state.candles.length >= 12 && (
              <Line
                type="monotone"
                dataKey="ema12"
                stroke="#10B981"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            )}
            {curveVisibility.ema26 && state.candles.length >= 26 && (
              <Line
                type="monotone"
                dataKey="ema26"
                stroke="#F59E0B"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            )}
            {curveVisibility.ema50 && state.candles.length >= 50 && (
              <Line
                type="monotone"
                dataKey="ema50"
                stroke="#3B82F6"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            )}
            {curveVisibility.ema200 && state.candles.length >= 200 && (
              <Line
                type="monotone"
                dataKey="ema200"
                stroke="#A855F7"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            )}
            
            {/* Trading Signals - Entry */}
            <Scatter
              dataKey="buySignalPrice"
              fill="#10B981"
              line={false}
              shape={(props: { cx?: number; cy?: number; payload?: any }) => {
                const { cx, cy, payload } = props;
                if (cx === undefined || cy === undefined || !payload?.buySignals?.length) return <g />;
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={10} fill="#10B981" stroke="#fff" strokeWidth={2.5} opacity={0.95} />
                    <text x={cx} y={cy + 5} textAnchor="middle" fontSize={16} fill="#fff" fontWeight="bold">▲</text>
                  </g>
                );
              }}
            />
            <Scatter
              dataKey="sellSignalPrice"
              fill="#EF4444"
              line={false}
              shape={(props: { cx?: number; cy?: number; payload?: any }) => {
                const { cx, cy, payload } = props;
                if (cx === undefined || cy === undefined || !payload?.sellSignals?.length) return <g />;
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={10} fill="#EF4444" stroke="#fff" strokeWidth={2.5} opacity={0.95} />
                    <text x={cx} y={cy + 5} textAnchor="middle" fontSize={16} fill="#fff" fontWeight="bold">▼</text>
                  </g>
                );
              }}
            />
            
            {/* Trading Signals - Exit (Stop Loss / Take Profit) */}
            <Scatter
              dataKey="closeLongSignalPrice"
              fill="#F59E0B"
              line={false}
              shape={(props: { cx?: number; cy?: number; payload?: any }) => {
                const { cx, cy, payload } = props;
                if (cx === undefined || cy === undefined || !payload?.closeLongSignals?.length) return <g />;
                return (
                  <g>
                    <rect x={cx - 7} y={cy - 7} width={14} height={14} fill="#F59E0B" stroke="#fff" strokeWidth={2.5} opacity={0.95} rx={2} />
                    <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fill="#fff" fontWeight="bold">X</text>
                  </g>
                );
              }}
            />
            <Scatter
              dataKey="closeShortSignalPrice"
              fill="#06B6D4"
              line={false}
              shape={(props: { cx?: number; cy?: number; payload?: any }) => {
                const { cx, cy, payload } = props;
                if (cx === undefined || cy === undefined || !payload?.closeShortSignals?.length) return <g />;
                return (
                  <g>
                    <rect x={cx - 7} y={cy - 7} width={14} height={14} fill="#06B6D4" stroke="#fff" strokeWidth={2.5} opacity={0.95} rx={2} />
                    <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fill="#fff" fontWeight="bold">X</text>
                  </g>
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
    </div>
    </>
  );
}
