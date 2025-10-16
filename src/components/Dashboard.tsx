'use client';

import { StrategyPerformance, StrategyState, TradingSignal } from '@/types/trading';
import { useEffect, useState } from 'react';
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
import StrategyPanel from './StrategyPanel';

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
  const [strategyPerformances, setStrategyPerformances] = useState<StrategyPerformance[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('GLOBAL'); // 'GLOBAL' or strategy name

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
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        setIsConnected(false);
        setIsConnecting(false);
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
      await fetch(`/api/trading?action=toggleStrategy&strategyName=${encodeURIComponent(strategyName)}`);
      // No need to refresh - data comes via SSE
    } catch (error) {
      console.error('Error toggling strategy:', error);
    }
  };

  const changeTimeframe = async (timeframe: string) => {
    if (timeframe === selectedTimeframe) return; // Éviter les changements inutiles
    
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
      } catch (error) {
        console.error('Error changing timeframe:', error);
      }
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
  const getCriteriaForStrategy = (strategyType: 'RSI_EMA' | 'MOMENTUM_CROSSOVER' | 'VOLUME_MACD' | 'NEURAL_SCALPER' | 'BOLLINGER_BOUNCE' | 'TREND_FOLLOWER', strategyMetrics: StrategyPerformance) => {
    if (!state) return null;

    // Extract position from strategyMetrics
    const position = strategyMetrics.currentPosition;
    if (!position) return null;

    // Calculer le cooldown restant
    const now = Date.now();
    const lastTradeTime = state.lastSignal?.timestamp || 0;
    const cooldownPeriod = 5 * 60 * 1000; // 5 minutes
    const cooldownRemaining = Math.max(0, cooldownPeriod - (now - lastTradeTime));
    const cooldownPassed = cooldownRemaining === 0;
    
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
      
      const criteria = {
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
      
      const criteria = {
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
    if (strategyType === 'NEURAL_SCALPER') {
      // Get Neural Scalper specific values from backend
      let velocity = 0;
      let acceleration = 0;
      let rsiMomentum = 0;
      let volumeSpike = false;
      let isVolatilityHigh = false;
      
      if (strategyMetrics && 'velocity' in strategyMetrics) {
        velocity = strategyMetrics.velocity || 0;
        acceleration = strategyMetrics.acceleration || 0;
        rsiMomentum = strategyMetrics.rsiMomentum || 0;
        volumeSpike = strategyMetrics.volumeSpike || false;
        isVolatilityHigh = strategyMetrics.isVolatilityHigh || false;
      }
      
      const hasNoPosition = position.type === 'NONE';
      const vwapAbove = state.currentPrice > state.ema50; // VWAP proxy
      const vwapBelow = state.currentPrice < state.ema50;
      
      // Exact conditions from backend
      // LONG: acceleration > 0 && velocity > 0 && (volumeSpike || volatilityHigh) && price > vwap && rsiMomentum > 1.5
      const accelerationPositive = acceleration > 0;
      const velocityPositive = velocity > 0;
      const volumeOrVolatility = volumeSpike || isVolatilityHigh;
      const rsiMomentumBullish = rsiMomentum > 1.5;
      
      const accelerationNegative = acceleration < 0;
      const velocityNegative = velocity < 0;
      const rsiMomentumBearish = rsiMomentum < -1.5;
      
      const longAllCriteria = accelerationPositive && velocityPositive && volumeOrVolatility && vwapAbove && rsiMomentumBullish && hasNoPosition && cooldownPassed;
      const shortAllCriteria = accelerationNegative && velocityNegative && volumeOrVolatility && vwapBelow && rsiMomentumBearish && hasNoPosition && cooldownPassed;
      
      const criteria = {
        strategyType: 'NEURAL_SCALPER' as const,
        long: {
          accelerationPositive: accelerationPositive,
          accelerationPositiveStatus: getStatus(accelerationPositive, false),
          accelerationValue: acceleration.toFixed(4),
          velocityPositive: velocityPositive,
          velocityPositiveStatus: getStatus(velocityPositive, false),
          velocityValue: velocity.toFixed(4),
          volumeOrVolatility: volumeOrVolatility,
          volumeOrVolatilityStatus: getStatus(volumeOrVolatility, false),
          volumeSpike: volumeSpike,
          volatilityHigh: isVolatilityHigh,
          priceAboveVWAP: vwapAbove,
          priceAboveVWAPStatus: getStatus(vwapAbove, false),
          rsiMomentumBullish: rsiMomentumBullish,
          rsiMomentumBullishStatus: getStatus(rsiMomentumBullish, false),
          rsiMomentumValue: rsiMomentum.toFixed(2),
          noPosition: hasNoPosition,
          noPositionStatus: getStatus(hasNoPosition, false),
          cooldownPassed: cooldownPassed,
          cooldownPassedStatus: getStatus(cooldownPassed, cooldownRemaining > 0 && cooldownRemaining < 15000)
        },
        short: {
          accelerationNegative: accelerationNegative,
          accelerationNegativeStatus: getStatus(accelerationNegative, false),
          accelerationValue: acceleration.toFixed(4),
          velocityNegative: velocityNegative,
          velocityNegativeStatus: getStatus(velocityNegative, false),
          velocityValue: velocity.toFixed(4),
          volumeOrVolatility: volumeOrVolatility,
          volumeOrVolatilityStatus: getStatus(volumeOrVolatility, false),
          volumeSpike: volumeSpike,
          volatilityHigh: isVolatilityHigh,
          priceBelowVWAP: vwapBelow,
          priceBelowVWAPStatus: getStatus(vwapBelow, false),
          rsiMomentumBearish: rsiMomentumBearish,
          rsiMomentumBearishStatus: getStatus(rsiMomentumBearish, false),
          rsiMomentumValue: rsiMomentum.toFixed(2),
          noPosition: hasNoPosition,
          noPositionStatus: getStatus(hasNoPosition, false),
          cooldownPassed: cooldownPassed,
          cooldownPassedStatus: getStatus(cooldownPassed, cooldownRemaining > 0 && cooldownRemaining < 15000)
        },
        cooldownRemaining: cooldownRemaining,
        longReady: longAllCriteria,
        shortReady: shortAllCriteria
      };
      return criteria;
    }

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
      
      const criteria = {
        strategyType: 'BOLLINGER_BOUNCE' as const,
        long: {
          nearLowerBand: nearLowerBand,
          nearLowerBandStatus: getStatus(nearLowerBand, nearLowerBandClose),
          distanceValue: `${distanceFromLower.toFixed(2)}%`,
          rsiOversold: rsiOversold,
          rsiOversoldStatus: getStatus(rsiOversold, rsiOversoldClose),
          rsiValue: state.rsi.toFixed(0),
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
          rsiValue: state.rsi.toFixed(0),
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
      const hasNoPosition = position.type === 'NONE';
      const priceAboveEma50 = state.currentPrice > state.ema50;
      const priceBelowEma50 = state.currentPrice < state.ema50;
      
      const criteria = {
        strategyType: 'TREND_FOLLOWER' as const,
        long: {
          trendUp: priceAboveEma50,
          trendUpStatus: getStatus(priceAboveEma50, false)
        },
        short: {
          trendDown: priceBelowEma50,
          trendDownStatus: getStatus(priceBelowEma50, false)
        },
        cooldownRemaining: 0,
        longReady: priceAboveEma50,
        shortReady: priceBelowEma50
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
    
    const criteria = {
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
  const getStrategyColor = (strategyType: string) => {
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
      case 'NEURAL_SCALPER':
        return {
          border: 'border-pink-400',
          text: 'text-pink-400',
          accent: 'bg-pink-400',
          bgSelected: 'bg-pink-950/40'
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
    
    // RSI_EMA
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
        ? [criteriaData.trendUpStatus as string]
        : [criteriaData.trendDownStatus as string];
    }
    
    // RSI + EMA
    return [
      criteriaData.emaTrendStatus as string,
      (criteriaData.rsiOversoldStatus || criteriaData.rsiOverboughtStatus) as string
    ];
  };

  // Render criteria labels based on strategy type
  const renderCriteriaLabels = (criteria: { strategyType: string; long: Record<string, string | boolean>; short: Record<string, string | boolean>; cooldownRemaining: number }, type: 'long' | 'short', _allReady: boolean = false) => {
    const criteriaData = type === 'long' ? criteria.long : criteria.short;
    
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
    
    // NEURAL_SCALPER Strategy - 6 conditions complètes
    if (criteria.strategyType === 'NEURAL_SCALPER') {
      if (type === 'long') {
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
      } else {
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
          <span 
            className={`flex items-center gap-1 ${criteriaData.trendUpStatus === 'green' ? 'text-green-400' : 'text-gray-500'}`}
            title="Prix > EMA50 (tendance haussière)"
          >
            <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.trendUpStatus)}`}></span>
            Trend↗
          </span>
        );
      } else {
        return (
          <span 
            className={`flex items-center gap-1 ${criteriaData.trendDownStatus === 'green' ? 'text-green-400' : 'text-gray-500'}`}
            title="Prix < EMA50 (tendance baissière)"
          >
            <span className={`w-1 h-1 rounded-full ${getStatusClass(criteriaData.trendDownStatus)}`}></span>
            Trend↘
          </span>
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
            title={`RSI: ${state?.rsi.toFixed(1)} < 30 (survente)`}
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
            title={`RSI: ${state?.rsi.toFixed(1)} > 70 (surachat)`}
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
      // Global metrics: sum of all strategies
      const totalPnL = strategyPerformances.reduce((sum, p) => sum + p.totalPnL, 0);
      const totalTrades = strategyPerformances.reduce((sum, p) => sum + p.totalTrades, 0);
      const totalWinningTrades = strategyPerformances.reduce((sum, p) => sum + p.winningTrades, 0);
      const winRate = totalTrades > 0 ? (totalWinningTrades / totalTrades) * 100 : 0;

      // For global view, show primary strategy position
      return {
        position: state.currentPosition,
        totalPnL,
        totalTrades,
        winningTrades: totalWinningTrades,
        winRate
      };
    } else {
      // Individual strategy metrics
      const strategy = strategyPerformances.find(p => p.strategyName === selectedStrategy);
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
    
    const selectedStrategyData = strategyPerformances.find(p => p.strategyName === selectedStrategy);
    if (!selectedStrategyData) return {};
    
    switch (selectedStrategyData.strategyType) {
      case 'RSI_EMA': return { backgroundColor: 'rgb(23, 37, 84)' }; // Bleu très foncé
      case 'MOMENTUM_CROSSOVER': return { backgroundColor: 'rgb(46, 16, 101)' }; // Violet très foncé
      case 'VOLUME_MACD': return { backgroundColor: 'rgb(67, 20, 7)' }; // Orange très foncé
      default: return {};
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white transition-all duration-500" style={getBackgroundStyle()}>
      {/* Header Binance-style */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 sticky top-0 z-10">
        <div className="grid grid-cols-3 items-center gap-4">
          {/* Left: Brand + Pair */}
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-yellow-400">TradingBot</h1>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">BTC/USDT</span>
              <span className="text-gray-400 text-sm">Spot</span>
              {state && (
                <span className="bg-yellow-400 text-black px-2 py-1 rounded text-xs font-medium">
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
                  <div className="px-4 py-1.5 bg-gray-900 border-2 border-yellow-500/50 rounded">
                    <span className="text-base font-semibold text-yellow-400">
                      🌍 Global Dashboard
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      {strategyPerformances.length} stratégies
                    </span>
                  </div>
                ) : (() => {
                  const selectedStrategyData = strategyPerformances.find(p => p.strategyName === selectedStrategy);
                  if (!selectedStrategyData) return null;
                  const colors = getStrategyColor(selectedStrategyData.strategyType);
                  
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
          
          {/* Right: Monitoring */}
          <div className="flex items-center justify-end gap-4">
            {isConnecting && (
              <div className="bg-yellow-600 text-white px-4 py-2 rounded text-sm font-medium">
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
         <div className="flex items-center gap-1">
           {['1m', '5m', '15m', '1h', '4h', '1d'].map((timeframe) => (
             <button
               key={timeframe}
               onClick={() => changeTimeframe(timeframe)}
               className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
                 selectedTimeframe === timeframe
                   ? 'bg-yellow-400 text-black'
                   : 'text-gray-400 hover:text-white hover:bg-gray-700'
               }`}
             >
               {timeframe}
             </button>
           ))}
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

          {/* Trading Info Panel */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">

            {(() => {
              const metrics = getSelectedMetrics();
              if (!metrics) return <TradingInfoSkeleton />;

              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
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

                  {/* PnL */}
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
              );
            })()}
          </div>

          {/* Trading Criteria & Multi-Strategy Performance Panel */}
          {strategyPerformances.length === 0 ? (
            <StrategyPanelSkeleton />
          ) : (
            <StrategyPanel 
              performances={strategyPerformances} 
              onToggleStrategy={handleToggleStrategy}
              selectedStrategy={selectedStrategy}
              onSelectStrategy={setSelectedStrategy}
              getCriteriaForStrategy={getCriteriaForStrategy}
              getStatusesArray={getStatusesArray}
              renderCriteriaLabels={renderCriteriaLabels}
            />
          )}

          {/* Binance-style Chart */}
          <BinanceChart state={state} selectedStrategy={selectedStrategy} strategyPerformances={strategyPerformances} />

          {/* Last Signal - Compact */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
            {(() => {
              // Get signals from selected strategy or combined signals
              let lastSignal = null;
              let signalHistory: TradingSignal[] = [];
              
              if (selectedStrategy === 'GLOBAL') {
                // Show all signals from all strategies
                strategyPerformances.forEach(perf => {
                  signalHistory = [...signalHistory, ...(perf.signalHistory || [])];
                });
                signalHistory.sort((a, b) => b.timestamp - a.timestamp);
                lastSignal = signalHistory[0] || null;
              } else {
                // Show signals from selected strategy only
                const strategy = strategyPerformances.find(p => p.strategyName === selectedStrategy);
                lastSignal = strategy?.lastSignal || null;
                signalHistory = strategy?.signalHistory || [];
              }
              
              return (
                <>
                  {lastSignal ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`${getSignalColor(lastSignal.type)} px-3 py-1 rounded text-sm font-bold`}>
                          {lastSignal.type}
                        </span>
                        <span className="text-white font-mono">${formatPrice(lastSignal.price)}</span>
                        <span className="text-gray-400 text-sm">{formatTime(lastSignal.timestamp)}</span>
                      </div>
                      <span className="text-gray-400 text-sm max-w-md truncate">
                        {lastSignal.reason}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">Waiting for signal...</span>
                      <div className="w-1 h-1 bg-gray-600 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Completed Trades History */}
          {(() => {
            // Get completed trades from selected strategy or combined
            let completedTrades: any[] = [];
            
            if (selectedStrategy === 'GLOBAL') {
              strategyPerformances.forEach(perf => {
                if (perf.completedTrades) {
                  completedTrades = [...completedTrades, ...perf.completedTrades.map(t => ({ ...t, strategyName: perf.strategyName }))];
                }
              });
              completedTrades.sort((a, b) => a.exitTime - b.exitTime); // Du plus ancien au plus récent
            } else {
              const strategy = strategyPerformances.find(p => p.strategyName === selectedStrategy);
              completedTrades = strategy?.completedTrades || [];
            }
            
            if (completedTrades.length === 0) return null;
            
            // Prendre les 10 derniers trades
            const recentTrades = completedTrades.slice(-10);
            
            return (
              <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-300">RECENT TRADES {selectedStrategy !== 'GLOBAL' && `- ${selectedStrategy}`}</h3>
                  <span className="text-xs text-gray-500">{completedTrades.length} total</span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {recentTrades.map((trade: any, index: number) => {
                    const isWin = trade.isWin;
                    const durationMin = Math.floor(trade.duration / 60000);
                    const durationSec = Math.floor((trade.duration % 60000) / 1000);
                    
                    return (
                      <div key={index} className={`py-2 px-3 rounded ${
                        isWin 
                          ? 'bg-green-900/10 border border-green-500/20' 
                          : 'bg-red-900/10 border border-red-500/20'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-3">
                            {/* Position Type */}
                            <span className={`${
                              trade.type === 'LONG' ? 'bg-green-500' : 'bg-red-500'
                            } px-2 py-1 rounded text-xs font-bold min-w-[60px] text-center text-white`}>
                              {trade.type}
                            </span>
                            
                            {/* Entry → Exit */}
                            <div className="flex items-center gap-2">
                              <span className="text-white font-mono font-semibold text-xs">${formatPrice(trade.entryPrice)}</span>
                              <span className="text-gray-500">→</span>
                              <span className="text-white font-mono font-semibold text-xs">${formatPrice(trade.exitPrice)}</span>
                            </div>
                            
                            {/* Time & Duration */}
                            <span className="text-gray-400 text-[11px]">
                              {formatTime(trade.exitTime)} ({durationMin}m{durationSec}s)
                            </span>
                            
                            {/* Win/Loss Badge */}
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              isWin 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {isWin ? '✅ WIN' : '❌ LOSS'}
                            </span>
                            
                            {/* P&L */}
                            <span className={`font-bold text-sm ${
                              isWin ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)} USDT
                            </span>
                            <span className={`text-[10px] ${
                              isWin ? 'text-green-400/70' : 'text-red-400/70'
                            }`}>
                              ({trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                        
                        {/* Reasons */}
                        <div className="flex items-center gap-4 text-[10px] ml-[72px]">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Entry:</span>
                            <span className="text-gray-400">{trade.entryReason.substring(0, 40)}...</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Exit:</span>
                            <span className="text-gray-400">{trade.exitReason}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </>
      )}

      {!state && !isConnecting && (
        <div className="text-center py-20 bg-gray-800">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-semibold mb-2 text-white">Bot en attente</h2>
          <p className="text-gray-400">Cliquez sur &quot;Start Bot&quot; pour commencer le trading</p>
        </div>
      )}
    </div>
  );
}

