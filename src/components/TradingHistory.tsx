import { StrategyPerformance } from '@/types/trading';
import React, { useMemo, useState } from 'react';
import { HiChartBar, HiClock, HiCurrencyDollar, HiLightningBolt, HiTrendingUp } from 'react-icons/hi';

interface TradingHistoryProps {
  strategyPerformances: StrategyPerformance[];
  selectedStrategy: string;
  currentStrategy?: StrategyPerformance;
  getStrategyColor: (strategyType: string) => { border: string; text: string; accent: string; bgSelected: string };
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
  const [activeTab, setActiveTab] = useState<'statistics' | 'signals' | 'trades'>('statistics');
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

  // Get all active positions
  const activePositions = useMemo(() => {
    if (selectedStrategy === 'GLOBAL') {
      // Get all active positions across all strategies
      return strategyPerformances
        .filter(perf => perf.currentPosition && perf.currentPosition.type !== 'NONE')
        .map(perf => ({ 
          ...perf.currentPosition, 
          strategyName: perf.strategyName,
          strategyType: perf.strategyType
        }));
    } else {
      // Get only the selected strategy's position
      const strategy = strategyPerformances.find(p => p.strategyName === selectedStrategy);
      if (strategy?.currentPosition && strategy.currentPosition.type !== 'NONE') {
        return [{ 
          ...strategy.currentPosition, 
          strategyName: strategy.strategyName,
          strategyType: strategy.strategyType
        }];
      }
      return [];
    }
  }, [strategyPerformances, selectedStrategy]);

  // Get all signals
  const allSignals = useMemo(() => {
    let signals: any[] = [];
    
    if (selectedStrategy === 'GLOBAL') {
      strategyPerformances.forEach(perf => {
        if (perf.signalHistory) {
          signals = [...signals, ...perf.signalHistory.map(s => ({ 
            ...s, 
            strategyName: perf.strategyName,
            strategyType: perf.strategyType 
          }))];
        }
      });
    } else {
      const strategy = strategyPerformances.find(p => p.strategyName === selectedStrategy);
      if (strategy?.signalHistory) {
        signals = strategy.signalHistory.map(s => ({ 
          ...s, 
          strategyName: strategy.strategyName,
          strategyType: strategy.strategyType 
        }));
      }
    }
    
    return signals.sort((a, b) => b.timestamp - a.timestamp); // Most recent first
  }, [strategyPerformances, selectedStrategy]);

  // Get completed trades
  const completedTrades = useMemo(() => {
    let trades: any[] = [];
    
    if (selectedStrategy === 'GLOBAL') {
      strategyPerformances.forEach(perf => {
        if (perf.completedTrades) {
          trades = [...trades, ...perf.completedTrades.map(t => ({ ...t, strategyName: perf.strategyName }))];
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

  const getSignalColor = (type: string) => {
    switch (type) {
      case 'BUY': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'SELL': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'CLOSE_LONG': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'CLOSE_SHORT': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="bg-gray-800 border-t border-gray-700">
      {/* Trading History Tabs */}
      <div className="border-t border-gray-700 mt-3">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('statistics')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer select-none ${
              activeTab === 'statistics'
                ? 'bg-gray-700 text-white border-b-2 border-gray-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <HiChartBar className="w-4 h-4 pointer-events-none" />
            <span className="pointer-events-none">Statistics</span>
            <span className="text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded pointer-events-none">
              {stats.totalTrades}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('signals')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer select-none ${
              activeTab === 'signals'
                ? 'bg-gray-700 text-white border-b-2 border-gray-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <HiLightningBolt className="w-4 h-4 pointer-events-none" />
            <span className="pointer-events-none">Signals</span>
            <span className="text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded pointer-events-none">
              {allSignals.length}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('trades')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer select-none ${
              activeTab === 'trades'
                ? 'bg-gray-700 text-white border-b-2 border-gray-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <HiTrendingUp className="w-4 h-4 pointer-events-none" />
            <span className="pointer-events-none">Trades</span>
            <span className="text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded pointer-events-none">
              {completedTrades.length}
            </span>
          </button>
        </div>

        {/* Active Positions - Below tabs, above content */}
        {activePositions.length > 0 && (
          <div className="bg-gray-800/80 border-b border-gray-600/50 px-6 py-4 space-y-3">
            {activePositions.map((currentPosition, idx) => {
              const strategyPerf = strategyPerformances.find(p => p.strategyName === currentPosition.strategyName);
              const colors = currentPosition.strategyType ? getStrategyColor(currentPosition.strategyType) : { text: 'text-gray-400' };
              
              return (
                <div key={idx} className={idx > 0 ? 'pt-3 border-t border-gray-700/50' : ''}>
            <div className="flex items-center justify-between">
              {/* Left Group - Status & Strategy */}
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <h3 className="text-lg font-bold text-white">POSITION ACTIVE</h3>
                <span className={`text-sm font-semibold ${colors.text}`}>- {currentPosition.strategyName}</span>
              </div>

              {/* Center Group - Position Details */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xs text-gray-400">Type</div>
                  <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                    currentPosition.type === 'LONG' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {currentPosition.type}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400">Entry Price</div>
                  <div className="text-white font-mono font-bold">${formatPrice(currentPosition.entryPrice)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400">Duration</div>
                  <div className="text-white font-mono">
                    {formatDuration(Date.now() - currentPosition.entryTime)}
                  </div>
                </div>
              </div>

              {/* Right Group - P&L & Targets */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xs text-gray-400">Unrealized P&L</div>
                  <div className={`font-bold ${
                    currentPosition.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {currentPosition.unrealizedPnL >= 0 ? '+' : ''}{formatPrice(currentPosition.unrealizedPnL)} USDT
                    <span className={`text-xs ml-2 ${
                      currentPosition.unrealizedPnLPercent >= 0 ? 'text-green-400/70' : 'text-red-400/70'
                    }`}>
                      ({currentPosition.unrealizedPnLPercent >= 0 ? '+' : ''}{currentPosition.unrealizedPnLPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
              {strategyPerf?.config && (
                  <>
                    <div className="text-center">
                      <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                        Take Profit
                        <span className="text-green-400/70">
                          (+{strategyPerf.config.profitTargetPercent || 0}%)
                        </span>
                      </div>
                      <div className="text-green-400 font-mono font-bold">
                        ${formatPrice(currentPosition.entryPrice * (1 + (strategyPerf.config.profitTargetPercent || 0) / 100))}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                        Stop Loss
                        <span className="text-red-400/70">
                          (-{strategyPerf.config.stopLossPercent || 0}%)
                        </span>
                      </div>
                      <div className="text-red-400 font-mono font-bold">
                        ${formatPrice(currentPosition.entryPrice * (1 - (strategyPerf.config.stopLossPercent || 0) / 100))}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400">Time Left</div>
                      <div className="text-orange-400 font-mono font-bold">
                        {strategyPerf?.config && strategyPerf.config.maxPositionTime ? 
                          formatDuration(Math.max(0, (strategyPerf.config.maxPositionTime * 60000) - (Date.now() - currentPosition.entryTime))) :
                          '∞'
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
              );
            })}
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'statistics' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <HiTrendingUp className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs text-gray-400">Win Rate</span>
                </div>
                <div className="text-lg font-bold text-white">{stats.winRate.toFixed(1)}%</div>
                <div className="text-[10px] text-gray-500">{stats.winningTrades}/{stats.totalTrades} trades</div>
              </div>
              
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <HiCurrencyDollar className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-gray-400">Total P&L</span>
                </div>
                <div className={`text-lg font-bold ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.totalPnL >= 0 ? '+' : ''}{formatPrice(stats.totalPnL)} USDT
                </div>
                <div className="text-[10px] text-gray-500">All time</div>
              </div>
              
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <HiLightningBolt className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs text-gray-400">Best Trade</span>
                </div>
                <div className="text-lg font-bold text-green-400">+{formatPrice(stats.bestTrade)}</div>
                <div className="text-[10px] text-gray-500">USDT</div>
              </div>
              
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <HiClock className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs text-gray-400">Avg Duration</span>
                </div>
                <div className="text-lg font-bold text-white">{formatDuration(stats.avgDuration)}</div>
                <div className="text-[10px] text-gray-500">Per trade</div>
              </div>
            </div>
          )}

          {activeTab === 'signals' && (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {allSignals.map((signal, index) => (
                <div key={index} className="bg-gray-700/30 rounded-lg p-2 border border-gray-600/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getSignalColor(signal.type)}`}>
                        {signal.type}
                      </span>
                      <span className="text-white font-mono font-semibold text-sm">${formatPrice(signal.price)}</span>
                      <span className="text-gray-400 text-xs">{formatTime(signal.timestamp)}</span>
                      {signal.strategyType && (() => {
                        const colors = getStrategyColor(signal.strategyType);
                        return (
                          <>
                            <span className="text-gray-600 text-xs">/</span>
                            <span className={`text-xs ${colors.text} font-medium`}>
                              {signal.strategyName}
                            </span>
                            <span className="text-gray-600 text-xs">/</span>
                          </>
                        );
                      })()}
                    </div>
                    <span className="text-gray-400 text-xs max-w-md truncate">
                      {signal.reason}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'trades' && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {completedTrades.map((trade, index) => {
                const isWin = trade.pnl > 0;
                const duration = formatDuration(trade.duration);
                
                const isFlipped = flippedTrades.has(index);
                
                return (
                  <div 
                    key={index} 
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
                            const colors = getStrategyColor(trade.strategyType);
                            // Map strategy type to bg color
                            const bgColorMap: Record<string, string> = {
                              'RSI_EMA': 'bg-blue-500/20',
                              'MOMENTUM_CROSSOVER': 'bg-purple-500/20',
                              'VOLUME_MACD': 'bg-orange-500/20',
                              'NEURAL_SCALPER': 'bg-pink-500/20',
                              'BOLLINGER_BOUNCE': 'bg-teal-500/20',
                              'TREND_FOLLOWER': 'bg-cyan-500/20'
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
          )}
        </div>
      </div>
    </div>
  );
};

export default TradingHistory;
