'use client';

import { StrategyPerformance } from '@/types/trading';
import { useRef, useState } from 'react';
import { FaBrain } from 'react-icons/fa';
import { HiBookOpen, HiChevronDown, HiChevronRight, HiClock, HiCog, HiCurrencyDollar, HiLightningBolt, HiPlus, HiRefresh, HiSortAscending, HiTrash, HiTrendingUp, HiViewGrid } from 'react-icons/hi';

interface IndicatorPanelData {
  price: number;
  rsi: number;
  ema12: number;
  ema26: number;
  ema50: number;
  ema200: number;
  ma7: number;
  ma25: number;
  ma99: number;
  volume?: number;
}

interface StrategyPanelProps {
  performances: StrategyPerformance[];
  onToggleStrategy?: (strategyName: string) => void;
  selectedStrategy?: string;
  onSelectStrategy?: (strategyName: string) => void;
  onRefresh?: () => void;
  onConfigChange?: (strategyName: string, config: { profitTargetPercent?: number | null; stopLossPercent?: number | null; maxPositionTime?: number | null }) => void;
  getCriteriaForStrategy?: (strategyType: 'RSI_EMA' | 'MOMENTUM_CROSSOVER' | 'VOLUME_MACD' | 'BOLLINGER_BOUNCE' | 'TREND_FOLLOWER' | 'ATR_PULLBACK' | 'CUSTOM', strategyMetrics: StrategyPerformance) => { strategyType: string; long: Record<string, string | boolean>; short: Record<string, string | boolean>; cooldownRemaining: number; longReady?: boolean; shortReady?: boolean } | null;
  getStatusesArray?: (criteria: { strategyType: string; long: Record<string, string | boolean>; short: Record<string, string | boolean>; cooldownRemaining: number }, type: 'long' | 'short') => string[];
  renderCriteriaLabels?: (criteria: { strategyType: string; long: Record<string, string | boolean>; short: Record<string, string | boolean>; cooldownRemaining: number }, type: 'long' | 'short') => React.ReactNode;
  onGenerateAIStrategy?: () => void;
  isGeneratingAI?: boolean;
  onCreateStrategy?: () => void;
  indicatorData?: IndicatorPanelData | null;
  onDeleteStrategy?: (strategyName: string) => void;
}

export default function StrategyPanel({ 
  performances, 
  onToggleStrategy, 
  selectedStrategy, 
  onSelectStrategy,
  onRefresh,
  onConfigChange,
  getCriteriaForStrategy,
  getStatusesArray,
  renderCriteriaLabels,
  onGenerateAIStrategy,
  isGeneratingAI,
  onCreateStrategy,
  indicatorData,
  onDeleteStrategy
}: StrategyPanelProps) {
  const [viewMode, setViewMode] = useState<'compact' | 'normal'>('normal');
  const [resetConfirm, setResetConfirm] = useState<string | null>(null); // Strategy name to reset
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); // Strategy name to delete
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set()); // Cartes retournées pour afficher les détails
  const [expandedSections, setExpandedSections] = useState<Record<string, Set<string>>>({}); // Sections étendues par stratégie
  const [sortMode, setSortMode] = useState<'smart' | 'pnl' | 'winrate' | 'capital' | 'alphabetical'>('smart'); // Mode de tri
  const [settingsOpen, setSettingsOpen] = useState<string | null>(null); // Strategy name in settings mode
  const [showIndicators, setShowIndicators] = useState(false); // Toggle indicators panel
  const [tempSettings, setTempSettings] = useState<{
    profitTarget: number;
    stopLoss: number;
    maxPositionTime: number;
    cooldownMinutes: number;
    enableTP: boolean;
    enableSL: boolean;
    enableMaxPos: boolean;
    enableCooldown: boolean;
  }>({ profitTarget: 0, stopLoss: 0, maxPositionTime: 0, cooldownMinutes: 0, enableTP: true, enableSL: true, enableMaxPos: true, enableCooldown: true });
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Cache local des paramètres modifiés (persiste après fermeture de Settings)
  const [localConfigCache, setLocalConfigCache] = useState<Record<string, { 
    profitTargetPercent?: number | null; 
    stopLossPercent?: number | null; 
    maxPositionTime?: number | null;
    cooldownPeriod?: number | null; // ms
    enableTP?: boolean;
    enableSL?: boolean;
    enableMaxPos?: boolean;
    enableCooldown?: boolean;
  }>>({});

  const toggleCardFlip = (strategyName: string) => {
    // Fermer Settings si ouvert
    if (settingsOpen === strategyName) {
      setSettingsOpen(null);
    }
    
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

  // Fonction de tri multi-critères pour les stratégies
  const sortStrategies = (strategies: StrategyPerformance[]): StrategyPerformance[] => {
    return [...strategies].sort((a, b) => {
      switch (sortMode) {
        case 'pnl':
          // Tri par P&L uniquement
          return b.totalPnL - a.totalPnL;
        
        case 'winrate':
          // Tri par Win Rate uniquement
          return b.winRate - a.winRate;
        
        case 'capital':
          // Tri par Capital actuel uniquement
          return b.currentCapital - a.currentCapital;
        
        case 'alphabetical':
          // Tri alphabétique
          return a.strategyName.localeCompare(b.strategyName);
        
        case 'smart':
        default:
          // TRI INTELLIGENT multi-critères
          // Critère 1 : Stratégies actives en priorité
          if (a.isActive !== b.isActive) {
            return a.isActive ? -1 : 1;
          }

          // Critère 2 : Win rate (stratégies gagnantes d'abord)
          // Seulement si au moins 3 trades pour être significatif
          const aHasSignificantTrades = a.totalTrades >= 3;
          const bHasSignificantTrades = b.totalTrades >= 3;
          
          if (aHasSignificantTrades && bHasSignificantTrades) {
            const winRateDiff = b.winRate - a.winRate;
            if (Math.abs(winRateDiff) > 5) { // Différence significative (>5%)
              return winRateDiff;
            }
          }

          // Critère 3 : Total P&L (profit/perte cumulé)
          const pnlDiff = b.totalPnL - a.totalPnL;
          if (Math.abs(pnlDiff) > 10) { // Différence significative (>10 USDT)
            return pnlDiff;
          }

          // Critère 4 : Capital actuel (performance globale)
          const capitalDiff = b.currentCapital - a.currentCapital;
          if (Math.abs(capitalDiff) > 50) { // Différence significative (>50 USDT)
            return capitalDiff;
          }

          // Critère 5 : Nombre de trades (expérience)
          const tradesDiff = b.totalTrades - a.totalTrades;
          if (tradesDiff !== 0) {
            return tradesDiff;
          }

          // Critère 6 : Position ouverte (actives en premier)
          const aHasPosition = a.currentPosition.type !== 'NONE';
          const bHasPosition = b.currentPosition.type !== 'NONE';
          if (aHasPosition !== bHasPosition) {
            return aHasPosition ? -1 : 1;
          }

          // Par défaut, ordre alphabétique
          return a.strategyName.localeCompare(b.strategyName);
      }
    });
  };

  const getSortIcon = () => {
    switch (sortMode) {
      case 'pnl': return <HiTrendingUp className="w-4 h-4" />;
      case 'winrate': return <HiLightningBolt className="w-4 h-4" />;
      case 'capital': return <HiCurrencyDollar className="w-4 h-4" />;
      case 'alphabetical': return <HiSortAscending className="w-4 h-4" />;
      case 'smart': return <FaBrain className="w-4 h-4" />;
    }
  };

  const getSortLabel = () => {
    switch (sortMode) {
      case 'pnl': return 'P&L Total';
      case 'winrate': return 'Win Rate';
      case 'capital': return 'Capital';
      case 'alphabetical': return 'Alphabétique';
      case 'smart': return 'Intelligent';
    }
  };

  const cycleSortMode = () => {
    const modes: typeof sortMode[] = ['smart', 'pnl', 'winrate', 'capital', 'alphabetical'];
    const currentIndex = modes.indexOf(sortMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setSortMode(modes[nextIndex]);
  };

  const openSettings = (strategyName: string, strategyType: string, strategyConfig?: { profitTargetPercent?: number | null; stopLossPercent?: number | null; maxPositionTime?: number | null } & { cooldownPeriod?: number | null }) => {
    // Fermer le mode Read si ouvert
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      newSet.delete(strategyName);
      return newSet;
    });
    
    // Utiliser le cache local en priorité, puis la config depuis SSE, puis les defaults
    const cachedConfig = localConfigCache[strategyName];
    const mergedConfig = cachedConfig ? { ...strategyConfig, ...cachedConfig } : strategyConfig;
    const params = getStrategyParams(strategyType, mergedConfig);
    
    // Déterminer les états des toggles depuis le cache ou la config
    const enableTP = cachedConfig?.enableTP !== undefined 
      ? cachedConfig.enableTP 
      : (mergedConfig?.profitTargetPercent !== null && mergedConfig?.profitTargetPercent !== undefined);
    
    const enableSL = cachedConfig?.enableSL !== undefined 
      ? cachedConfig.enableSL 
      : (mergedConfig?.stopLossPercent !== null && mergedConfig?.stopLossPercent !== undefined);
    
    const enableMaxPos = cachedConfig?.enableMaxPos !== undefined 
      ? cachedConfig.enableMaxPos 
      : (mergedConfig?.maxPositionTime !== null && mergedConfig?.maxPositionTime !== undefined);
    const enableCooldown = cachedConfig?.enableCooldown !== undefined
      ? cachedConfig.enableCooldown
      : (mergedConfig?.cooldownPeriod !== null && mergedConfig?.cooldownPeriod !== undefined);
    
    setTempSettings({
      profitTarget: params.profitTarget,
      stopLoss: params.stopLoss,
      maxPositionTime: params.maxPositionTime,
      cooldownMinutes: Math.max(0, Math.round((((mergedConfig as any)?.cooldownPeriod ?? (params.cooldown * 60)) || 0) / 60000)),
      enableTP,
      enableSL,
      enableMaxPos,
      enableCooldown: enableCooldown ?? false
    });
    setSettingsOpen(strategyName);
  };

  const closeSettings = () => {
    setSettingsOpen(null);
  };

  // Sauvegarde automatique dès modification (avec debounce)
  const autoSaveSettings = (strategyName: string, newSettings: typeof tempSettings) => {
    const newConfig = {
      profitTargetPercent: newSettings.enableTP ? newSettings.profitTarget : null,
      stopLossPercent: newSettings.enableSL ? newSettings.stopLoss : null,
      maxPositionTime: newSettings.enableMaxPos ? newSettings.maxPositionTime : null,
      cooldownPeriod: newSettings.enableCooldown ? Math.max(0, newSettings.cooldownMinutes * 60 * 1000) : null,
      enableTP: newSettings.enableTP,
      enableSL: newSettings.enableSL,
      enableMaxPos: newSettings.enableMaxPos,
      enableCooldown: newSettings.enableCooldown
    };
    
    // Mettre à jour le cache local immédiatement pour l'UI réactive
    setLocalConfigCache(prev => ({
      ...prev,
      [strategyName]: newConfig
    }));
    
    // Notifier le parent immédiatement pour mettre à jour le graphique
    if (onConfigChange) {
      onConfigChange(strategyName, newConfig);
    }
    
    // Annuler le timer précédent si existe
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Nouveau timer de 500ms
    saveTimerRef.current = setTimeout(async () => {
      try {
        const config: any = {
          // Envoyer null si désactivé, la valeur si activé
          profitTarget: newSettings.enableTP ? newSettings.profitTarget : null,
          stopLoss: newSettings.enableSL ? newSettings.stopLoss : null,
          maxPositionTime: newSettings.enableMaxPos ? newSettings.maxPositionTime : null
        };

        const response = await fetch('/api/strategy-config', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            strategyName,
            config
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          console.log(`✅ Auto-saved:`, config);
          // Déclencher un refresh pour synchroniser avec le backend
          if (onRefresh) {
            onRefresh();
          }
      } else {
          console.error(`❌ Auto-save failed:`, data.error);
        }
      } catch (error) {
        console.error('❌ Error auto-saving:', error);
      }
    }, 500); // Debounce de 500ms
  };

  const calculateRiskReward = () => {
    if (tempSettings.stopLoss === 0) return 0;
    return tempSettings.profitTarget / tempSettings.stopLoss;
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
      },
      'ATR_PULLBACK': {
        title: 'ATR Trend Pullback',
        description: 'Stratégie prudente: entrées sur pullback vers EMA50 dans la direction de la tendance, validées par ATR et une bougie de retournement.',
        longCriteria: [
          '🚀 EMA50 > EMA200 : Tendance haussière',
          '↔️ Prix proche EMA50 (±0.5×ATR)',
          '📊 RSI 35-55 : neutralité/retour à la moyenne',
          '🕯️ Bougie de retournement haussière'
        ],
        shortCriteria: [
          '📉 EMA50 < EMA200 : Tendance baissière',
          '↔️ Prix proche EMA50 (±0.5×ATR)',
          '📊 RSI 45-65 : neutralité/retour à la moyenne',
          '🕯️ Bougie de retournement baissière'
        ],
        logic: 'On suit la tendance principale (EMA50 vs EMA200) et on attend un pullback contrôlé (ATR) vers EMA50. L\'entrée se fait sur un signal de retournement (bougie) avec RSI modéré pour éviter le surachat/survente extrêmes. Objectif: quelques setups propres par jour.'
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

  const handleDeleteStrategy = async (strategyName: string, strategyType: string) => {
    try {
      // Only allow deletion of CUSTOM strategies
      if (strategyType !== 'CUSTOM') {
        console.log('❌ Only custom strategies can be deleted');
        setDeleteConfirm(null);
        return;
      }

      // First reset the strategy (delete all trades and data)
      const resetResponse = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'resetStrategy',
          strategyName 
        })
      });

      if (!resetResponse.ok) {
        throw new Error('Failed to reset strategy data');
      }

      // Then delete the strategy from database
      const deleteResponse = await fetch('/api/custom-strategy', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: strategyName })
      });

      if (deleteResponse.ok) {
        console.log(`🗑️ Strategy "${strategyName}" deleted successfully`);
        setDeleteConfirm(null);
        // Reload page to refresh data
        window.location.reload();
      } else {
        const data = await deleteResponse.json();
        throw new Error(data.error || 'Failed to delete strategy');
      }
    } catch (error: any) {
      console.error('❌ Error deleting strategy:', error);
      setDeleteConfirm(null);
    }
  };

  // Get strategy parameters (SL/TP based on strategy type)
  const formatCooldown = (ms: number) => {
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

  const getStrategyParams = (strategyType: string, strategyConfig?: { profitTargetPercent?: number | null; stopLossPercent?: number | null; maxPositionTime?: number | null } & { cooldownPeriod?: number | null }) => {
    // Valeurs par défaut
    const defaults: Record<string, { profitTarget: number; stopLoss: number; maxPositionTime: number; cooldown: number }> = {
      'RSI_EMA': { profitTarget: 2.5, stopLoss: 1.5, maxPositionTime: 60, cooldown: 300 },
      'MOMENTUM_CROSSOVER': { profitTarget: 2.0, stopLoss: 1.0, maxPositionTime: 30, cooldown: 180 },
      'VOLUME_MACD': { profitTarget: 2.0, stopLoss: 1.0, maxPositionTime: 45, cooldown: 180 },
      'NEURAL_SCALPER': { profitTarget: 1.5, stopLoss: 0.8, maxPositionTime: 2, cooldown: 0.5 },
      'BOLLINGER_BOUNCE': { profitTarget: 1.8, stopLoss: 2.0, maxPositionTime: 120, cooldown: 0 },
      'TREND_FOLLOWER': { profitTarget: 2.0, stopLoss: 2.0, maxPositionTime: 999, cooldown: 0 },
      'ATR_PULLBACK': { profitTarget: 1.2, stopLoss: 0.8, maxPositionTime: 180, cooldown: 3600 }
    };

    const defaultParams = defaults[strategyType] || { profitTarget: 2.0, stopLoss: 1.0, maxPositionTime: 60, cooldown: 300 };

    // Override avec les paramètres de la config si disponibles
    return {
      profitTarget: strategyConfig?.profitTargetPercent ?? defaultParams.profitTarget,
      stopLoss: strategyConfig?.stopLossPercent ?? defaultParams.stopLoss,
      maxPositionTime: strategyConfig?.maxPositionTime ?? defaultParams.maxPositionTime,
      cooldown: (strategyConfig as any)?.cooldownPeriod ? Math.round((((strategyConfig as any).cooldownPeriod || 0) / 60_000)) : defaultParams.cooldown
    };
  };

  // Strategy color mapping (with predefined color mapping for CUSTOM)
  const getStrategyColor = (perf: StrategyPerformance) => {
    const strategyType = perf.strategyType;
    const customColor = perf.strategyType === 'CUSTOM' && perf.customConfig?.color 
      ? perf.customConfig.color 
      : undefined;
    
    // For CUSTOM strategies with predefined color map
    if (strategyType === 'CUSTOM' && customColor) {
      const colorMap: Record<string, any> = {
        emerald: { border: 'border-emerald-400', borderDimmed: 'border-emerald-400/40', text: 'text-emerald-400', accent: 'bg-emerald-400' },
        rose: { border: 'border-rose-400', borderDimmed: 'border-rose-400/40', text: 'text-rose-400', accent: 'bg-rose-400' },
        indigo: { border: 'border-indigo-400', borderDimmed: 'border-indigo-400/40', text: 'text-indigo-400', accent: 'bg-indigo-400' },
        violet: { border: 'border-violet-400', borderDimmed: 'border-violet-400/40', text: 'text-violet-400', accent: 'bg-violet-400' },
        amber: { border: 'border-amber-400', borderDimmed: 'border-amber-400/40', text: 'text-amber-400', accent: 'bg-amber-400' },
        lime: { border: 'border-lime-400', borderDimmed: 'border-lime-400/40', text: 'text-lime-400', accent: 'bg-lime-400' },
        sky: { border: 'border-sky-400', borderDimmed: 'border-sky-400/40', text: 'text-sky-400', accent: 'bg-sky-400' },
        fuchsia: { border: 'border-fuchsia-400', borderDimmed: 'border-fuchsia-400/40', text: 'text-fuchsia-400', accent: 'bg-fuchsia-400' },
        pink: { border: 'border-pink-400', borderDimmed: 'border-pink-400/40', text: 'text-pink-400', accent: 'bg-pink-400' },
        red: { border: 'border-red-400', borderDimmed: 'border-red-400/40', text: 'text-red-400', accent: 'bg-red-400' },
        green: { border: 'border-green-400', borderDimmed: 'border-green-400/40', text: 'text-green-400', accent: 'bg-green-400' },
        slate: { border: 'border-slate-400', borderDimmed: 'border-slate-400/40', text: 'text-slate-400', accent: 'bg-slate-400' },
        stone: { border: 'border-stone-400', borderDimmed: 'border-stone-400/40', text: 'text-stone-400', accent: 'bg-stone-400' }
      };
      
      return colorMap[customColor] || colorMap.fuchsia; // Fallback to fuchsia
    }
    
    switch (strategyType) {
      case 'RSI_EMA':
        return {
          border: 'border-blue-400',
          borderDimmed: 'border-blue-400/40',
          text: 'text-blue-400',
          accent: 'bg-blue-400'
        };
      case 'MOMENTUM_CROSSOVER':
        return {
          border: 'border-purple-400',
          borderDimmed: 'border-purple-400/40',
          text: 'text-purple-400',
          accent: 'bg-purple-400'
        };
      case 'VOLUME_MACD':
        return {
          border: 'border-orange-400',
          borderDimmed: 'border-orange-400/40',
          text: 'text-orange-400',
          accent: 'bg-orange-400'
        };
      case 'BOLLINGER_BOUNCE':
        return {
          border: 'border-teal-400',
          borderDimmed: 'border-teal-400/40',
          text: 'text-teal-400',
          accent: 'bg-teal-400'
        };
      case 'TREND_FOLLOWER':
        return {
          border: 'border-cyan-400',
          borderDimmed: 'border-cyan-400/40',
          text: 'text-cyan-400',
          accent: 'bg-cyan-400'
        };
      case 'ATR_PULLBACK':
        return {
          border: 'border-yellow-400',
          borderDimmed: 'border-yellow-400/40',
          text: 'text-yellow-400',
          accent: 'bg-yellow-400'
        };
      case 'CUSTOM':
        return {
          border: 'border-fuchsia-400',
          borderDimmed: 'border-fuchsia-400/40',
          text: 'text-fuchsia-400',
          accent: 'bg-fuchsia-400'
        };
      default:
        return {
          border: 'border-gray-400',
          borderDimmed: 'border-gray-400/40',
          text: 'text-gray-400',
          accent: 'bg-gray-400'
        };
    }
  };


  if (performances.length === 0) {
    return null;
  }

  // Trier les stratégies selon plusieurs critères
  const sortedPerformances = sortStrategies(performances);

  // Find best strategy
  const bestStrategy = performances.reduce((best, current) => 
    current.totalPnL > best.totalPnL ? current : best
  );

  return (
    <div className="bg-gray-800 border-b border-gray-700">
      {/* View Mode Toggle */}
      <div className="px-4 py-2 flex items-center justify-between">
        {/* Best Strategy Indicator + AI Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-lg">
            <span className="text-yellow-400 text-lg">🏆</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-yellow-400">{bestStrategy?.strategyName || 'N/A'}</span>
            </div>
            <div className="ml-2 px-2 py-0.5 bg-yellow-500/20 rounded text-xs font-bold text-yellow-300">
              {bestStrategy ? `+${bestStrategy.totalPnL.toFixed(2)} USDT` : '0.00'}
            </div>
          </div>

          {/* AI Generate & Create Strategy Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onGenerateAIStrategy}
              disabled={isGeneratingAI}
              className={`flex items-center gap-2 px-3 py-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg border border-gray-600/50 transition-all ${
                isGeneratingAI ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Générer une stratégie aléatoire avec l'IA"
            >
              {isGeneratingAI ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-medium text-gray-300">Generating...</span>
                </>
              ) : (
                <>
                  <FaBrain className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-300">AI</span>
                </>
              )}
            </button>
            
            <button
              onClick={onCreateStrategy}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg border border-gray-600/50 transition-all"
              title="Créer une nouvelle stratégie personnalisée"
            >
              <HiPlus className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-300">New</span>
            </button>
          </div>
        </div>

        {/* View Mode & Sort Buttons */}
        <div className="flex gap-3">
          {/* Sort Button */}
          <button
            onClick={cycleSortMode}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-all text-gray-300 hover:text-white"
            title={`Tri actuel: ${getSortLabel()} - Cliquer pour changer`}
          >
            {getSortIcon()}
          </button>

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
          {/* Reset All Button */}
          <button
            onClick={async () => {
              try {
                await fetch('/api/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
                onRefresh?.();
                window.location.reload();
              } catch (e) {
                console.error('❌ Reset all failed', e);
              }
            }}
            className="px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-red-500/60 text-red-400 hover:text-red-300 transition-all"
            title="Reset All (delete all trades/signals and stop strategies)"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Strategy Cards */}
      <div className={`px-4 pb-4 grid gap-4 ${
        viewMode === 'compact' 
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3' 
          : flippedCards.size > 0
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {sortedPerformances.map((perf) => {
          const colors = getStrategyColor(perf);
          
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
              className={`bg-gray-900 rounded-lg p-3 border-2 transition-all cursor-pointer h-fit ${
                !perf.isActive 
                  ? 'border-gray-700 opacity-60'
                  : selectedStrategy === 'GLOBAL' || selectedStrategy === perf.strategyName
                  ? colors.border
                    : colors.borderDimmed
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
                          <span key={`long-${idx}`} className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            longReady 
                              ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse' 
                              : status === 'green' ? 'bg-green-500 shadow-md shadow-green-500/40 animate-pulse' : 
                                status === 'orange' ? 'bg-orange-400 shadow-sm shadow-orange-400/40 animate-pulse' : 
                                'bg-gray-500/30'
                          }`}></span>
                        ))}
                      </div>
                      
                      {/* Separator */}
                      <div className="h-3 w-px bg-gray-600"></div>
                      
                      {/* SHORT Status Points */}
                      <div className="flex gap-1">
                        {shortStatuses.map((status, idx) => (
                          <span key={`short-${idx}`} className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            shortReady 
                              ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse' 
                              : status === 'green' ? 'bg-green-500 shadow-md shadow-green-500/40 animate-pulse' : 
                                status === 'orange' ? 'bg-orange-400 shadow-sm shadow-orange-400/40 animate-pulse' : 
                                'bg-gray-500/30'
                          }`}></span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Cooldown Display */}
                    {strategyCriteria && strategyCriteria.cooldownRemaining > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <HiClock className="w-3 h-3 text-orange-400" />
                        <span className="text-xs text-orange-400">
                          {formatCooldown(strategyCriteria.cooldownRemaining)}
                        </span>
                      </div>
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
                  {/* Header: Strategy Name + Buttons (TOUJOURS VISIBLE) */}
                  <div className="mb-3 pb-3 border-b border-gray-700/50 flex items-start justify-between">
                    <div 
                      className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => {
                        if (settingsOpen === perf.strategyName) {
                        e.stopPropagation();
                          closeSettings();
                        }
                      }}
                      title={settingsOpen === perf.strategyName ? "Cliquer pour fermer les paramètres" : ""}
                    >
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
                        title={flippedCards.has(perf.strategyName) ? "Retour à la vue normale" : "Voir les détails de la stratégie"}
                      >
                        <HiBookOpen className="w-3.5 h-3.5" />
                      </button>

                      {/* Settings Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (settingsOpen === perf.strategyName) {
                            closeSettings();
                          } else {
                            openSettings(perf.strategyName, perf.strategyType, perf.config);
                          }
                        }}
                        className={`p-1.5 ${colors.text} hover:opacity-70 transition-opacity ${
                          settingsOpen === perf.strategyName ? 'opacity-100' : ''
                        }`}
                        title="Paramètres de la stratégie"
                      >
                        <HiCog className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button - Only for CUSTOM strategies */}
                      {perf.strategyType === 'CUSTOM' && (
                        deleteConfirm === perf.strategyName ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStrategy(perf.strategyName, perf.strategyType);
                              }}
                              className="px-2 py-1 text-green-400 hover:opacity-70 text-xs font-medium transition-opacity"
                              title="Confirmer la suppression"
                            >
                              ✓
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(null);
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
                              setDeleteConfirm(perf.strategyName);
                            }}
                            className="p-1.5 text-red-400 hover:opacity-70 transition-opacity"
                            title="Supprimer la stratégie (CUSTOM uniquement)"
                          >
                            <HiTrash className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}

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
                          title="Réinitialiser la stratégie"
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

                  {settingsOpen === perf.strategyName ? (
                    // MODE SETTINGS - Modification des paramètres (AUTO-SAVE)
                    <div className="space-y-2 bg-gray-800/50 rounded-lg border border-gray-600/50">
                      {/* Risk/Reward Affichage */}
                      <div className="px-3 py-2 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-b border-purple-500/30 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">Risk/Reward:</span>
                        <span className={`text-sm font-bold ${
                          !tempSettings.enableTP || !tempSettings.enableSL ? 'text-gray-500' :
                          calculateRiskReward() >= 1.5 ? 'text-green-400' :
                          calculateRiskReward() >= 1 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {tempSettings.enableTP && tempSettings.enableSL ? `1:${calculateRiskReward().toFixed(2)}` : 'N/A'}
                        </span>
                    </div>
                    
                      <div className="px-3 pb-3 space-y-2">
                      {/* Cooldown */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-400">Cooldown</span>
                          <span className={`font-bold text-xs ${tempSettings.enableCooldown ? 'text-orange-400' : 'text-gray-600'}`}>
                            {tempSettings.cooldownMinutes}m
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={tempSettings.enableCooldown}
                            onChange={(e) => {
                              const newSettings = { ...tempSettings, enableCooldown: e.target.checked };
                              setTempSettings(newSettings);
                              autoSaveSettings(perf.strategyName, newSettings);
                            }}
                            className="w-3 h-3 rounded accent-orange-500 flex-shrink-0"
                          />
                          {tempSettings.enableCooldown && (
                            <input
                              type="range"
                              min="0"
                              max="120"
                              step="1"
                              value={tempSettings.cooldownMinutes}
                              onChange={(e) => {
                                const newSettings = { ...tempSettings, cooldownMinutes: parseInt(e.target.value) };
                                setTempSettings(newSettings);
                                autoSaveSettings(perf.strategyName, newSettings);
                              }}
                              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                          )}
                        </div>
                      </div>
                            {/* Take Profit */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-400">TP</span>
                                <span className={`font-bold text-xs ${tempSettings.enableTP ? 'text-green-400' : 'text-gray-600'}`}>
                                  +{tempSettings.profitTarget.toFixed(1)}%
                                </span>
                      </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={tempSettings.enableTP}
                                  onChange={(e) => {
                                    const newSettings = { ...tempSettings, enableTP: e.target.checked };
                                    setTempSettings(newSettings);
                                    autoSaveSettings(perf.strategyName, newSettings);
                                  }}
                                  className="w-3 h-3 rounded accent-green-500 flex-shrink-0"
                                />
                                {tempSettings.enableTP && (
                                  <input
                                    type="range"
                                    min="0.1"
                                    max="50"
                                    step="0.1"
                                    value={tempSettings.profitTarget}
                                    onChange={(e) => {
                                      const newSettings = { ...tempSettings, profitTarget: parseFloat(e.target.value) };
                                      setTempSettings(newSettings);
                                      autoSaveSettings(perf.strategyName, newSettings);
                                    }}
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                  />
                                )}
                      </div>
                    </div>
                    
                        {/* Stop Loss */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400">SL</span>
                            <span className={`font-bold text-xs ${tempSettings.enableSL ? 'text-red-400' : 'text-gray-600'}`}>
                              -{tempSettings.stopLoss.toFixed(1)}%
                            </span>
                      </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={tempSettings.enableSL}
                              onChange={(e) => {
                                const newSettings = { ...tempSettings, enableSL: e.target.checked };
                                setTempSettings(newSettings);
                                autoSaveSettings(perf.strategyName, newSettings);
                              }}
                              className="w-3 h-3 rounded accent-red-500 flex-shrink-0"
                            />
                            {tempSettings.enableSL && (
                              <input
                                type="range"
                                min="0.1"
                                max="50"
                                step="0.1"
                                value={tempSettings.stopLoss}
                                onChange={(e) => {
                                  const newSettings = { ...tempSettings, stopLoss: parseFloat(e.target.value) };
                                  setTempSettings(newSettings);
                                  autoSaveSettings(perf.strategyName, newSettings);
                                }}
                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                              />
                            )}
                    </div>
                  </div>

                        {/* Max Position Time */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400">Max</span>
                            <span className={`font-bold text-xs ${tempSettings.enableMaxPos ? 'text-blue-400' : 'text-gray-600'}`}>
                              {tempSettings.maxPositionTime}min
                          </span>
                        </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={tempSettings.enableMaxPos}
                              onChange={(e) => {
                                const newSettings = { ...tempSettings, enableMaxPos: e.target.checked };
                                setTempSettings(newSettings);
                                autoSaveSettings(perf.strategyName, newSettings);
                              }}
                              className="w-3 h-3 rounded accent-blue-500 flex-shrink-0"
                            />
                            {tempSettings.enableMaxPos && (
                              <input
                                type="range"
                                min="1"
                                max="500"
                                step="1"
                                value={tempSettings.maxPositionTime}
                                onChange={(e) => {
                                  const newSettings = { ...tempSettings, maxPositionTime: parseInt(e.target.value) };
                                  setTempSettings(newSettings);
                                  autoSaveSettings(perf.strategyName, newSettings);
                                }}
                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                              />
                            )}
                      </div>
                        </div>
                        </div>
                        </div>
                  ) : flippedCards.has(perf.strategyName) ? (
                    // MODE LECTURE - Description détaillée de la stratégie
                    <div className="space-y-3">
                      {/* Description */}
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {getStrategyDescription(perf.strategyType)?.description ?? perf.customConfig?.description}
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
                          perf.strategyType === 'CUSTOM' && perf.customConfig?.longNotes ? (
                            <p className="px-3 pb-3 text-xs text-gray-300 leading-relaxed">
                              {perf.customConfig.longNotes}
                            </p>
                          ) : (
                            <ul className="px-3 pb-3 space-y-1.5">
                              {getStrategyDescription(perf.strategyType)?.longCriteria.map((criteria, idx) => (
                                <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                                  <span className="text-green-400 mt-0.5">•</span>
                                  <span>{criteria}</span>
                                </li>
                              ))}
                            </ul>
                          )
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
                          perf.strategyType === 'CUSTOM' && perf.customConfig?.shortNotes ? (
                            <p className="px-3 pb-3 text-xs text-gray-300 leading-relaxed">
                              {perf.customConfig.shortNotes}
                            </p>
                          ) : (
                            <ul className="px-3 pb-3 space-y-1.5">
                              {getStrategyDescription(perf.strategyType)?.shortCriteria.map((criteria, idx) => (
                                <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                                  <span className="text-red-400 mt-0.5">•</span>
                                  <span>{criteria}</span>
                                </li>
                              ))}
                            </ul>
                          )
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
                            {getStrategyDescription(perf.strategyType)?.logic ?? perf.customConfig?.strategyLogic}
                          </p>
                        )}
                        </div>
                      </div>
                  ) : (
                    // MODE NORMAL - Stats et métriques
                    <>
                  {/* Detailed Criteria with status points on the right */}
                  {strategyCriteria && renderCriteriaLabels && (
                    <div className="mb-3 pb-3 border-b border-gray-700/50">
                      <div className="flex flex-col gap-2 text-xs">
                        {/* LONG Criteria with status points */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-base ${longReady ? 'text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'text-green-400/40'}`}>🟢</span>
                            {renderCriteriaLabels(strategyCriteria, 'long')}
                            {/* Inline cooldown between labels and points */}
                            {strategyCriteria.cooldownRemaining > 0 && (
                              <span className="flex items-center gap-1 text-[10px] text-orange-400 ml-2">
                                <HiClock className="w-3 h-3" />
                                {formatCooldown(strategyCriteria.cooldownRemaining)}
                                </span>
                            )}
                            </div>
                          {/* Status points for LONG - on the right */}
                          <div className="flex gap-1">
                              {longStatuses.map((status, idx) => (
                                <span key={`long-${idx}`} className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                  longReady 
                                  ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse' 
                                    : status === 'green' ? 'bg-green-500 shadow-md shadow-green-500/40 animate-pulse' : 
                                      status === 'orange' ? 'bg-orange-400 shadow-sm shadow-orange-400/40 animate-pulse' : 
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
                            {/* Inline cooldown between labels and points */}
                            {strategyCriteria.cooldownRemaining > 0 && (
                              <span className="flex items-center gap-1 text-[10px] text-orange-400 ml-2">
                                <HiClock className="w-3 h-3" />
                                {formatCooldown(strategyCriteria.cooldownRemaining)}
                                </span>
                            )}
                          </div>
                          {/* Status points for SHORT - on the right */}
                          <div className="flex gap-1">
                              {shortStatuses.map((status, idx) => (
                                <span key={`short-${idx}`} className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                  shortReady 
                                  ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse' 
                                    : status === 'green' ? 'bg-green-500 shadow-md shadow-green-500/40 animate-pulse' : 
                                      status === 'orange' ? 'bg-orange-400 shadow-sm shadow-orange-400/40 animate-pulse' : 
                                      'bg-gray-500/30'
                                }`}></span>
                              ))}
                        </div>
                      </div>
                      
                        {/* Cooldown moved inline with criteria rows */}
                      </div>
                    </div>
                  )}

                  {/* Performance Metrics - Single row with left/right columns */}
                  <div className="flex items-start justify-between gap-6 min-w-[300px] w-full">
                    {/* LEFT: Trades + Win Rate */}
                    <div className="flex flex-col gap-1.5 basis-1/3">
                      {/* Trades */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-gray-400">Trades:</span>
                        <span className="text-sm text-white">
                          {perf.winningTrades}/{perf.totalTrades}
                        </span>
                      </div>

                      {/* Win Rate (moved from right) */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-gray-400">Win Rate:</span>
                        <span className={`text-sm font-semibold ${
                          perf.winRate >= 50 ? 'text-green-400' : 'text-orange-400'
                        }`}>
                          {perf.winRate.toFixed(1)}%
                        </span>
                      </div>

                      {/* Unrealized row moved below to span full width */}
                    </div>

                    {/* RIGHT: Position (top) + Total P&L (bottom) */}
                    <div className="flex flex-col gap-1.5 basis-2/3">
                      {/* Position (moved from left) */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-gray-400">Position:</span>
                        <span className={`text-sm font-semibold ${
                          perf.currentPosition.type === 'LONG' ? 'text-green-400' :
                          perf.currentPosition.type === 'SHORT' ? 'text-red-400' :
                          'text-gray-400'
                        }`}>
                          {perf.currentPosition.type}
                        </span>
                      </div>

                      {/* Total PnL */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-gray-400">Total P&L:</span>
                        <span className={`text-sm font-bold ${
                          perf.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {perf.totalPnL >= 0 ? '+' : ''}{perf.totalPnL.toFixed(2)} USDT
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Unrealized P&L - Full width under the row */}
                  {perf.currentPosition.type !== 'NONE' && (
                    <div className="flex items-center justify-between pt-2 border-t border-gray-700 w-full mt-2">
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
          
          {/* Toggle Indicators Button */}
          <button
            onClick={() => setShowIndicators(!showIndicators)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-300 hover:text-white"
            title={showIndicators ? 'Masquer les indicateurs' : 'Afficher tous les indicateurs'}
          >
            <span className="text-sm font-medium">📊 Indicators</span>
            {showIndicators ? (
              <HiChevronDown className="w-4 h-4" />
            ) : (
              <HiChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Technical Indicators Panel - Collapsible */}
      {showIndicators && indicatorData && (
        <div className="px-4 pb-4 border-t border-gray-700">
          <div className="bg-gray-900 rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Technical Indicators
            </h3>
            
            {/* Grid of indicators */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {/* Price */}
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">💰 Price</div>
                <div className="text-lg font-bold text-white">
                  ${indicatorData.price.toFixed(2)}
                </div>
              </div>
              
              {/* RSI */}
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">📊 RSI (14)</div>
                <div className={`text-lg font-bold ${
                  indicatorData.rsi < 30 ? 'text-green-400' :
                  indicatorData.rsi > 70 ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {indicatorData.rsi.toFixed(1)}
                </div>
              </div>
              
              {/* EMA 12 */}
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">📈 EMA 12</div>
                <div className={`text-sm font-bold ${
                  indicatorData.price > indicatorData.ema12 ? 'text-green-400' : 'text-red-400'
                }`}>
                  ${indicatorData.ema12.toFixed(2)}
                </div>
              </div>
              
              {/* EMA 26 */}
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">📈 EMA 26</div>
                <div className={`text-sm font-bold ${
                  indicatorData.price > indicatorData.ema26 ? 'text-green-400' : 'text-red-400'
                }`}>
                  ${indicatorData.ema26.toFixed(2)}
                </div>
              </div>
              
              {/* EMA 50 */}
              <div className="bg-gray-800 rounded-lg p-3 border border-blue-500/30">
                <div className="text-xs text-blue-400 mb-1 font-semibold">📈 EMA 50</div>
                <div className={`text-sm font-bold ${
                  indicatorData.price > indicatorData.ema50 ? 'text-green-400' : 'text-red-400'
                }`}>
                  ${indicatorData.ema50.toFixed(2)}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {indicatorData.price > indicatorData.ema50 ? '↗ Above' : '↘ Below'}
                </div>
              </div>
              
              {/* EMA 200 */}
              <div className="bg-gray-800 rounded-lg p-3 border border-purple-500/30">
                <div className="text-xs text-purple-400 mb-1 font-semibold">📈 EMA 200</div>
                <div className={`text-sm font-bold ${
                  indicatorData.price > indicatorData.ema200 ? 'text-green-400' : 'text-red-400'
                }`}>
                  ${indicatorData.ema200.toFixed(2)}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {indicatorData.ema50 > indicatorData.ema200 ? '🚀 Bullish' : '📉 Bearish'}
                </div>
              </div>
              
              {/* MA 7 */}
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">📊 MA 7</div>
                <div className="text-sm font-bold text-cyan-400">
                  ${indicatorData.ma7.toFixed(2)}
                </div>
              </div>
              
              {/* MA 25 */}
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">📊 MA 25</div>
                <div className="text-sm font-bold text-cyan-400">
                  ${indicatorData.ma25.toFixed(2)}
                </div>
              </div>
              
              {/* MA 99 */}
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">📊 MA 99</div>
                <div className="text-sm font-bold text-cyan-400">
                  ${indicatorData.ma99.toFixed(2)}
                </div>
              </div>
              
              {/* Volume */}
              {indicatorData.volume && (
                <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">📊 Volume</div>
                  <div className="text-sm font-bold text-orange-400">
                    {(indicatorData.volume / 1000).toFixed(2)}K
                  </div>
                </div>
              )}
              
              {/* Trend Status */}
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">🎯 Trend</div>
                <div className={`text-sm font-bold ${
                  indicatorData.ema50 > indicatorData.ema200 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {indicatorData.ema50 > indicatorData.ema200 ? '🚀 Bullish' : '📉 Bearish'}
                </div>
              </div>
              
              {/* Price Position */}
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">📍 Position</div>
                <div className={`text-sm font-bold ${
                  indicatorData.price > indicatorData.ema50 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {indicatorData.price > indicatorData.ema50 ? '↗ Above 50' : '↘ Below 50'}
                </div>
              </div>
            </div>
            
            {/* Detailed View - Expandable sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {/* Moving Averages Detail */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-blue-500/20">
                <div className="text-sm font-semibold text-blue-400 mb-2">📈 Moving Averages</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">EMA 12:</span>
                    <span className="text-white">${indicatorData.ema12.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">EMA 26:</span>
                    <span className="text-white">${indicatorData.ema26.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">EMA 50:</span>
                    <span className="text-blue-400 font-semibold">${indicatorData.ema50.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">EMA 200:</span>
                    <span className="text-purple-400 font-semibold">${indicatorData.ema200.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-gray-700/50">
                    <span className="text-gray-400">MA 7:</span>
                    <span className="text-white">${indicatorData.ma7.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">MA 25:</span>
                    <span className="text-white">${indicatorData.ma25.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">MA 99:</span>
                    <span className="text-white">${indicatorData.ma99.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {/* Momentum Indicators */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-yellow-500/20">
                <div className="text-sm font-semibold text-yellow-400 mb-2">💪 Momentum</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">RSI (14):</span>
                    <span className={`font-bold ${
                      indicatorData.rsi < 30 ? 'text-green-400' :
                      indicatorData.rsi > 70 ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {indicatorData.rsi.toFixed(1)}
                      {indicatorData.rsi < 30 ? ' 🟢 Oversold' : 
                       indicatorData.rsi > 70 ? ' 🔴 Overbought' : 
                       ' ⚪ Neutral'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">EMA Crossover:</span>
                    <span className={`font-bold ${
                      indicatorData.ema12 > indicatorData.ema26 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {indicatorData.ema12 > indicatorData.ema26 ? '↗ Bullish' : '↘ Bearish'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Trend Strength:</span>
                    <span className={`font-bold ${
                      indicatorData.ema50 > indicatorData.ema200 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {Math.abs(((indicatorData.ema50 - indicatorData.ema200) / indicatorData.ema200) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Price Analysis */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-green-500/20">
                <div className="text-sm font-semibold text-green-400 mb-2">💰 Price Analysis</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current:</span>
                    <span className="text-white font-bold">${indicatorData.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">vs EMA 50:</span>
                    <span className={`font-bold ${
                      indicatorData.price > indicatorData.ema50 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {((indicatorData.price - indicatorData.ema50) / indicatorData.ema50 * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">vs EMA 200:</span>
                    <span className={`font-bold ${
                      indicatorData.price > indicatorData.ema200 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {((indicatorData.price - indicatorData.ema200) / indicatorData.ema200 * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-gray-700/50">
                    <span className="text-gray-400">Trend:</span>
                    <span className={`font-bold ${
                      indicatorData.ema50 > indicatorData.ema200 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {indicatorData.ema50 > indicatorData.ema200 ? 'BULL 🚀' : 'BEAR 📉'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}