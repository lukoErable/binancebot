'use client';

import { StrategyState } from '@/types/trading';
import { useState } from 'react';
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface BinanceChartProps {
  state: StrategyState;
}

export default function BinanceChart({ state }: BinanceChartProps) {
  const [showEMA50, setShowEMA50] = useState(true);
  const [showEMA200, setShowEMA200] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!state.candles || state.candles.length === 0) {
    return (
      <div className="bg-gray-800 h-96 flex items-center justify-center">
        <div className="text-gray-400">Loading chart data...</div>
      </div>
    );
  }

  // Calculate EMA for each candle
  const calculateEMA = (candles: any[], period: number, index: number): number | null => {
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

  // Prepare chart data with calculated EMAs
  const chartData = state.candles.map((candle, index) => ({
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
    ema50: showEMA50 ? calculateEMA(state.candles, 50, index) : null,
    ema200: showEMA200 ? calculateEMA(state.candles, 200, index) : null,
  }));

  // Calculate price range for better scaling
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const margin = priceRange * 0.1; // 10% margin

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-white">
              Price: <span className="text-yellow-400">${payload[0]?.value?.toFixed(2)}</span>
            </p>
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
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-white font-semibold text-lg" title="BTC/USDT: Paire de trading Bitcoin contre Tether (USD)">BTC/USDT</h3>
              <div className="flex items-center gap-2">
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
              <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                
                {/* Price Line */}
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                
                {/* EMAs */}
                {showEMA50 && state.candles.length >= 50 && (
                  <Line
                    type="monotone"
                    dataKey="ema50"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                )}
                {showEMA200 && state.candles.length >= 200 && (
                  <Line
                    type="monotone"
                    dataKey="ema200"
                    stroke="#A855F7"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                )}
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
            {/* Chart Toggle Controls - separate row */}
        <div className="bg-gray-800 px-4 py-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
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
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
            
            {/* Price Line */}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#FCD34D"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            
            {/* EMAs */}
            {showEMA50 && state.candles.length >= 50 && (
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
            {showEMA200 && state.candles.length >= 200 && (
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
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
    </div>
    </>
  );
}
