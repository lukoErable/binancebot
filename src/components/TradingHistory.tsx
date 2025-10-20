import { StrategyPerformance } from '@/types/trading';
import React, { useMemo, useState } from 'react';
import { HiChartBar, HiClock, HiCurrencyDollar, HiLightningBolt, HiTrendingUp } from 'react-icons/hi';

interface TradingHistoryProps {
  strategyPerformances: StrategyPerformance[];
  selectedStrategy: string;
  currentStrategy?: StrategyPerformance;
  getStrategyColor: (strategyType: string, customColor?: string) => { border: string; text: string; accent: string; bgSelected: string };
}

interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  avgDuration: number;
}

const TradingHistory: React.FC<TradingHistoryProps> = ({ strategyPerformances, selectedStrategy, currentStrategy, getStrategyColor }) => {
  const [flippedTrades, setFlippedTrades] = useState<Set<number>>(new Set());

  // Toggle trade flip
  const toggleTradeFlip = (tradeIndex: number) => {
    setFlippedTrades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tradeIndex)) {
        newSet.delete(tradeIndex);
      } else {
        newSet.add(tradeIndex);
      }
      return newSet;
    });
  };

  // Active positions now displayed in Dashboard

  // Get completed trades
  const completedTrades = useMemo(() => {
    let trades: any[] = [];
    
    if (selectedStrategy === 'GLOBAL') {
      strategyPerformances.forEach(perf => {
        if (perf.completedTrades) {
          trades = [...trades, ...perf.completedTrades.map(t => ({ 
            ...t, 
            strategyName: perf.strategyName,
            customColor: perf.customConfig?.color
          }))];
        }
      });
    } else {
      const strategy = strategyPerformances.find(p => p.strategyName === selectedStrategy);
      trades = strategy?.completedTrades || [];
    }
    
    return trades.sort((a, b) => b.exitTime - a.exitTime); // Most recent first
  }, [strategyPerformances, selectedStrategy]);

  // Calculate statistics
  const stats: TradeStats = useMemo(() => {
    const trades = completedTrades;
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnL: 0,
        avgWin: 0,
        avgLoss: 0,
        bestTrade: 0,
        worstTrade: 0,
        avgDuration: 0
      };
    }

    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0;
    const bestTrade = Math.max(...trades.map(t => t.pnl));
    const worstTrade = Math.min(...trades.map(t => t.pnl));
    const avgDuration = trades.reduce((sum, t) => sum + t.duration, 0) / trades.length;

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / trades.length) * 100,
      totalPnL,
      avgWin,
      avgLoss,
      bestTrade,
      worstTrade,
      avgDuration
    };
  }, [completedTrades]);

  const formatPrice = (price: number) => {
    if (!price || isNaN(price)) return '0.00';
    return price.toFixed(2);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="bg-gray-800 border-t border-gray-700">
      {/* Trading History - Unified View */}
      <div className="border-t border-gray-700 mt-3">
        {/* Header */}
        <div className="px-6 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <HiChartBar className="w-5 h-5 text-gray-300" />
            <h3 className="text-lg font-bold text-white">Trading Performance</h3>
            <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded">
              {stats.totalTrades} trades
            </span>
          </div>
        </div>

        <div className="p-6">
          {/* Statistics Cards - Enhanced */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Win Rate */}
            <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-600/20 rounded-xl p-4 hover:border-green-500/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-green-400/80 uppercase tracking-wide">Win Rate</span>
                <div className="p-1.5 bg-green-500/10 rounded-lg">
                  <HiTrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                </div>
              <div className="text-2xl font-bold text-white mb-1">{stats.winRate.toFixed(1)}%</div>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stats.winRate, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 font-mono">{stats.winningTrades}/{stats.totalTrades}</span>
                </div>
              </div>

            {/* Total P&L */}
            <div className={`bg-gradient-to-br ${
              stats.totalPnL >= 0 
                ? 'from-blue-900/20 to-blue-800/10 border-blue-600/20 hover:border-blue-500/40' 
                : 'from-red-900/20 to-red-800/10 border-red-600/20 hover:border-red-500/40'
            } border rounded-xl p-4 transition-all`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium uppercase tracking-wide ${
                  stats.totalPnL >= 0 ? 'text-blue-400/80' : 'text-red-400/80'
                }`}>Total P&L</span>
                <div className={`p-1.5 rounded-lg ${
                  stats.totalPnL >= 0 ? 'bg-blue-500/10' : 'bg-red-500/10'
                }`}>
                  <HiCurrencyDollar className={`w-4 h-4 ${
                    stats.totalPnL >= 0 ? 'text-blue-400' : 'text-red-400'
                  }`} />
                </div>
              </div>
              <div className={`text-2xl font-bold mb-1 ${
                stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {stats.totalPnL >= 0 ? '+' : ''}{formatPrice(stats.totalPnL)}
              </div>
              <div className="text-[10px] text-gray-400 font-medium">USDT · All time</div>
            </div>
            
            {/* Best Trade */}
            <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border border-yellow-600/20 rounded-xl p-4 hover:border-yellow-500/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-yellow-400/80 uppercase tracking-wide">Best Trade</span>
                <div className="p-1.5 bg-yellow-500/10 rounded-lg">
                  <HiLightningBolt className="w-4 h-4 text-yellow-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-green-400 mb-1">
                +{formatPrice(stats.bestTrade)}
              </div>
              <div className="text-[10px] text-gray-400 font-medium">USDT · Highest profit</div>
              </div>
              
            {/* Avg Duration */}
            <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-600/20 rounded-xl p-4 hover:border-purple-500/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-purple-400/80 uppercase tracking-wide">Avg Time</span>
                <div className="p-1.5 bg-purple-500/10 rounded-lg">
                  <HiClock className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{formatDuration(stats.avgDuration)}</div>
              <div className="text-[10px] text-gray-400 font-medium">Per trade average</div>
            </div>
          </div>

          {/* Trades List Header */}
          <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gray-700/50 rounded-lg">
                <HiTrendingUp className="w-4 h-4 text-gray-400" />
                    </div>
              <h4 className="text-sm font-semibold text-white">Recent Trades</h4>
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-md font-medium">
                {completedTrades.length}
                    </span>
                  </div>
            {completedTrades.length > 0 && (
              <div className="text-xs text-gray-500">
                Click to see entry/exit details
            </div>
          )}
          </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {completedTrades.map((trade, index) => {
                const isWin = trade.pnl > 0;
                const duration = formatDuration(trade.duration);
                
                const isFlipped = flippedTrades.has(index);
                
                return (
                  <div 
                    key={index} 
                    id={`trade-${trade.exitTime}`}
                    className={`rounded-lg p-3 border cursor-pointer transition-all hover:border-opacity-50 ${
                      isWin 
                        ? 'bg-green-900/10 border-green-500/20' 
                        : 'bg-red-900/10 border-red-500/20'
                    }`}
                    onClick={() => toggleTradeFlip(index)}
                  >
                    {!isFlipped ? (
                      // Front - Compact single line
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {/* Position Type */}
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            trade.type === 'LONG' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                            {trade.type}
                          </span>
                          
                          {/* Entry → Exit */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-mono text-xs">${formatPrice(trade.entryPrice)}</span>
                            <span className="text-gray-500 text-xs">→</span>
                            <span className="text-white font-mono text-xs">${formatPrice(trade.exitPrice)}</span>
                          </div>
                          
                          {/* Duration */}
                          <div className="flex items-center gap-1 text-gray-400">
                            <HiClock className="w-3 h-3" />
                            <span className="text-xs">{duration}</span>
                          </div>
                          
                          {/* Win/Loss Badge */}
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                            isWin 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {isWin ? 'WIN' : 'LOSS'}
                          </span>
                          
                          {/* P&L */}
                          <div className={`font-bold text-xs ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                            {trade.pnl >= 0 ? '+' : ''}{formatPrice(trade.pnl)} USDT
                            <span className={`text-xs ml-1 ${isWin ? 'text-green-400/70' : 'text-red-400/70'}`}>
                              ({trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                        
                        {/* Timestamp */}
                        <div className="flex items-center gap-2 text-gray-500 text-xs">
                          {selectedStrategy === 'GLOBAL' && trade.strategyType && (() => {
                            const colors = getStrategyColor(trade.strategyType, trade.customColor);
                            // Map strategy type to bg color
                            const bgColorMap: Record<string, string> = {
                              'RSI_EMA': 'bg-blue-500/20',
                              'MOMENTUM_CROSSOVER': 'bg-purple-500/20',
                              'VOLUME_MACD': 'bg-orange-500/20',
                              'NEURAL_SCALPER': 'bg-pink-500/20',
                              'BOLLINGER_BOUNCE': 'bg-teal-500/20',
                              'TREND_FOLLOWER': 'bg-cyan-500/20',
                              'CUSTOM': colors.text.includes('emerald') ? 'bg-emerald-500/20' :
                                        colors.text.includes('rose') ? 'bg-rose-500/20' :
                                        colors.text.includes('indigo') ? 'bg-indigo-500/20' :
                                        colors.text.includes('violet') ? 'bg-violet-500/20' :
                                        colors.text.includes('amber') ? 'bg-amber-500/20' :
                                        colors.text.includes('lime') ? 'bg-lime-500/20' :
                                        colors.text.includes('sky') ? 'bg-sky-500/20' :
                                        colors.text.includes('fuchsia') ? 'bg-fuchsia-500/20' :
                                        colors.text.includes('pink') ? 'bg-pink-500/20' :
                                        colors.text.includes('red') ? 'bg-red-500/20' :
                                        colors.text.includes('green') ? 'bg-green-500/20' :
                                        colors.text.includes('slate') ? 'bg-slate-500/20' :
                                        colors.text.includes('stone') ? 'bg-stone-500/20' :
                                        'bg-gray-500/20'
                            };
                            const bgColor = bgColorMap[trade.strategyType] || 'bg-gray-500/20';
                            
                            return (
                              <span className={`text-[10px] ${colors.text} ${bgColor} px-1.5 py-0.5 rounded font-medium`}>
                                {trade.strategyName}
                              </span>
                            );
                          })()}
                          <span>{formatTime(trade.exitTime)}</span>
                        </div>
                      </div>
                    ) : (
                      // Back - Entry/Exit reasons on one line
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 flex-1">
                          {/* Entry */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-green-400 font-semibold">📥</span>
                            <span className="text-gray-300 truncate max-w-xs">{trade.entryReason}</span>
                          </div>
                          
                          <span className="text-gray-600">|</span>
                          
                          {/* Exit */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-red-400 font-semibold">📤</span>
                            <span className="text-gray-300 truncate max-w-xs">{trade.exitReason}</span>
                          </div>
                        </div>
                        
                        {/* Timestamp */}
                        <span className="text-gray-500 text-xs ml-3">{formatTime(trade.exitTime)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default TradingHistory;
