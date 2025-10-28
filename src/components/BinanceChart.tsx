'use client';

import { StrategyPerformance, StrategyState } from '@/types/trading';
import { useEffect, useState } from 'react';
import { HiClock, HiEye, HiEyeOff, HiX } from 'react-icons/hi';
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface BinanceChartProps {
  state: StrategyState;
  selectedStrategy?: string;
  strategyPerformances?: StrategyPerformance[];
  localConfigCache?: Record<string, { profitTargetPercent?: number | null; stopLossPercent?: number | null; maxPositionTime?: number | null }>;
}

export default function BinanceChart({ state, selectedStrategy = 'GLOBAL', strategyPerformances = [], localConfigCache = {} }: BinanceChartProps) {
  const [showEMA12, setShowEMA12] = useState(true);
  const [showEMA26, setShowEMA26] = useState(true);
  const [showEMA50, setShowEMA50] = useState(true);
  const [showEMA200, setShowEMA200] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get strategy color based on type (with dynamic color for CUSTOM)
  const getStrategyColor = (strategyType: string, customColor?: string) => {
    // For CUSTOM strategies with predefined color map
    if (strategyType === 'CUSTOM' && customColor) {
      const colorMap: Record<string, any> = {
        emerald: { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-400', accent: 'bg-emerald-400' },
        rose: { bg: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-400', accent: 'bg-rose-400' },
        indigo: { bg: 'bg-indigo-500', text: 'text-indigo-400', border: 'border-indigo-400', accent: 'bg-indigo-400' },
        violet: { bg: 'bg-violet-500', text: 'text-violet-400', border: 'border-violet-400', accent: 'bg-violet-400' },
        amber: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-400', accent: 'bg-amber-400' },
        lime: { bg: 'bg-lime-500', text: 'text-lime-400', border: 'border-lime-400', accent: 'bg-lime-400' },
        sky: { bg: 'bg-sky-500', text: 'text-sky-400', border: 'border-sky-400', accent: 'bg-sky-400' },
        fuchsia: { bg: 'bg-fuchsia-500', text: 'text-fuchsia-400', border: 'border-fuchsia-400', accent: 'bg-fuchsia-400' },
        pink: { bg: 'bg-pink-500', text: 'text-pink-400', border: 'border-pink-400', accent: 'bg-pink-400' },
        red: { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-400', accent: 'bg-red-400' },
        green: { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-400', accent: 'bg-green-400' },
        slate: { bg: 'bg-slate-500', text: 'text-slate-400', border: 'border-slate-400', accent: 'bg-slate-400' },
        stone: { bg: 'bg-stone-500', text: 'text-stone-400', border: 'border-stone-400', accent: 'bg-stone-400' }
      };
      
      return colorMap[customColor] || colorMap.fuchsia;
    }
    
    switch (strategyType) {
      case 'RSI_EMA':
        return { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-400', accent: 'bg-blue-400' };
      case 'MOMENTUM_CROSSOVER':
        return { bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-400', accent: 'bg-purple-400' };
      case 'VOLUME_MACD':
        return { bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-400', accent: 'bg-orange-400' };
      case 'BOLLINGER_BOUNCE':
        return { bg: 'bg-teal-500', text: 'text-teal-400', border: 'border-teal-400', accent: 'bg-teal-400' };
      case 'TREND_FOLLOWER':
        return { bg: 'bg-cyan-500', text: 'text-cyan-400', border: 'border-cyan-400', accent: 'bg-cyan-400' };
      case 'ATR_PULLBACK':
        return { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-400', accent: 'bg-yellow-400' };
      case 'CUSTOM':
        return { bg: 'bg-fuchsia-500', text: 'text-fuchsia-400', border: 'border-fuchsia-400', accent: 'bg-fuchsia-400' };
      default:
        return { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-400', accent: 'bg-blue-400' };
    }
  };

  // Get current strategy data
  const currentStrategy = strategyPerformances.find(p => p.strategyName === selectedStrategy);
  const customColor = currentStrategy?.strategyType === 'CUSTOM' ? currentStrategy.customConfig?.color : undefined;
  const strategyColors = currentStrategy ? getStrategyColor(currentStrategy.strategyType, customColor) : { bg: 'bg-blue-600', text: 'text-blue-400', border: 'border-blue-400', accent: 'bg-blue-400' };

  // Calculate TP/SL prices and time remaining for selected strategy
  const getTradeLevels = () => {
    if (!currentStrategy || !currentStrategy.currentPosition || currentStrategy.currentPosition.type === 'NONE') {
      return { tpPrice: null, slPrice: null, timeRemaining: null };
    }

    const position = currentStrategy.currentPosition;
    // Utiliser le cache local en priorité, puis la config SSE
    const cachedConfig = localConfigCache[currentStrategy.strategyName];
    const config = cachedConfig ? { ...currentStrategy.config, ...cachedConfig } : currentStrategy.config;
    const entryPrice = position.entryPrice;

    let tpPrice = null;
    let slPrice = null;

    if (config?.profitTargetPercent && config.profitTargetPercent !== null) {
      if (position.type === 'LONG') {
        tpPrice = entryPrice * (1 + config.profitTargetPercent / 100);
      } else if (position.type === 'SHORT') {
        tpPrice = entryPrice * (1 - config.profitTargetPercent / 100);
      }
    }

    if (config?.stopLossPercent && config.stopLossPercent !== null) {
      if (position.type === 'LONG') {
        slPrice = entryPrice * (1 - config.stopLossPercent / 100);
      } else if (position.type === 'SHORT') {
        slPrice = entryPrice * (1 + config.stopLossPercent / 100);
      }
    }

    // Calculate elapsed time and time remaining
    let timeRemaining = null;
    let timeElapsed = null;
    
    if (position.entryTime) {
      const elapsedMs = Date.now() - position.entryTime;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000);
      const elapsedHours = Math.floor(elapsedMinutes / 60);
      
      // Format elapsed time - heures si >= 60 minutes
      if (elapsedMinutes >= 60) {
        timeElapsed = `${elapsedHours}h ${elapsedMinutes % 60}m`;
      } else {
        timeElapsed = `${elapsedMinutes}m ${elapsedSeconds}s`;
      }
      
      // Calculate time remaining
      if (config?.maxPositionTime && config.maxPositionTime !== null) {
        const maxTimeMs = config.maxPositionTime * 60 * 1000;
        const remainingMs = maxTimeMs - elapsedMs;
        
        if (remainingMs > 0) {
          const minutes = Math.floor(remainingMs / 60000);
          const seconds = Math.floor((remainingMs % 60000) / 1000);
          const hours = Math.floor(minutes / 60);
          
          // Format - heures si >= 60 minutes
          if (minutes >= 60) {
            timeRemaining = `${hours}h ${minutes % 60}m`;
          } else {
            timeRemaining = `${minutes}m ${seconds}s`;
          }
        } else {
          timeRemaining = 'Expiré';
        }
      }
    }

    return { 
      tpPrice, 
      slPrice, 
      timeRemaining,
      timeElapsed,
      positionType: position.type,
      unrealizedPnL: position.unrealizedPnL,
      unrealizedPnLPercent: position.unrealizedPnLPercent
    };
  };

  // Update time remaining every second and recalculate on config change
  const [, setUpdateTrigger] = useState(0);
  useEffect(() => {
    if (currentStrategy && currentStrategy.currentPosition && currentStrategy.currentPosition.type !== 'NONE') {
      const interval = setInterval(() => {
        setUpdateTrigger(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentStrategy]);

  // Recalculate trade levels (will update when localConfigCache changes)
  const { tpPrice, slPrice, timeRemaining, timeElapsed, positionType, unrealizedPnL, unrealizedPnLPercent } = getTradeLevels();

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



  // Prepare chart data with calculated EMAs
  const chartData = filteredCandlesWithIndex.map(({ candle, originalIndex }, dataIndex) => {
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
      ema12: showEMA12 && originalIndex >= 11 ? calculateEMA(state.candles, 12, originalIndex) : null,
      ema26: showEMA26 && originalIndex >= 25 ? calculateEMA(state.candles, 26, originalIndex) : null,
      ema50: showEMA50 && originalIndex >= 49 ? calculateEMA(state.candles, 50, originalIndex) : null,
      ema200: showEMA200 && originalIndex >= 199 ? calculateEMA(state.candles, 200, originalIndex) : null
    };
  });


  // Calculate price range for better scaling
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const margin = priceRange * 0.1; // 10% margin
  
  // Get current price (last candle)
  const currentPrice = state.candles.length > 0 ? state.candles[state.candles.length - 1].close : 0;

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
    };
  }

  // Early return AFTER all hooks if no data
  if (!state.candles || state.candles.length === 0) {
    return (
      <div className="bg-gray-800 h-96 flex items-center justify-center">
        <div className="text-gray-400">Loading chart data...</div>
      </div>
    );
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
          <div className="bg-gray-800 border-b border-gray-700">
            {/* Info Bar - Price, Strategy, Position, Timer */}
            <div className="px-4 py-3 flex items-center gap-6">
              {/* BTC Price */}
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-xl">${currentPrice.toFixed(2)}</span>
                <span className="text-gray-400 text-sm">BTC/USDT</span>
              </div>

              {/* Strategy Name */}
              {selectedStrategy !== 'GLOBAL' && (
                <>
                  <div className={`w-1 h-7 ${strategyColors.accent} rounded-full`}></div>
                  <span className={`${strategyColors.text} text-base font-semibold`}>
                    {selectedStrategy}
                  </span>
                </>
              )}

              {/* Position, Timer, TP, SL, Unrealized */}
              {positionType && positionType !== 'NONE' && (
                <>
                  <div className="w-px h-6 bg-gray-600"></div>
                  <div className="flex items-center justify-between flex-1">
            <div className="flex items-center gap-4">
                      {/* Position Type */}
                      <span className={`text-base font-bold ${
                        positionType === 'LONG' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {positionType}
                      </span>
                      
                      {/* Separator */}
                      {timeElapsed && <div className="w-px h-5 bg-gray-600"></div>}
                      
                      {/* Time Elapsed & Remaining */}
                      {timeElapsed && (
                        <div className="flex items-center gap-1 text-sm font-mono font-semibold text-blue-400">
                          <HiClock className="w-4 h-4" />
                          <span>{timeElapsed}</span>
                        </div>
                      )}
                      
                      {/* Separator */}
                      {timeRemaining && <div className="w-px h-5 bg-gray-600"></div>}
                      
                      {timeRemaining && (
                        <div className="flex items-center gap-1 text-sm font-mono font-semibold text-red-400">
                          <HiClock className="w-4 h-4" />
                          <span>{timeRemaining}</span>
                        </div>
                      )}
                      
                      {/* Separator */}
                      {tpPrice && <div className="w-px h-5 bg-gray-600"></div>}
                      
                      {/* TP */}
                      {tpPrice && (
                        <span className="text-sm font-semibold text-green-400">
                          TP: ${tpPrice.toFixed(2)}
                        </span>
                      )}
                      
                      {/* SL */}
                      {slPrice && (
                        <span className="text-sm font-semibold text-red-400">
                          SL: ${slPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    
                    {/* Unrealized P&L - Au bout à droite */}
                    {unrealizedPnL !== undefined && (
                      <>
                        <span className={`text-sm font-semibold ${
                          unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnL.toFixed(2)} USDT
                        </span>
                        <div className={`w-1 h-7 ${strategyColors.accent} rounded-full`}></div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* EMA Controls & Values Bar */}
            <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-700/50 flex items-center justify-between">
              {/* EMA Toggle Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEMA12(!showEMA12)}
                  className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                    showEMA12 ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                  title="EMA(12): Moyenne mobile exponentielle sur 12 périodes - Indicateur de momentum rapide utilisé par Momentum Crossover"
                >
                  {showEMA12 ? <HiEye className="w-3 h-3" /> : <HiEyeOff className="w-3 h-3" />}
                  EMA(12)
                </button>
                <button
                  onClick={() => setShowEMA26(!showEMA26)}
                  className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                    showEMA26 ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                  title="EMA(26): Moyenne mobile exponentielle sur 26 périodes - Indicateur de momentum moyen utilisé par Momentum Crossover"
                >
                  {showEMA26 ? <HiEye className="w-3 h-3" /> : <HiEyeOff className="w-3 h-3" />}
                  EMA(26)
                </button>
                <button
                  onClick={() => setShowEMA50(!showEMA50)}
                  className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                    showEMA50 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                  title="EMA(50): Moyenne mobile exponentielle sur 50 périodes - Indicateur de tendance court terme utilisé par le bot"
                >
                  {showEMA50 ? <HiEye className="w-3 h-3" /> : <HiEyeOff className="w-3 h-3" />}
                  EMA(50)
                </button>
                <button
                  onClick={() => setShowEMA200(!showEMA200)}
                  className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                    showEMA200 ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                  title="EMA(200): Moyenne mobile exponentielle sur 200 périodes - Indicateur de tendance long terme utilisé par le bot"
                >
                  {showEMA200 ? <HiEye className="w-3 h-3" /> : <HiEyeOff className="w-3 h-3" />}
                  EMA(200)
                </button>
              </div>

              {/* EMA Values */}
              <div className="flex items-center gap-6">
                {showEMA12 && chartData.length > 0 && chartData[chartData.length - 1].ema12 && (
                  <div className="flex items-center gap-2" title="EMA(12): Moyenne mobile exponentielle sur 12 périodes - Utilisée par Momentum Crossover pour détecter les croisements rapides">
                    <div className="w-3 h-0.5 bg-green-400"></div>
                    <span className="text-green-400 font-mono text-sm font-semibold">{chartData[chartData.length - 1].ema12?.toFixed(2)}</span>
                  </div>
                )}
                {showEMA26 && chartData.length > 0 && chartData[chartData.length - 1].ema26 && (
                  <div className="flex items-center gap-2" title="EMA(26): Moyenne mobile exponentielle sur 26 périodes - Utilisée par Momentum Crossover pour détecter les croisements moyens">
                    <div className="w-3 h-0.5 bg-orange-400"></div>
                    <span className="text-orange-400 font-mono text-sm font-semibold">{chartData[chartData.length - 1].ema26?.toFixed(2)}</span>
                  </div>
                )}
                {showEMA50 && chartData.length > 0 && chartData[chartData.length - 1].ema50 && (
                  <div className="flex items-center gap-2" title="EMA(50): Moyenne mobile exponentielle sur 50 périodes - Utilisée par le bot pour détecter les tendances">
                    <div className="w-3 h-0.5 bg-blue-400"></div>
                    <span className="text-blue-400 font-mono text-sm font-semibold">{chartData[chartData.length - 1].ema50?.toFixed(2)}</span>
                  </div>
                )}
                {showEMA200 && chartData.length > 0 && chartData[chartData.length - 1].ema200 && (
                  <div className="flex items-center gap-2" title="EMA(200): Moyenne mobile exponentielle sur 200 périodes - Utilisée par le bot pour confirmer la tendance majeure">
                    <div className="w-3 h-0.5 bg-purple-400"></div>
                    <span className="text-purple-400 font-mono text-sm font-semibold">{chartData[chartData.length - 1].ema200?.toFixed(2)}</span>
                  </div>
                )}
              
              {/* Close Fullscreen Button */}
              <button
                onClick={() => setIsFullscreen(false)}
                className="ml-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center justify-center"
                title="Quitter le plein écran"
              >
                <HiX className="w-4 h-4" />
              </button>
              </div>
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
                
                {/* Current Price Line - Ligne verte en pointillés */}
                <ReferenceLine 
                  y={currentPrice} 
                  stroke="#10B981" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                  label={{ 
                    value: `${currentPrice.toFixed(2)} USDT`, 
                    position: 'left',
                    fill: '#10B981',
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}
                />

                {/* Take Profit Line - Ligne verte */}
                {tpPrice && (
                  <ReferenceLine 
                    y={tpPrice} 
                    stroke="#22C55E" 
                    strokeDasharray="3 3" 
                    strokeWidth={2}
                    label={{ 
                      value: `TP: ${tpPrice.toFixed(2)}`, 
                      position: 'right',
                      fill: '#22C55E',
                      fontSize: 11,
                      fontWeight: 'bold'
                    }}
                  />
                )}

                {/* Stop Loss Line - Ligne rouge */}
                {slPrice && (
                  <ReferenceLine 
                    y={slPrice} 
                    stroke="#EF4444" 
                    strokeDasharray="3 3" 
                    strokeWidth={2}
                    label={{ 
                      value: `SL: ${slPrice.toFixed(2)}`, 
                      position: 'right',
                      fill: '#EF4444',
                      fontSize: 11,
                      fontWeight: 'bold'
                    }}
                  />
                )}
                
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
                    strokeLinecap="round"
                    strokeLinejoin="round"
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
                    strokeLinecap="round"
                    strokeLinejoin="round"
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
                    strokeLinecap="round"
                    strokeLinejoin="round"
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
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* Normal Chart */}
      <div className="bg-gray-900 h-[28rem] relative">
        {/* Chart Controls */}
        <div className="bg-gray-800 border-b border-gray-700">
          {/* Info Bar - Price, Strategy, Position, Timer */}
          <div className="px-4 py-2 flex items-center gap-4">
            {/* BTC Price */}
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-base">${currentPrice.toFixed(2)}</span>
              <span className="text-gray-400 text-xs">BTC/USDT</span>
            </div>

            {/* Strategy Name */}
            {selectedStrategy !== 'GLOBAL' && (
              <>
                <div className={`w-1 h-6 ${strategyColors.accent} rounded-full`}></div>
                <span className={`${strategyColors.text} text-sm font-semibold`}>
                  {selectedStrategy}
                </span>
              </>
            )}

            {/* Position, Timer, TP, SL, Unrealized */}
            {positionType && positionType !== 'NONE' && (
              <>
                <div className="w-px h-5 bg-gray-600"></div>
                <div className="flex items-center justify-between flex-1">
                  <div className="flex items-center gap-3">
                    {/* Position Type */}
                    <span className={`text-sm font-bold ${
                      positionType === 'LONG' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {positionType}
                    </span>
                    
                    {/* Separator */}
                    {timeElapsed && <div className="w-px h-4 bg-gray-600"></div>}
                    
                    {/* Time Elapsed & Remaining */}
                    {timeElapsed && (
                      <div className="flex items-center gap-1 text-xs font-mono font-semibold text-blue-400">
                        <HiClock className="w-3.5 h-3.5" />
                        <span>{timeElapsed}</span>
                      </div>
                    )}
                    
                    {/* Separator */}
                    {timeRemaining && <div className="w-px h-4 bg-gray-600"></div>}
                    
                    {timeRemaining && (
                      <div className="flex items-center gap-1 text-xs font-mono font-semibold text-red-400">
                        <HiClock className="w-3.5 h-3.5" />
                        <span>{timeRemaining}</span>
                      </div>
                    )}
                    
                    {/* Separator */}
                    {tpPrice && <div className="w-px h-4 bg-gray-600"></div>}
                    
                    {/* TP */}
                    {tpPrice && (
                      <span className="text-xs font-semibold text-green-400">
                        TP: ${tpPrice.toFixed(2)}
                      </span>
                    )}
                    
                    {/* SL */}
                    {slPrice && (
                      <span className="text-xs font-semibold text-red-400">
                        SL: ${slPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  {/* Unrealized P&L - Au bout à droite */}
                  {unrealizedPnL !== undefined && (
                    <>
                      <span className={`text-xs font-semibold ${
                        unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnL.toFixed(2)} USDT
                      </span>
                      <div className={`w-1 h-6 ${strategyColors.accent} rounded-full`}></div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* EMA Controls & Values Bar */}
          <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-700/50 flex items-center justify-between">
            {/* EMA Toggle Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEMA12(!showEMA12)}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                  showEMA12 ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
                title="EMA(12): Moyenne mobile exponentielle sur 12 périodes - Indicateur de momentum rapide utilisé par Momentum Crossover"
              >
                {showEMA12 ? <HiEye className="w-3 h-3" /> : <HiEyeOff className="w-3 h-3" />}
                EMA(12)
              </button>
              <button
                onClick={() => setShowEMA26(!showEMA26)}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                  showEMA26 ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
                title="EMA(26): Moyenne mobile exponentielle sur 26 périodes - Indicateur de momentum moyen utilisé par Momentum Crossover"
              >
                {showEMA26 ? <HiEye className="w-3 h-3" /> : <HiEyeOff className="w-3 h-3" />}
                EMA(26)
              </button>
              <button
                onClick={() => setShowEMA50(!showEMA50)}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                  showEMA50 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
                title="EMA(50): Moyenne mobile exponentielle sur 50 périodes - Indicateur de tendance court terme utilisé par le bot"
              >
                {showEMA50 ? <HiEye className="w-3 h-3" /> : <HiEyeOff className="w-3 h-3" />}
                EMA(50)
              </button>
              <button
                onClick={() => setShowEMA200(!showEMA200)}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                  showEMA200 ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
                title="EMA(200): Moyenne mobile exponentielle sur 200 périodes - Indicateur de tendance long terme utilisé par le bot"
              >
                {showEMA200 ? <HiEye className="w-3 h-3" /> : <HiEyeOff className="w-3 h-3" />}
                EMA(200)
              </button>
            </div>

            {/* EMA Values */}
        <div className="flex items-center gap-4">
          {showEMA12 && chartData.length > 0 && chartData[chartData.length - 1].ema12 && (
            <div className="flex items-center gap-1.5" title="EMA(12): Moyenne mobile exponentielle sur 12 périodes - Utilisée par Momentum Crossover pour détecter les croisements rapides">
              <div className="w-3 h-0.5 bg-green-400"></div>
                  <span className="text-green-400 font-mono text-xs font-semibold">{chartData[chartData.length - 1].ema12?.toFixed(2)}</span>
            </div>
          )}
          {showEMA26 && chartData.length > 0 && chartData[chartData.length - 1].ema26 && (
            <div className="flex items-center gap-1.5" title="EMA(26): Moyenne mobile exponentielle sur 26 périodes - Utilisée par Momentum Crossover pour détecter les croisements moyens">
              <div className="w-3 h-0.5 bg-orange-400"></div>
                  <span className="text-orange-400 font-mono text-xs font-semibold">{chartData[chartData.length - 1].ema26?.toFixed(2)}</span>
            </div>
          )}
          {showEMA50 && chartData.length > 0 && chartData[chartData.length - 1].ema50 && (
            <div className="flex items-center gap-1.5" title="EMA(50): Moyenne mobile exponentielle sur 50 périodes - Utilisée par le bot pour détecter les tendances">
              <div className="w-3 h-0.5 bg-blue-400"></div>
                  <span className="text-blue-400 font-mono text-xs font-semibold">{chartData[chartData.length - 1].ema50?.toFixed(2)}</span>
            </div>
          )}
          {showEMA200 && chartData.length > 0 && chartData[chartData.length - 1].ema200 && (
            <div className="flex items-center gap-1.5" title="EMA(200): Moyenne mobile exponentielle sur 200 périodes - Utilisée par le bot pour confirmer la tendance majeure">
              <div className="w-3 h-0.5 bg-purple-400"></div>
                  <span className="text-purple-400 font-mono text-xs font-semibold">{chartData[chartData.length - 1].ema200?.toFixed(2)}</span>
            </div>
          )}
          
          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="ml-2 p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded transition-colors flex items-center justify-center"
            title="Afficher en plein écran"
          >
            <HiEye className="w-4 h-4" />
          </button>
            </div>
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
            
            {/* Current Price Line - Ligne verte en pointillés */}
            <ReferenceLine 
              y={currentPrice} 
              stroke="#10B981" 
              strokeDasharray="5 5" 
              strokeWidth={2}
              label={{ 
                value: `${currentPrice.toFixed(2)}`, 
                position: 'left',
                fill: '#10B981',
                fontSize: 12,
                fontWeight: 'bold'
              }}
            />

            {/* Take Profit Line - Ligne verte */}
            {tpPrice && (
              <ReferenceLine 
                y={tpPrice} 
                stroke="#22C55E" 
                strokeDasharray="3 3" 
                strokeWidth={2}
                label={{ 
                  value: `TP: ${tpPrice.toFixed(2)}`, 
                  position: 'right',
                  fill: '#22C55E',
                  fontSize: 11,
                  fontWeight: 'bold'
                }}
              />
            )}

            {/* Stop Loss Line - Ligne rouge */}
            {slPrice && (
              <ReferenceLine 
                y={slPrice} 
                stroke="#EF4444" 
                strokeDasharray="3 3" 
                strokeWidth={2}
                label={{ 
                  value: `SL: ${slPrice.toFixed(2)}`, 
                  position: 'right',
                  fill: '#EF4444',
                  fontSize: 11,
                  fontWeight: 'bold'
                }}
              />
            )}
            
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
                strokeWidth={1}
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
                strokeWidth={1}
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
                strokeWidth={1}
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
                strokeWidth={1}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            )}
            
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
    </div>
    </>
  );
}
