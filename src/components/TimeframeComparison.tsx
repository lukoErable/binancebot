'use client';

import { StrategyPerformance } from '@/types/trading';
import { HiArrowDown, HiArrowUp, HiClock, HiTrendingUp } from 'react-icons/hi';

interface TimeframeComparisonProps {
  strategyName: string;
  performances: StrategyPerformance[];
  onClose: () => void;
}

export default function TimeframeComparison({ strategyName, performances, onClose }: TimeframeComparisonProps) {
  // Filter performances for this strategy across all timeframes
  const strategyPerformances = performances.filter(p => p.strategyName === strategyName);

  if (strategyPerformances.length === 0) {
    return null;
  }

  // Sort by timeframe order
  const timeframeOrder = ['1m', '5m', '15m', '1h', '4h', '1d'];
  const sortedPerformances = strategyPerformances.sort((a, b) => {
    return timeframeOrder.indexOf(a.timeframe) - timeframeOrder.indexOf(b.timeframe);
  });

  // Calculate best and worst performers
  const bestPnL = Math.max(...sortedPerformances.map(p => p.totalPnL));
  const bestWinRate = Math.max(...sortedPerformances.map(p => p.winRate));

  const formatDuration = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-700" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <HiTrendingUp className="w-6 h-6" />
              Comparaison Multi-Timeframe
            </h2>
            <p className="text-sm text-gray-400 mt-1">Stratégie : {strategyName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span className="text-white text-2xl">×</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800 border-b border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Timeframe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  P&L Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Trades
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Win Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Capital
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Temps Actif
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sortedPerformances.map((perf) => {
                const isBestPnL = perf.totalPnL === bestPnL && bestPnL > 0;
                const isBestWinRate = perf.winRate === bestWinRate && bestWinRate > 0;
                
                return (
                  <tr key={perf.timeframe} className="hover:bg-gray-800/50 transition-colors">
                    {/* Timeframe */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 text-sm font-mono font-semibold rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {perf.timeframe}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          perf.isActive 
                            ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse' 
                            : 'bg-gray-500'
                        }`}></div>
                        <span className={`text-sm ${perf.isActive ? 'text-green-400' : 'text-gray-500'}`}>
                          {perf.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>

                    {/* P&L */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isBestPnL && (
                          <span className="text-yellow-400 text-xs">👑</span>
                        )}
                        <span className={`text-sm font-bold ${
                          perf.totalPnL > 0 ? 'text-green-400' : perf.totalPnL < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {perf.totalPnL >= 0 ? '+' : ''}{perf.totalPnL.toFixed(2)} USDT
                        </span>
                      </div>
                    </td>

                    {/* Trades */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm text-white font-medium">{perf.totalTrades}</span>
                    </td>

                    {/* Win Rate */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isBestWinRate && (
                          <span className="text-yellow-400 text-xs">🏆</span>
                        )}
                        <span className={`text-sm font-medium ${
                          perf.winRate >= 60 ? 'text-green-400' : perf.winRate >= 40 ? 'text-blue-400' : 'text-orange-400'
                        }`}>
                          {perf.winRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Capital */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-medium ${
                        perf.currentCapital >= 100000 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ${perf.currentCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Position */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {perf.currentPosition.type !== 'NONE' ? (
                        <div className="flex items-center justify-end gap-1">
                          {perf.currentPosition.type === 'LONG' ? (
                            <HiArrowUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <HiArrowDown className="w-4 h-4 text-red-400" />
                          )}
                          <span className={`text-xs font-semibold ${
                            perf.currentPosition.type === 'LONG' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {perf.currentPosition.type}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>

                    {/* Active Time */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {perf.totalActiveTime ? (
                        <div className="flex items-center justify-end gap-1">
                          <HiClock className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-xs text-blue-400">
                            {formatDuration(perf.totalActiveTime)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Summary Footer */}
            <tfoot className="bg-gray-800 border-t-2 border-gray-600">
              <tr className="font-semibold">
                <td className="px-6 py-4 text-sm text-gray-300" colSpan={2}>
                  Totaux / Moyennes
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`text-sm font-bold ${
                    sortedPerformances.reduce((sum, p) => sum + p.totalPnL, 0) > 0 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {sortedPerformances.reduce((sum, p) => sum + p.totalPnL, 0) >= 0 ? '+' : ''}
                    {sortedPerformances.reduce((sum, p) => sum + p.totalPnL, 0).toFixed(2)} USDT
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm text-white">
                    {sortedPerformances.reduce((sum, p) => sum + p.totalTrades, 0)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm text-blue-400">
                    {(sortedPerformances.reduce((sum, p) => sum + p.winRate, 0) / sortedPerformances.length).toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 text-right" colSpan={3}>
                  <span className="text-xs text-gray-400">
                    {sortedPerformances.filter(p => p.isActive).length} active sur {sortedPerformances.length} timeframes
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legend */}
        <div className="bg-gray-800 px-6 py-3 border-t border-gray-700 flex items-center gap-6 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">👑</span>
            <span>Meilleur P&L</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">🏆</span>
            <span>Meilleur Win Rate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>Stratégie active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

