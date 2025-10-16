'use client';

import { StrategyPerformance } from '@/types/trading';
import { useState } from 'react';
import { HiViewBoards, HiViewGrid, HiViewList } from 'react-icons/hi';

interface StrategyPanelProps {
  performances: StrategyPerformance[];
  onToggleStrategy?: (strategyName: string) => void;
  selectedStrategy?: string;
  onSelectStrategy?: (strategyName: string) => void;
  getCriteriaForStrategy?: (strategyType: 'RSI_EMA' | 'MOMENTUM_CROSSOVER' | 'VOLUME_MACD' | 'NEURAL_SCALPER' | 'BOLLINGER_BOUNCE', strategyMetrics: StrategyPerformance) => { strategyType: string; long: Record<string, string | boolean>; short: Record<string, string | boolean>; cooldownRemaining: number; longReady?: boolean; shortReady?: boolean } | null;
  getStatusesArray?: (criteria: { strategyType: string; long: Record<string, string | boolean>; short: Record<string, string | boolean>; cooldownRemaining: number }, type: 'long' | 'short') => string[];
  renderCriteriaLabels?: (criteria: { strategyType: string; long: Record<string, string | boolean>; short: Record<string, string | boolean>; cooldownRemaining: number }, type: 'long' | 'short') => React.ReactNode;
}

export default function StrategyPanel({ 
  performances, 
  onToggleStrategy, 
  selectedStrategy, 
  onSelectStrategy,
  getCriteriaForStrategy,
  getStatusesArray,
  renderCriteriaLabels
}: StrategyPanelProps) {
  const [viewMode, setViewMode] = useState<'compact' | 'normal' | 'detailed'>('normal');
  const [resetConfirm, setResetConfirm] = useState<string | null>(null); // Strategy name to reset

  const handleResetStrategy = async (strategyName: string) => {
    try {
      const response = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'resetStrategy',
          strategyName 
        })
      });

      if (response.ok) {
        console.log(`✅ Strategy "${strategyName}" reset successfully`);
        setResetConfirm(null);
        // Reload page to refresh data
        window.location.reload();
      } else {
        console.error('Failed to reset strategy');
      }
    } catch (error) {
      console.error('Error resetting strategy:', error);
    }
  };

  // Get strategy parameters (SL/TP based on strategy type)
  const getStrategyParams = (strategyType: string) => {
    switch (strategyType) {
      case 'RSI_EMA':
        return { profitTarget: 2.5, stopLoss: 1.5, maxPositionTime: 60, cooldown: 300 };
      case 'MOMENTUM_CROSSOVER':
        return { profitTarget: 2.0, stopLoss: 1.0, maxPositionTime: 30, cooldown: 180 };
      case 'VOLUME_MACD':
        return { profitTarget: 2.0, stopLoss: 1.0, maxPositionTime: 45, cooldown: 180 };
      case 'NEURAL_SCALPER':
        return { profitTarget: 1.5, stopLoss: 0.8, maxPositionTime: 2, cooldown: 0.5 };
      case 'BOLLINGER_BOUNCE':
        return { profitTarget: 1.8, stopLoss: 2.0, maxPositionTime: 120, cooldown: 0 };
      default:
        return { profitTarget: 2.0, stopLoss: 1.0, maxPositionTime: 60, cooldown: 300 };
    }
  };

  // Strategy color mapping
  const getStrategyColor = (strategyType: string) => {
    switch (strategyType) {
      case 'RSI_EMA':
        return {
          border: 'border-blue-400',
          text: 'text-blue-400',
          accent: 'bg-blue-400'
        };
      case 'MOMENTUM_CROSSOVER':
        return {
          border: 'border-purple-400',
          text: 'text-purple-400',
          accent: 'bg-purple-400'
        };
      case 'VOLUME_MACD':
        return {
          border: 'border-orange-400',
          text: 'text-orange-400',
          accent: 'bg-orange-400'
        };
      case 'NEURAL_SCALPER':
        return {
          border: 'border-pink-400',
          text: 'text-pink-400',
          accent: 'bg-pink-400'
        };
      case 'BOLLINGER_BOUNCE':
        return {
          border: 'border-teal-400',
          text: 'text-teal-400',
          accent: 'bg-teal-400'
        };
      default:
        return {
          border: 'border-gray-400',
          text: 'text-gray-400',
          accent: 'bg-gray-400'
        };
    }
  };


  if (performances.length === 0) {
    return null;
  }

  // Find best strategy
  const bestStrategy = performances.reduce((best, current) => 
    current.totalPnL > best.totalPnL ? current : best
  );

  return (
    <div className="bg-gray-800 border-b border-gray-700">
      {/* View Mode Toggle */}
      <div className="px-4 py-2 flex items-center justify-between">
        {/* Best Strategy Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-lg">
          <span className="text-yellow-400 text-lg">🏆</span>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-yellow-400">{bestStrategy?.strategyName || 'N/A'}</span>
          </div>
          <div className="ml-2 px-2 py-0.5 bg-yellow-500/20 rounded text-xs font-bold text-yellow-300">
            {bestStrategy ? `+${bestStrategy.totalPnL.toFixed(2)} USDT` : '0.00'}
          </div>
        </div>

        {/* View Mode Buttons */}
        <div className="flex gap-1 p-1 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <button
            onClick={() => setViewMode('compact')}
            className={`p-2 rounded-md transition-all duration-200 ${
              viewMode === 'compact' 
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
            title="Mode compact - Informations essentielles"
          >
            <HiViewGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('normal')}
            className={`p-2 rounded-md transition-all duration-200 ${
              viewMode === 'normal' 
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
            title="Mode normal - Vue équilibrée"
          >
            <HiViewList className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`p-2 rounded-md transition-all duration-200 ${
              viewMode === 'detailed' 
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
            title="Mode détaillé - Toutes les informations"
          >
            <HiViewBoards className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Strategy Cards */}
      <div className={`px-4 pb-4 grid gap-4 ${
        viewMode === 'compact' 
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' 
          : viewMode === 'detailed'
          ? 'grid-cols-1 lg:grid-cols-2'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {performances.map((perf) => {
          const colors = getStrategyColor(perf.strategyType);
          
          // Get criteria for this strategy
          const strategyCriteria = getCriteriaForStrategy?.(perf.strategyType, perf);
          const longStatuses = strategyCriteria && getStatusesArray ? getStatusesArray(strategyCriteria, 'long') : [];
          const shortStatuses = strategyCriteria && getStatusesArray ? getStatusesArray(strategyCriteria, 'short') : [];
          const longReady = longStatuses.length > 0 && longStatuses.every(status => status === 'green');
          const shortReady = shortStatuses.length > 0 && shortStatuses.every(status => status === 'green');
          
          return (
            <div
              key={perf.strategyName}
              onClick={() => {
                // Toggle: if already selected, go back to GLOBAL
                if (selectedStrategy === perf.strategyName) {
                  onSelectStrategy?.('GLOBAL');
                } else {
                  onSelectStrategy?.(perf.strategyName);
                }
              }}
              className={`bg-gray-900 rounded-lg p-3 border-2 transition-all cursor-pointer ${
                perf.isActive 
                  ? colors.border
                  : 'border-gray-700 opacity-60'
              } ${
                perf.strategyName === bestStrategy.strategyName && perf.totalPnL > 0
                  ? 'ring-2 ring-yellow-400'
                  : ''
              }`}
              title={selectedStrategy === perf.strategyName ? 'Cliquer pour retourner à la vue globale' : 'Cliquer pour voir les détails de cette stratégie'}
            >
              {viewMode === 'compact' ? (
                // COMPACT MODE
                <>
                  {/* Header: Name + Status Points + Toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className={`text-sm font-semibold ${colors.text}`}>{perf.strategyName}</h3>
                      {perf.strategyName === bestStrategy.strategyName && perf.totalPnL > 0 && (
                        <span className="text-yellow-400 text-xs">👑 Best</span>
                      )}
                    </div>
                    
                    {/* Status Points (Compact Mode) */}
                    <div className="flex items-center gap-2">
                      {/* LONG Status Points */}
                      <div className="flex gap-1">
                        {longStatuses.map((status, idx) => (
                          <span key={`long-${idx}`} className={`w-2 h-2 rounded-full ${
                            longReady 
                              ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse' 
                              : status === 'green' ? 'bg-green-500/70' : 
                                status === 'orange' ? 'bg-orange-400/60' : 
                                'bg-gray-500/30'
                          }`}></span>
                        ))}
                      </div>
                      
                      {/* Separator */}
                      <div className="h-3 w-px bg-gray-600"></div>
                      
                      {/* SHORT Status Points */}
                      <div className="flex gap-1">
                        {shortStatuses.map((status, idx) => (
                          <span key={`short-${idx}`} className={`w-2 h-2 rounded-full ${
                            shortReady 
                              ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse' 
                              : status === 'green' ? 'bg-green-500/70' : 
                                status === 'orange' ? 'bg-orange-400/60' : 
                                'bg-gray-500/30'
                          }`}></span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Toggle Switch */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStrategy?.(perf.strategyName);
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        perf.isActive ? 'bg-gray-700' : 'bg-gray-600'
                      }`}
                      title={perf.isActive ? 'Désactiver la stratégie' : 'Activer la stratégie'}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full transition-transform ${
                        perf.isActive ? 'translate-x-5' : 'translate-x-1'
                      } ${
                        perf.isActive ? colors.accent : 'bg-gray-400'
                      }`} />
                    </button>
                  </div>

                  {/* Capital */}
                  <div className="mb-2">
                    <span className={`text-lg font-bold ${
                      perf.currentCapital >= 100000 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${perf.currentCapital.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  {/* Total P&L */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Total P&L:</span>
                    <span className={`text-sm font-bold ${
                      perf.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {perf.totalPnL >= 0 ? '+' : ''}{perf.totalPnL.toFixed(2)} USDT
                    </span>
                  </div>

                  {/* Unrealized P&L - Only if in position */}
                  {perf.currentPosition.type !== 'NONE' && (
                    <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                      <span className="text-xs text-gray-400">Unrealized:</span>
                      <span className={`text-xs font-bold ${
                        perf.currentPosition.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {perf.currentPosition.unrealizedPnL >= 0 ? '+' : ''}{perf.currentPosition.unrealizedPnL.toFixed(2)} USDT
                        <span className="text-[10px] ml-1">
                          ({perf.currentPosition.unrealizedPnLPercent >= 0 ? '+' : ''}{perf.currentPosition.unrealizedPnLPercent.toFixed(2)}%)
                        </span>
                      </span>
                    </div>
                  )}
                </>
              ) : viewMode === 'normal' ? (
                // NORMAL MODE (ancien mode détaillé)
                <>
                  {/* Capital + Toggle Switch */}
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`text-sm font-bold ${
                      perf.currentCapital >= 100000 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${perf.currentCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    
                    {/* Toggle Switch */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStrategy?.(perf.strategyName);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        perf.isActive ? 'bg-gray-700' : 'bg-gray-600'
                      }`}
                      title={perf.isActive ? 'Désactiver la stratégie' : 'Activer la stratégie'}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                        perf.isActive ? 'translate-x-6' : 'translate-x-1'
                      } ${
                        perf.isActive ? colors.accent : 'bg-gray-400'
                      }`} />
                    </button>
                  </div>
                  
                  {/* Strategy Header */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-base font-semibold ${colors.text}`}>{perf.strategyName}</h3>
                      {perf.strategyName === bestStrategy.strategyName && perf.totalPnL > 0 && (
                        <span className="text-yellow-400 text-sm">👑</span>
                      )}
                      {selectedStrategy === perf.strategyName && (
                        <span className="text-blue-400 text-sm">👁️</span>
                      )}
                    </div>
                  </div>

                  {/* Detailed Criteria with status points on the right */}
                  {strategyCriteria && renderCriteriaLabels && (
                    <div className="mb-3 pb-3 border-b border-gray-700/50">
                      <div className="flex flex-col gap-2 text-xs">
                        {/* LONG Criteria with status points */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xl ${longReady ? 'text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'text-green-400/40'}`}>🟢</span>
                            {renderCriteriaLabels(strategyCriteria, 'long')}
                          </div>
                          {/* Status points for LONG - on the right */}
                          <div className="flex gap-1">
                            {longStatuses.map((status, idx) => (
                              <span key={`long-${idx}`} className={`w-2 h-2 rounded-full ${
                                longReady 
                                  ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse' 
                                  : status === 'green' ? 'bg-green-500/70' : 
                                    status === 'orange' ? 'bg-orange-400/60' : 
                                    'bg-gray-500/30'
                              }`}></span>
                            ))}
                          </div>
                        </div>
                        {/* SHORT Criteria with status points */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xl ${shortReady ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-red-400/40'}`}>🔴</span>
                            {renderCriteriaLabels(strategyCriteria, 'short')}
                          </div>
                          {/* Status points for SHORT - on the right */}
                          <div className="flex gap-1">
                            {shortStatuses.map((status, idx) => (
                              <span key={`short-${idx}`} className={`w-2 h-2 rounded-full ${
                                shortReady 
                                  ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse' 
                                  : status === 'green' ? 'bg-green-500/70' : 
                                    status === 'orange' ? 'bg-orange-400/60' : 
                                    'bg-gray-500/30'
                              }`}></span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Performance Metrics */}
                  <div className="space-y-1.5">
                    {/* Total PnL */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Total P&L:</span>
                      <span className={`text-sm font-bold ${
                        perf.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {perf.totalPnL >= 0 ? '+' : ''}{perf.totalPnL.toFixed(2)} USDT
                      </span>
                    </div>

                    {/* Win Rate */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Win Rate:</span>
                      <span className={`text-sm font-semibold ${
                        perf.winRate >= 50 ? 'text-green-400' : 'text-orange-400'
                      }`}>
                        {perf.winRate.toFixed(1)}%
                      </span>
                    </div>

                    {/* Trades */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Trades:</span>
                      <span className="text-sm text-white">
                        {perf.winningTrades}/{perf.totalTrades}
                      </span>
                    </div>

                    {/* Current Position */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Position:</span>
                      <span className={`text-sm font-semibold ${
                        perf.currentPosition.type === 'LONG' ? 'text-green-400' :
                        perf.currentPosition.type === 'SHORT' ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {perf.currentPosition.type}
                      </span>
                    </div>

                    {/* Unrealized P&L if in position */}
                    {perf.currentPosition.type !== 'NONE' && (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                        <span className="text-xs text-gray-400">Unrealized:</span>
                        <span className={`text-xs font-semibold ${
                          perf.currentPosition.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {perf.currentPosition.unrealizedPnL >= 0 ? '+' : ''}
                          {perf.currentPosition.unrealizedPnL.toFixed(2)} USDT
                          ({perf.currentPosition.unrealizedPnLPercent.toFixed(2)}%)
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // DETAILED MODE - Toutes les informations (2 colonnes)
                <>
                  {/* Header avec Toggle + Reset */}
                  <div className="mb-3 flex items-center justify-between border-b border-gray-700 pb-2">
                    <div className="flex items-center gap-2">
                      <h2 className={`text-base font-bold ${colors.text}`}>{perf.strategyName}</h2>
                      {perf.strategyName === bestStrategy.strategyName && perf.totalPnL > 0 && (
                        <span className="text-yellow-400 text-xs">👑</span>
                      )}
                      {selectedStrategy === perf.strategyName && (
                        <span className="text-blue-400 text-xs">👁️</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Reset Button with Confirmation */}
                      {resetConfirm === perf.strategyName ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-orange-400 mr-1">Confirmer?</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResetStrategy(perf.strategyName);
                            }}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                            title="Confirmer la réinitialisation"
                          >
                            ✓ Oui
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setResetConfirm(null);
                            }}
                            className="px-2 py-0.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors"
                            title="Annuler"
                          >
                            ✗ Non
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setResetConfirm(perf.strategyName);
                          }}
                          className="px-2 py-0.5 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 border border-orange-500/50 rounded text-xs font-medium transition-colors"
                          title="Réinitialiser cette stratégie (supprime toutes les données)"
                        >
                          🔄 Reset
                        </button>
                      )}
                      
                      {/* Toggle Switch */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStrategy?.(perf.strategyName);
                        }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          perf.isActive ? 'bg-gray-700' : 'bg-gray-600'
                        }`}
                        title={perf.isActive ? 'Désactiver la stratégie' : 'Activer la stratégie'}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full transition-transform ${
                          perf.isActive ? 'translate-x-5' : 'translate-x-1'
                        } ${
                          perf.isActive ? colors.accent : 'bg-gray-400'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Capital & Performance - Compact */}
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    <div className="bg-gray-800 p-2 rounded">
                      <div className="text-[10px] text-gray-400 mb-0.5">Capital</div>
                      <div className={`text-sm font-bold ${
                        perf.currentCapital >= 100000 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ${(perf.currentCapital / 1000).toFixed(1)}k
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {perf.currentCapital >= 100000 ? '+' : ''}{((perf.currentCapital - 100000) / 1000).toFixed(1)}k
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-2 rounded">
                      <div className="text-[10px] text-gray-400 mb-0.5">P&L</div>
                      <div className={`text-sm font-bold ${
                        perf.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {perf.totalPnL >= 0 ? '+' : ''}{perf.totalPnL.toFixed(0)}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {perf.totalPnL >= 0 ? '+' : ''}{(perf.totalPnL / 100000 * 100).toFixed(2)}%
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-2 rounded">
                      <div className="text-[10px] text-gray-400 mb-0.5">Win Rate</div>
                      <div className={`text-sm font-bold ${
                        perf.winRate >= 50 ? 'text-green-400' : perf.winRate >= 40 ? 'text-orange-400' : 'text-red-400'
                      }`}>
                        {perf.winRate.toFixed(0)}%
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {perf.winningTrades}/{perf.totalTrades}
                      </div>
                    </div>
                  </div>

                  {/* Position en cours - Compact */}
                  {perf.currentPosition.type !== 'NONE' ? (
                    <div className={`mb-3 p-3 rounded border ${
                      perf.currentPosition.type === 'LONG' ? 'bg-green-900/10 border-green-500/50' : 'bg-red-900/10 border-red-500/50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`text-sm font-bold ${
                          perf.currentPosition.type === 'LONG' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          📊 {perf.currentPosition.type}
                        </h3>
                        <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                          perf.currentPosition.unrealizedPnL >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {perf.currentPosition.unrealizedPnL >= 0 ? '+' : ''}{perf.currentPosition.unrealizedPnL.toFixed(2)} USDT
                          <span className="text-[10px] ml-1">
                            ({perf.currentPosition.unrealizedPnLPercent >= 0 ? '+' : ''}{perf.currentPosition.unrealizedPnLPercent.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Entrée:</span>
                          <span className="font-semibold text-white">${perf.currentPosition.entryPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Qté:</span>
                          <span className="font-semibold text-white">{perf.currentPosition.quantity.toFixed(4)} BTC</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Temps:</span>
                          <span className="font-semibold text-white">
                            {Math.floor((Date.now() - perf.currentPosition.entryTime) / 60000)}m
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Valeur:</span>
                          <span className="font-semibold text-white">
                            ${(perf.currentPosition.entryPrice * perf.currentPosition.quantity).toFixed(0)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Stop Loss & Take Profit */}
                      <div className="pt-2 border-t border-gray-700/50 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-red-400">🛑 SL:</span>
                          <span className="font-semibold text-white">
                            ${(perf.currentPosition.entryPrice * (perf.currentPosition.type === 'LONG' ? (1 - getStrategyParams(perf.strategyType).stopLoss / 100) : (1 + getStrategyParams(perf.strategyType).stopLoss / 100))).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-400">🎯 TP:</span>
                          <span className="font-semibold text-white">
                            ${(perf.currentPosition.entryPrice * (perf.currentPosition.type === 'LONG' ? (1 + getStrategyParams(perf.strategyType).profitTarget / 100) : (1 - getStrategyParams(perf.strategyType).profitTarget / 100))).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3 p-3 rounded bg-gray-800 border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-gray-400">
                          ⏸️ Aucune position
                        </h3>
                        <div className="px-2 py-0.5 rounded text-xs font-bold bg-gray-700 text-gray-400">
                          Waiting...
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Entrée:</span>
                          <span className="font-semibold text-gray-600">--</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Qté:</span>
                          <span className="font-semibold text-gray-600">--</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Temps:</span>
                          <span className="font-semibold text-gray-600">--</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Valeur:</span>
                          <span className="font-semibold text-gray-600">--</span>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-700/50 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">🛑 SL:</span>
                          <span className="font-semibold text-gray-600">--</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">🎯 TP:</span>
                          <span className="font-semibold text-gray-600">--</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Critères de trading - Compact */}
                  {strategyCriteria && renderCriteriaLabels && (
                    <div className="mb-3 p-3 rounded bg-gray-800 border border-gray-700">
                      <h3 className="text-xs font-bold text-white mb-2">📈 Critères</h3>
                      <div className="space-y-2">
                        {/* LONG Criteria */}
                        <div className={`p-2 rounded ${
                          longReady ? 'bg-green-900/20 border border-green-500/50' : 'bg-gray-900/30'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm ${longReady ? 'text-green-500' : 'text-green-400/40'}`}>🟢</span>
                              <span className={`text-xs font-semibold ${longReady ? 'text-green-400' : 'text-gray-400'}`}>
                                LONG {longReady ? '✓' : ''}
                              </span>
                            </div>
                            <div className="flex gap-0.5">
                              {longStatuses.map((status, idx) => (
                                <span key={`long-${idx}`} className={`w-2 h-2 rounded-full ${
                                  longReady 
                                    ? 'bg-green-500 shadow-lg shadow-green-500/50' 
                                    : status === 'green' ? 'bg-green-500/70' : 
                                      status === 'orange' ? 'bg-orange-400/60' : 
                                      'bg-gray-500/30'
                                }`}></span>
                              ))}
                            </div>
                          </div>
                          <div className="text-[10px] text-gray-300 ml-6 mt-1">
                            {renderCriteriaLabels(strategyCriteria, 'long')}
                          </div>
                        </div>
                        
                        {/* SHORT Criteria */}
                        <div className={`p-2 rounded ${
                          shortReady ? 'bg-red-900/20 border border-red-500/50' : 'bg-gray-900/30'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm ${shortReady ? 'text-red-500' : 'text-red-400/40'}`}>🔴</span>
                              <span className={`text-xs font-semibold ${shortReady ? 'text-red-400' : 'text-gray-400'}`}>
                                SHORT {shortReady ? '✓' : ''}
                              </span>
                            </div>
                            <div className="flex gap-0.5">
                              {shortStatuses.map((status, idx) => (
                                <span key={`short-${idx}`} className={`w-2 h-2 rounded-full ${
                                  shortReady 
                                    ? 'bg-red-500 shadow-lg shadow-red-500/50' 
                                    : status === 'green' ? 'bg-green-500/70' : 
                                      status === 'orange' ? 'bg-orange-400/60' : 
                                      'bg-gray-500/30'
                                }`}></span>
                              ))}
                            </div>
                          </div>
                          <div className="text-[10px] text-gray-300 ml-6 mt-1">
                            {renderCriteriaLabels(strategyCriteria, 'short')}
                          </div>
                        </div>
                      </div>
                      
                      {/* État Position & Cooldown */}
                      <div className="mt-2 flex gap-2">
                        <div className={`flex-1 p-1.5 rounded text-[10px] ${
                          perf.currentPosition.type === 'NONE' 
                            ? 'bg-gray-800/50 border border-gray-600/30 text-gray-400' 
                            : perf.currentPosition.type === 'LONG'
                            ? 'bg-green-900/20 border border-green-500/30 text-green-400'
                            : 'bg-red-900/20 border border-red-500/30 text-red-400'
                        }`}>
                          📍 {perf.currentPosition.type === 'NONE' ? 'Aucune position' : `Position ${perf.currentPosition.type}`}
                        </div>
                        {strategyCriteria.cooldownRemaining > 0 && (
                          <div className="p-1.5 bg-orange-900/20 border border-orange-500/30 rounded text-[10px] text-orange-400">
                            ⏱️ {Math.ceil(strategyCriteria.cooldownRemaining / 1000)}s
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stats & Description combinées */}
                  <div className="p-3 rounded bg-gray-800 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-white">📊 Stats & Paramètres</h3>
                      <div className="text-[10px] text-gray-400">
                        TP: +{getStrategyParams(perf.strategyType).profitTarget}% | SL: -{getStrategyParams(perf.strategyType).stopLoss}%
                      </div>
                    </div>
                    
                    {/* Stats en ligne */}
                    <div className="flex items-center gap-3 text-xs mb-2">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">Total:</span>
                        <span className="font-semibold text-white">{perf.totalTrades}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">Win:</span>
                        <span className="font-semibold text-green-400">{perf.winningTrades}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">Loss:</span>
                        <span className="font-semibold text-red-400">{perf.totalTrades - perf.winningTrades}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">R/R:</span>
                        <span className="font-semibold text-white">1:{(getStrategyParams(perf.strategyType).profitTarget / getStrategyParams(perf.strategyType).stopLoss).toFixed(1)}</span>
                      </div>
                    </div>
                    
                    {/* Description courte */}
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      {perf.strategyType === 'RSI_EMA' && 
                        "RSI(14) + EMA(50/200). LONG: RSI<30 + EMA50>EMA200. SHORT: RSI>70 + EMA50<EMA200. Cooldown: 5min."}
                      {perf.strategyType === 'MOMENTUM_CROSSOVER' && 
                        "EMA(12/26) cross + filtre EMA(200). Croisement haussier/baissier. Cooldown: 3min."}
                      {perf.strategyType === 'VOLUME_MACD' && 
                        "Volume >2x + MACD cross + VWAP. Forte conviction requise. Cooldown: 3min."}
                      {perf.strategyType === 'NEURAL_SCALPER' && 
                        "Scalping ultra-rapide. Accélération + volatilité + RSI momentum. Max 2min en position. Cooldown: 30s."}
                      {perf.strategyType === 'BOLLINGER_BOUNCE' && 
                        "Rebond sur Bollinger Bands. Achète quand prix touche bande inf + RSI<45. Vend sur bande sup ou moyenne. Mean reversion."}
                    </p>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Total Combined P&L:</span>
              <span className={`font-bold ${
                performances.reduce((sum, p) => sum + p.totalPnL, 0) >= 0 
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                {performances.reduce((sum, p) => sum + p.totalPnL, 0) >= 0 ? '+' : ''}
                {performances.reduce((sum, p) => sum + p.totalPnL, 0).toFixed(2)} USDT
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Total Trades:</span>
              <span className="text-white font-semibold">
                {performances.reduce((sum, p) => sum + p.totalTrades, 0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Avg Win Rate:</span>
              <span className="text-blue-400 font-semibold">
                {(performances.reduce((sum, p) => sum + p.winRate, 0) / performances.length).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}