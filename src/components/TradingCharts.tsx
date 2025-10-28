'use client';

import { StrategyState } from '@/types/trading';
import { useState } from 'react';
import { HiChartBar, HiEye, HiEyeOff, HiTrendingDown, HiTrendingUp } from 'react-icons/hi';
import {
    Area,
    Bar,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { EMA, RSI } from 'technicalindicators';

interface TradingChartsProps {
  state: StrategyState;
}

interface ChartDataPoint {
  time: string;
  price: number;
  ema50: number;
  ema200: number;
  rsi: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export default function TradingCharts({ state }: TradingChartsProps) {
  // État pour gérer la visibilité des courbes
  const [visibleLines, setVisibleLines] = useState({
    price: true,
    ema50: true,
    ema200: true,
    rsi: true,
    volume: true
  });

  // État pour le mode d'affichage (prix absolu vs variation %)
  const [showPercentage, setShowPercentage] = useState(false);
  
  // État pour afficher les bougies - Par défaut activé pour ressembler à Binance
  const [showCandlesticks, setShowCandlesticks] = useState(true);
  
  

  // Toggle visibility
  const toggleLine = (key: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Préparer les données pour les graphiques
  const chartData: ChartDataPoint[] = state.candles.map((candle, index) => {
    const date = new Date(candle.time);
    
    // Calculer les indicateurs pour chaque bougie individuellement
    // On utilise les bougies jusqu'à l'index actuel
    const candlesForCalculation = state.candles.slice(0, index + 1);
    
    // RSI
    let rsiValue = 0;
    if (candlesForCalculation.length >= 14) {
      const closes = candlesForCalculation.map(c => c.close);
      const rsiValues = RSI.calculate({
        values: closes,
        period: 14
      });
      rsiValue = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : 0;
    }
    
    // EMA 50
    let ema50Value = 0;
    if (candlesForCalculation.length >= 50) {
      const closes = candlesForCalculation.map(c => c.close);
      const ema50Values = EMA.calculate({
        values: closes,
        period: 50
      });
      ema50Value = ema50Values.length > 0 ? ema50Values[ema50Values.length - 1] : 0;
    }
    
    // EMA 200
    let ema200Value = 0;
    if (candlesForCalculation.length >= 200) {
      const closes = candlesForCalculation.map(c => c.close);
      const ema200Values = EMA.calculate({
        values: closes,
        period: 200
      });
      ema200Value = ema200Values.length > 0 ? ema200Values[ema200Values.length - 1] : 0;
    }
    
    return {
      time: date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      price: candle.close,
      ema50: ema50Value,
      ema200: ema200Value,
      rsi: rsiValue,
      volume: candle.volume,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close
    };
  });

  // Prendre les 50 dernières bougies
  const displayData = chartData.slice(-50);
  
  // Calculer les plages de prix pour un meilleur scaling
  const prices = displayData.map(d => d.price).filter(p => p > 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  
  // Pour Binance-style: utiliser un scaling plus dynamique
  // Si la variation est très faible, on utilise un pourcentage du prix moyen
  const avgPrice = (minPrice + maxPrice) / 2;
  const minVariation = avgPrice * 0.005; // 0.5% minimum pour voir les variations
  const margin = Math.max(priceRange * 0.5, minVariation); // 50% de marge pour voir les mouvements
  
  // Debug pour voir les valeurs
  console.log('Prix debug:', {
    minPrice: minPrice.toFixed(2),
    maxPrice: maxPrice.toFixed(2),
    avgPrice: avgPrice.toFixed(2),
    range: priceRange.toFixed(2),
    margin: margin.toFixed(2),
    variationPercent: ((priceRange / avgPrice) * 100).toFixed(3) + '%',
    prices: prices.slice(-5).map(p => p.toFixed(2))
  });

  // Custom tooltip pour les graphiques
  interface TooltipPayloadItem {
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload?: ChartDataPoint;
  }

  interface TooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800/95 backdrop-blur border border-gray-600 p-4 rounded-lg shadow-xl">
          <p className="text-white font-semibold text-sm mb-3 border-b border-gray-600 pb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry, index: number) => {
              if (entry.dataKey === 'volume' || entry.value === 0) return null;
              const value = entry.value as number;
              
              // Pour les bougies, affichage spécial OHLC
              if (entry.dataKey === 'close' && showCandlesticks) {
                const dataPoint = payload[0]?.payload;
                if (dataPoint) {
                  const isGreen = dataPoint.close >= dataPoint.open;
                  return (
                    <div key={index} className="space-y-1 border-t border-gray-600 pt-2 mt-2">
                      <p className="text-sm font-semibold text-gray-300 mb-2">
                        🕯️ Bougie {isGreen ? '🟢' : '🔴'}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="opacity-80">Open:</span> 
                          <span className="font-bold ml-1">${dataPoint.open.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="opacity-80">High:</span> 
                          <span className="font-bold ml-1 text-green-400">${dataPoint.high.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="opacity-80">Low:</span> 
                          <span className="font-bold ml-1 text-red-400">${dataPoint.low.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="opacity-80">Close:</span> 
                          <span className={`font-bold ml-1 ${isGreen ? 'text-green-400' : 'text-red-400'}`}>
                            ${dataPoint.close.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
              }
              
              // Affichage normal pour les autres éléments
              let displayValue = '';
              if (entry.dataKey === 'rsi') {
                displayValue = value.toFixed(2);
              } else if (showPercentage && (entry.dataKey === 'price' || entry.dataKey === 'ema50' || entry.dataKey === 'ema200')) {
                displayValue = `${value.toFixed(3)}%`;
              } else {
                displayValue = `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
              
              return (
                <p key={index} style={{ color: entry.color }} className="text-sm font-mono flex justify-between gap-4">
                  <span className="opacity-80">{entry.name}:</span>
                  <span className="font-bold">{displayValue}</span>
                </p>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Configuration des courbes pour les boutons de toggle
  const lineConfigs = [
    { key: 'price' as const, name: 'Prix BTC', color: '#3B82F6' },
    { key: 'ema50' as const, name: 'EMA 50', color: '#FFC107' },
    { key: 'ema200' as const, name: 'EMA 200', color: '#FF5722' },
    { key: 'rsi' as const, name: 'RSI (14)', color: '#FBBF24' },
    { key: 'volume' as const, name: 'Volume', color: '#06B6D4' },
  ];

  // Focus sur BTC (masquer les autres courbes pour voir uniquement le prix)
  const focusOnBTC = () => {
    setVisibleLines({
      price: true,
      ema50: false,
      ema200: false,
      rsi: false,
      volume: false
    });
  };

  // Voir toutes les courbes
  const showAllCurves = () => {
    setVisibleLines({
      price: true,
      ema50: true,
      ema200: true,
      rsi: true,
      volume: true
    });
  };

  // Préparer les données avec variation en pourcentage si activé
  const processedData = showPercentage && displayData.length > 1 ? 
    displayData.map((point) => {
      const basePrice = displayData[0].price;
      return {
        ...point,
        price: ((point.price - basePrice) / basePrice) * 100,
        ema50: point.ema50 > 0 ? ((point.ema50 - basePrice) / basePrice) * 100 : 0,
        ema200: point.ema200 > 0 ? ((point.ema200 - basePrice) / basePrice) * 100 : 0,
      };
    }) : displayData;


  return (
    <div className="bg-gray-900">
      {/* Contrôles d'affichage - Style Binance */}
      <div className="px-4 py-2 border-b border-gray-700 flex justify-between items-center">
        <div className="flex gap-1">
          <button
            onClick={focusOnBTC}
            className="px-2 py-1 text-xs bg-yellow-400 text-black rounded font-medium flex items-center gap-1"
          >
            <HiTrendingUp className="w-3 h-3" />
            BTC
          </button>
          <button
            onClick={showAllCurves}
            className="px-2 py-1 text-xs text-gray-400 hover:text-white flex items-center gap-1"
          >
            <HiEye className="w-3 h-3" />
            All
          </button>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowCandlesticks(!showCandlesticks)}
            className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 ${
              showCandlesticks 
                ? 'bg-green-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <HiChartBar className="w-3 h-3" />
            Candles
          </button>
          <button
            onClick={() => setShowPercentage(!showPercentage)}
            className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 ${
              showPercentage 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <HiTrendingDown className="w-3 h-3" />
            %
          </button>
        </div>
      </div>

      {/* Graphique principal combiné */}
      <ResponsiveContainer width="100%" height={275}>
        <ComposedChart 
          data={processedData}
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="colorRSI" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#FBBF24" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          
          {/* Axe X */}
          <XAxis 
            dataKey="time" 
            stroke="#9CA3AF"
            style={{ fontSize: '11px' }}
            tick={{ fill: '#9CA3AF' }}
          />
          
          {/* Axe Y gauche - Prix/EMAs */}
          <YAxis 
            yAxisId="left"
            stroke="#3B82F6"
            style={{ fontSize: '11px' }}
            domain={showPercentage ? undefined : [minPrice - margin, maxPrice + margin]}
            tickFormatter={(value) => 
              showPercentage 
                ? `${value.toFixed(2)}%`
                : `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
            }
            tick={{ fill: '#3B82F6' }}
            label={{ 
              value: showPercentage ? 'Variation (%)' : 'Prix (USD)', 
              angle: -90, 
              position: 'insideLeft', 
              fill: '#3B82F6', 
              style: { fontSize: '12px' } 
            }}
          />
          
          {/* Axe Y droit - RSI */}
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#FBBF24"
            style={{ fontSize: '11px' }}
            domain={[0, 100]}
            tick={{ fill: '#FBBF24' }}
            label={{ value: 'RSI', angle: 90, position: 'insideRight', fill: '#FBBF24', style: { fontSize: '12px' } }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Lignes de référence RSI */}
          {visibleLines.rsi && (
            <>
              <ReferenceLine 
                yAxisId="right"
                y={70} 
                stroke="#EF4444" 
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <ReferenceLine 
                yAxisId="right"
                y={30} 
                stroke="#10B981" 
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <ReferenceLine 
                yAxisId="right"
                y={50} 
                stroke="#6B7280" 
                strokeDasharray="2 2"
                strokeOpacity={0.3}
              />
            </>
          )}
          
          {/* Volume en arrière-plan */}
          {visibleLines.volume && (
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="volume" 
              stroke="none"
              fillOpacity={0.3}
              fill="url(#colorVolume)"
              name="Volume BTC"
              animationDuration={300}
            />
          )}
          
          {/* Prix BTC - Ligne ou Bougies */}
          {visibleLines.price && !showCandlesticks && (
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="price" 
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={false}
              name="Prix BTC"
              animationDuration={300}
              animationBegin={0}
              isAnimationActive={false}
            />
          )}
          
          {/* Bougies (Candlesticks) avec Bar personnalisées */}
          {visibleLines.price && showCandlesticks && (
            <Bar
              yAxisId="left"
              dataKey="high"
              fill="transparent"
              name="Bougies"
              barSize={Math.max(4, Math.min(12, 300 / displayData.length))} // Taille adaptative plus grande
              animationDuration={300}
            >
              {processedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="transparent" />
              ))}
            </Bar>
          )}
          
          {/* EMA 50 */}
          {visibleLines.ema50 && (
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="ema50" 
              stroke="#FFC107" 
              strokeWidth={2}
              dot={false}
              name="EMA 50"
              strokeDasharray="0" // Ligne continue pour plus de visibilité
              animationDuration={300}
              animationBegin={0}
              isAnimationActive={false}
            />
          )}
          
          {/* EMA 200 */}
          {visibleLines.ema200 && (
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="ema200" 
              stroke="#FF5722" 
              strokeWidth={2}
              dot={false}
              name="EMA 200"
              strokeDasharray="0" // Ligne continue pour plus de visibilité
              animationDuration={300}
              animationBegin={0}
              isAnimationActive={false}
            />
          )}
          
          {/* RSI */}
          {visibleLines.rsi && (
            <Area
              yAxisId="right"
              type="monotone" 
              dataKey="rsi" 
              stroke="#FBBF24" 
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRSI)"
              name="RSI (14)"
              animationDuration={300}
              animationBegin={0}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Contrôles de visibilité des courbes - Style Binance */}
      <div className="px-4 py-2 border-b border-gray-700">
        <div className="flex gap-2">
          {lineConfigs.map((config) => (
            <button
              key={config.key}
              onClick={() => toggleLine(config.key)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                visibleLines[config.key]
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {visibleLines[config.key] ? (
                <HiEye className="w-3 h-3" />
              ) : (
                <HiEyeOff className="w-3 h-3" />
              )}
              <div
                className="w-3 h-0.5"
                style={{
                  backgroundColor: config.color,
                  opacity: visibleLines[config.key] ? 1 : 0.3
                }}
              />
              <span>{config.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

