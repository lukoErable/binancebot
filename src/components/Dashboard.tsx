'use client';

import { StrategyState, TradingSignal } from '@/types/trading';
import { useEffect, useState } from 'react';
import BinanceChart from './BinanceChart';

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
  const [tradingMode, setTradingMode] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false); // false = observation, true = trading

  const startDataStream = async (timeframe?: string, trading?: boolean) => {
    const tf = timeframe || selectedTimeframe;
    const tm = trading !== undefined ? trading : tradingMode;
    
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

  const toggleTradingMode = () => {
    const newTradingMode = !tradingMode;
    setTradingMode(newTradingMode);
    if (isConnected) {
      // Redémarrer avec le nouveau mode
      stopDataStream().then(() => {
        setTimeout(() => startDataStream(selectedTimeframe, newTradingMode), 1000);
      });
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

  const formatPrice = (price: number) => price.toFixed(2);
  const formatIndicator = (value: number) => value.toFixed(2);
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

  const getTradingCriteria = () => {
    if (!state) return null;
    
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
    
    // Calculer les proximités
    const emaDiff = Math.abs(state.ema50 - state.ema200);
    const emaPercent = (emaDiff / state.ema200) * 100;
    const isEmaClose = emaPercent < 1; // Moins de 1% de différence
    
    const longRsiClose = state.rsi < 40 && state.rsi >= 30; // RSI entre 30 et 40
    const shortRsiClose = state.rsi > 60 && state.rsi <= 70; // RSI entre 60 et 70
    
    const cooldownClose = cooldownRemaining > 0 && cooldownRemaining < 60000; // Moins d'1 minute
    
    const criteria = {
      // Critères pour LONG
      long: {
        emaTrend: state.ema50 > state.ema200,
        emaTrendStatus: getStatus(state.ema50 > state.ema200, isEmaClose && state.ema50 <= state.ema200),
        rsiOversold: state.rsi < 30,
        rsiOversoldStatus: getStatus(state.rsi < 30, longRsiClose),
        noPosition: state.currentPosition.type === 'NONE',
        noPositionStatus: getStatus(state.currentPosition.type === 'NONE', false),
        cooldownPassed: cooldownPassed,
        cooldownPassedStatus: getStatus(cooldownPassed, cooldownClose)
      },
      // Critères pour SHORT
      short: {
        emaTrend: state.ema50 < state.ema200,
        emaTrendStatus: getStatus(state.ema50 < state.ema200, isEmaClose && state.ema50 >= state.ema200),
        rsiOverbought: state.rsi > 70,
        rsiOverboughtStatus: getStatus(state.rsi > 70, shortRsiClose),
        noPosition: state.currentPosition.type === 'NONE',
        noPositionStatus: getStatus(state.currentPosition.type === 'NONE', false),
        cooldownPassed: cooldownPassed,
        cooldownPassedStatus: getStatus(cooldownPassed, cooldownClose)
      },
      cooldownRemaining: cooldownRemaining
    };

    return criteria;
  };

  // Fonction pour obtenir la classe CSS du point en fonction du statut
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'green': return 'bg-green-400';
      case 'orange': return 'bg-orange-400';
      case 'gray': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header Binance-style */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
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
          
          <div className="flex items-center gap-4">
            {isConnecting && (
              <div className="bg-yellow-600 text-white px-4 py-2 rounded text-sm font-medium">
                ⏳ Connecting...
              </div>
            )}
            
            {isConnected && (
              <>
                <button
                  onClick={toggleTradingMode}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                    tradingMode
                      ? 'bg-red-600 hover:bg-red-700 text-white border border-red-500'
                      : 'bg-green-600 hover:bg-green-700 text-white border border-green-500'
                  }`}
                  title={tradingMode ? 'Stop Trading' : 'Start Trading'}
                >
                  {tradingMode ? 'STOP' : 'START'}
                </button>
                
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${tradingMode ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                  <span className={`text-sm font-medium ${tradingMode ? 'text-red-400' : 'text-gray-400'}`}>
                    {tradingMode ? 'TRADING ACTIVE' : 'MONITORING'}
                  </span>
                </div>
              </>
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

      {state && (
        <>
          {/* OHLC Panel - Binance Style */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
            <div className="flex items-center gap-8">
              {/* Current Price */}
              <div className="flex items-center gap-2">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Position Info */}
              <div className="flex flex-col" title="Position actuelle: LONG (achat), SHORT (vente à découvert), ou NONE (aucune position)">
                <span className="text-gray-400 text-xs mb-1">POSITION</span>
                <span className={`font-bold ${
                  state.currentPosition.type === 'LONG' ? 'text-green-400' : 
                  state.currentPosition.type === 'SHORT' ? 'text-red-400' : 
                  'text-gray-400'
                }`}>
                  {state.currentPosition.type}
                </span>
                {state.currentPosition.type !== 'NONE' && (
                  <span className="text-xs text-gray-500" title={`Prix d'entrée de la position: ${state.currentPosition.entryPrice.toFixed(2)} USDT`}>
                    Entry: ${state.currentPosition.entryPrice.toFixed(2)}
                  </span>
                )}
              </div>

              {/* PnL */}
              <div className="flex flex-col" title="Profit/Perte non réalisé(e) de la position actuelle (avant clôture)">
                <span className="text-gray-400 text-xs mb-1">UNREALIZED P&L</span>
                <span className={`font-bold ${
                  state.currentPosition.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {state.currentPosition.unrealizedPnL.toFixed(2)} USDT
                </span>
                <span className={`text-xs ${
                  state.currentPosition.unrealizedPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`} title="Pourcentage de profit/perte par rapport au prix d'entrée">
                  {state.currentPosition.unrealizedPnLPercent.toFixed(2)}%
                </span>
              </div>

              {/* Total PnL */}
              <div className="flex flex-col" title="Profit/Perte total(e) cumulé(e) de toutes les positions fermées">
                <span className="text-gray-400 text-xs mb-1">TOTAL P&L</span>
                <span className={`font-bold ${
                  state.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {state.totalPnL.toFixed(2)} USDT
                </span>
                <span className="text-xs text-gray-500" title={`Nombre total de trades exécutés: ${state.totalTrades}`}>
                  {state.totalTrades} trades
                </span>
              </div>

              {/* Win Rate */}
              <div className="flex flex-col" title="Pourcentage de trades gagnants sur le total des trades">
                <span className="text-gray-400 text-xs mb-1">WIN RATE</span>
                <span className="font-bold text-blue-400">
                  {state.totalTrades > 0 ? ((state.winningTrades / state.totalTrades) * 100).toFixed(1) : 0}%
                </span>
                <span className="text-xs text-gray-500" title={`${state.winningTrades} trades gagnants sur ${state.totalTrades} trades au total`}>
                  {state.winningTrades}/{state.totalTrades} wins
                </span>
              </div>
            </div>
          </div>

          {/* Trading Criteria Panel - Compact & Collapsible */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCriteria(!showCriteria)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Afficher/Masquer les critères de trading détaillés"
                >
                  {showCriteria ? '▼' : '▶'}
                </button>
                <span className="text-sm font-medium text-white" title="Critères de validation pour les signaux LONG et SHORT">Trading Criteria</span>
              </div>
              
              {(() => {
                const criteria = getTradingCriteria();
                if (!criteria) return null;
                
                const longReady = Object.values(criteria.long).every(Boolean);
                const shortReady = Object.values(criteria.short).every(Boolean);
                
                return (
                  <div className="flex items-center gap-6">
                    {/* Mini visual indicators - always visible */}
                    <div className="flex items-center gap-2 text-xs" title="Indicateurs visuels: 🟢 Validé | 🟠 Proche | ⚪ Non validé">
                      {/* LONG mini indicators */}
                      <div className="flex items-center gap-1" title="Critères LONG (ordre: EMA, RSI, Position, Cooldown)">
                        <span className={`w-1 h-1 rounded-full ${getStatusClass(criteria.long.emaTrendStatus)}`} title="EMA50 > EMA200 (tendance haussière)"></span>
                        <span className={`w-1 h-1 rounded-full ${getStatusClass(criteria.long.rsiOversoldStatus)}`} title="RSI < 30 (zone de survente)"></span>
                        <span className={`w-1 h-1 rounded-full ${getStatusClass(criteria.long.noPositionStatus)}`} title="Aucune position ouverte"></span>
                        <span className={`w-1 h-1 rounded-full ${getStatusClass(criteria.long.cooldownPassedStatus)}`} title="Cooldown de 5 minutes écoulé"></span>
                      </div>
                      <span className="text-gray-500">|</span>
                      {/* SHORT mini indicators */}
                      <div className="flex items-center gap-1" title="Critères SHORT (ordre: EMA, RSI, Position, Cooldown)">
                        <span className={`w-1 h-1 rounded-full ${getStatusClass(criteria.short.emaTrendStatus)}`} title="EMA50 < EMA200 (tendance baissière)"></span>
                        <span className={`w-1 h-1 rounded-full ${getStatusClass(criteria.short.rsiOverboughtStatus)}`} title="RSI > 70 (zone de surachat)"></span>
                        <span className={`w-1 h-1 rounded-full ${getStatusClass(criteria.short.noPositionStatus)}`} title="Aucune position ouverte"></span>
                        <span className={`w-1 h-1 rounded-full ${getStatusClass(criteria.short.cooldownPassedStatus)}`} title="Cooldown de 5 minutes écoulé"></span>
                      </div>
                    </div>
                    
                    {/* Status summary */}
                    <div className="flex items-center gap-3 text-xs">
                      <div 
                        className={`flex items-center gap-1 ${longReady ? 'text-green-400' : 'text-gray-400'}`}
                        title={longReady ? 'Signal LONG prêt: Tous les critères sont validés!' : 'Signal LONG en attente: Certains critères ne sont pas encore remplis'}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${longReady ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`}></span>
                        LONG {longReady ? 'READY' : 'WAIT'}
                      </div>
                      <div 
                        className={`flex items-center gap-1 ${shortReady ? 'text-red-400' : 'text-gray-400'}`}
                        title={shortReady ? 'Signal SHORT prêt: Tous les critères sont validés!' : 'Signal SHORT en attente: Certains critères ne sont pas encore remplis'}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${shortReady ? 'bg-red-400 animate-pulse' : 'bg-gray-600'}`}></span>
                        SHORT {shortReady ? 'READY' : 'WAIT'}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {showCriteria && (() => {
              const criteria = getTradingCriteria();
              if (!criteria) return null;
              
              const cooldownSeconds = Math.ceil((criteria.cooldownRemaining || 0) / 1000);
              const cooldownMinutes = Math.floor(cooldownSeconds / 60);
              const cooldownSecondsRemainder = cooldownSeconds % 60;
              
              return (
                <div className="mt-2 space-y-2">
                  {/* Cooldown Timer - compact version */}
                  {criteria.cooldownRemaining > 0 && (
                    <div className="bg-gray-900 px-3 py-1 rounded border border-gray-700">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs text-gray-400">⏳ Cooldown:</span>
                        <span className="text-xs text-yellow-400 font-mono">
                          {cooldownMinutes}:{cooldownSecondsRemainder.toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Compact inline display */}
                  <div className="flex items-center justify-between gap-4 text-xs">
                    {/* LONG Criteria - inline */}
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-medium" title="Critères pour signal LONG (achat)">🟢 LONG</span>
                      <div className="flex items-center gap-2">
                        <span 
                          className={`flex items-center gap-1 ${criteria.long.emaTrendStatus === 'green' ? 'text-green-400' : criteria.long.emaTrendStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
                          title={`EMA50 (${state.ema50.toFixed(0)}) > EMA200 (${state.ema200.toFixed(0)})`}
                        >
                          <span className={`w-1 h-1 rounded-full ${getStatusClass(criteria.long.emaTrendStatus)}`}></span>
                          EMA
                        </span>
                        <span 
                          className={`flex items-center gap-1 ${criteria.long.rsiOversoldStatus === 'green' ? 'text-green-400' : criteria.long.rsiOversoldStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
                          title={`RSI: ${state.rsi.toFixed(1)} < 30 (survente)`}
                        >
                          <span className={`w-1 h-1 rounded-full ${getStatusClass(criteria.long.rsiOversoldStatus)}`}></span>
                          RSI
                        </span>
                        <span 
                          className={`flex items-center gap-1 ${criteria.long.noPositionStatus === 'green' ? 'text-green-400' : criteria.long.noPositionStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
                          title={`Position actuelle: ${state.currentPosition.type}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${getStatusClass(criteria.long.noPositionStatus)}`}></span>
                          Pos
                        </span>
                        <span 
                          className={`flex items-center gap-1 ${criteria.long.cooldownPassedStatus === 'green' ? 'text-green-400' : criteria.long.cooldownPassedStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
                          title={criteria.cooldownRemaining > 0 ? `Cooldown: ${Math.ceil(criteria.cooldownRemaining / 1000)}s restantes` : 'Cooldown OK'}
                        >
                          <span className={`w-1 h-1 rounded-full ${getStatusClass(criteria.long.cooldownPassedStatus)}`}></span>
                          CD
                        </span>
                      </div>
                    </div>
                    
                    {/* Separator */}
                    <span className="text-gray-600">|</span>
                    
                    {/* SHORT Criteria - inline */}
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 font-medium" title="Critères pour signal SHORT (vente)">🔴 SHORT</span>
                      <div className="flex items-center gap-2">
                        <span 
                          className={`flex items-center gap-1 ${criteria.short.emaTrendStatus === 'green' ? 'text-green-400' : criteria.short.emaTrendStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
                          title={`EMA50 (${state.ema50.toFixed(0)}) < EMA200 (${state.ema200.toFixed(0)})`}
                        >
                          <span className={`w-1 h-1 rounded-full ${getStatusClass(criteria.short.emaTrendStatus)}`}></span>
                          EMA
                        </span>
                        <span 
                          className={`flex items-center gap-1 ${criteria.short.rsiOverboughtStatus === 'green' ? 'text-green-400' : criteria.short.rsiOverboughtStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
                          title={`RSI: ${state.rsi.toFixed(1)} > 70 (surachat)`}
                        >
                          <span className={`w-1 h-1 rounded-full ${getStatusClass(criteria.short.rsiOverboughtStatus)}`}></span>
                          RSI
                        </span>
                        <span 
                          className={`flex items-center gap-1 ${criteria.short.noPositionStatus === 'green' ? 'text-green-400' : criteria.short.noPositionStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
                          title={`Position actuelle: ${state.currentPosition.type}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${getStatusClass(criteria.short.noPositionStatus)}`}></span>
                          Pos
                        </span>
                        <span 
                          className={`flex items-center gap-1 ${criteria.short.cooldownPassedStatus === 'green' ? 'text-green-400' : criteria.short.cooldownPassedStatus === 'orange' ? 'text-orange-400' : 'text-gray-500'}`}
                          title={criteria.cooldownRemaining > 0 ? `Cooldown: ${Math.ceil(criteria.cooldownRemaining / 1000)}s restantes` : 'Cooldown OK'}
                        >
                          <span className={`w-1 h-1 rounded-full ${getStatusClass(criteria.short.cooldownPassedStatus)}`}></span>
                          CD
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Binance-style Chart */}
          <BinanceChart state={state} />

          {/* Last Signal - Compact */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
            {state.lastSignal ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`${getSignalColor(state.lastSignal.type)} px-3 py-1 rounded text-sm font-bold`}>
                    {state.lastSignal.type}
                  </span>
                  <span className="text-white font-mono">${formatPrice(state.lastSignal.price)}</span>
                  <span className="text-gray-400 text-sm">{formatTime(state.lastSignal.timestamp)}</span>
                </div>
                <span className="text-gray-400 text-sm max-w-md truncate">
                  {state.lastSignal.reason}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">Waiting for signal...</span>
                <div className="w-1 h-1 bg-gray-600 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>

          {/* Signals History - Compact */}
          {state.signals.length > 0 && (
            <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-300">RECENT SIGNALS</h3>
                <span className="text-xs text-gray-500">{state.signals.length} total</span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {[...state.signals].reverse().slice(0, 5).map((signal: TradingSignal, index: number) => (
                  <div key={index} className="flex items-center justify-between py-1 text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`${getSignalColor(signal.type)} px-2 py-1 rounded text-xs font-bold`}>
                        {signal.type}
                      </span>
                      <span className="text-white font-mono">${formatPrice(signal.price)}</span>
                      <span className="text-gray-400">{formatTime(signal.timestamp)}</span>
                    </div>
                    <span className="text-gray-500 truncate max-w-xs">
                      {signal.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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

