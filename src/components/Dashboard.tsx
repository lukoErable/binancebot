'use client';

import { CustomStrategyConfig } from '@/lib/custom-strategy';
import { StrategyPerformance, StrategyState } from '@/types/trading';
import { useEffect, useRef, useState } from 'react';
import { HiChevronDown, HiClock } from 'react-icons/hi';
import BinanceChart from './BinanceChart';
import {
  ChartSkeleton,
  CriteriaSkeleton,
  FullPageSkeleton,
  IndicatorSkeleton,
  OHLCSkeleton,
  SignalSkeleton,
  StrategyPanelSkeleton,
  TradingInfoSkeleton
} from './SkeletonLoader';
import StrategyBuilder from './StrategyBuilder';
import StrategyPanel from './StrategyPanel';
import TimeframeComparison from './TimeframeComparison';
import TradingHistory from './TradingHistory';

// Extend Window interface for tradingEventSource
declare global {
  interface Window {
    tradingEventSource?: EventSource;
  }
}

export default function Dashboard() {
  const [state, setState] = useState<StrategyState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [isChangingTimeframe, setIsChangingTimeframe] = useState(false);
  const [strategyPerformances, setStrategyPerformances] = useState<StrategyPerformance[]>([]);
  const [localConfigCache, setLocalConfigCache] = useState<Record<string, { profitTargetPercent?: number | null; stopLossPercent?: number | null; maxPositionTime?: number | null }>>({});
  const [selectedStrategy, setSelectedStrategy] = useState<string>('GLOBAL'); // 'GLOBAL' or strategy name
  const [showStrategyBuilder, setShowStrategyBuilder] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isStatsSticky, setIsStatsSticky] = useState(false);
  const statsSentinelRef = useRef<HTMLDivElement>(null);
  const [showTimeframeComparison, setShowTimeframeComparison] = useState(false);
  const [comparisonStrategyName, setComparisonStrategyName] = useState<string | null>(null);
  const [allTimeframePerformances, setAllTimeframePerformances] = useState<StrategyPerformance[]>([]);
  const [showAllPositions, setShowAllPositions] = useState(false);

  // Detect when stats bar becomes sticky using IntersectionObserver
  useEffect(() => {
    const sentinel = statsSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel is not visible, stats bar is sticky
        setIsStatsSticky(!entry.isIntersecting);
      },
      { 
        threshold: 0,
        rootMargin: '-57px 0px 0px 0px' // Offset by header height
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const startDataStream = async (timeframe?: string, trading?: boolean) => {
    const tf = timeframe || selectedTimeframe;
    const tm = trading !== undefined ? trading : false; // Always start in monitoring mode
    
    setIsConnecting(true);
    try {
      const eventSource = new EventSource(`/api/trading?action=start&timeframe=${tf}&trading=${tm}`);

      eventSource.onmessage = (event) => {
        try {
          const data: StrategyState = JSON.parse(event.data);
          setState(data);
          setIsConnected(data.isConnected);
          setIsConnecting(false);
          setIsChangingTimeframe(false); // Désactiver le loading quand les nouvelles données arrivent
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        setIsConnected(false);
        setIsConnecting(false);
        setIsChangingTimeframe(false);
        eventSource.close();
      };

      // Store eventSource in window to close it later
      window.tradingEventSource = eventSource;
    } catch (error) {
      console.error('Error starting data stream:', error);
      setIsConnecting(false);
    }
  };


  const stopDataStream = async () => {
    try {
      // Close SSE connection
      if (window.tradingEventSource) {
        window.tradingEventSource.close();
        window.tradingEventSource = undefined;
      }

      await fetch('/api/trading?action=stop');
      setIsConnected(false);
      setState(null);
    } catch (error) {
      console.error('Error stopping data stream:', error);
    }
  };



  const handleToggleStrategy = async (strategyName: string) => {
    try {
      await fetch(`/api/trading?action=toggleStrategy&strategyName=${encodeURIComponent(strategyName)}&timeframe=${selectedTimeframe}`);
      // No need to refresh - data comes via SSE
    } catch (error) {
      console.error('Error toggling strategy:', error);
    }
  };

  const onRefresh = () => {
    // Refresh is now handled via localConfigCache + SSE
    // No need for manual API call as the graph uses local cache immediately
    console.log('Config refresh triggered (using local cache)');
  };

  const handleSaveStrategy = async (config: CustomStrategyConfig) => {
    try {
      // Create strategy on ALL timeframes
      const allTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
      
      console.log(`🚀 Creating strategy "${config.name}" on all timeframes...`);
      
      // Use multi-timeframe API to create on all TFs at once
      const response = await fetch('/api/multi-timeframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyName: config.name,
          timeframes: allTimeframes,
          config // Pass the full config
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ Strategy "${config.name}" created on ${allTimeframes.length} timeframes!`);
        setShowStrategyBuilder(false);
        // Reload to see the new strategy
        window.location.reload();
      } else {
        console.error(`❌ Error: ${data.error || 'Failed to create strategy'}`);
      }
    } catch (error) {
      console.error('Error creating strategy:', error);
    }
  };

  const handleGenerateAIStrategy = async () => {
    setIsGeneratingAI(true);
    
    try {
      // Choisir aléatoirement le type de stratégie
      const types: ('aggressive' | 'balanced' | 'conservative')[] = ['aggressive', 'balanced', 'conservative'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      
      console.log(`🤖 Generating ${randomType} strategy with AI...`);
      
      // Préparer le contexte des stratégies existantes
      const existingStrategies = strategyPerformances.map(perf => {
        // Extraire les conditions principales si disponibles
        const criteria = getCriteriaForStrategy?.(perf.strategyType as any, perf);
        
        // Extract color from customConfig for CUSTOM strategies
        const color = perf.strategyType === 'CUSTOM' && perf.customConfig?.color 
          ? perf.customConfig.color 
          : undefined;
        
        return {
          name: perf.strategyName,
          type: perf.strategyType,
          focus: getStrategyFocus(perf.strategyType),
          conditions: criteria ? Object.keys(criteria.long).filter(k => !k.includes('Status')).join(', ') : 'N/A',
          color: color
        };
      });
      
      // Générer la stratégie avec l'IA
      const aiResponse = await fetch('/api/ai-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: '', // Pas d'instructions custom
          type: randomType,
          existingStrategies // Envoyer les stratégies existantes
        })
      });

      let aiData;
      try {
        aiData = await aiResponse.json();
      } catch (jsonError: any) {
        console.error('❌ Failed to parse AI response:', jsonError);
        throw new Error('Invalid response from AI API');
      }

      if (!aiResponse.ok) {
        console.error('❌ AI API error:', aiData.error);
        throw new Error(aiData.error || 'Failed to generate strategy');
      }

      const generatedStrategy = aiData.strategy;
      
      if (!generatedStrategy || !generatedStrategy.name) {
        console.error('❌ Invalid strategy structure:', generatedStrategy);
        throw new Error('AI generated invalid strategy');
      }
      
      console.log('✅ Strategy generated:', generatedStrategy.name);

      // Save strategy on ALL timeframes using multi-timeframe API
      const allTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
      const saveResponse = await fetch('/api/multi-timeframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyName: generatedStrategy.name,
          timeframes: allTimeframes,
          config: generatedStrategy
        })
      });

      const saveData = await saveResponse.json();

      if (saveResponse.ok) {
        console.log(`✨ AI Strategy "${generatedStrategy.name}" created on all timeframes!`);
        console.log(`📊 Type: ${randomType.toUpperCase()}`);
        console.log(`💡 ${generatedStrategy.description}`);
        // Reload to see the new strategy
        window.location.reload();
      } else {
        console.error(`❌ Error saving: ${saveData.error || 'Failed to save strategy'}`);
      }
    } catch (error: any) {
      console.error('❌ Error generating AI strategy:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const changeTimeframe = async (timeframe: string) => {
    if (timeframe === selectedTimeframe) return; // Éviter les changements inutiles
    
    // Activer le loading
    setIsChangingTimeframe(true);
    
    // Mise à jour instantanée de l'UI
    setSelectedTimeframe(timeframe);
    
    // Mettre à jour le state local immédiatement pour éviter le flash
    if (state) {
      setState({
        ...state,
        timeframe: timeframe
      });
    }
    
    // Changement en arrière-plan : juste envoyer un message au serveur pour changer le timeframe
    if (isConnected) {
      try {
        await fetch(`/api/trading?action=changeTimeframe&timeframe=${timeframe}`);
        // Le loading sera désactivé quand les nouvelles données arriveront via SSE
      } catch (error) {
        console.error('Error changing timeframe:', error);
        setIsChangingTimeframe(false);
      }
    } else {
      setIsChangingTimeframe(false);
    }
  };

  useEffect(() => {
    // Démarrer automatiquement l'affichage des données au chargement
    startDataStream();
    
    return () => {
      // Cleanup on unmount
      if (window.tradingEventSource) {
        window.tradingEventSource.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update strategy performances from SSE data
  useEffect(() => {
    if (state?.strategyPerformances) {
      setStrategyPerformances(state.strategyPerformances);
    }
  }, [state?.strategyPerformances]);

  const formatPrice = (price: number | undefined) => {
    if (!price) return '0.00';
    const numPrice = typeof price === 'number' ? price : parseFloat(price);
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
  };
  const formatIndicator = (value: number | undefined) => {
    if (!value) return '0.00';
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(numValue) ? '0.00' : numValue.toFixed(2);
  };
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR');
  };

  // Filter strategies by selected timeframe AND filter their trades to match timeframe
  const filteredStrategyPerformances = strategyPerformances
    .filter(p => p.timeframe === selectedTimeframe)
    .map(perf => {
      // Filter completedTrades to only include trades from this specific timeframe
      const filteredTrades = perf.completedTrades?.filter(trade => trade.timeframe === perf.timeframe) || [];
      
      // Recalculate all stats based on filtered trades only
      const totalTrades = filteredTrades.length;
      const winningTrades = filteredTrades.filter(t => t.isWin).length;
      const totalPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      
      // Calculate current capital based on filtered trades
      const currentCapital = 100000 + totalPnL;
      
      return {
        ...perf,
        completedTrades: filteredTrades,
        totalTrades,
        winningTrades,
        totalPnL,
        winRate,
        currentCapital
      };
    });

  const getSignalColor = (type: 'BUY' | 'SELL' | 'HOLD' | 'CLOSE_LONG' | 'CLOSE_SHORT') => {
    switch (type) {
      case 'BUY': return 'bg-green-500';
      case 'SELL': return 'bg-red-500';
      case 'CLOSE_LONG': return 'bg-orange-500';
      case 'CLOSE_SHORT': return 'bg-cyan-500';
      case 'HOLD': return 'bg-gray-500';
    }
  };

  const getSignalIcon = (type: 'BUY' | 'SELL' | 'HOLD' | 'CLOSE_LONG' | 'CLOSE_SHORT') => {
    switch (type) {
      case 'BUY': return '📈';
      case 'SELL': return '📉';
      case 'CLOSE_LONG': return '🔴';
      case 'CLOSE_SHORT': return '🟢';
      case 'HOLD': return '⏸️';
    }
  };

  const getRSIColor = (rsi: number) => {
    if (rsi < 30) return 'text-green-500 font-bold';
    if (rsi > 70) return 'text-red-500 font-bold';
    return 'text-yellow-500';
  };

  const getEMAStatus = () => {
    if (!state) return null;
    if (state.ema50 > state.ema200) {
      return <span className="text-green-500">🚀 Tendance haussière</span>;
    } else if (state.ema50 < state.ema200) {
      return <span className="text-red-500">📉 Tendance baissière</span>;
    }
    return <span className="text-gray-500">➡️ Neutre</span>;
  };

  // Get criteria for a specific strategy type
  type CriteriaReturn = { strategyType: string; long: Record<string, string | boolean>; short: Record<string, string | boolean>; cooldownRemaining: number; longReady?: boolean; shortReady?: boolean };

  const getCriteriaForStrategy = (strategyType: 'RSI_EMA' | 'MOMENTUM_CROSSOVER' | 'VOLUME_MACD' | 'BOLLINGER_BOUNCE' | 'TREND_FOLLOWER' | 'ATR_PULLBACK' | 'CUSTOM', strategyMetrics: StrategyPerformance): CriteriaReturn | null => {
    if (!state) return null;

    // Extract position from strategyMetrics
    const position = strategyMetrics.currentPosition;
    if (!position) return null;

    // Cooldown is now managed internally by strategies
    const cooldownRemaining = 0; // Always 0 (cooldown handled by strategy)
    const cooldownPassed = true;
    
    // Fonction pour déterminer si un critère est "proche"
    const getStatus = (value: boolean, isClose: boolean) => {
      if (value) return 'green'; // Validé
      if (isClose) return 'orange'; // Proche
      return 'gray'; // Par défaut
    };

    // Adapt criteria based on strategy type
    if (strategyType === 'MOMENTUM_CROSSOVER') {
      // For Momentum Crossover: Use REAL crossover detection from the strategy itself
      // Get crossover flags from the specific strategy performance
      
      const ema12 = state.ema12 || 0;
      const ema26 = state.ema26 || 0;
      const ema200Distance = state.currentPrice - state.ema200;
      
      // For Momentum Crossover, we need to check if we're in a position or not
      const hasNoPosition = position.type === 'NONE';
      
      // Get crossover flags from the Momentum strategy performance
      let isBullishCrossover = false;
      let isBearishCrossover = false;
      
      // If we have strategyMetrics with crossover flags, use them
      if (strategyMetrics && 'isBullishCrossover' in strategyMetrics) {
        isBullishCrossover = strategyMetrics.isBullishCrossover || false;
        isBearishCrossover = strategyMetrics.isBearishCrossover || false;
      }
      
      // LONG criteria: Use REAL bullish crossover from strategy
      const isPriceAboveEma200 = state.currentPrice > state.ema200;
      const longAllCriteria = isBullishCrossover && isPriceAboveEma200 && hasNoPosition && cooldownPassed;
      
      // SHORT criteria: Use REAL bearish crossover from strategy
      const isPriceBelowEma200 = state.currentPrice < state.ema200;
      const shortAllCriteria = isBearishCrossover && isPriceBelowEma200 && hasNoPosition && cooldownPassed;
      
      // Calculate proximity for orange status
      const emaDiff = Math.abs(ema12 - ema26);
      const emaPercent = (emaDiff / ema26) * 100;
      const isEmaClose = emaPercent < 0.5; // Less than 0.5% difference
      
      const criteria: CriteriaReturn = {
        strategyType: 'MOMENTUM_CROSSOVER' as const,
        long: {
          emaCrossover: isBullishCrossover,
          emaCrossoverStatus: getStatus(isBullishCrossover, isEmaClose && ema12 <= ema26),
          priceAboveEma200: isPriceAboveEma200,
          priceAboveEma200Status: getStatus(isPriceAboveEma200, Math.abs(ema200Distance) / state.ema200 < 0.01),
          noPosition: hasNoPosition,
          noPositionStatus: getStatus(hasNoPosition, false),
          cooldownPassed: cooldownPassed,
          cooldownPassedStatus: getStatus(cooldownPassed, cooldownRemaining > 0 && cooldownRemaining < 60000)
        },
        short: {
          emaCrossover: isBearishCrossover,
          emaCrossoverStatus: getStatus(isBearishCrossover, isEmaClose && ema12 >= ema26),
          priceBelowEma200: isPriceBelowEma200,
          priceBelowEma200Status: getStatus(isPriceBelowEma200, Math.abs(ema200Distance) / state.ema200 < 0.01),
          noPosition: hasNoPosition,
          noPositionStatus: getStatus(hasNoPosition, false),
          cooldownPassed: cooldownPassed,
          cooldownPassedStatus: getStatus(cooldownPassed, cooldownRemaining > 0 && cooldownRemaining < 60000)
        },
        cooldownRemaining: cooldownRemaining,
        // Only show READY when crossover is detected by strategy
        longReady: longAllCriteria,
        shortReady: shortAllCriteria
      };
      return criteria;
    }

    // VOLUME_MACD Strategy
    if (strategyType === 'VOLUME_MACD') {
      // Get Volume + MACD specific flags from strategy performance
      let isVolumeBreakout = false;
      let isMACDBullish = false;
      let isMACDBearish = false;
      
      if (strategyMetrics && 'isVolumeBreakout' in strategyMetrics) {
        isVolumeBreakout = strategyMetrics.isVolumeBreakout || false;
        isMACDBullish = strategyMetrics.isMACDBullish || false;
        isMACDBearish = strategyMetrics.isMACDBearish || false;
      }
      
      const hasNoPosition = position.type === 'NONE';
      
      // Calculate VWAP proximity (approximation for display)
      const vwapAbove = state.currentPrice > state.ema50; // Using EMA50 as VWAP proxy
      const vwapBelow = state.currentPrice < state.ema50;
      
      const longAllCriteria = isVolumeBreakout && isMACDBullish && vwapAbove && hasNoPosition && cooldownPassed;
      const shortAllCriteria = isVolumeBreakout && isMACDBearish && vwapBelow && hasNoPosition && cooldownPassed;
      
      const criteria: CriteriaReturn = {
        strategyType: 'VOLUME_MACD' as const,
        long: {
          volumeBreakout: isVolumeBreakout,
          volumeBreakoutStatus: getStatus(isVolumeBreakout, false),
          macdBullish: isMACDBullish,
          macdBullishStatus: getStatus(isMACDBullish, false),
          priceAboveVWAP: vwapAbove,
          priceAboveVWAPStatus: getStatus(vwapAbove, false),
          noPosition: hasNoPosition,
          noPositionStatus: getStatus(hasNoPosition, false),
          cooldownPassed: cooldownPassed,
          cooldownPassedStatus: getStatus(cooldownPassed, cooldownRemaining > 0 && cooldownRemaining < 60000)
        },
        short: {
          volumeBreakout: isVolumeBreakout,
          volumeBreakoutStatus: getStatus(isVolumeBreakout, false),
          macdBearish: isMACDBearish,
          macdBearishStatus: getStatus(isMACDBearish, false),
          priceBelowVWAP: vwapBelow,
          priceBelowVWAPStatus: getStatus(vwapBelow, false),
          noPosition: hasNoPosition,
          noPositionStatus: getStatus(hasNoPosition, false),
          cooldownPassed: cooldownPassed,
          cooldownPassedStatus: getStatus(cooldownPassed, cooldownRemaining > 0 && cooldownRemaining < 60000)
        },
        cooldownRemaining: cooldownRemaining,
        longReady: longAllCriteria,
        shortReady: shortAllCriteria
      };
      return criteria;
    }

    // NEURAL_SCALPER Strategy

    // BOLLINGER_BOUNCE Strategy
    if (strategyType === 'BOLLINGER_BOUNCE') {
      const hasNoPosition = position.type === 'NONE';
      
      // Approximate Bollinger Bands using EMA values
      // Upper band ≈ EMA12, Middle ≈ EMA26, Lower ≈ EMA50 (approximation for display)
      const upperBand = state.ema12 || state.currentPrice * 1.02;
      const middleBand = state.ema26 || state.currentPrice;
      const lowerBand = state.ema50 || state.currentPrice * 0.98;
      
      // Calculate distance from bands as percentage
      const distanceFromLower = ((state.currentPrice - lowerBand) / lowerBand) * 100;
      const distanceFromUpper = ((upperBand - state.currentPrice) / state.currentPrice) * 100;
      
      // LONG criteria: Price near lower band + RSI oversold
      const nearLowerBand = distanceFromLower <= 1; // Within 1% of lower band
      const nearLowerBandClose = distanceFromLower <= 2 && distanceFromLower > 1; // Between 1-2%
      const rsiOversold = state.rsi < 45;
      const rsiOversoldClose = state.rsi >= 45 && state.rsi < 50;
      
      // Calculate BB width (volatility indicator)
      const bbWidth = ((upperBand - lowerBand) / middleBand) * 100;
      const isVolatile = bbWidth > 3; // BB width > 3%
      const isVolatilityClose = bbWidth > 2.5 && bbWidth <= 3;
      
      const longAllCriteria = nearLowerBand && rsiOversold && isVolatile && hasNoPosition;
      
      // SHORT criteria: Price near upper band + RSI overbought (moins utilisé)
      const nearUpperBand = distanceFromUpper <= 1;
      const nearUpperBandClose = distanceFromUpper <= 2 && distanceFromUpper > 1;
      const rsiOverbought = state.rsi > 60;
      const rsiOverboughtClose = state.rsi >= 55 && state.rsi <= 60;
      
      const shortAllCriteria = nearUpperBand && rsiOverbought && isVolatile && hasNoPosition;
      
      const criteria: CriteriaReturn = {
        strategyType: 'BOLLINGER_BOUNCE' as const,
        long: {
          nearLowerBand: nearLowerBand,
          nearLowerBandStatus: getStatus(nearLowerBand, nearLowerBandClose),
          distanceValue: `${distanceFromLower.toFixed(2)}%`,
          rsiOversold: rsiOversold,
          rsiOversoldStatus: getStatus(rsiOversold, rsiOversoldClose),
          rsiValue: formatIndicator(state.rsi),
          volatility: isVolatile,
          volatilityStatus: getStatus(isVolatile, isVolatilityClose),
          bbWidthValue: `${bbWidth.toFixed(1)}%`,
          noPosition: hasNoPosition,
          noPositionStatus: getStatus(hasNoPosition, false)
        },
        short: {
          nearUpperBand: nearUpperBand,
          nearUpperBandStatus: getStatus(nearUpperBand, nearUpperBandClose),
          distanceValue: `${distanceFromUpper.toFixed(2)}%`,
          rsiOverbought: rsiOverbought,
          rsiOverboughtStatus: getStatus(rsiOverbought, rsiOverboughtClose),
          rsiValue: formatIndicator(state.rsi),
          volatility: isVolatile,
          volatilityStatus: getStatus(isVolatile, isVolatilityClose),
          bbWidthValue: `${bbWidth.toFixed(1)}%`,
          noPosition: hasNoPosition,
          noPositionStatus: getStatus(hasNoPosition, false)
        },
        cooldownRemaining: 0, // No cooldown for Bollinger Bounce
        longReady: longAllCriteria,
        shortReady: shortAllCriteria
      };
      return criteria;
    }

    // TREND_FOLLOWER Strategy
    if (strategyType === 'TREND_FOLLOWER') {
      // Vérifier que les valeurs sont valides
      const hasValidData = state.currentPrice > 0 && state.ema50 > 0;
      
      if (!hasValidData) {
        return {
          strategyType: 'TREND_FOLLOWER' as const,
          long: {
            priceAboveEma: false,
            priceAboveEmaStatus: 'gray',
            trendConfirmed: false,
            trendConfirmedStatus: 'gray'
          },
          short: {
            priceBelowEma: false,
            priceBelowEmaStatus: 'gray',
            trendConfirmed: false,
            trendConfirmedStatus: 'gray'
          },
          cooldownRemaining: 0,
          longReady: false,
          shortReady: false
        };
      }
      
      // Critère 1 : Prix vs EMA50
      const priceAboveEma50 = state.currentPrice > state.ema50;
      const priceBelowEma50 = state.currentPrice < state.ema50;
      
      // Calculer la différence de prix vs EMA pour déterminer si "proche"
      const priceDiffPercent = Math.abs((state.currentPrice - state.ema50) / state.ema50) * 100;
      const isCloseToEma = priceDiffPercent < 0.5; // Moins de 0.5% de différence = orange
      
      // Critère 2 : Confirmation de tendance (réelle) = 3 clôtures consécutives au-dessus/au-dessous de l'EMA50
      const trendConfirmedLong = !!state.isUptrendConfirmed3;
      const trendConfirmedShort = !!state.isDowntrendConfirmed3;
      
      const criteria: CriteriaReturn = {
        strategyType: 'TREND_FOLLOWER' as const,
        long: {
          priceAboveEma: priceAboveEma50,
          priceAboveEmaStatus: getStatus(priceAboveEma50, isCloseToEma),
          trendConfirmed: trendConfirmedLong && priceAboveEma50,
          trendConfirmedStatus: getStatus(trendConfirmedLong && priceAboveEma50, !trendConfirmedLong && priceAboveEma50)
        },
        short: {
          priceBelowEma: priceBelowEma50,
          priceBelowEmaStatus: getStatus(priceBelowEma50, isCloseToEma),
          trendConfirmed: trendConfirmedShort && priceBelowEma50,
          trendConfirmedStatus: getStatus(trendConfirmedShort && priceBelowEma50, !trendConfirmedShort && priceBelowEma50)
        },
        cooldownRemaining: 0,
        longReady: priceAboveEma50 && trendConfirmedLong,
        shortReady: priceBelowEma50 && trendConfirmedShort
      };
      
      // Debug pour Trend Follower
      console.log('🔍 TREND_FOLLOWER Criteria:', {
        price: state.currentPrice,
        ema50: state.ema50,
        priceAboveEma50,
        priceDiffPercent,
        trendConfirmedLong,
        trendConfirmedShort,
        longStatus: criteria.long.priceAboveEmaStatus,
        longConfStatus: criteria.long.trendConfirmedStatus,
        shortStatus: criteria.short.priceBelowEmaStatus,
        shortConfStatus: criteria.short.trendConfirmedStatus
      });
      
      return criteria;
    }

    // ATR_PULLBACK Strategy (approximation UI)
    if (strategyType === 'ATR_PULLBACK') {
      const hasNoPosition = position.type === 'NONE';
      const price = state.currentPrice;
      const ema50 = state.ema50;
      const ema200 = state.ema200;
      const uptrend = ema50 > ema200;
      const downtrend = ema50 < ema200;
      // Approx ATR as 1% of price when not available on UI side
      const approxAtr = price * 0.01;
      const distance = Math.abs(price - ema50);
      const nearBand = distance <= 0.5 * approxAtr;
      const nearBandClose = !nearBand && distance <= 0.8 * approxAtr;
      const rsi = state.rsi;
      const rsiLong = rsi >= 35 && rsi <= 55;
      const rsiLongClose = (rsi >= 30 && rsi < 35) || (rsi > 55 && rsi <= 60);
      const rsiShort = rsi >= 45 && rsi <= 65;
      const rsiShortClose = (rsi >= 40 && rsi < 45) || (rsi > 65 && rsi <= 70);

      // Reversal detection using last two candles (UI approximation)
      let bullishReversal = false;
      let bearishReversal = false;
      if (state.candles.length >= 2) {
        const prevC = state.candles[state.candles.length - 2];
        const currC = state.candles[state.candles.length - 1];
        bullishReversal = prevC.close < prevC.open && currC.close > currC.open;
        bearishReversal = prevC.close > prevC.open && currC.close < currC.open;
      }

      // Cooldown retiré pour ATR (géré côté nom/label si besoin)
      const atrCooldownRemaining = 0;
      const longAll = uptrend && nearBand && rsiLong && bullishReversal && hasNoPosition;
      const shortAll = downtrend && nearBand && rsiShort && bearishReversal && hasNoPosition;

      const criteria: CriteriaReturn = {
        strategyType: 'ATR_PULLBACK' as const,
        long: {
          uptrend,
          uptrendStatus: getStatus(uptrend, Math.abs((ema50 - ema200) / (ema200 || 1)) < 0.005),
          nearEma50: nearBand,
          nearEma50Status: getStatus(nearBand, nearBandClose),
          rsiNeutral: rsiLong,
          rsiNeutralStatus: getStatus(rsiLong, rsiLongClose),
          reversal: bullishReversal,
          reversalStatus: getStatus(bullishReversal, false),
          noPosition: hasNoPosition,
          noPositionStatus: getStatus(hasNoPosition, false),
          // cooldown retiré des points
        },
        short: {
          downtrend,
          downtrendStatus: getStatus(downtrend, Math.abs((ema50 - ema200) / (ema200 || 1)) < 0.005),
          nearEma50: nearBand,
          nearEma50Status: getStatus(nearBand, nearBandClose),
          rsiNeutral: rsiShort,
          rsiNeutralStatus: getStatus(rsiShort, rsiShortClose),
          reversal: bearishReversal,
          reversalStatus: getStatus(bearishReversal, false),
          noPosition: hasNoPosition,
          noPositionStatus: getStatus(hasNoPosition, false),
          // cooldown retiré des points
        },
        cooldownRemaining: atrCooldownRemaining,
        longReady: longAll,
        shortReady: shortAll
      };
      return criteria;
    }

    // CUSTOM Strategy - Évaluer les conditions en temps réel
    if (strategyType === 'CUSTOM') {
      const hasNoPosition = position.type === 'NONE';
      
      // Extraire et évaluer les indicateurs depuis customConfig
      const customConfig = (strategyMetrics as any).customConfig;
      const longIndicators: Record<string, { value: boolean; status: string }> = {};
      const shortIndicators: Record<string, { value: boolean; status: string }> = {};
      
      if (customConfig && state) {
        // Helper pour évaluer une condition
        const evaluateCondition = (cond: any): { met: boolean; close: boolean } => {
          if (!cond || !cond.indicator) return { met: false, close: false };
          
          // Get indicator value from state (basic indicators only)
          const indicatorValue = (state as any)[cond.indicator];
          if (indicatorValue === undefined) return { met: false, close: false };
          
          if (cond.type === 'comparison') {
            const val = indicatorValue;
            const threshold = cond.value;
            const margin = threshold * 0.1; // 10% margin for "close"
            
            switch (cond.operator) {
              case 'GT':
                return { 
                  met: val > threshold, 
                  close: val > threshold * 0.9 && val <= threshold 
                };
              case 'LT':
                return { 
                  met: val < threshold, 
                  close: val < threshold * 1.1 && val >= threshold 
                };
              case 'GTE':
                return { 
                  met: val >= threshold, 
                  close: val >= threshold * 0.9 && val < threshold 
                };
              case 'LTE':
                return { 
                  met: val <= threshold, 
                  close: val <= threshold * 1.1 && val > threshold 
                };
              case 'EQ':
                return { 
                  met: Math.abs(val - threshold) < margin, 
                  close: Math.abs(val - threshold) < margin * 2 
                };
              default:
                return { met: false, close: false };
            }
          } else if (cond.type === 'boolean') {
            // Proximity heuristics for boolean indicators to allow 'orange' state
            const met = indicatorValue === cond.value;
            let closeTo = false;
            try {
              // Price vs EMA50 proximity (~0.5%)
              const price = (state as any).currentPrice as number | undefined;
              const ema50 = (state as any).ema50 as number | undefined;
              const ema200 = (state as any).ema200 as number | undefined;
              const priceDiffPct = price && ema50 ? Math.abs((price - ema50) / (ema50 || 1)) : undefined;
              const emaDiffPct = ema50 && ema200 ? Math.abs((ema50 - ema200) / (ema200 || 1)) : undefined;

              // isUptrend / isDowntrend (price vs EMA50)
              if (!met && (cond.indicator === 'isUptrend' || cond.indicator === 'isDowntrend')) {
                closeTo = !!priceDiffPct && priceDiffPct < 0.005; // < 0.5%
              }

              // isBullishTrend / isBearishTrend (EMA50 vs EMA200)
              if (!met && (cond.indicator === 'isBullishTrend' || cond.indicator === 'isBearishTrend')) {
                closeTo = !!emaDiffPct && emaDiffPct < 0.005; // < 0.5%
              }

              // isUptrendConfirmed3 / isDowntrendConfirmed3
              if (!met && cond.indicator === 'isUptrendConfirmed3') {
                const isUp = !!(state as any).isUptrend;
                closeTo = isUp && !!priceDiffPct && priceDiffPct < 0.005;
              }
              if (!met && cond.indicator === 'isDowntrendConfirmed3') {
                const isDown = !!(state as any).isDowntrend;
                closeTo = isDown && !!priceDiffPct && priceDiffPct < 0.005;
              }
            } catch {}
            return { met, close: closeTo };
          } else if (cond.type === 'range') {
            const val = indicatorValue;
            const inRange = val >= cond.min && val <= cond.max;
            const closeToRange = val >= cond.min * 0.9 && val <= cond.max * 1.1;
            return { met: inRange, close: !inRange && closeToRange };
          }
          
          return { met: false, close: false };
        };
        
        // Extract and evaluate indicators from conditions
        const processConditions = (conditions: any, targetMap: Record<string, { value: boolean; status: string }>) => {
          if (!conditions || !conditions.conditions) return;
          
          conditions.conditions.forEach((cond: any) => {
            if (cond.type === 'comparison' || cond.type === 'boolean' || cond.type === 'range') {
              if (cond.indicator && !targetMap[cond.indicator]) {
                const result = evaluateCondition(cond);
                targetMap[cond.indicator] = {
                  value: result.met,
                  status: result.met ? 'green' : result.close ? 'orange' : 'gray'
                };
              }
            }
            // Recursive for nested groups
            if (cond.operator === 'AND' || cond.operator === 'OR' || cond.operator === 'NOT') {
              processConditions(cond, targetMap);
            }
          });
        };
        
        // Process long and short conditions
        if (customConfig.longEntryConditions) {
          processConditions(customConfig.longEntryConditions, longIndicators);
        }
        if (customConfig.shortEntryConditions) {
          processConditions(customConfig.shortEntryConditions, shortIndicators);
        }
      }
      
      // Check if all conditions are met
      const longAllMet = Object.values(longIndicators).every(ind => ind.value) && hasNoPosition && cooldownPassed;
      const shortAllMet = Object.values(shortIndicators).every(ind => ind.value) && hasNoPosition && cooldownPassed;
      
      const criteria: CriteriaReturn = {
        strategyType: 'CUSTOM' as const,
        long: {
          customIndicators: JSON.stringify(longIndicators), // Serialize for type compatibility
          noPosition: hasNoPosition,
          noPositionStatus: getStatus(hasNoPosition, false),
          cooldownPassed: cooldownPassed,
          cooldownPassedStatus: getStatus(cooldownPassed, cooldownRemaining > 0 && cooldownRemaining < 60000),
          _customIndicatorsData: longIndicators as any // Hidden property for actual data
        },
        short: {
          customIndicators: JSON.stringify(shortIndicators),
          noPosition: hasNoPosition,
          noPositionStatus: getStatus(hasNoPosition, false),
          cooldownPassed: cooldownPassed,
          cooldownPassedStatus: getStatus(cooldownPassed, cooldownRemaining > 0 && cooldownRemaining < 60000),
          _customIndicatorsData: shortIndicators as any
        },
        cooldownRemaining: cooldownRemaining,
        longReady: longAllMet,
        shortReady: shortAllMet
      };
      return criteria;
    }

    // Default: RSI + EMA Strategy
    const emaDiff = Math.abs(state.ema50 - state.ema200);
    const emaPercent = (emaDiff / state.ema200) * 100;
    const isEmaClose = emaPercent < 1; // Moins de 1% de différence
    
    const longRsiClose = state.rsi < 40 && state.rsi >= 30; // RSI entre 30 et 40
    const shortRsiClose = state.rsi > 60 && state.rsi <= 70; // RSI entre 60 et 70
    
    const cooldownClose = cooldownRemaining > 0 && cooldownRemaining < 60000; // Moins d'1 minute
    
    const criteria: CriteriaReturn = {
      strategyType: 'RSI_EMA' as const,
      long: {
        emaTrend: state.ema50 > state.ema200,
        emaTrendStatus: getStatus(state.ema50 > state.ema200, isEmaClose && state.ema50 <= state.ema200),
        rsiOversold: state.rsi < 30,
        rsiOversoldStatus: getStatus(state.rsi < 30, longRsiClose),
        noPosition: position.type === 'NONE',
        noPositionStatus: getStatus(position.type === 'NONE', false),
        cooldownPassed: cooldownPassed,
        cooldownPassedStatus: getStatus(cooldownPassed, cooldownClose)
      },
      short: {
        emaTrend: state.ema50 < state.ema200,
        emaTrendStatus: getStatus(state.ema50 < state.ema200, isEmaClose && state.ema50 >= state.ema200),
        rsiOverbought: state.rsi > 70,
        rsiOverboughtStatus: getStatus(state.rsi > 70, shortRsiClose),
        noPosition: position.type === 'NONE',
        noPositionStatus: getStatus(position.type === 'NONE', false),
        cooldownPassed: cooldownPassed,
        cooldownPassedStatus: getStatus(cooldownPassed, cooldownClose)
      },
      cooldownRemaining: cooldownRemaining
    };

    return criteria;
  };

  // Get trading criteria for selected strategy
  const getTradingCriteria = () => {
    if (!state) return null;

    if (selectedStrategy === 'GLOBAL') {
      // For global view, use the first RSI_EMA strategy if available
      const rsiEmaStrategy = strategyPerformances.find(p => p.strategyType === 'RSI_EMA');
      if (!rsiEmaStrategy) return null;
      return getCriteriaForStrategy('RSI_EMA', rsiEmaStrategy);
    }

    // Get the selected strategy type
    const selectedStrategyData = strategyPerformances.find(p => p.strategyName === selectedStrategy);
    if (!selectedStrategyData) return null;

    return getCriteriaForStrategy(selectedStrategyData.strategyType, selectedStrategyData);
  };

  // Fonction pour obtenir la classe CSS du point en fonction du statut
  const getStatusClass = (status: string | boolean, allReady: boolean = false) => {
    const statusStr = String(status);
    switch (statusStr) {
      case 'green': return allReady ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse' : 'bg-green-400/50';
      case 'orange': return 'bg-orange-400/50';
      case 'gray': return 'bg-gray-500/40';
      default: return 'bg-gray-500/40';
    }
  };


  // Strategy color mapping
  const getStrategyFocus = (strategyType: string): string => {
    switch (strategyType) {
      case 'RSI_EMA': return 'RSI + EMA trend (mean reversion)';
      case 'MOMENTUM_CROSSOVER': return 'EMA crossovers (momentum)';
      case 'VOLUME_MACD': return 'Volume + MACD (breakout)';
      case 'BOLLINGER_BOUNCE': return 'Bollinger Bands (mean reversion)';
      case 'TREND_FOLLOWER': return 'EMA50 trend following';
      case 'ATR_PULLBACK': return 'ATR pullback in trend';
      case 'CUSTOM': return 'Custom indicators';
      default: return 'Unknown';
    }
  };

  const getStrategyColor = (strategyType: string, customColor?: string) => {
    // For CUSTOM strategies, use predefined color mapping
    if (strategyType === 'CUSTOM' && customColor) {
      const colorMap: Record<string, any> = {
        emerald: { border: 'border-emerald-400', text: 'text-emerald-400', accent: 'bg-emerald-400', bgSelected: 'bg-emerald-950/40' },
        rose: { border: 'border-rose-400', text: 'text-rose-400', accent: 'bg-rose-400', bgSelected: 'bg-rose-950/40' },
        indigo: { border: 'border-indigo-400', text: 'text-indigo-400', accent: 'bg-indigo-400', bgSelected: 'bg-indigo-950/40' },
        violet: { border: 'border-violet-400', text: 'text-violet-400', accent: 'bg-violet-400', bgSelected: 'bg-violet-950/40' },
        amber: { border: 'border-amber-400', text: 'text-amber-400', accent: 'bg-amber-400', bgSelected: 'bg-amber-950/40' },
        lime: { border: 'border-lime-400', text: 'text-lime-400', accent: 'bg-lime-400', bgSelected: 'bg-lime-950/40' },
        sky: { border: 'border-sky-400', text: 'text-sky-400', accent: 'bg-sky-400', bgSelected: 'bg-sky-950/40' },
        fuchsia: { border: 'border-fuchsia-400', text: 'text-fuchsia-400', accent: 'bg-fuchsia-400', bgSelected: 'bg-fuchsia-950/40' },
        pink: { border: 'border-pink-400', text: 'text-pink-400', accent: 'bg-pink-400', bgSelected: 'bg-pink-950/40' },
        red: { border: 'border-red-400', text: 'text-red-400', accent: 'bg-red-400', bgSelected: 'bg-red-950/40' },
        green: { border: 'border-green-400', text: 'text-green-400', accent: 'bg-green-400', bgSelected: 'bg-green-950/40' },
        slate: { border: 'border-slate-400', text: 'text-slate-400', accent: 'bg-slate-400', bgSelected: 'bg-slate-950/40' },
        stone: { border: 'border-stone-400', text: 'text-stone-400', accent: 'bg-stone-400', bgSelected: 'bg-stone-950/40' }
      };
      
      return colorMap[customColor] || colorMap.fuchsia; // Fallback to fuchsia
    }
    
    switch (strategyType) {
      case 'RSI_EMA':
        return {
          border: 'border-blue-400',
          text: 'text-blue-400',
          accent: 'bg-blue-400',
          bgSelected: 'bg-blue-950/40'
        };
      case 'MOMENTUM_CROSSOVER':
        return {
          border: 'border-purple-400',
          text: 'text-purple-400',
          accent: 'bg-purple-400',
          bgSelected: 'bg-purple-950/40'
        };
      case 'VOLUME_MACD':
        return {
          border: 'border-orange-400',
          text: 'text-orange-400',
          accent: 'bg-orange-400',
          bgSelected: 'bg-orange-950/40'
        };
      case 'BOLLINGER_BOUNCE':
        return {
          border: 'border-teal-400',
          text: 'text-teal-400',
          accent: 'bg-teal-400',
          bgSelected: 'bg-teal-950/40'
        };
      case 'TREND_FOLLOWER':
        return {
          border: 'border-cyan-400',
          text: 'text-cyan-400',
          accent: 'bg-cyan-400',
          bgSelected: 'bg-cyan-950/40'
        };
      case 'ATR_PULLBACK':
        return {
          border: 'border-yellow-400',
          text: 'text-yellow-400',
          accent: 'bg-yellow-400',
          bgSelected: 'bg-yellow-950/40'
        };
      case 'CUSTOM':
        // Fallback for CUSTOM without color
        return {
          border: 'border-fuchsia-400',
          text: 'text-fuchsia-400',
          accent: 'bg-fuchsia-400',
          bgSelected: 'bg-fuchsia-950/40'
        };
      default:
        return {
          border: 'border-gray-400',
          text: 'text-gray-400',
          accent: 'bg-gray-400',
          bgSelected: 'bg-gray-950/40'
        };
    }
  };

  // Get statuses array for a criteria object
  const getStatusesArray = (criteria: { strategyType: string; long: Record<string, string | boolean>; short: Record<string, string | boolean>; cooldownRemaining: number }, type: 'long' | 'short'): string[] => {
    const criteriaData = type === 'long' ? criteria.long : criteria.short;
    
    if (criteria.strategyType === 'MOMENTUM_CROSSOVER') {
      return type === 'long'
        ? [
            criteriaData.emaCrossoverStatus as string,
            criteriaData.priceAboveEma200Status as string
          ]
        : [
            criteriaData.emaCrossoverStatus as string,
            criteriaData.priceBelowEma200Status as string
          ];
    }
    
    if (criteria.strategyType === 'VOLUME_MACD') {
      return type === 'long'
        ? [
            criteriaData.volumeBreakoutStatus as string,
            criteriaData.macdBullishStatus as string,
            criteriaData.priceAboveVWAPStatus as string
          ]
        : [
            criteriaData.volumeBreakoutStatus as string,
            criteriaData.macdBearishStatus as string,
            criteriaData.priceBelowVWAPStatus as string
          ];
    }
    
    if (criteria.strategyType === 'NEURAL_SCALPER') {
      return type === 'long'
        ? [
            criteriaData.accelerationPositiveStatus as string,
            criteriaData.velocityPositiveStatus as string,
            criteriaData.volumeOrVolatilityStatus as string,
            criteriaData.priceAboveVWAPStatus as string,
            criteriaData.rsiMomentumBullishStatus as string
          ]
        : [
            criteriaData.accelerationNegativeStatus as string,
            criteriaData.velocityNegativeStatus as string,
            criteriaData.volumeOrVolatilityStatus as string,
            criteriaData.priceBelowVWAPStatus as string,
            criteriaData.rsiMomentumBearishStatus as string
          ];
    }
    
    if (criteria.strategyType === 'BOLLINGER_BOUNCE') {
      return type === 'long'
        ? [
            criteriaData.nearLowerBandStatus as string,
            criteriaData.rsiOversoldStatus as string,
            criteriaData.volatilityStatus as string
          ]
        : [
            criteriaData.nearUpperBandStatus as string,
            criteriaData.rsiOverboughtStatus as string,
            criteriaData.volatilityStatus as string
          ];
    }

    if (criteria.strategyType === 'TREND_FOLLOWER') {
      return type === 'long'
        ? [
            criteriaData.priceAboveEmaStatus as string,
            criteriaData.trendConfirmedStatus as string
          ]
        : [
            criteriaData.priceBelowEmaStatus as string,
            criteriaData.trendConfirmedStatus as string
          ];
    }

    if (criteria.strategyType === 'ATR_PULLBACK') {
      return type === 'long'
        ? [
            criteriaData.uptrendStatus as string,
            criteriaData.nearEma50Status as string,
            criteriaData.rsiNeutralStatus as string,
            criteriaData.reversalStatus as string
          ]
        : [
            criteriaData.downtrendStatus as string,
            criteriaData.nearEma50Status as string,
            criteriaData.rsiNeutralStatus as string,
            criteriaData.reversalStatus as string
          ];
    }
    
    // CUSTOM Strategy - Extract statuses from customIndicators (indicators only, not cooldown/position)
    if (criteria.strategyType === 'CUSTOM') {
      const statuses: string[] = [];
      const indicators = (criteriaData as any)._customIndicatorsData as Record<string, { value: boolean; status: string }> | undefined;
      if (indicators && typeof indicators === 'object') {
        Object.values(indicators).forEach(data => {
          if (data && typeof data === 'object' && 'status' in data) {
            statuses.push(data.status);
          }
        });
      }
      // Note: cooldown and position are displayed separately, not as dots
      return statuses;
    }
    
    // RSI_EMA (default)
    return type === 'long'
      ? [
          criteriaData.emaTrendStatus as string,
          criteriaData.rsiOversoldStatus as string
        ]
      : [
          criteriaData.emaTrendStatus as string,
          criteriaData.rsiOverboughtStatus as string
        ];
  };

  // Get mini indicator statuses based on strategy type
  const getMiniIndicatorStatuses = (criteria: { strategyType: string; long: Record<string, string | boolean>; short: Record<string, string | boolean>; cooldownRemaining: number }, type: 'long' | 'short') => {
    const criteriaData = type === 'long' ? criteria.long : criteria.short;
    
    if (criteria.strategyType === 'MOMENTUM_CROSSOVER') {
      return [
        criteriaData.emaCrossoverStatus as string,
        (criteriaData.priceAboveEma200Status || criteriaData.priceBelowEma200Status) as string
      ];
    }
    
    if (criteria.strategyType === 'VOLUME_MACD') {
      return [
        criteriaData.volumeBreakoutStatus as string,
        (criteriaData.macdBullishStatus || criteriaData.macdBearishStatus) as string,
        (criteriaData.priceAboveVWAPStatus || criteriaData.priceBelowVWAPStatus) as string
      ];
    }
    
    if (criteria.strategyType === 'NEURAL_SCALPER') {
      return [
        (criteriaData.accelerationPositiveStatus || criteriaData.accelerationNegativeStatus) as string,
        (criteriaData.velocityPositiveStatus || criteriaData.velocityNegativeStatus) as string,
        criteriaData.volumeOrVolatilityStatus as string,
        (criteriaData.priceAboveVWAPStatus || criteriaData.priceBelowVWAPStatus) as string,
        (criteriaData.rsiMomentumBullishStatus || criteriaData.rsiMomentumBearishStatus) as string
      ];
    }
    
    if (criteria.strategyType === 'BOLLINGER_BOUNCE') {
      return [
        (criteriaData.nearLowerBandStatus || criteriaData.nearUpperBandStatus) as string,
        (criteriaData.rsiOversoldStatus || criteriaData.rsiOverboughtStatus) as string,
        criteriaData.volatilityStatus as string
      ];
    }
    
    if (criteria.strategyType === 'TREND_FOLLOWER') {
      return type === 'long'
        ? [criteriaData.priceAboveEmaStatus as string, criteriaData.trendConfirmedStatus as string]
        : [criteriaData.priceBelowEmaStatus as string, criteriaData.trendConfirmedStatus as string];
    }
    
    // CUSTOM Strategy - Extract statuses from customIndicators (indicators only, not cooldown/position)
    if (criteria.strategyType === 'CUSTOM') {
      const statuses: string[] = [];
      const indicators = (criteriaData as any)._customIndicatorsData as Record<string, { value: boolean; status: string }> | undefined;
      if (indicators && typeof indicators === 'object') {
        Object.values(indicators).forEach(data => {
          if (data && typeof data === 'object' && 'status' in data) {
            statuses.push(data.status);
          }
        });
      }
      // Note: cooldown and position are displayed separately, not as dots
      return statuses;
    }
    
    // RSI + EMA (default)
    return [
      criteriaData.emaTrendStatus as string,
      (criteriaData.rsiOversoldStatus || criteriaData.rsiOverboughtStatus) as string
    ];
  };

  // Render criteria labels based on strategy type
  const renderCriteriaLabels = (criteria: { strategyType: string; long: Record<string, string | boolean>; short: Record<string, string | boolean>; cooldownRemaining: number }, type: 'long' | 'short', _allReady: boolean = false) => {
    const criteriaData = type === 'long' ? criteria.long : criteria.short;
    
    // CUSTOM Strategy - Afficher les indicateurs avec statuts dynamiques
    if (criteria.strategyType === 'CUSTOM') {
      const indicators = (criteriaData as any)._customIndicatorsData as Record<string, { value: boolean; status: string }> | undefined;
      
      if (!indicators || Object.keys(indicators).length === 0) {
        return (
          <span className="flex items-center gap-1 text-gray-500">
            <span className="w-1 h-1 rounded-full bg-gray-500"></span>
            No conditions
          </span>
        );
      }
      
      const indicatorEntries = Object.entries(indicators);
      // Display all indicators (no limit) since we have dots for each
      const displayedIndicators = indicatorEntries;
      const remainingCount = 0; // No remaining since we show all
      
      return (
        <>
          {displayedIndicators.map(([name, data], idx) => {
            const statusColor = 
              data.status === 'green' ? 'text-green-400' :
              data.status === 'orange' ? 'text-orange-400' :
              'text-gray-500';
            
            return (
              <span 
                key={idx}
                className={`flex items-center gap-1 ${statusColor}`}
                title={`${name}: ${data.value ? '✓ Met' : '✗ Not met'}`}
              >
                <span className={`w-1 h-1 rounded-full ${getStatusClass(data.status)}`}></span>
                {name}
              </span>
            );
          })}
          {remainingCount > 0 && (
            <span 
              className="flex items-center gap-1 text-cyan-400"
              title={`+ ${remainingCount} more indicators`}
            >
              <span className="w-1 h-1 rounded-full bg-cyan-500"></span>
              +{remainingCount}
            </span>
          )}
        </>
      );
    }
    
    if (criteria.strategyType === 'MOMENTUM_CROSSOVER') {
      // Momentum Crossover criteria
      if (type === 'long') {
        return (
          <>
            <span 
              className={`flex items-center gap-1 ${criteriaData.emaCrossoverStatus === 'green' ? 'text-green-400' : criteriaData.emaCrossoverStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="EMA(12) > EMA(26) (croisement haussier)"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.emaCrossoverStatus)}`}></span>
              Cross↗
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.priceAboveEma200Status === 'green' ? 'text-green-400' : criteriaData.priceAboveEma200Status === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title={`Prix > EMA(200)`}
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.priceAboveEma200Status)}`}></span>
              P{'>'}200
            </span>
          </>
        );
      } else {
        return (
          <>
            <span 
              className={`flex items-center gap-1 ${criteriaData.emaCrossoverStatus === 'green' ? 'text-green-400' : criteriaData.emaCrossoverStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="EMA(12) < EMA(26) (croisement baissier)"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.emaCrossoverStatus)}`}></span>
              Cross↘
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.priceBelowEma200Status === 'green' ? 'text-green-400' : criteriaData.priceBelowEma200Status === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title={`Prix < EMA(200)`}
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.priceBelowEma200Status)}`}></span>
              P{'<'}200
            </span>
          </>
        );
      }
    }
    
    // VOLUME_MACD Strategy
    if (criteria.strategyType === 'VOLUME_MACD') {
      if (type === 'long') {
        return (
          <>
            <span 
              className={`flex items-center gap-1 ${criteriaData.volumeBreakoutStatus === 'green' ? 'text-green-400' : criteriaData.volumeBreakoutStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="Volume > 2x moyenne (explosion de volume)"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.volumeBreakoutStatus)}`}></span>
              Vol↑
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.macdBullishStatus === 'green' ? 'text-green-400' : criteriaData.macdBullishStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="MACD croisement haussier (histogram > 0)"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.macdBullishStatus)}`}></span>
              MACD↗
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.priceAboveVWAPStatus === 'green' ? 'text-green-400' : criteriaData.priceAboveVWAPStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="Prix > VWAP (au-dessus de la moyenne pondérée)"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.priceAboveVWAPStatus)}`}></span>
              P{'>'}VWAP
            </span>
          </>
        );
      } else {
        return (
          <>
            <span 
              className={`flex items-center gap-1 ${criteriaData.volumeBreakoutStatus === 'green' ? 'text-green-400' : criteriaData.volumeBreakoutStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="Volume > 2x moyenne (explosion de volume)"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.volumeBreakoutStatus)}`}></span>
              Vol↑
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.macdBearishStatus === 'green' ? 'text-green-400' : criteriaData.macdBearishStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="MACD croisement baissier (histogram < 0)"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.macdBearishStatus)}`}></span>
              MACD↘
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.priceBelowVWAPStatus === 'green' ? 'text-green-400' : criteriaData.priceBelowVWAPStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="Prix < VWAP (en-dessous de la moyenne pondérée)"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.priceBelowVWAPStatus)}`}></span>
              P{'<'}VWAP
            </span>
          </>
        );
      }
    }
    
    // NEURAL_SCALPER Strategy - 6 conditions complètes (MEAN REVERSION)
    if (criteria.strategyType === 'NEURAL_SCALPER') {
      if (type === 'long') {
        // LONG: Buy the dip - acceleration < 0, velocity < 0, price < VWAP, rsiMomentum < -1.5
        return (
          <>
            <span 
              className={`flex items-center gap-1 ${criteriaData.accelerationNegativeStatus === 'green' ? 'text-green-400' : criteriaData.accelerationNegativeStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title={`Accélération < 0 (${criteriaData.accelerationValue})`}
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.accelerationNegativeStatus)}`}></span>
              Accel↘
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.velocityNegativeStatus === 'green' ? 'text-green-400' : criteriaData.velocityNegativeStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title={`Vélocité < 0 (${criteriaData.velocityValue})`}
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.velocityNegativeStatus)}`}></span>
              Vel↘
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.volumeOrVolatilityStatus === 'green' ? 'text-green-400' : criteriaData.volumeOrVolatilityStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title={`Volume spike: ${criteriaData.volumeSpike ? '✓' : '✗'} | Volatilité: ${criteriaData.volatilityHigh ? '✓' : '✗'}`}
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.volumeOrVolatilityStatus)}`}></span>
              {criteriaData.volumeSpike ? '📊' : '⚡'}Vol
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.priceBelowVWAPStatus === 'green' ? 'text-green-400' : criteriaData.priceBelowVWAPStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="Prix < VWAP"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.priceBelowVWAPStatus)}`}></span>
              P{'<'}VWAP
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.rsiMomentumBearishStatus === 'green' ? 'text-green-400' : criteriaData.rsiMomentumBearishStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title={`RSI Momentum < -1.5 (${criteriaData.rsiMomentumValue})`}
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.rsiMomentumBearishStatus)}`}></span>
              RSI-M↘
            </span>
          </>
        );
      } else {
        // SHORT: Sell the rip - acceleration > 0, velocity > 0, price > VWAP, rsiMomentum > 1.5
        return (
          <>
            <span 
              className={`flex items-center gap-1 ${criteriaData.accelerationPositiveStatus === 'green' ? 'text-green-400' : criteriaData.accelerationPositiveStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title={`Accélération > 0 (${criteriaData.accelerationValue})`}
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.accelerationPositiveStatus)}`}></span>
              Accel↗
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.velocityPositiveStatus === 'green' ? 'text-green-400' : criteriaData.velocityPositiveStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title={`Vélocité > 0 (${criteriaData.velocityValue})`}
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.velocityPositiveStatus)}`}></span>
              Vel↗
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.volumeOrVolatilityStatus === 'green' ? 'text-green-400' : criteriaData.volumeOrVolatilityStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title={`Volume spike: ${criteriaData.volumeSpike ? '✓' : '✗'} | Volatilité: ${criteriaData.volatilityHigh ? '✓' : '✗'}`}
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.volumeOrVolatilityStatus)}`}></span>
              {criteriaData.volumeSpike ? '📊' : '⚡'}Vol
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.priceAboveVWAPStatus === 'green' ? 'text-green-400' : criteriaData.priceAboveVWAPStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="Prix > VWAP"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.priceAboveVWAPStatus)}`}></span>
              P{'>'}VWAP
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.rsiMomentumBullishStatus === 'green' ? 'text-green-400' : criteriaData.rsiMomentumBullishStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title={`RSI Momentum > 1.5 (${criteriaData.rsiMomentumValue})`}
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.rsiMomentumBullishStatus)}`}></span>
              RSI-M↗
            </span>
          </>
        );
      }
    }

    // BOLLINGER_BOUNCE Strategy
    if (criteria.strategyType === 'BOLLINGER_BOUNCE') {
      if (type === 'long') {
        return (
          <>
            <span 
              className={`flex items-center gap-1 ${criteriaData.nearLowerBandStatus === 'green' ? 'text-green-400' : criteriaData.nearLowerBandStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title={`Prix proche bande inf (${criteriaData.distanceValue} au-dessus)`}
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.nearLowerBandStatus)}`}></span>
              BB↓ {criteriaData.distanceValue}
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.rsiOversoldStatus === 'green' ? 'text-green-400' : criteriaData.rsiOversoldStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title={`RSI survente (${criteriaData.rsiValue})`}
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.rsiOversoldStatus)}`}></span>
              RSI {criteriaData.rsiValue}
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.volatilityStatus === 'green' ? 'text-green-400' : criteriaData.volatilityStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title={`Volatilité (largeur BB: ${criteriaData.bbWidthValue})`}
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.volatilityStatus)}`}></span>
              Vol {criteriaData.bbWidthValue}
            </span>
          </>
        );
      } else {
        return (
          <>
            <span 
              className={`flex items-center gap-1 ${criteriaData.nearUpperBandStatus === 'green' ? 'text-green-400' : criteriaData.nearUpperBandStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title={`Prix proche bande sup (${criteriaData.distanceValue} en-dessous)`}
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.nearUpperBandStatus)}`}></span>
              BB↑ {criteriaData.distanceValue}
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.rsiOverboughtStatus === 'green' ? 'text-green-400' : criteriaData.rsiOverboughtStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title={`RSI surachat (${criteriaData.rsiValue})`}
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.rsiOverboughtStatus)}`}></span>
              RSI {criteriaData.rsiValue}
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.volatilityStatus === 'green' ? 'text-green-400' : criteriaData.volatilityStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title={`Volatilité (largeur BB: ${criteriaData.bbWidthValue})`}
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.volatilityStatus)}`}></span>
              Vol {criteriaData.bbWidthValue}
            </span>
          </>
        );
      }
    }

    // TREND_FOLLOWER Strategy
    if (criteria.strategyType === 'TREND_FOLLOWER') {
      if (type === 'long') {
        return (
          <>
            <span 
              className={`flex items-center gap-1 ${
                criteriaData.priceAboveEmaStatus === 'green' ? 'text-green-400' : 
                criteriaData.priceAboveEmaStatus === 'orange' ? 'text-orange-400' : 
                'text-gray-500'
              }`}
              title="Prix > EMA50"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.priceAboveEmaStatus)}`}></span>
              P{'>'}50
            </span>
            <span 
              className={`flex items-center gap-1 ${
                criteriaData.trendConfirmedStatus === 'green' ? 'text-green-400' : 
                criteriaData.trendConfirmedStatus === 'orange' ? 'text-orange-400' : 
                'text-gray-500'
              }`}
              title="Tendance confirmée (3 bougies consécutives)"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.trendConfirmedStatus)}`}></span>
              Conf✓
            </span>
          </>
        );
      } else {
        return (
          <>
            <span 
              className={`flex items-center gap-1 ${
                criteriaData.priceBelowEmaStatus === 'green' ? 'text-green-400' : 
                criteriaData.priceBelowEmaStatus === 'orange' ? 'text-orange-400' : 
                'text-gray-500'
              }`}
              title="Prix < EMA50"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.priceBelowEmaStatus)}`}></span>
              P{'<'}50
            </span>
            <span 
              className={`flex items-center gap-1 ${
                criteriaData.trendConfirmedStatus === 'green' ? 'text-green-400' : 
                criteriaData.trendConfirmedStatus === 'orange' ? 'text-orange-400' : 
                'text-gray-500'
              }`}
              title="Tendance confirmée (3 bougies consécutives)"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.trendConfirmedStatus)}`}></span>
              Conf✓
            </span>
          </>
        );
      }
    }

    if (criteria.strategyType === 'ATR_PULLBACK') {
      if (type === 'long') {
        return (
          <>
            <span 
              className={`flex items-center gap-1 ${criteriaData.uptrendStatus === 'green' ? 'text-green-400' : criteriaData.uptrendStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="EMA50 > EMA200"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.uptrendStatus)}`}></span>
              Trend↑
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.nearEma50Status === 'green' ? 'text-green-400' : criteriaData.nearEma50Status === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="Prix proche EMA50 (±0.5×ATR)"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.nearEma50Status)}`}></span>
              EMA50≈
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.rsiNeutralStatus === 'green' ? 'text-green-400' : criteriaData.rsiNeutralStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="RSI 35-55"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.rsiNeutralStatus)}`}></span>
              RSI≈
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.reversalStatus === 'green' ? 'text-green-400' : criteriaData.reversalStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="Bougie de retournement haussière"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.reversalStatus)}`}></span>
              Rev↗
            </span>
       
          </>
        );
      } else {
        return (
          <>
            <span 
              className={`flex items-center gap-1 ${criteriaData.downtrendStatus === 'green' ? 'text-green-400' : criteriaData.downtrendStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="EMA50 < EMA200"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.downtrendStatus)}`}></span>
              Trend↓
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.nearEma50Status === 'green' ? 'text-green-400' : criteriaData.nearEma50Status === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="Prix proche EMA50 (±0.5×ATR)"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.nearEma50Status)}`}></span>
              EMA50≈
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.rsiNeutralStatus === 'green' ? 'text-green-400' : criteriaData.rsiNeutralStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="RSI 45-65"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.rsiNeutralStatus)}`}></span>
              RSI≈
            </span>
            <span 
              className={`flex items-center gap-1 ${criteriaData.reversalStatus === 'green' ? 'text-green-400' : criteriaData.reversalStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
              title="Bougie de retournement baissière"
            >
              <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.reversalStatus)}`}></span>
              Rev↘
            </span>
          
          </>
        );
      }
    }

    // RSI + EMA criteria
    if (type === 'long') {
      return (
        <>
          <span 
            className={`flex items-center gap-1 ${criteriaData.emaTrendStatus === 'green' ? 'text-green-400' : criteriaData.emaTrendStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
            title={`EMA50 (${state?.ema50.toFixed(0)}) > EMA200 (${state?.ema200.toFixed(0)})`}
          >
            <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.emaTrendStatus)}`}></span>
            EMA
          </span>
          <span 
            className={`flex items-center gap-1 ${criteriaData.rsiOversoldStatus === 'green' ? 'text-green-400' : criteriaData.rsiOversoldStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
            title={`RSI: ${formatIndicator(state?.rsi)} < 30 (survente)`}
          >
            <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.rsiOversoldStatus)}`}></span>
            RSI
          </span>
        </>
      );
    } else {
      return (
        <>
          <span 
            className={`flex items-center gap-1 ${criteriaData.emaTrendStatus === 'green' ? 'text-green-400' : criteriaData.emaTrendStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
            title={`EMA50 (${state?.ema50.toFixed(0)}) < EMA200 (${state?.ema200.toFixed(0)})`}
          >
            <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.emaTrendStatus)}`}></span>
            EMA
          </span>
          <span 
            className={`flex items-center gap-1 ${criteriaData.rsiOverboughtStatus === 'green' ? 'text-green-400' : criteriaData.rsiOverboughtStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
            title={`RSI: ${formatIndicator(state?.rsi)} > 70 (surachat)`}
          >
            <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.rsiOverboughtStatus)}`}></span>
            RSI
          </span>
        </>
      );
    }
  };

  // Get metrics for selected strategy or global
  const getSelectedMetrics = () => {
    if (!state) return null;

    if (selectedStrategy === 'GLOBAL') {
      // Global metrics: sum of all strategies (filtered by current timeframe)
      const totalPnL = filteredStrategyPerformances.reduce((sum, p) => sum + p.totalPnL, 0);
      const totalTrades = filteredStrategyPerformances.reduce((sum, p) => sum + p.totalTrades, 0);
      const totalWinningTrades = filteredStrategyPerformances.reduce((sum, p) => sum + p.winningTrades, 0);
      const winRate = totalTrades > 0 ? (totalWinningTrades / totalTrades) * 100 : 0;

      // For global view, find active position from filtered strategies
      const activeStrategy = filteredStrategyPerformances.find(p => p.currentPosition && p.currentPosition.type !== 'NONE');
      const position = activeStrategy?.currentPosition || {
        type: 'NONE' as const,
        entryPrice: 0,
        entryTime: 0,
        quantity: 0,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0
      };

      return {
        position,
        totalPnL,
        totalTrades,
        winningTrades: totalWinningTrades,
        winRate
      };
    } else {
      // Individual strategy metrics
      const strategy = filteredStrategyPerformances.find(p => p.strategyName === selectedStrategy);
      if (!strategy) return null;

      return {
        position: strategy.currentPosition,
        totalPnL: strategy.totalPnL,
        totalTrades: strategy.totalTrades,
        winningTrades: strategy.winningTrades,
        winRate: strategy.winRate
      };
    }
  };

  // Show full page skeleton on initial load
  if (!state && isConnecting) {
    return <FullPageSkeleton />;
  }

  // Get background style based on selected strategy
  const getBackgroundStyle = () => {
    if (selectedStrategy === 'GLOBAL') return {};
    
    const selectedStrategyData = filteredStrategyPerformances.find(p => p.strategyName === selectedStrategy);
    if (!selectedStrategyData) return {};
    
    // Dynamic background for CUSTOM based on color mapping
    if (selectedStrategyData.strategyType === 'CUSTOM') {
      const color = selectedStrategyData.customConfig?.color as string | undefined;
      const bgMap: Record<string, string> = {
        emerald: 'rgb(2, 44, 34)',      // very dark emerald
        rose: 'rgb(76, 5, 25)',         // very dark rose
        indigo: 'rgb(30, 27, 75)',      // very dark indigo
        violet: 'rgb(46, 16, 101)',     // very dark violet
        amber: 'rgb(69, 51, 0)',        // very dark amber
        lime: 'rgb(26, 46, 5)',         // very dark lime
        sky: 'rgb(7, 28, 61)',          // very dark sky
        fuchsia: 'rgb(76, 5, 82)',      // very dark fuchsia
        pink: 'rgb(76, 5, 45)',         // very dark pink
        red: 'rgb(69, 10, 10)',         // very dark red
        green: 'rgb(3, 35, 20)',        // very dark green
        slate: 'rgb(15, 23, 42)',       // very dark slate
        stone: 'rgb(28, 25, 23)'        // very dark stone
      };
      if (color && bgMap[color]) {
        return { backgroundColor: bgMap[color] };
      }
      return { backgroundColor: 'rgb(112, 26, 117)' }; // fallback fuchsia
    }
    
    switch (selectedStrategyData.strategyType) {
      case 'RSI_EMA': return { backgroundColor: 'rgb(23, 37, 84)' }; // Bleu très foncé
      case 'MOMENTUM_CROSSOVER': return { backgroundColor: 'rgb(46, 16, 101)' }; // Violet très foncé
      case 'VOLUME_MACD': return { backgroundColor: 'rgb(67, 20, 7)' }; // Orange très foncé
      case 'BOLLINGER_BOUNCE': return { backgroundColor: 'rgb(6, 78, 59)' }; // Teal très foncé
      case 'TREND_FOLLOWER': return { backgroundColor: 'rgb(8, 51, 68)' }; // Cyan très foncé
      case 'ATR_PULLBACK': return { backgroundColor: 'rgb(69, 51, 0)' }; // Yellow très foncé
      default: return {};
    }
  };

  // Helper function for Active Positions display
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  };

  // Get active positions (filtered by timeframe, sorted by most recent first)
  const activePositions = (selectedStrategy === 'GLOBAL' 
    ? filteredStrategyPerformances
        .filter(perf => perf.currentPosition && perf.currentPosition.type !== 'NONE')
        .map(perf => ({ 
          ...perf.currentPosition, 
          strategyName: perf.strategyName,
          strategyType: perf.strategyType
        }))
    : filteredStrategyPerformances
        .filter(perf => perf.strategyName === selectedStrategy && perf.currentPosition && perf.currentPosition.type !== 'NONE')
        .map(perf => ({ 
          ...perf.currentPosition, 
          strategyName: perf.strategyName,
          strategyType: perf.strategyType
        }))
  ).sort((a, b) => b.entryTime - a.entryTime); // Sort by most recent first
  
  // Display only first position or all based on state
  const displayedPositions = showAllPositions ? activePositions : activePositions.slice(0, 1);

  return (
    <div className="min-h-screen bg-gray-900 text-white transition-all duration-500" style={getBackgroundStyle()}>
      {/* Header Binance-style */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 sticky top-0 z-10">
        <div className="grid grid-cols-3 items-center gap-4">
          {/* Left: Brand + Pair */}
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent">Fluxion</h1>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">BTC/USDT</span>
              <span className="text-gray-400 text-sm">Spot</span>
              {state && (
                <span className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white px-2 py-1 rounded text-xs font-medium shadow-lg shadow-sky-500/30">
                  {state.timeframe}
                </span>
              )}
            </div>
          </div>
          
          {/* Center: Strategy View Indicator */}
          <div className="flex justify-center">
            {strategyPerformances.length > 0 && (
              <>
                {selectedStrategy === 'GLOBAL' ? (
                  <div className="px-4 py-1.5 bg-gray-900 border-2 border-sky-500/50 rounded shadow-lg shadow-sky-500/20">
                    <span className="text-base font-semibold bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent">
                      🌍 {selectedTimeframe} Dashboard
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      {filteredStrategyPerformances.length} stratégie{filteredStrategyPerformances.length > 1 ? 's' : ''}
                    </span>
                    {strategyPerformances.length > filteredStrategyPerformances.length && (
                      <span className="ml-2 text-xs text-cyan-400">
                        (+{strategyPerformances.length - filteredStrategyPerformances.length} autre{strategyPerformances.length - filteredStrategyPerformances.length > 1 ? 's' : ''} TF)
                      </span>
                    )}
                  </div>
                ) : (() => {
                  const selectedStrategyData = strategyPerformances.find(p => p.strategyName === selectedStrategy);
                  if (!selectedStrategyData) return null;
                  const customColor = selectedStrategyData.strategyType === 'CUSTOM' ? selectedStrategyData.customConfig?.color : undefined;
                  const colors = getStrategyColor(selectedStrategyData.strategyType, customColor);
                  
                  return (
                    <div className={`px-4 py-1.5 bg-gray-900 border-2 ${colors.border} rounded flex items-center gap-3`}>
                      <span className={`text-sm font-semibold ${colors.text}`}>
                        {selectedStrategy}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400">P&L:</span>
                        <span className={`text-xs font-bold ${
                          selectedStrategyData.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {selectedStrategyData.totalPnL >= 0 ? '+' : ''}{selectedStrategyData.totalPnL.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400">Capital:</span>
                        <span className={`text-xs font-bold ${
                          selectedStrategyData.currentCapital >= 100000 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ${(selectedStrategyData.currentCapital / 1000).toFixed(1)}k
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedStrategy('GLOBAL')}
                        className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-[10px] font-medium transition-colors"
                        title="Retour à la vue globale"
                      >
                        ← 
                      </button>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
          
          {/* Right: Monitoring Status */}
          <div className="flex items-center justify-end gap-4">
            {isConnecting && (
              <div className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white px-4 py-2 rounded text-sm font-medium shadow-lg shadow-sky-500/30">
                ⏳ Connecting...
              </div>
            )}
            
            {isConnected && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm font-medium text-green-400">
                  MONITORING
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

       {/* Time Period Selector */}
       <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
         <div className="flex items-center gap-3">
           <div className="flex items-center gap-1">
             {['1m', '5m', '15m', '1h', '4h', '1d'].map((timeframe) => (
               <button
                 key={timeframe}
                 onClick={() => changeTimeframe(timeframe)}
                 disabled={isChangingTimeframe}
                 className={`px-3 py-1 text-sm rounded font-medium transition-all ${
                   selectedTimeframe === timeframe
                     ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/30'
                     : 'text-gray-400 hover:text-sky-400 hover:bg-gray-700'
                 } ${isChangingTimeframe ? 'opacity-50 cursor-not-allowed' : ''}`}
               >
                 {timeframe}
               </button>
             ))}
           </div>
           
           {/* Separator */}
           {!isChangingTimeframe && filteredStrategyPerformances.length > 0 && (
             <div className="h-6 w-px bg-gray-600"></div>
           )}
           
           {isChangingTimeframe && (
             <div className="flex items-center gap-2 text-sky-400 text-sm animate-pulse">
               <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               <span>Loading {selectedTimeframe} data...</span>
             </div>
           )}
           {!isChangingTimeframe && filteredStrategyPerformances.length > 0 && (
             <div className="flex items-center gap-2 text-gray-400 text-xs">
               <span className="font-medium">{filteredStrategyPerformances.length}</span>
               <span>stratégie{filteredStrategyPerformances.length > 1 ? 's' : ''} sur {selectedTimeframe}</span>
               {strategyPerformances.length > filteredStrategyPerformances.length && (
                 <span className="text-cyan-400">
                   ({strategyPerformances.length - filteredStrategyPerformances.length} autre{strategyPerformances.length - filteredStrategyPerformances.length > 1 ? 's' : ''} timeframe{strategyPerformances.length - filteredStrategyPerformances.length > 1 ? 's' : ''})
                 </span>
               )}
             </div>
           )}
         </div>
       </div>

      {!state ? (
        <>
          {/* OHLC Skeleton */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
            <div className="flex items-center gap-8">
              <div className="animate-pulse">
                <div className="h-8 w-32 bg-gray-700 rounded"></div>
              </div>
              <OHLCSkeleton />
              <IndicatorSkeleton />
            </div>
          </div>

          {/* Trading Info Skeleton */}
          <TradingInfoSkeleton />

          {/* Criteria Skeleton */}
          <CriteriaSkeleton />

          {/* Strategy Panel Skeleton */}
          <StrategyPanelSkeleton />

          {/* Chart Skeleton */}
          <ChartSkeleton />

          {/* Signal Skeleton */}
          <SignalSkeleton />
        </>
      ) : (
        <>
          {/* OHLC Panel - Binance Style */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between gap-8">
              {/* Current Price */}
              <div className="flex items-center  gap-2">
                <span className="text-2xl font-bold text-white">
                  ${formatPrice(state.currentPrice)}
                </span>
                {(() => {
                  if (state.candles.length > 0) {
                    const currentCandle = state.candles[state.candles.length - 1];
                    const openPrice = currentCandle.open;
                    const currentPrice = state.currentPrice;
                    const priceChangePercent = ((currentPrice - openPrice) / openPrice) * 100;
                    const isPositive = priceChangePercent >= 0;
                    
                    return (
                      <span className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
                      </span>
                    );
                  }
                  return <span className="text-green-400 text-sm">+0.00%</span>;
                })()}
              </div>

              {/* OHLC Data */}
              <div className="flex items-center gap-6 text-sm">
                {(() => {
                  if (state.candles.length > 0) {
                    const currentCandle = state.candles[state.candles.length - 1];
                    return (
                      <>
                        <div className="flex items-center gap-1" title="Open: Prix d'ouverture de la bougie">
                          <span className="text-gray-400">O:</span>
                          <span className="text-white font-mono">${formatPrice(currentCandle.open)}</span>
                        </div>
                        <div className="flex items-center gap-1" title="High: Prix le plus haut de la bougie">
                          <span className="text-gray-400">H:</span>
                          <span className="text-white font-mono">${formatPrice(currentCandle.high)}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Low: Prix le plus bas de la bougie">
                          <span className="text-gray-400">L:</span>
                          <span className="text-white font-mono">${formatPrice(currentCandle.low)}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Close: Prix de clôture de la bougie">
                          <span className="text-gray-400">C:</span>
                          <span className="text-white font-mono">${formatPrice(currentCandle.close)}</span>
                        </div>
                      </>
                    );
                  }
                  return (
                    <>
                      <div className="flex items-center gap-1" title="Open: Prix d'ouverture de la bougie">
                        <span className="text-gray-400">O:</span>
                        <span className="text-white font-mono">${formatPrice(state.currentPrice)}</span>
                      </div>
                      <div className="flex items-center gap-1" title="High: Prix le plus haut de la bougie">
                        <span className="text-gray-400">H:</span>
                        <span className="text-white font-mono">${formatPrice(state.currentPrice)}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Low: Prix le plus bas de la bougie">
                        <span className="text-gray-400">L:</span>
                        <span className="text-white font-mono">${formatPrice(state.currentPrice)}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Close: Prix de clôture de la bougie">
                        <span className="text-gray-400">C:</span>
                        <span className="text-white font-mono">${formatPrice(state.currentPrice)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Moving Averages */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1" title="EMA(12): Moyenne mobile exponentielle sur 12 périodes - Indicateur de momentum rapide">
                  <span className="text-green-400">MA(12):</span>
                  <span className="text-green-400 font-mono">${formatIndicator(state.ema12)}</span>
                </div>
                <div className="flex items-center gap-1" title="EMA(26): Moyenne mobile exponentielle sur 26 périodes - Indicateur de momentum moyen">
                  <span className="text-orange-400">MA(26):</span>
                  <span className="text-orange-400 font-mono">${formatIndicator(state.ema26)}</span>
                </div>
                <div className="flex items-center gap-1" title="EMA(50): Moyenne mobile exponentielle sur 50 périodes - Indicateur de tendance court terme">
                  <span className="text-yellow-400">MA(50):</span>
                  <span className="text-yellow-400 font-mono">${formatIndicator(state.ema50)}</span>
                </div>
                <div className="flex items-center gap-1" title="EMA(200): Moyenne mobile exponentielle sur 200 périodes - Indicateur de tendance long terme">
                  <span className="text-purple-400">MA(200):</span>
                  <span className="text-purple-400 font-mono">${formatIndicator(state.ema200)}</span>
                </div>
              </div>

              {/* RSI */}
              <div className="flex items-center gap-1" title="RSI: Relative Strength Index - Indicateur de surachat (>70) ou survente (<30)">
                <span className="text-gray-400 text-sm">RSI:</span>
                <span className={`font-mono text-sm ${getRSIColor(state.rsi)}`}>
                  {formatIndicator(state.rsi)}
                </span>
              </div>
            </div>
          </div>

          {/* Sentinel element for sticky detection */}
          <div ref={statsSentinelRef} className="h-0 -mb-0"></div>

          {/* Trading Info Panel - Dual Layout (Normal + Sticky) */}
          <div className={`bg-gray-800 border-b border-gray-700 px-4 py-3 sticky top-[57px] z-20 transition-all ${
            isStatsSticky ? 'backdrop-blur-sm shadow-md' : ''
          }`}>
            {(() => {
              const metrics = getSelectedMetrics();
              if (!metrics) return <TradingInfoSkeleton />;

              return (
                <>
                  {/* Normal View - Grid Layout */}
                  <div className={`grid-cols-2 lg:grid-cols-4 gap-6 ${isStatsSticky ? 'hidden' : 'grid'}`}>
                    {/* Position Info */}
                    <div className="flex flex-col" title="Position actuelle: LONG (achat), SHORT (vente à découvert), ou NONE (aucune position)">
                      <span className="text-gray-400 text-xs mb-1">POSITION</span>
                      <span className={`font-bold ${
                        metrics.position.type === 'LONG' ? 'text-green-400' : 
                        metrics.position.type === 'SHORT' ? 'text-red-400' : 
                        'text-gray-400'
                      }`}>
                        {metrics.position.type}
                      </span>
                      {metrics.position.type !== 'NONE' && (
                        <span className="text-xs text-gray-500" title={`Prix d'entrée de la position: ${metrics.position.entryPrice.toFixed(2)} USDT`}>
                          Entry: ${metrics.position.entryPrice.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Unrealized PnL */}
                    <div className="flex flex-col" title="Profit/Perte non réalisé(e) de la position actuelle (avant clôture)">
                      <span className="text-gray-400 text-xs mb-1">UNREALIZED P&L</span>
                      <span className={`font-bold ${
                        metrics.position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {metrics.position.unrealizedPnL.toFixed(2)} USDT
                      </span>
                      <span className={`text-xs ${
                        metrics.position.unrealizedPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'
                      }`} title="Pourcentage de profit/perte par rapport au prix d'entrée">
                        {metrics.position.unrealizedPnLPercent.toFixed(2)}%
                      </span>
                    </div>

                    {/* Total PnL */}
                    <div className="flex flex-col" title="Profit/Perte total(e) cumulé(e) de toutes les positions fermées">
                      <span className="text-gray-400 text-xs mb-1">TOTAL P&L</span>
                      <span className={`font-bold ${
                        metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {metrics.totalPnL.toFixed(2)} USDT
                      </span>
                      <span className="text-xs text-gray-500" title={`Nombre total de trades exécutés: ${metrics.totalTrades}`}>
                        {metrics.totalTrades} trades
                      </span>
                    </div>

                    {/* Win Rate */}
                    <div className="flex flex-col" title="Pourcentage de trades gagnants sur le total des trades">
                      <span className="text-gray-400 text-xs mb-1">WIN RATE</span>
                      <span className="font-bold text-blue-400">
                        {metrics.winRate.toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-500" title={`${metrics.winningTrades} trades gagnants sur ${metrics.totalTrades} trades au total`}>
                        {metrics.winningTrades}/{metrics.totalTrades} wins
                      </span>
                    </div>
                  </div>

                  {/* Sticky View - Compact Horizontal Layout */}
                  <div className={`items-center gap-6 ${isStatsSticky ? 'flex' : 'hidden'}`}>
                    {/* Position */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs font-medium">POS:</span>
                      <span className={`font-bold text-sm ${
                        metrics.position.type === 'LONG' ? 'text-green-400' : 
                        metrics.position.type === 'SHORT' ? 'text-red-400' : 
                        'text-gray-400'
                      }`}>
                        {metrics.position.type}
                      </span>
                      {metrics.position.type !== 'NONE' && (
                        <span className="text-xs text-gray-400 font-mono">
                          ${metrics.position.entryPrice.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="w-px h-5 bg-gray-600"></div>

                    {/* Unrealized P&L */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs font-medium">UNREAL:</span>
                      <span className={`font-bold text-sm ${
                        metrics.position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {metrics.position.unrealizedPnL >= 0 ? '+' : ''}{metrics.position.unrealizedPnL.toFixed(2)} USDT
                      </span>
                      <span className={`text-xs ${
                        metrics.position.unrealizedPnLPercent >= 0 ? 'text-green-400/70' : 'text-red-400/70'
                      }`}>
                        ({metrics.position.unrealizedPnLPercent >= 0 ? '+' : ''}{metrics.position.unrealizedPnLPercent.toFixed(2)}%)
                      </span>
                    </div>

                    <div className="w-px h-5 bg-gray-600"></div>

                    {/* Total P&L */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs font-medium">TOTAL:</span>
                      <span className={`font-bold text-sm ${
                        metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {metrics.totalPnL >= 0 ? '+' : ''}{metrics.totalPnL.toFixed(2)} USDT
                      </span>
                      <span className="text-xs text-gray-400">
                        ({metrics.totalTrades})
                      </span>
                    </div>

                    <div className="w-px h-5 bg-gray-600"></div>

                    {/* Win Rate */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs font-medium">WIN:</span>
                      <span className="font-bold text-sm text-blue-400">
                        {metrics.winRate.toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-400">
                        ({metrics.winningTrades}/{metrics.totalTrades})
                      </span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Active Positions - Below stats bar - Sticky */}
          {activePositions.length > 0 && (() => {
            // Get color for the first active position
            const firstPosition = activePositions[0];
            const strategyPerf = filteredStrategyPerformances.find(p => p.strategyName === firstPosition.strategyName);
            const customColor = strategyPerf?.customConfig?.color;
            
            // Map custom colors to very subtle background gradients
            const getBgClass = (color?: string) => {
              if (!color) return 'bg-gray-800/95';
              
              const colorMap: Record<string, string> = {
                emerald: 'bg-gradient-to-r from-emerald-950/20 via-gray-800/95 to-gray-800/95',
                rose: 'bg-gradient-to-r from-rose-950/20 via-gray-800/95 to-gray-800/95',
                indigo: 'bg-gradient-to-r from-indigo-950/20 via-gray-800/95 to-gray-800/95',
                violet: 'bg-gradient-to-r from-violet-950/20 via-gray-800/95 to-gray-800/95',
                amber: 'bg-gradient-to-r from-amber-950/20 via-gray-800/95 to-gray-800/95',
                lime: 'bg-gradient-to-r from-lime-950/20 via-gray-800/95 to-gray-800/95',
                sky: 'bg-gradient-to-r from-sky-950/20 via-gray-800/95 to-gray-800/95',
                fuchsia: 'bg-gradient-to-r from-fuchsia-950/20 via-gray-800/95 to-gray-800/95',
                pink: 'bg-gradient-to-r from-pink-950/20 via-gray-800/95 to-gray-800/95',
                red: 'bg-gradient-to-r from-red-950/20 via-gray-800/95 to-gray-800/95',
                green: 'bg-gradient-to-r from-green-950/20 via-gray-800/95 to-gray-800/95',
                slate: 'bg-gradient-to-r from-slate-950/20 via-gray-800/95 to-gray-800/95',
                stone: 'bg-gradient-to-r from-stone-950/20 via-gray-800/95 to-gray-800/95',
              };
              
              return colorMap[color] || 'bg-gray-800/95';
            };
            
            return (
              <div className={`${getBgClass(customColor)} border-b border-gray-600/50 px-6 py-3 sticky z-20 backdrop-blur-md shadow-lg transition-all ${
                isStatsSticky ? 'top-[105px]' : 'top-[130px]'
              }`}>
                {displayedPositions.map((currentPosition, idx) => {
                  const strategyPerf = filteredStrategyPerformances.find(p => p.strategyName === currentPosition.strategyName);
                  const customColor = strategyPerf?.customConfig?.color;
                  const colors = currentPosition.strategyType ? getStrategyColor(currentPosition.strategyType, customColor) : { text: 'text-gray-400' };
                  
                  return (
                  <div key={idx} className={`flex items-center gap-4 ${idx > 0 ? 'pt-3 border-t border-gray-700/50 mt-3' : ''}`}>
                    {/* Status & Strategy */}
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
                      <h3 className="text-sm font-bold text-white">POSITION ACTIVE</h3>
                      <span className={`text-xs font-semibold ${colors.text}`}>- {currentPosition.strategyName}</span>
                    </div>

                    {/* Type Badge */}
                    <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                      currentPosition.type === 'LONG' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {currentPosition.type}
                    </div>

                    {/* Entry Price */}
                    <div className="text-white font-mono text-sm font-bold">
                      ${formatPrice(currentPosition.entryPrice)}
                    </div>

                    {/* Duration with blue clock icon */}
                    <div className="flex items-center gap-1">
                      <HiClock className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-white font-mono text-xs">
                        {formatDuration(Date.now() - currentPosition.entryTime)}
                      </span>
                    </div>

                    {/* Separator */}
                    <div className="w-px h-4 bg-gray-600"></div>

                    {strategyPerf?.config && (
                      <>
                        {/* TP */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400 font-semibold">TP</span>
                          <span className="text-green-400 font-mono text-sm font-bold">
                            ${formatPrice(currentPosition.entryPrice * (1 + (strategyPerf.config.profitTargetPercent || 0) / 100))}
                          </span>
                          <span className="text-green-400/70 text-[10px]">
                            (+{strategyPerf.config.profitTargetPercent || 0}%)
                          </span>
                        </div>

                        {/* SL */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400 font-semibold">SL</span>
                          <span className="text-red-400 font-mono text-sm font-bold">
                            ${formatPrice(currentPosition.entryPrice * (1 - (strategyPerf.config.stopLossPercent || 0) / 100))}
                          </span>
                          <span className="text-red-400/70 text-[10px]">
                            (-{strategyPerf.config.stopLossPercent || 0}%)
                          </span>
                        </div>

                        {/* Time Left with red clock icon */}
                        <div className="flex items-center gap-1">
                          <HiClock className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-orange-400 font-mono text-xs font-bold">
                            {strategyPerf?.config && strategyPerf.config.maxPositionTime ? 
                              formatDuration(Math.max(0, (strategyPerf.config.maxPositionTime * 60000) - (Date.now() - currentPosition.entryTime))) :
                              '∞'
                            }
                          </span>
                        </div>
                      </>
                    )}

                    {/* P&L - At the end */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[10px] text-gray-400 font-semibold">P&L</span>
                      <span className={`font-bold text-sm ${
                        currentPosition.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {currentPosition.unrealizedPnL >= 0 ? '+' : ''}{formatPrice(currentPosition.unrealizedPnL)} USDT
                        <span className={`text-xs ml-1 ${
                          currentPosition.unrealizedPnLPercent >= 0 ? 'text-green-400/70' : 'text-red-400/70'
                        }`}>
                          ({currentPosition.unrealizedPnLPercent >= 0 ? '+' : ''}{currentPosition.unrealizedPnLPercent.toFixed(2)}%)
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
              
              {/* Expand/Collapse Button - Show if more than 1 position */}
              {activePositions.length > 1 && (
                <div className="mt-2 pt-2 border-t border-gray-600/30 flex items-center justify-center">
                  <button
                    onClick={() => setShowAllPositions(!showAllPositions)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700/30"
                  >
                    <span>
                      {showAllPositions 
                        ? `Masquer ${activePositions.length - 1}` 
                        : `+${activePositions.length - 1}`
                      }
                    </span>
                    <HiChevronDown className={`w-2.5 h-2.5 transition-transform ${showAllPositions ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              )}
              </div>
            );
          })()}

          {/* Trading Criteria & Multi-Strategy Performance Panel */}
          {strategyPerformances.length === 0 ? (
            <StrategyPanelSkeleton />
          ) : (
            <StrategyPanel 
              performances={filteredStrategyPerformances}
              allPerformances={strategyPerformances}
              currentTimeframe={selectedTimeframe}
              isStatsSticky={isStatsSticky}
              onToggleStrategy={handleToggleStrategy}
              selectedStrategy={selectedStrategy}
              onSelectStrategy={setSelectedStrategy}
              onRefresh={onRefresh}
              onConfigChange={(strategyName, config) => {
                setLocalConfigCache(prev => ({
                  ...prev,
                  [strategyName]: config
                }));
              }}
              getCriteriaForStrategy={getCriteriaForStrategy}
              getStatusesArray={getStatusesArray}
              renderCriteriaLabels={renderCriteriaLabels}
              onGenerateAIStrategy={handleGenerateAIStrategy}
              isGeneratingAI={isGeneratingAI}
              onCreateStrategy={() => setShowStrategyBuilder(true)}
              indicatorData={state ? {
                // Price-based
                price: state.currentPrice,
                open: (state as any).open,
                high: (state as any).high,
                low: (state as any).low,
                volume: state.candles && state.candles.length > 0 ? state.candles[state.candles.length - 1].volume : undefined,
                
                // Moving Averages
                ema12: state.ema12,
                ema26: state.ema26,
                ema50: state.ema50,
                ema100: (state as any).ema100,
                ema200: state.ema200,
                sma7: (state as any).sma7 ?? state.ma7,
                sma25: (state as any).sma25 ?? state.ma25,
                sma50: (state as any).sma50,
                sma99: (state as any).sma99 ?? state.ma99,
                sma200: (state as any).sma200,
                
                // Momentum Indicators
                rsi: state.rsi,
                rsi9: (state as any).rsi9,
                rsi21: (state as any).rsi21,
                
                // MACD
                macd: (state as any).macd,
                macdSignal: (state as any).macdSignal,
                macdHistogram: (state as any).macdHistogram,
                
                // Bollinger Bands
                bbUpper: (state as any).bbUpper,
                bbMiddle: (state as any).bbMiddle,
                bbLower: (state as any).bbLower,
                bbWidth: (state as any).bbWidth,
                bbPercent: (state as any).bbPercent,
                
                // Volatility
                atr: (state as any).atr,
                atr14: (state as any).atr14,
                atr21: (state as any).atr21,
                
                // Stochastic
                stochK: (state as any).stochK,
                stochD: (state as any).stochD,
                
                // Trend Strength
                adx: (state as any).adx,
                
                // Others
                cci: (state as any).cci,
                obv: (state as any).obv,
                
                // Volume Analysis
                volumeSMA20: (state as any).volumeSMA20,
                volumeRatio: (state as any).volumeRatio,
                
                // Price Position
                priceChangePercent: (state as any).priceChangePercent,
                priceChange24h: (state as any).priceChange24h,
                vwap: (state as any).vwap,
                
                // Trend Detection
                isBullishTrend: (state as any).isBullishTrend,
                isBearishTrend: (state as any).isBearishTrend,
                isUptrend: (state as any).isUptrend,
                isDowntrend: (state as any).isDowntrend,
                isUptrendConfirmed3: (state as any).isUptrendConfirmed3,
                isDowntrendConfirmed3: (state as any).isDowntrendConfirmed3,
                isTrendReversalUp: (state as any).isTrendReversalUp,
                isTrendReversalDown: (state as any).isTrendReversalDown,
                
                // Momentum
                isOversold: (state as any).isOversold,
                isOverbought: (state as any).isOverbought,
                
                // MACD Signals
                isMACDBullish: (state as any).isMACDBullish,
                isMACDBearish: (state as any).isMACDBearish,
                isMACDCrossoverBullish: (state as any).isMACDCrossoverBullish,
                isMACDCrossoverBearish: (state as any).isMACDCrossoverBearish,
                
                // EMA Crossovers
                isEMAFastSlowBullCross: (state as any).isEMAFastSlowBullCross,
                isEMAFastSlowBearCross: (state as any).isEMAFastSlowBearCross,
                
                // Price/EMA Cross
                isPriceCrossedAboveEMA50: (state as any).isPriceCrossedAboveEMA50,
                isPriceCrossedBelowEMA50: (state as any).isPriceCrossedBelowEMA50,
                
                // Volume
                isHighVolume: (state as any).isHighVolume,
                isLowVolume: (state as any).isLowVolume,
                
                // VWAP Signals
                isPriceAboveVWAP: (state as any).isPriceAboveVWAP,
                isPriceBelowVWAP: (state as any).isPriceBelowVWAP,
                isNearVWAP: (state as any).isNearVWAP,
                
                // Bollinger Bands Signals
                isNearBBLower: (state as any).isNearBBLower,
                isNearBBUpper: (state as any).isNearBBUpper,
                isBelowBBLower: (state as any).isBelowBBLower,
                isAboveBBUpper: (state as any).isAboveBBUpper,
                
                // Candle Patterns
                isBullishCandle: (state as any).isBullishCandle,
                isBearishCandle: (state as any).isBearishCandle,
                isBullishEngulfing: (state as any).isBullishEngulfing,
                isBearishEngulfing: (state as any).isBearishEngulfing,
                isDoji: (state as any).isDoji,
                isHammer: (state as any).isHammer,
                isShootingStar: (state as any).isShootingStar
              } as any : null}
              onDeleteStrategy={async (strategyName) => {
                // Cette fonction sera appelée depuis StrategyPanel après confirmation
                console.log(`Deleting strategy: ${strategyName}`);
              }}
              onShowTimeframeComparison={async (strategyName) => {
                setComparisonStrategyName(strategyName);
                // Fetch all performances from all timeframes
                try {
                  const response = await fetch('/api/all-performances');
                  const data = await response.json();
                  if (data.success) {
                    setAllTimeframePerformances(data.performances);
                    setShowTimeframeComparison(true);
                  } else {
                    console.error('Failed to fetch all performances:', data.error);
                  }
                } catch (error) {
                  console.error('Error fetching all performances:', error);
                }
              }}
            />
          )}

          {/* Binance-style Chart */}
          <BinanceChart state={state} selectedStrategy={selectedStrategy} strategyPerformances={filteredStrategyPerformances} localConfigCache={localConfigCache} />

          {/* Professional Trading History */}
          <TradingHistory 
            strategyPerformances={filteredStrategyPerformances.map(perf => {
              // Merge with localConfigCache if available
              const cachedConfig = localConfigCache[perf.strategyName];
              return cachedConfig ? {
                ...perf,
                config: {
                  ...perf.config,
                  ...cachedConfig
                }
              } : perf;
            })} 
            selectedStrategy={selectedStrategy}
            currentStrategy={selectedStrategy !== 'GLOBAL' ? (() => {
              const strategy = filteredStrategyPerformances.find(p => p.strategyName === selectedStrategy);
              if (!strategy) return undefined;
              
              // Merge with localConfigCache if available
              const cachedConfig = localConfigCache[selectedStrategy];
              return cachedConfig ? {
                ...strategy,
                config: {
                  ...strategy.config,
                  ...cachedConfig
                }
              } : strategy;
            })() : undefined}
            getStrategyColor={getStrategyColor}
          />
        </>
      )}

      {!state && !isConnecting && (
        <div className="text-center py-20 bg-gray-800">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-semibold mb-2 text-white">Bot en attente</h2>
          <p className="text-gray-400">Cliquez sur &quot;Start Bot&quot; pour commencer le trading</p>
        </div>
      )}

      {/* Strategy Builder Modal */}
      {showStrategyBuilder && (
        <StrategyBuilder
          onSave={handleSaveStrategy}
          onClose={() => setShowStrategyBuilder(false)}
        />
      )}

      {/* Timeframe Comparison Modal */}
      {showTimeframeComparison && comparisonStrategyName && (
        <TimeframeComparison
          strategyName={comparisonStrategyName}
          performances={allTimeframePerformances}
          onClose={() => {
            setShowTimeframeComparison(false);
            setComparisonStrategyName(null);
            setAllTimeframePerformances([]);
          }}
        />
      )}
    </div>
  );
}

