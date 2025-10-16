'use client';

import { StrategyPerformance } from '@/types/trading';
import { useState } from 'react';
import { HiBookOpen, HiChevronDown, HiChevronRight, HiRefresh, HiViewGrid } from 'react-icons/hi';

interface StrategyPanelProps {
  performances: StrategyPerformance[];
  onToggleStrategy?: (strategyName: string) => void;
  selectedStrategy?: string;
  onSelectStrategy?: (strategyName: string) => void;
  getCriteriaForStrategy?: (strategyType: 'RSI_EMA' | 'MOMENTUM_CROSSOVER' | 'VOLUME_MACD' | 'NEURAL_SCALPER' | 'BOLLINGER_BOUNCE' | 'TREND_FOLLOWER', strategyMetrics: StrategyPerformance) => { strategyType: string; long: Record<string, string | boolean>; short: Record<string, string | boolean>; cooldownRemaining: number; longReady?: boolean; shortReady?: boolean } | null;
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
  const [viewMode, setViewMode] = useState<'compact' | 'normal'>('normal');
  const [resetConfirm, setResetConfirm] = useState<string | null>(null); // Strategy name to reset
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set()); // Cartes retournées pour afficher les détails
  const [expandedSections, setExpandedSections] = useState<Record<string, Set<string>>>({}); // Sections étendues par stratégie

  const toggleCardFlip = (strategyName: string) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(strategyName)) {
        newSet.delete(strategyName);
      } else {
        newSet.add(strategyName);
      }
      return newSet;
    });
  };

  const toggleSection = (strategyName: string, sectionName: string) => {
    setExpandedSections(prev => {
      const newState = { ...prev };
      if (!newState[strategyName]) {
        newState[strategyName] = new Set();
      }
      const sections = new Set(newState[strategyName]);
      if (sections.has(sectionName)) {
        sections.delete(sectionName);
      } else {
        sections.add(sectionName);
      }
      newState[strategyName] = sections;
      return newState;
    });
  };

  const isSectionExpanded = (strategyName: string, sectionName: string) => {
    return expandedSections[strategyName]?.has(sectionName) || false;
  };

  const getStrategyDescription = (strategyType: string) => {
    const descriptions: Record<string, { title: string; description: string; longCriteria: string[]; shortCriteria: string[]; logic: string }> = {
      'RSI_EMA': {
        title: 'RSI + EMA (Mean Reversion)',
        description: 'Cette stratégie combine l\'indicateur RSI pour détecter les conditions de survente/surachat et les EMA pour confirmer la tendance.',
        longCriteria: [
          '📊 RSI < 30 : Le marché est survendu, opportunité d\'achat',
          '📈 EMA50 > EMA200 : Tendance haussière confirmée (Golden Cross)',
          '⏱️ Cooldown : 5 minutes entre chaque signal'
        ],
        shortCriteria: [
          '📊 RSI > 70 : Le marché est suracheté, opportunité de vente',
          '📉 EMA50 < EMA200 : Tendance baissière confirmée (Death Cross)',
          '⏱️ Cooldown : 5 minutes entre chaque signal'
        ],
        logic: 'La stratégie achète quand le marché est survendu dans une tendance haussière et vend quand il est suracheté dans une tendance baissière. Elle vise à profiter des retours de prix vers la moyenne (mean reversion).'
      },
      'MOMENTUM_CROSSOVER': {
        title: 'Momentum Crossover',
        description: 'Cette stratégie détecte les changements de momentum grâce aux croisements des moyennes mobiles exponentielles.',
        longCriteria: [
          '⚡ EMA12 > EMA26 : Croisement haussier des moyennes courtes',
          '📈 Prix > EMA200 : Confirmation de la tendance haussière',
          '⏱️ Cooldown : 3 minutes entre chaque signal'
        ],
        shortCriteria: [
          '⚡ EMA12 < EMA26 : Croisement baissier des moyennes courtes',
          '📉 Prix < EMA200 : Confirmation de la tendance baissière',
          '⏱️ Cooldown : 3 minutes entre chaque signal'
        ],
        logic: 'La stratégie suit les croisements des EMA courtes (12/26) pour détecter les changements de momentum. Le filtre EMA200 confirme la direction de la tendance principale et évite les faux signaux.'
      },
      'VOLUME_MACD': {
        title: 'Volume + MACD',
        description: 'Cette stratégie combine l\'analyse du volume, du momentum (MACD) et du VWAP pour des signaux haute conviction.',
        longCriteria: [
          '📊 Volume > 2x moyen : Forte activité de trading détectée',
          '📈 MACD positif : Momentum haussier confirmé',
          '💰 Prix > VWAP : Position favorable au-dessus du prix moyen',
          '⏱️ Cooldown : 3 minutes entre chaque signal'
        ],
        shortCriteria: [
          '📊 Volume > 2x moyen : Forte activité de trading détectée',
          '📉 MACD négatif : Momentum baissier confirmé',
          '💰 Prix < VWAP : Position favorable en-dessous du prix moyen',
          '⏱️ Cooldown : 3 minutes entre chaque signal'
        ],
        logic: 'La stratégie attend une forte conviction avec trois confirmations : volume élevé (activité du marché), momentum confirmé (MACD) et prix favorable par rapport au VWAP. Cette triple confirmation maximise les chances de succès.'
      },
      'NEURAL_SCALPER': {
        title: 'Neural Scalper',
        description: 'Stratégie de scalping ultra-rapide utilisant l\'analyse de l\'accélération et de la volatilité.',
        longCriteria: [
          '⚡ Accélération détectée : Mouvement de prix rapide et significatif',
          '📊 Volatilité élevée : Conditions favorables au scalping',
          '📈 RSI momentum positif : Direction haussière confirmée',
          '⏱️ Cooldown : 30 secondes seulement'
        ],
        shortCriteria: [
          '⚡ Accélération détectée : Mouvement de prix rapide et significatif',
          '📊 Volatilité élevée : Conditions favorables au scalping',
          '📉 RSI momentum négatif : Direction baissière confirmée',
          '⏱️ Cooldown : 30 secondes seulement'
        ],
        logic: 'Stratégie de scalping qui capture les mouvements rapides sur de très courtes périodes (maximum 2 minutes en position). Idéale pour les marchés très volatils avec des mouvements brusques. Attention : haute fréquence = risque élevé.'
      },
      'BOLLINGER_BOUNCE': {
        title: 'Bollinger Bounce (Mean Reversion)',
        description: 'Cette stratégie profite des rebonds sur les bandes de Bollinger avec confirmation RSI.',
        longCriteria: [
          '📉 Prix proche bande inférieure : Signal de rebond potentiel',
          '📊 RSI < 45 : Conditions de survente légère',
          '📈 Volatilité modérée : Conditions idéales pour le mean reversion',
          '⏱️ Cooldown : 2 minutes entre chaque signal'
        ],
        shortCriteria: [
          '📈 Prix proche bande supérieure : Signal de retrait potentiel',
          '📊 RSI > 55 : Conditions de surachat léger',
          '📉 Volatilité modérée : Conditions idéales pour le mean reversion',
          '⏱️ Cooldown : 2 minutes entre chaque signal'
        ],
        logic: 'La stratégie achète quand le prix touche la bande inférieure de Bollinger (avec RSI bas) et vend quand il atteint la bande supérieure (avec RSI haut) ou la moyenne mobile. Principe de retour à la moyenne (mean reversion).'
      },
      'TREND_FOLLOWER': {
        title: 'Trend Follower',
        description: 'Stratégie simple qui suit la tendance en utilisant l\'EMA 50 comme filtre. Inverse automatiquement la position lors d\'un changement de tendance.',
        longCriteria: [
          '📈 Prix > EMA50 : Tendance haussière détectée',
          '✅ Ouverture position LONG automatique',
          '🎯 TP: +2% | SL: -2%',
          '🔄 Fermeture auto si tendance s\'inverse'
        ],
        shortCriteria: [
          '📉 Prix < EMA50 : Tendance baissière détectée',
          '✅ Ouverture position SHORT automatique',
          '🎯 TP: +2% | SL: -2%',
          '🔄 Fermeture auto si tendance s\'inverse'
        ],
        logic: 'La stratégie suit la tendance de manière simple : LONG quand le prix est au-dessus de l\'EMA50, SHORT quand il est en-dessous. Dès que la tendance s\'inverse, la position est fermée et une nouvelle position opposée est ouverte automatiquement. Pas de cooldown, inversion instantanée.'
      }
    };
    return descriptions[strategyType] || null;
  };

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
      case 'TREND_FOLLOWER':
        return { profitTarget: 2.0, stopLoss: 2.0, maxPositionTime: 999, cooldown: 0 };
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
      case 'TREND_FOLLOWER':
        return {
          border: 'border-cyan-400',
          text: 'text-cyan-400',
          accent: 'bg-cyan-400'
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
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <rect x="4" y="4" width="12" height="12" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Strategy Cards */}
      <div className={`px-4 pb-4 grid gap-4 ${
        viewMode === 'compact' 
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' 
          : flippedCards.size > 0
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
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${colors.text}`}>{perf.strategyName}</h3>
                      {/* Status Indicator */}
                      <div className={`w-2 h-2 rounded-full ${
                        perf.isActive 
                          ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse' 
                          : 'bg-red-500'
                      }`}></div>
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
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">Unrealized:</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          perf.currentPosition.type === 'LONG' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                      </div>
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
              ) : (
                // NORMAL MODE
                <>
                  {flippedCards.has(perf.strategyName) ? (
                    // FACE ARRIÈRE - Description détaillée de la stratégie
                    <div className="p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-600">
                      <div className="flex items-center justify-between mb-3 border-b border-gray-700 pb-2">
                        <h3 className={`text-base font-bold ${colors.text}`}>
                          {getStrategyDescription(perf.strategyType)?.title}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCardFlip(perf.strategyName);
                          }}
                          className="p-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                          title="Retour à la vue normale"
                        >
                          <HiBookOpen className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {/* Description */}
                        <p className="text-sm text-gray-300 leading-relaxed">
                          {getStrategyDescription(perf.strategyType)?.description}
                        </p>
                        
                        {/* Critères LONG - Réduisible */}
                        <div className="bg-green-900/10 border border-green-500/30 rounded-lg overflow-hidden">
                          <div 
                            className="p-3 cursor-pointer hover:bg-green-900/20 transition-colors flex items-center justify-between"
                            onClick={() => toggleSection(perf.strategyName, 'long')}
                          >
                            <h4 className="text-sm font-bold text-green-400">🟢 Conditions d'ACHAT (LONG)</h4>
                            {isSectionExpanded(perf.strategyName, 'long') ? (
                              <HiChevronDown className="w-4 h-4 text-green-400" />
                            ) : (
                              <HiChevronRight className="w-4 h-4 text-green-400" />
                            )}
                          </div>
                          {isSectionExpanded(perf.strategyName, 'long') && (
                            <ul className="px-3 pb-3 space-y-1.5">
                              {getStrategyDescription(perf.strategyType)?.longCriteria.map((criteria, idx) => (
                                <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                                  <span className="text-green-400 mt-0.5">•</span>
                                  <span>{criteria}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        
                        {/* Critères SHORT - Réduisible */}
                        <div className="bg-red-900/10 border border-red-500/30 rounded-lg overflow-hidden">
                          <div 
                            className="p-3 cursor-pointer hover:bg-red-900/20 transition-colors flex items-center justify-between"
                            onClick={() => toggleSection(perf.strategyName, 'short')}
                          >
                            <h4 className="text-sm font-bold text-red-400">🔴 Conditions de VENTE (SHORT)</h4>
                            {isSectionExpanded(perf.strategyName, 'short') ? (
                              <HiChevronDown className="w-4 h-4 text-red-400" />
                            ) : (
                              <HiChevronRight className="w-4 h-4 text-red-400" />
                            )}
                          </div>
                          {isSectionExpanded(perf.strategyName, 'short') && (
                            <ul className="px-3 pb-3 space-y-1.5">
                              {getStrategyDescription(perf.strategyType)?.shortCriteria.map((criteria, idx) => (
                                <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                                  <span className="text-red-400 mt-0.5">•</span>
                                  <span>{criteria}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        
                        {/* Logique - Réduisible */}
                        <div className="bg-blue-900/10 border border-blue-500/30 rounded-lg overflow-hidden">
                          <div 
                            className="p-3 cursor-pointer hover:bg-blue-900/20 transition-colors flex items-center justify-between"
                            onClick={() => toggleSection(perf.strategyName, 'logic')}
                          >
                            <h4 className="text-sm font-bold text-blue-400">💡 Logique de la stratégie</h4>
                            {isSectionExpanded(perf.strategyName, 'logic') ? (
                              <HiChevronDown className="w-4 h-4 text-blue-400" />
                            ) : (
                              <HiChevronRight className="w-4 h-4 text-blue-400" />
                            )}
                          </div>
                          {isSectionExpanded(perf.strategyName, 'logic') && (
                            <p className="px-3 pb-3 text-xs text-gray-300 leading-relaxed">
                              {getStrategyDescription(perf.strategyType)?.logic}
                            </p>
                          )}
                        </div>
                        
                        {/* Paramètres - Réduisible */}
                        <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg overflow-hidden">
                          <div 
                            className="p-3 cursor-pointer hover:bg-gray-700/50 transition-colors flex items-center justify-between"
                            onClick={() => toggleSection(perf.strategyName, 'params')}
                          >
                            <h4 className="text-sm font-bold text-gray-400">⚙️ Paramètres de trading</h4>
                            {isSectionExpanded(perf.strategyName, 'params') ? (
                              <HiChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <HiChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          {isSectionExpanded(perf.strategyName, 'params') && (
                            <div className="px-3 pb-3 grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Take Profit:</span>
                                <span className="text-green-400 font-semibold">+{getStrategyParams(perf.strategyType).profitTarget}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Stop Loss:</span>
                                <span className="text-red-400 font-semibold">-{getStrategyParams(perf.strategyType).stopLoss}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Max Position:</span>
                                <span className="text-white font-semibold">{getStrategyParams(perf.strategyType).maxPositionTime}min</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Risk/Reward:</span>
                                <span className="text-blue-400 font-semibold">1:{(getStrategyParams(perf.strategyType).profitTarget / getStrategyParams(perf.strategyType).stopLoss).toFixed(1)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // FACE AVANT - Vue normale
                    <>
                  {/* Header: Strategy Name + Buttons */}
                  <div className="mb-3 pb-3 border-b border-gray-700/50 flex items-start justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-base font-semibold ${colors.text}`}>{perf.strategyName}</h3>
                        {/* Status Indicator */}
                        <div className={`w-2 h-2 rounded-full ${
                          perf.isActive 
                            ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse' 
                            : 'bg-red-500'
                        }`}></div>
                        {perf.strategyName === bestStrategy.strategyName && perf.totalPnL > 0 && (
                          <span className="text-yellow-400 text-sm">👑</span>
                        )}
                        {selectedStrategy === perf.strategyName && (
                          <span className="text-blue-400 text-sm">👁️</span>
                        )}
                      </div>
                      <div className={`h-0.5 w-24 ${colors.accent} mt-1.5 mb-1.5 rounded-full`}></div>
                      <span className={`text-sm font-bold ${
                        perf.currentCapital >= 100000 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ${perf.currentCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    <div className="flex items-start gap-1.5">
                      {/* Read Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCardFlip(perf.strategyName);
                        }}
                        className={`p-1.5 ${colors.text} hover:opacity-70 transition-opacity`}
                        title="Voir les détails de la stratégie"
                      >
                        <HiBookOpen className="w-3.5 h-3.5" />
                      </button>
                      
                      {/* Reset Button */}
                      {resetConfirm === perf.strategyName ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResetStrategy(perf.strategyName);
                            }}
                            className="px-2 py-1 text-green-400 hover:opacity-70 text-xs font-medium transition-opacity"
                            title="Confirmer"
                          >
                            ✓
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setResetConfirm(null);
                            }}
                            className="px-2 py-1 text-red-400 hover:opacity-70 text-xs font-medium transition-opacity"
                            title="Annuler"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setResetConfirm(perf.strategyName);
                          }}
                          className={`p-1.5 ${colors.text} hover:opacity-70 transition-opacity`}
                          title="Réinitialiser"
                        >
                          <HiRefresh className="w-3.5 h-3.5" />
                        </button>
                      )}
                      
                      {/* Toggle Switch */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStrategy?.(perf.strategyName);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          perf.isActive ? 'bg-gray-700' : 'bg-gray-600'
                        }`}
                        title={perf.isActive ? 'Désactiver' : 'Activer'}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                          perf.isActive ? 'translate-x-6' : 'translate-x-1'
                        } ${
                          perf.isActive ? colors.accent : 'bg-gray-400'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Detailed Criteria with status points on the right */}
                  {strategyCriteria && renderCriteriaLabels && (
                    <div className="mb-3 pb-3 border-b border-gray-700/50">
                      <div className="flex flex-col gap-2 text-xs">
                        {/* LONG Criteria with status points */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-base ${longReady ? 'text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'text-green-400/40'}`}>🟢</span>
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
                            <span className={`text-base ${shortReady ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-red-400/40'}`}>🔴</span>
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
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-400">Unrealized:</span>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            perf.currentPosition.type === 'LONG' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                        </div>
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
                  )}
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