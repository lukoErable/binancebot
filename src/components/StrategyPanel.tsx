'use client';

import { BacktestResult, StrategyPerformance } from '@/types/trading';
import { useEffect, useRef, useState } from 'react';
import { BiDownArrow, BiSquare, BiUpArrow } from 'react-icons/bi';
import { FaBrain, FaChartLine } from 'react-icons/fa';
import {
  HiAdjustments,
  HiArrowCircleDown,
  HiArrowCircleUp,
  HiArrowDown,
  HiArrowUp,
  HiBeaker,
  HiChartBar,
  HiChartPie,
  HiChartSquareBar,
  HiCheckCircle,
  HiChevronDown,
  HiChevronLeft,
  HiChevronRight,
  HiClock,
  HiCollection,
  HiCurrencyDollar,
  HiLightningBolt,
  HiMinusCircle,
  HiPlus,
  HiRefresh,
  HiScale,
  HiSearch,
  HiSortAscending,
  HiStar,
  HiSwitchVertical,
  HiTrash,
  HiTrendingDown,
  HiTrendingUp,
  HiViewGrid,
  HiX,
  HiXCircle
} from 'react-icons/hi';
import {
  RiBarChartBoxLine,
  RiCandleLine,
  RiLineChartLine,
  RiStockLine
} from 'react-icons/ri';
import {
  TbArrowsUpDown,
  TbChartCandle,
  TbChartDots,
  TbTrendingDown,
  TbTrendingUp
} from 'react-icons/tb';
import LocalBacktestModal from './LocalBacktestModal';

interface IndicatorPanelData {
  // Price-based
  price: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  
  // Moving Averages
  ema12: number;
  ema26: number;
  ema50: number;
  ema100?: number;
  ema200: number;
  sma7: number;
  sma25: number;
  sma50?: number;
  sma99: number;
  sma200?: number;
  
  // Momentum Indicators
  rsi: number;
  rsi9?: number;
  rsi21?: number;
  
  // MACD
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  
  // Bollinger Bands
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  bbWidth?: number;
  bbPercent?: number;
  
  // Volatility
  atr?: number;
  atr14?: number;
  atr21?: number;
  
  // Stochastic
  stochK?: number;
  stochD?: number;
  
  // Trend Strength
  adx?: number;
  
  // Others
  cci?: number;
  obv?: number;
  
  // Volume Analysis
  volumeSMA20?: number;
  volumeRatio?: number;
  
  // Price Position
  priceChangePercent?: number;
  priceChange24h?: number;
  vwap?: number;
  
  // Trend Detection (booleans)
  isBullishTrend?: boolean;
  isBearishTrend?: boolean;
  isUptrend?: boolean;
  isDowntrend?: boolean;
  isUptrendConfirmed3?: boolean;
  isDowntrendConfirmed3?: boolean;
  isTrendReversalUp?: boolean;
  isTrendReversalDown?: boolean;
  
  // Momentum (booleans)
  isOversold?: boolean;
  isOverbought?: boolean;
  
  // MACD Signals (booleans)
  isMACDBullish?: boolean;
  isMACDBearish?: boolean;
  isMACDCrossoverBullish?: boolean;
  isMACDCrossoverBearish?: boolean;
  
  // EMA Crossovers (booleans)
  isEMAFastSlowBullCross?: boolean;
  isEMAFastSlowBearCross?: boolean;
  
  // Price/EMA Cross (booleans)
  isPriceCrossedAboveEMA50?: boolean;
  isPriceCrossedBelowEMA50?: boolean;
  
  // Volume (booleans)
  isHighVolume?: boolean;
  isLowVolume?: boolean;
  
  // VWAP Signals (booleans)
  isPriceAboveVWAP?: boolean;
  isPriceBelowVWAP?: boolean;
  isNearVWAP?: boolean;
  
  // Bollinger Bands Signals (booleans)
  isNearBBLower?: boolean;
  isNearBBUpper?: boolean;
  isBelowBBLower?: boolean;
  isAboveBBUpper?: boolean;
  
  // Candle Patterns (booleans)
  isBullishCandle?: boolean;
  isBearishCandle?: boolean;
  isBullishEngulfing?: boolean;
  isBearishEngulfing?: boolean;
  isDoji?: boolean;
  isHammer?: boolean;
  isShootingStar?: boolean;
}

interface StrategyPanelProps {
  performances: StrategyPerformance[]; // Filtered performances (by current timeframe)
  allPerformances?: StrategyPerformance[]; // All performances (all timeframes) - for multi-TF modal
  currentTimeframe?: string; // Current timeframe for Reset All
  isStatsSticky?: boolean; // Indicates if main stats bar is sticky
  onToggleStrategy?: (strategyName: string) => void;
  togglingStrategies?: Set<string>; // Strategies currently being toggled
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
  advancedIndicators?: any;
  basicIndicators?: any;
  triggerIndicatorsOverlay?: boolean;
  onIndicatorsOverlayTriggered?: () => void;
  triggerAdvancedIndicatorsOverlay?: boolean;
  onAdvancedIndicatorsOverlayTriggered?: () => void;
  onDeleteStrategy?: (strategyName: string) => void;
  onShowTimeframeComparison?: (strategyName: string) => void;
  onEditStrategy?: (strategyName: string, config: any) => void;
}

export default function StrategyPanel({ 
  performances, 
  allPerformances,
  currentTimeframe,
  isStatsSticky,
  onToggleStrategy, 
  togglingStrategies,
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
  advancedIndicators,
  basicIndicators,
  triggerIndicatorsOverlay,
  onIndicatorsOverlayTriggered,
  onDeleteStrategy,
  onShowTimeframeComparison,
  onEditStrategy
}: StrategyPanelProps) {
  const [viewMode, setViewMode] = useState<'compact' | 'normal'>('normal');
  const [resetConfirm, setResetConfirm] = useState<string | null>(null); // Strategy name to reset
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); // Strategy name to delete
  const [resetAllConfirm, setResetAllConfirm] = useState(false); // Confirmation for reset all
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set()); // Cartes retournées pour afficher les détails
  const [expandedSections, setExpandedSections] = useState<Record<string, Set<string>>>({}); // Sections étendues par stratégie
  const [sortMode, setSortMode] = useState<'smart' | 'pnl' | 'winrate' | 'capital' | 'alphabetical'>('smart'); // Mode de tri
  const [showAdvancedIndicators, setShowAdvancedIndicators] = useState(false); // Afficher tous les indicateurs avancés
  
  // Trigger indicators overlay from Dashboard
  useEffect(() => {
    if (triggerIndicatorsOverlay) {
      setShowInfoOverlay(true);
      onIndicatorsOverlayTriggered?.();
    }
  }, [triggerIndicatorsOverlay, onIndicatorsOverlayTriggered]);
  const [activeAdvancedTab, setActiveAdvancedTab] = useState<'trend' | 'momentum' | 'volatility' | 'volume'>('trend'); // Onglet actif pour les indicateurs avancés
  const [settingsOpen, setSettingsOpen] = useState<string | null>(null); // Strategy name in settings mode
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  const [overlayPos, setOverlayPos] = useState<{ x: number; y: number }>({ x: 80, y: 120 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragMoved = useRef<boolean>(false);
  const [overlayCollapsed, setOverlayCollapsed] = useState(false);
  
  // Category filter state
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(['price', 'movingAverages', 'trend']));
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [expandedIndicators, setExpandedIndicators] = useState<Set<string>>(new Set()); // Track which indicators show detailed formula
  const [indicatorSearch, setIndicatorSearch] = useState<string>(''); // Search filter for indicators
  const [strategySearch, setStrategySearch] = useState<string>(''); // Search filter for strategies
  
  // Multi-timeframe modal state
  const [showMultiTimeframeModal, setShowMultiTimeframeModal] = useState(false);
  const [selectedStrategyForMultiTF, setSelectedStrategyForMultiTF] = useState<string | null>(null);
  const [selectedTimeframes, setSelectedTimeframes] = useState<Set<string>>(new Set(['1m']));
  const [isActivatingMultiTF, setIsActivatingMultiTF] = useState(false);
  
  // Local Backtest modal state
  const [showLocalBacktestModal, setShowLocalBacktestModal] = useState(false);
  const [selectedStrategyForLocalBacktest, setSelectedStrategyForLocalBacktest] = useState<string | null>(null);
  const [selectedTimeframeForLocalBacktest, setSelectedTimeframeForLocalBacktest] = useState<string>('1m');
  const [localBacktestResults, setLocalBacktestResults] = useState<BacktestResult | null>(null);
  
  // Action buttons expanded state
  const [expandedActionButtons, setExpandedActionButtons] = useState<Set<string>>(new Set());
  
  const toggleActionButtons = (strategyName: string) => {
    setExpandedActionButtons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(strategyName)) {
        newSet.delete(strategyName);
      } else {
        newSet.add(strategyName);
      }
      return newSet;
    });
  };
  
  // Category definitions
  type IndicatorCategory = {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    numericKeys: { key: keyof IndicatorPanelData; label: string; formula?: string; format?: (v: number) => string; icon?: React.ComponentType<{ className?: string }> }[];
    booleanKeys: { key: keyof IndicatorPanelData; label: string; formula?: string; nearKey?: keyof IndicatorPanelData; icon?: React.ComponentType<{ className?: string }> }[];
  };
  
  const toggleIndicatorExpand = (indicatorKey: string) => {
    setExpandedIndicators(prev => {
      const newSet = new Set(prev);
      if (newSet.has(indicatorKey)) {
        newSet.delete(indicatorKey);
      } else {
        newSet.add(indicatorKey);
      }
      return newSet;
    });
  };

  const INDICATOR_CATEGORIES: IndicatorCategory[] = [
    {
      id: 'price',
      label: 'Price',
      icon: HiCurrencyDollar,
      color: 'text-green-400',
      numericKeys: [
        { key: 'price', label: 'Current Price', formula: 'Most recent close price of the current candle', format: (v) => `$${v.toFixed(2)}`, icon: HiCurrencyDollar },
        { key: 'open', label: 'Open', formula: 'Opening price of current candle', format: (v) => `$${v.toFixed(2)}`, icon: RiStockLine },
        { key: 'high', label: 'High', formula: 'Highest price reached in current candle', format: (v) => `$${v.toFixed(2)}`, icon: HiArrowUp },
        { key: 'low', label: 'Low', formula: 'Lowest price reached in current candle', format: (v) => `$${v.toFixed(2)}`, icon: HiArrowDown },
        { key: 'priceChangePercent', label: 'Price Change %', formula: '((Close - PrevClose) / PrevClose) × 100', format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, icon: TbArrowsUpDown },
        { key: 'priceChange24h', label: '24h Change %', formula: '((Close - Close24hAgo) / Close24hAgo) × 100', format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, icon: HiClock }
      ],
      booleanKeys: []
    },
    {
      id: 'movingAverages',
      label: 'Moving Averages',
      icon: RiLineChartLine,
      color: 'text-blue-400',
      numericKeys: [
        { key: 'ema12', label: 'EMA 12', formula: 'Exponential Moving Average over 12 periods (gives more weight to recent prices)', format: (v) => `$${v.toFixed(2)}`, icon: TbChartDots },
        { key: 'ema26', label: 'EMA 26', formula: 'Exponential Moving Average over 26 periods', format: (v) => `$${v.toFixed(2)}`, icon: TbChartDots },
        { key: 'ema50', label: 'EMA 50', formula: 'Exponential Moving Average over 50 periods (short-term trend)', format: (v) => `$${v.toFixed(2)}`, icon: TbChartDots },
        { key: 'ema100', label: 'EMA 100', formula: 'Exponential Moving Average over 100 periods (medium-term trend)', format: (v) => `$${v.toFixed(2)}`, icon: TbChartDots },
        { key: 'ema200', label: 'EMA 200', formula: 'Exponential Moving Average over 200 periods (long-term trend)', format: (v) => `$${v.toFixed(2)}`, icon: TbChartDots },
        { key: 'sma7', label: 'SMA 7', formula: 'Simple Moving Average: (Sum of last 7 closes) / 7', format: (v) => `$${v.toFixed(2)}`, icon: FaChartLine },
        { key: 'sma25', label: 'SMA 25', formula: 'Simple Moving Average: (Sum of last 25 closes) / 25', format: (v) => `$${v.toFixed(2)}`, icon: FaChartLine },
        { key: 'sma50', label: 'SMA 50', formula: 'Simple Moving Average: (Sum of last 50 closes) / 50', format: (v) => `$${v.toFixed(2)}`, icon: FaChartLine },
        { key: 'sma99', label: 'SMA 99', formula: 'Simple Moving Average: (Sum of last 99 closes) / 99', format: (v) => `$${v.toFixed(2)}`, icon: FaChartLine },
        { key: 'sma200', label: 'SMA 200', formula: 'Simple Moving Average: (Sum of last 200 closes) / 200', format: (v) => `$${v.toFixed(2)}`, icon: FaChartLine }
      ],
      booleanKeys: []
    },
    {
      id: 'momentum',
      label: 'Momentum',
      icon: HiLightningBolt,
      color: 'text-yellow-400',
      numericKeys: [
        { key: 'rsi', label: 'RSI (14)', formula: 'Relative Strength Index over 14 periods: 100 - (100 / (1 + RS)) where RS = Avg Gain / Avg Loss', format: (v) => v.toFixed(1), icon: HiChartPie },
        { key: 'rsi9', label: 'RSI (9)', formula: 'Fast RSI calculated over 9 periods (more sensitive to price changes)', format: (v) => v.toFixed(1), icon: HiChartPie },
        { key: 'rsi21', label: 'RSI (21)', formula: 'Slow RSI calculated over 21 periods (smoother, less noise)', format: (v) => v.toFixed(1), icon: HiChartPie }
      ],
      booleanKeys: [
        { key: 'isOversold', label: 'RSI Oversold (<30)', formula: 'RSI(14) < 30 → Market is oversold, potential buy signal', icon: HiArrowCircleDown },
        { key: 'isOverbought', label: 'RSI Overbought (>70)', formula: 'RSI(14) > 70 → Market is overbought, potential sell signal', icon: HiArrowCircleUp }
      ]
    },
    {
      id: 'macd',
      label: 'MACD',
      icon: HiChartBar,
      color: 'text-purple-400',
      numericKeys: [
        { key: 'macd', label: 'MACD', formula: 'Moving Average Convergence Divergence: EMA(12) - EMA(26)', format: (v) => v.toFixed(2), icon: RiBarChartBoxLine },
        { key: 'macdSignal', label: 'MACD Signal', formula: 'EMA(9) of MACD line (signal line)', format: (v) => v.toFixed(2), icon: RiBarChartBoxLine },
        { key: 'macdHistogram', label: 'MACD Histogram', formula: 'MACD - Signal (shows momentum strength)', format: (v) => v.toFixed(2), icon: HiChartSquareBar }
      ],
      booleanKeys: [
        { key: 'isMACDBullish', label: 'MACD > Signal (Bullish)', formula: 'MACD line above signal line → Bullish momentum', icon: TbTrendingUp },
        { key: 'isMACDBearish', label: 'MACD < Signal (Bearish)', formula: 'MACD line below signal line → Bearish momentum', icon: TbTrendingDown },
        { key: 'isMACDCrossoverBullish', label: 'MACD Bullish Crossover', formula: 'MACD just crossed above signal line (strong buy signal)', icon: HiArrowCircleUp },
        { key: 'isMACDCrossoverBearish', label: 'MACD Bearish Crossover', formula: 'MACD just crossed below signal line (strong sell signal)', icon: HiArrowCircleDown }
      ]
    },
    {
      id: 'bollingerBands',
      label: 'Bollinger Bands',
      icon: HiAdjustments,
      color: 'text-teal-400',
      numericKeys: [
        { key: 'bbUpper', label: 'BB Upper', formula: 'Upper Band: SMA(20) + (2 × StdDev)', format: (v) => `$${v.toFixed(2)}`, icon: HiArrowUp },
        { key: 'bbMiddle', label: 'BB Middle', formula: 'Middle Band: SMA(20) of price', format: (v) => `$${v.toFixed(2)}`, icon: HiMinusCircle },
        { key: 'bbLower', label: 'BB Lower', formula: 'Lower Band: SMA(20) - (2 × StdDev)', format: (v) => `$${v.toFixed(2)}`, icon: HiArrowDown },
        { key: 'bbWidth', label: 'BB Width %', formula: '((Upper - Lower) / Middle) × 100 (measures volatility)', format: (v) => `${v.toFixed(2)}%`, icon: TbArrowsUpDown },
        { key: 'bbPercent', label: 'BB Percent (%B)', formula: '((Price - Lower) / (Upper - Lower)) × 100 (price position within bands)', format: (v) => `${v.toFixed(1)}%`, icon: HiScale }
      ],
      booleanKeys: [
        { key: 'isNearBBLower', label: 'Near BB Lower', formula: 'Price within 2% of lower band (potential bounce)', icon: HiArrowDown },
        { key: 'isNearBBUpper', label: 'Near BB Upper', formula: 'Price within 2% of upper band (potential pullback)', icon: HiArrowUp },
        { key: 'isBelowBBLower', label: 'Below BB Lower', formula: 'Price below lower band (oversold condition)', icon: HiArrowCircleDown },
        { key: 'isAboveBBUpper', label: 'Above BB Upper', formula: 'Price above upper band (overbought condition)', icon: HiArrowCircleUp }
      ]
    },
    {
      id: 'volatility',
      label: 'Volatility',
      icon: HiSwitchVertical,
      color: 'text-orange-400',
      numericKeys: [
        { key: 'atr', label: 'ATR', formula: 'Average True Range: Average of True Range over 14 periods (measures volatility)', format: (v) => v.toFixed(2), icon: TbArrowsUpDown },
        { key: 'atr14', label: 'ATR (14)', formula: 'ATR calculated over 14 periods (standard)', format: (v) => v.toFixed(2), icon: TbArrowsUpDown },
        { key: 'atr21', label: 'ATR (21)', formula: 'ATR calculated over 21 periods (smoother)', format: (v) => v.toFixed(2), icon: TbArrowsUpDown },
        { key: 'adx', label: 'ADX (Trend Strength)', formula: 'Average Directional Index: Measures trend strength (>25 = strong trend)', format: (v) => v.toFixed(1), icon: HiTrendingUp }
      ],
      booleanKeys: []
    },
    {
      id: 'stochastic',
      label: 'Stochastic',
      icon: HiSwitchVertical,
      color: 'text-cyan-400',
      numericKeys: [
        { key: 'stochK', label: 'Stochastic %K', formula: '((Close - Low14) / (High14 - Low14)) × 100 (fast line)', format: (v) => v.toFixed(1), icon: RiLineChartLine },
        { key: 'stochD', label: 'Stochastic %D', formula: 'SMA(3) of %K (slow line, signal line)', format: (v) => v.toFixed(1), icon: RiLineChartLine }
      ],
      booleanKeys: []
    },
    {
      id: 'volume',
      label: 'Volume',
      icon: HiChartSquareBar,
      color: 'text-pink-400',
      numericKeys: [
        { key: 'volume', label: 'Volume', formula: 'Trading volume for current candle (BTC traded)', format: (v) => `${(v / 1000).toFixed(2)}K`, icon: HiChartSquareBar },
        { key: 'volumeSMA20', label: 'Volume SMA20', formula: 'Simple Moving Average of volume over 20 periods', format: (v) => `${(v / 1000).toFixed(2)}K`, icon: HiChartBar },
        { key: 'volumeRatio', label: 'Volume Ratio', formula: 'Current Volume / Volume SMA(20) (>1 = above average)', format: (v) => `${v.toFixed(2)}x`, icon: HiScale },
        { key: 'obv', label: 'OBV', formula: 'On Balance Volume: Cumulative volume with direction (up candle: +vol, down: -vol)', format: (v) => v.toExponential(2), icon: HiCollection }
      ],
      booleanKeys: [
        { key: 'isHighVolume', label: 'High Volume (>1.5x avg)', formula: 'Volume > 1.5 × Volume SMA(20) → Strong activity', icon: HiTrendingUp },
        { key: 'isLowVolume', label: 'Low Volume (<0.5x avg)', formula: 'Volume < 0.5 × Volume SMA(20) → Weak activity', icon: HiTrendingDown }
      ]
    },
    {
      id: 'vwap',
      label: 'VWAP',
      icon: HiScale,
      color: 'text-indigo-400',
      numericKeys: [
        { key: 'vwap', label: 'VWAP', formula: 'Volume Weighted Average Price: Σ(Price × Volume) / Σ(Volume)', format: (v) => `$${v.toFixed(2)}`, icon: HiScale }
      ],
      booleanKeys: [
        { key: 'isPriceAboveVWAP', label: 'Price > VWAP', formula: 'Price above VWAP → Bullish sentiment', nearKey: 'isNearVWAP', icon: HiArrowUp },
        { key: 'isPriceBelowVWAP', label: 'Price < VWAP', formula: 'Price below VWAP → Bearish sentiment', nearKey: 'isNearVWAP', icon: HiArrowDown },
        { key: 'isNearVWAP', label: 'Near VWAP (±0.5%)', formula: 'Price within 0.5% of VWAP (equilibrium zone)', icon: HiMinusCircle }
      ]
    },
    {
      id: 'trend',
      label: 'Trend Signals',
      icon: HiTrendingUp,
      color: 'text-emerald-400',
      numericKeys: [],
      booleanKeys: [
        { key: 'isUptrend', label: 'Price > EMA50', formula: 'Current price above EMA(50) → Short-term uptrend', icon: HiArrowUp },
        { key: 'isDowntrend', label: 'Price < EMA50', formula: 'Current price below EMA(50) → Short-term downtrend', icon: HiArrowDown },
        { key: 'isBullishTrend', label: 'EMA50 > EMA200', formula: 'EMA(50) above EMA(200) → Long-term bullish trend (Golden Cross)', icon: TbTrendingUp },
        { key: 'isBearishTrend', label: 'EMA50 < EMA200', formula: 'EMA(50) below EMA(200) → Long-term bearish trend (Death Cross)', icon: TbTrendingDown },
        { key: 'isUptrendConfirmed3', label: 'Uptrend Confirmed (3 closes)', formula: 'Last 3 candles all closed above EMA(50) → Confirmed uptrend', icon: HiCheckCircle },
        { key: 'isDowntrendConfirmed3', label: 'Downtrend Confirmed (3 closes)', formula: 'Last 3 candles all closed below EMA(50) → Confirmed downtrend', icon: HiXCircle },
        { key: 'isTrendReversalUp', label: 'Trend Reversal Up', formula: 'Confirmed downtrend → Confirmed uptrend (trend flip)', icon: HiArrowCircleUp },
        { key: 'isTrendReversalDown', label: 'Trend Reversal Down', formula: 'Confirmed uptrend → Confirmed downtrend (trend flip)', icon: HiArrowCircleDown },
        { key: 'isEMAFastSlowBullCross', label: 'EMA12>26 Bull Cross', formula: 'EMA(12) just crossed above EMA(26) this candle → Bullish momentum', icon: TbTrendingUp },
        { key: 'isEMAFastSlowBearCross', label: 'EMA12<26 Bear Cross', formula: 'EMA(12) just crossed below EMA(26) this candle → Bearish momentum', icon: TbTrendingDown },
        { key: 'isPriceCrossedAboveEMA50', label: 'Price Crossed Above EMA50', formula: 'Price crossed above EMA(50) this candle → Breakout signal', icon: HiArrowCircleUp },
        { key: 'isPriceCrossedBelowEMA50', label: 'Price Crossed Below EMA50', formula: 'Price crossed below EMA(50) this candle → Breakdown signal', icon: HiArrowCircleDown }
      ]
    },
    {
      id: 'patterns',
      label: 'Candle Patterns',
      icon: RiCandleLine,
      color: 'text-amber-400',
      numericKeys: [],
      booleanKeys: [
        { key: 'isBullishCandle', label: 'Bullish Candle', formula: 'Close > Open (green/white candle)', icon: HiArrowUp },
        { key: 'isBearishCandle', label: 'Bearish Candle', formula: 'Close < Open (red/black candle)', icon: HiArrowDown },
        { key: 'isBullishEngulfing', label: 'Bullish Engulfing', formula: 'Bearish candle followed by larger bullish candle that engulfs it → Strong reversal', icon: TbChartCandle },
        { key: 'isBearishEngulfing', label: 'Bearish Engulfing', formula: 'Bullish candle followed by larger bearish candle that engulfs it → Strong reversal', icon: TbChartCandle },
        { key: 'isDoji', label: 'Doji', formula: 'Open ≈ Close (very small body) → Market indecision', icon: HiMinusCircle },
        { key: 'isHammer', label: 'Hammer', formula: 'Small body at top, long lower wick → Bullish reversal at bottom', icon: TbChartCandle },
        { key: 'isShootingStar', label: 'Shooting Star', formula: 'Small body at bottom, long upper wick → Bearish reversal at top', icon: TbChartCandle }
      ]
    },
    {
      id: 'other',
      label: 'Other',
      icon: HiBeaker,
      color: 'text-gray-400',
      numericKeys: [
        { key: 'cci', label: 'CCI', formula: 'Commodity Channel Index: (Typical Price - SMA) / (0.015 × Mean Deviation)', format: (v) => v.toFixed(1), icon: HiChartPie }
      ],
      booleanKeys: []
    }
  ];
  
  const [highlightLabel, setHighlightLabel] = useState<string | null>(null);
  const indicatorDataRef = useRef<IndicatorPanelData | null>(null);

  // Update ref whenever indicatorData changes
  useEffect(() => {
    indicatorDataRef.current = indicatorData || null;
  }, [indicatorData]);
  
  const toggleCategory = (categoryId: string) => {
    setActiveCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };
  
  const toggleCategoryCollapse = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const update = () => {
      const currentData = indicatorDataRef.current;
      if (!currentData) { 
        setHighlightLabel(null); 
        return; 
      }
      
      // Collect all active boolean indicators
      const actives: string[] = [];
      INDICATOR_CATEGORIES.forEach(cat => {
        cat.booleanKeys.forEach(({ key, label }) => {
          if ((currentData as any)[key] === true) {
            actives.push(label);
          }
        });
      });
      
      if (actives.length > 0) {
        const pick = actives[Math.floor(Math.random() * actives.length)];
        setHighlightLabel(pick);
      } else {
        setHighlightLabel(null);
      }
    };
    
    // Initial update
    update();
    
    // Set interval to update every 10 seconds
    timer = setInterval(update, 10000);
    
    return () => {
      clearInterval(timer);
    };
  }, []); // Empty deps - only runs once on mount, uses ref for latest data

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const nx = e.clientX - dragOffset.current.x;
      const ny = e.clientY - dragOffset.current.y;
      if (Math.abs(nx - overlayPos.x) > 3 || Math.abs(ny - overlayPos.y) > 3) {
        dragMoved.current = true;
      }
      setOverlayPos({ x: nx, y: ny });
    };
    const onUp = () => {
      if (dragging && !dragMoved.current) {
        // Treat as click on header → toggle collapse
        setOverlayCollapsed((v) => !v);
      }
      setDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);
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

  // Format exit conditions with visual indicators
  const formatExitConditionsCompact = (conditions?: any): string => {
    if (!conditions || !conditions.conditions || conditions.conditions.length === 0) {
      return 'TP/SL';
    }

    const formatCondition = (cond: any): string => {
      if ('operator' in cond && 'conditions' in cond) {
        const nestedParts = cond.conditions.map(formatCondition).filter(Boolean);
        const nestedOp = cond.operator === 'AND' ? ' + ' : ' | ';
        return `(${nestedParts.join(nestedOp)})`;
      }
      
      if (cond.type === 'comparison') {
        const indicatorMap: Record<string, string> = {
          'price': 'P', 'rsi': 'RSI', 'ema12': 'E12', 'ema26': 'E26', 'ema50': 'E50',
          'ema100': 'E100', 'ema200': 'E200', 'sma7': 'S7', 'sma25': 'S25', 'sma50': 'S50',
          'sma99': 'S99', 'sma200': 'S200', 'macd': 'MACD', 'macdHistogram': 'MACD-H',
          'bbUpper': 'BB↑', 'bbLower': 'BB↓', 'atr': 'ATR', 'stochK': 'Stoch',
          'adx': 'ADX', 'cci': 'CCI', 'volume': 'Vol', 'vwap': 'VWAP'
        };
        const operatorMap: Record<string, string> = {
          'LT': '<', 'GT': '>', 'EQ': '=', 'LTE': '≤', 'GTE': '≥'
        };
        const indicator = indicatorMap[cond.indicator] || cond.indicator;
        const operator = operatorMap[cond.operator] || cond.operator;
        
        // Handle indicator-to-indicator comparison
        const valueDisplay = typeof cond.value === 'string' 
          ? (indicatorMap[cond.value] || cond.value) // It's an indicator
          : cond.value; // It's a number
        
        return `${indicator}${operator}${valueDisplay}`;
      } else if (cond.type === 'boolean') {
        const booleanMap: Record<string, string> = {
          'isDowntrend': 'Trend↓', 'isUptrend': 'Trend↑', 'isBearishTrend': 'Bear',
          'isBullishTrend': 'Bull', 'isDowntrendConfirmed3': 'Conf↓ (3)', 'isUptrendConfirmed3': 'Conf↑ (3)',
          'isTrendReversalDown': 'Rev↓', 'isTrendReversalUp': 'Rev↑', 'isOversold': 'OS',
          'isOverbought': 'OB', 'isMACDBearish': 'MACD↓', 'isMACDBullish': 'MACD↑',
          'isMACDCrossoverBearish': 'MACDx↓', 'isMACDCrossoverBullish': 'MACDx↑',
          'isPriceCrossedBelowEMA50': 'Px↓E50', 'isPriceCrossedAboveEMA50': 'Px↑E50',
          'isHighVolume': 'Vol↑', 'isLowVolume': 'Vol↓', 'isPriceBelowVWAP': 'P<VWAP',
          'isPriceAboveVWAP': 'P>VWAP', 'isBelowBBLower': 'BB↓', 'isAboveBBUpper': 'BB↑',
          'isBearishEngulfing': 'Engulf↓', 'isBullishEngulfing': 'Engulf↑'
        };
        return booleanMap[cond.indicator] || cond.indicator;
      }
      return '';
    };

    const parts = conditions.conditions.map(formatCondition).filter(Boolean);
    const operator = conditions.operator === 'AND' ? ' + ' : ' | ';
    return parts.join(operator);
  };

  // Render exit conditions with visual status indicators
  const renderExitConditionsWithStatus = (conditions?: any, indicatorData?: any) => {
    if (!conditions || !conditions.conditions || conditions.conditions.length === 0) {
      return <span className="text-gray-500 text-xs">TP/SL only</span>;
    }

    const evaluateCondition = (cond: any): boolean => {
      if (!indicatorData) return false;
      
      if (cond.type === 'comparison') {
        const leftValue = indicatorData[cond.indicator];
        if (leftValue === undefined || leftValue === null) return false;
        
        // Handle indicator-to-indicator or indicator-to-number comparison
        const rightValue = typeof cond.value === 'string' 
          ? indicatorData[cond.value] // Compare with another indicator
          : cond.value; // Compare with a number
        
        if (rightValue === undefined || rightValue === null) return false;
        
        switch (cond.operator) {
          case 'LT': return leftValue < rightValue;
          case 'GT': return leftValue > rightValue;
          case 'EQ': return leftValue === rightValue;
          case 'LTE': return leftValue <= rightValue;
          case 'GTE': return leftValue >= rightValue;
          default: return false;
        }
      } else if (cond.type === 'boolean') {
        return indicatorData[cond.indicator] === true;
      }
      return false;
    };

    const evaluateGroup = (group: any): boolean => {
      if ('operator' in group && 'conditions' in group) {
        if (group.operator === 'AND') {
          return group.conditions.every((c: any) => 
            'operator' in c ? evaluateGroup(c) : evaluateCondition(c)
          );
        } else {
          return group.conditions.some((c: any) => 
            'operator' in c ? evaluateGroup(c) : evaluateCondition(c)
          );
        }
      }
      return evaluateCondition(group);
    };

    const allMet = evaluateGroup(conditions);
    
    // Format condition with current values for tooltip
    const formatConditionTooltip = (cond: any): string => {
      if (!indicatorData) return 'No data';
      
      if (cond.type === 'comparison') {
        const leftValue = indicatorData[cond.indicator];
        const rightValue = cond.value !== undefined && cond.value !== null 
          ? (typeof cond.value === 'number' ? cond.value : indicatorData[cond.value])
          : (cond.indicator2 ? indicatorData[cond.indicator2] : null);
        
        const operatorSymbol = cond.operator === 'LT' ? '<' : cond.operator === 'GT' ? '>' : cond.operator === 'EQ' ? '=' : cond.operator;
        const leftFormatted = typeof leftValue === 'number' ? leftValue.toFixed(2) : leftValue;
        const rightFormatted = typeof rightValue === 'number' ? rightValue.toFixed(2) : rightValue;
        
        return `${cond.indicator}: ${leftFormatted} ${operatorSymbol} ${rightFormatted}`;
      } else if (cond.type === 'boolean') {
        const value = indicatorData[cond.indicator];
        return `${cond.indicator}: ${value ? 'Met' : 'Not met'}`;
      }
      return 'Unknown condition';
    };
    
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400">{formatExitConditionsCompact(conditions)}</span>
        <div className="flex gap-0.5">
          {conditions.conditions.map((cond: any, idx: number) => {
            const met = evaluateCondition(cond);
            const tooltip = formatConditionTooltip(cond);
            return (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  met
                    ? 'bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.8)]'
                    : 'bg-gray-600'
                }`}
                title={tooltip}
              />
            );
          })}
        </div>
      </div>
    );
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
          maxPositionTime: newSettings.enableMaxPos ? newSettings.maxPositionTime : null,
          cooldownPeriod: newSettings.enableCooldown ? Math.max(0, newSettings.cooldownMinutes * 60 * 1000) : null
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
          'RSI < 30 : Le marché est survendu, opportunité d\'achat',
          'EMA50 > EMA200 : Tendance haussière confirmée (Golden Cross)',
          'Cooldown : 5 minutes entre chaque signal'
        ],
        shortCriteria: [
          'RSI > 70 : Le marché est suracheté, opportunité de vente',
          'EMA50 < EMA200 : Tendance baissière confirmée (Death Cross)',
          'Cooldown : 5 minutes entre chaque signal'
        ],
        logic: 'La stratégie achète quand le marché est survendu dans une tendance haussière et vend quand il est suracheté dans une tendance baissière. Elle vise à profiter des retours de prix vers la moyenne (mean reversion).'
      },
      'MOMENTUM_CROSSOVER': {
        title: 'Momentum Crossover',
        description: 'Cette stratégie détecte les changements de momentum grâce aux croisements des moyennes mobiles exponentielles.',
        longCriteria: [
          'EMA12 > EMA26 : Croisement haussier des moyennes courtes',
          'Prix > EMA200 : Confirmation de la tendance haussière',
          'Cooldown : 3 minutes entre chaque signal'
        ],
        shortCriteria: [
          'EMA12 < EMA26 : Croisement baissier des moyennes courtes',
          'Prix < EMA200 : Confirmation de la tendance baissière',
          'Cooldown : 3 minutes entre chaque signal'
        ],
        logic: 'La stratégie suit les croisements des EMA courtes (12/26) pour détecter les changements de momentum. Le filtre EMA200 confirme la direction de la tendance principale et évite les faux signaux.'
      },
      'VOLUME_MACD': {
        title: 'Volume + MACD',
        description: 'Cette stratégie combine l\'analyse du volume, du momentum (MACD) et du VWAP pour des signaux haute conviction.',
        longCriteria: [
          'Volume > 2x moyen : Forte activité de trading détectée',
          'MACD positif : Momentum haussier confirmé',
          'Prix > VWAP : Position favorable au-dessus du prix moyen',
          'Cooldown : 3 minutes entre chaque signal'
        ],
        shortCriteria: [
          'Volume > 2x moyen : Forte activité de trading détectée',
          'MACD négatif : Momentum baissier confirmé',
          'Prix < VWAP : Position favorable en-dessous du prix moyen',
          'Cooldown : 3 minutes entre chaque signal'
        ],
        logic: 'La stratégie attend une forte conviction avec trois confirmations : volume élevé (activité du marché), momentum confirmé (MACD) et prix favorable par rapport au VWAP. Cette triple confirmation maximise les chances de succès.'
      },
      'BOLLINGER_BOUNCE': {
        title: 'Bollinger Bounce (Mean Reversion)',
        description: 'Cette stratégie profite des rebonds sur les bandes de Bollinger avec confirmation RSI.',
        longCriteria: [
          'Prix proche bande inférieure : Signal de rebond potentiel',
          'RSI < 45 : Conditions de survente légère',
          'Volatilité modérée : Conditions idéales pour le mean reversion',
          'Cooldown : 2 minutes entre chaque signal'
        ],
        shortCriteria: [
          'Prix proche bande supérieure : Signal de retrait potentiel',
          'RSI > 55 : Conditions de surachat léger',
          'Volatilité modérée : Conditions idéales pour le mean reversion',
          'Cooldown : 2 minutes entre chaque signal'
        ],
        logic: 'La stratégie achète quand le prix touche la bande inférieure de Bollinger (avec RSI bas) et vend quand il atteint la bande supérieure (avec RSI haut) ou la moyenne mobile. Principe de retour à la moyenne (mean reversion).'
      },
      'TREND_FOLLOWER': {
        title: 'Trend Follower',
        description: 'Stratégie simple qui suit la tendance en utilisant l\'EMA 50 comme filtre. Inverse automatiquement la position lors d\'un changement de tendance.',
        longCriteria: [
          'Prix > EMA50 : Tendance haussière détectée',
          'Ouverture position LONG automatique',
          'TP: +2% | SL: -2%',
          'Fermeture auto si tendance s\'inverse'
        ],
        shortCriteria: [
          'Prix < EMA50 : Tendance baissière détectée',
          'Ouverture position SHORT automatique',
          'TP: +2% | SL: -2%',
          'Fermeture auto si tendance s\'inverse'
        ],
        logic: 'La stratégie suit la tendance de manière simple : LONG quand le prix est au-dessus de l\'EMA50, SHORT quand il est en-dessous. Dès que la tendance s\'inverse, la position est fermée et une nouvelle position opposée est ouverte automatiquement. Pas de cooldown, inversion instantanée.'
      },
      'ATR_PULLBACK': {
        title: 'ATR Trend Pullback',
        description: 'Stratégie prudente: entrées sur pullback vers EMA50 dans la direction de la tendance, validées par ATR et une bougie de retournement.',
        longCriteria: [
          'EMA50 > EMA200 : Tendance haussière',
          'Prix proche EMA50 (±0.5×ATR)',
          'RSI 35-55 : neutralité/retour à la moyenne',
          'Bougie de retournement haussière'
        ],
        shortCriteria: [
          'EMA50 < EMA200 : Tendance baissière',
          'Prix proche EMA50 (±0.5×ATR)',
          'RSI 45-65 : neutralité/retour à la moyenne',
          'Bougie de retournement baissière'
        ],
        logic: 'On suit la tendance principale (EMA50 vs EMA200) et on attend un pullback contrôlé (ATR) vers EMA50. L\'entrée se fait sur un signal de retournement (bougie) avec RSI modéré pour éviter le surachat/survente extrêmes. Objectif: quelques setups propres par jour.'
      }
    };
    return descriptions[strategyType] || null;
  };

  const handleResetStrategy = async (strategyName: string, timeframe: string) => {
    try {
      const response = await fetch('/api/trading-shared', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'resetStrategy',
          strategyName,
          timeframe
        })
      });

      if (response.ok) {
        console.log(`✅ Strategy "${strategyName}" [${timeframe}] reset successfully`);
        setResetConfirm(null);
        // Data will update automatically via SSE
        console.log('Data will refresh via SSE stream');
      } else {
        console.error('Failed to reset strategy');
      }
    } catch (error) {
      console.error('Error resetting strategy:', error);
    }
  };

  const handleDeleteStrategy = async (strategyName: string, strategyType: string, timeframe: string) => {
    try {
      // Only allow deletion of CUSTOM strategies
      if (strategyType !== 'CUSTOM') {
        console.log('❌ Only custom strategies can be deleted');
        setDeleteConfirm(null);
        return;
      }

      // Delete the strategy completely (no reset needed)
      const deleteResponse = await fetch('/api/custom-strategy', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: strategyName, timeframe })
      });

      if (deleteResponse.ok) {
        console.log(`Strategy "${strategyName}" [${timeframe}] deleted completely`);
        setDeleteConfirm(null);
        // Data will update automatically via SSE after StrategyManager reload
        console.log('Data will refresh via SSE stream');
      } else {
        const data = await deleteResponse.json();
        throw new Error(data.error || 'Failed to delete strategy');
      }
    } catch (error: any) {
      console.error('❌ Error deleting strategy:', error);
      setDeleteConfirm(null);
    }
  };

  // Multi-Timeframe Functions
  const openMultiTimeframeModal = (strategyName: string) => {
    setSelectedStrategyForMultiTF(strategyName);
    
    // Find all existing timeframes for this strategy (from allPerformances or performances)
    const performancesToCheck = allPerformances || performances;
    const existingTimeframes = performancesToCheck
      .filter(p => p.strategyName === strategyName)
      .map(p => p.timeframe);
    
    // Pre-select all existing timeframes EXCEPT the current timeframe
    // These will be non-deselectable (already exist)
    const timeframesToSelect = existingTimeframes.filter(tf => tf !== currentTimeframe);
    setSelectedTimeframes(new Set(timeframesToSelect));
    setShowMultiTimeframeModal(true);
  };

  // Local Backtest Functions
  const openLocalBacktestModal = (strategyName: string, timeframe: string = '1m') => {
    setSelectedStrategyForLocalBacktest(strategyName);
    setSelectedTimeframeForLocalBacktest(timeframe);
    setShowLocalBacktestModal(true);
  };

  const handleLocalBacktestComplete = (result: BacktestResult) => {
    setLocalBacktestResults(result);
    console.log('Local backtest completed:', result);
  };

  const toggleTimeframeSelection = (timeframe: string) => {
    setSelectedTimeframes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(timeframe)) {
        newSet.delete(timeframe);
      } else {
        newSet.add(timeframe);
      }
      return newSet;
    });
  };

  const activateMultiTimeframe = async () => {
    if (!selectedStrategyForMultiTF || selectedTimeframes.size === 0) return;

    setIsActivatingMultiTF(true);
    try {
      const response = await fetch('/api/multi-timeframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyName: selectedStrategyForMultiTF,
          timeframes: Array.from(selectedTimeframes)
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Strategy activated on ${data.results.length} timeframe(s)`);
        setShowMultiTimeframeModal(false);
        setSelectedStrategyForMultiTF(null);
        setSelectedTimeframes(new Set(['1m']));
        // New strategies will appear automatically via SSE
        console.log('New strategies will appear via SSE stream');
      } else {
        const error = await response.json();
        console.error('Failed to activate multi-timeframe:', error);
      }
    } catch (error) {
      console.error('Error activating multi-timeframe:', error);
    } finally {
      setIsActivatingMultiTF(false);
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
  
  const formatActiveDuration = (
    totalActiveTimeSeconds: number = 0,
    activatedAtTimestamp: number | null | undefined = null
  ): string => {
    // Calculate total time: cumulative + current session if active
    let totalSeconds = totalActiveTimeSeconds;
    if (activatedAtTimestamp) {
      const currentSessionSeconds = Math.floor((Date.now() - activatedAtTimestamp) / 1000);
      totalSeconds += currentSessionSeconds;
    }
    
    if (totalSeconds === 0) return 'Not started';
    
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${totalSeconds % 60}s`;
    } else {
      return `${totalSeconds}s`;
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
    
    // Only active strategies have bright colors for name and toggle
    const isActive = perf.isActive;
    
    // For CUSTOM strategies with predefined color map
    if (strategyType === 'CUSTOM' && customColor) {
      const colorMap: Record<string, any> = !isActive ? {
        emerald: { border: 'border-emerald-400/30', borderDimmed: 'border-emerald-400/30', text: 'text-emerald-400/60', accent: 'bg-emerald-400/30' },
        rose: { border: 'border-rose-400/30', borderDimmed: 'border-rose-400/30', text: 'text-rose-400/60', accent: 'bg-rose-400/30' },
        indigo: { border: 'border-indigo-400/30', borderDimmed: 'border-indigo-400/30', text: 'text-indigo-400/60', accent: 'bg-indigo-400/30' },
        violet: { border: 'border-violet-400/30', borderDimmed: 'border-violet-400/30', text: 'text-violet-400/60', accent: 'bg-violet-400/30' },
        amber: { border: 'border-amber-400/30', borderDimmed: 'border-amber-400/30', text: 'text-amber-400/60', accent: 'bg-amber-400/30' },
        lime: { border: 'border-lime-400/30', borderDimmed: 'border-lime-400/30', text: 'text-lime-400/60', accent: 'bg-lime-400/30' },
        sky: { border: 'border-sky-400/30', borderDimmed: 'border-sky-400/30', text: 'text-sky-400/60', accent: 'bg-sky-400/30' },
        fuchsia: { border: 'border-fuchsia-400/30', borderDimmed: 'border-fuchsia-400/30', text: 'text-fuchsia-400/60', accent: 'bg-fuchsia-400/30' },
        pink: { border: 'border-pink-400/30', borderDimmed: 'border-pink-400/30', text: 'text-pink-400/60', accent: 'bg-pink-400/30' },
        red: { border: 'border-red-400/30', borderDimmed: 'border-red-400/30', text: 'text-red-400/60', accent: 'bg-red-400/30' },
        green: { border: 'border-green-400/30', borderDimmed: 'border-green-400/30', text: 'text-green-400/60', accent: 'bg-green-400/30' },
        slate: { border: 'border-slate-400/30', borderDimmed: 'border-slate-400/30', text: 'text-slate-400/60', accent: 'bg-slate-400/30' },
        stone: { border: 'border-stone-400/30', borderDimmed: 'border-stone-400/30', text: 'text-stone-400/60', accent: 'bg-stone-400/30' }
      } : {
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
        return !isActive ? {
          border: 'border-blue-400/30',
          borderDimmed: 'border-blue-400/30',
          text: 'text-blue-400/60',
          accent: 'bg-blue-400/30'
        } : {
          border: 'border-blue-400',
          borderDimmed: 'border-blue-400/40',
          text: 'text-blue-400',
          accent: 'bg-blue-400'
        };
      case 'MOMENTUM_CROSSOVER':
        return !isActive ? {
          border: 'border-purple-400/30',
          borderDimmed: 'border-purple-400/30',
          text: 'text-purple-400/60',
          accent: 'bg-purple-400/30'
        } : {
          border: 'border-purple-400',
          borderDimmed: 'border-purple-400/40',
          text: 'text-purple-400',
          accent: 'bg-purple-400'
        };
      case 'VOLUME_MACD':
        return !isActive ? {
          border: 'border-orange-400/30',
          borderDimmed: 'border-orange-400/30',
          text: 'text-orange-400/60',
          accent: 'bg-orange-400/30'
        } : {
          border: 'border-orange-400',
          borderDimmed: 'border-orange-400/40',
          text: 'text-orange-400',
          accent: 'bg-orange-400'
        };
      case 'BOLLINGER_BOUNCE':
        return !isActive ? {
          border: 'border-teal-400/30',
          borderDimmed: 'border-teal-400/30',
          text: 'text-teal-400/60',
          accent: 'bg-teal-400/30'
        } : {
          border: 'border-teal-400',
          borderDimmed: 'border-teal-400/40',
          text: 'text-teal-400',
          accent: 'bg-teal-400'
        };
      case 'TREND_FOLLOWER':
        return !isActive ? {
          border: 'border-cyan-400/30',
          borderDimmed: 'border-cyan-400/30',
          text: 'text-cyan-400/60',
          accent: 'bg-cyan-400/30'
        } : {
          border: 'border-cyan-400',
          borderDimmed: 'border-cyan-400/40',
          text: 'text-cyan-400',
          accent: 'bg-cyan-400'
        };
      case 'ATR_PULLBACK':
        return !isActive ? {
          border: 'border-yellow-400/30',
          borderDimmed: 'border-yellow-400/30',
          text: 'text-yellow-400/60',
          accent: 'bg-yellow-400/30'
        } : {
          border: 'border-yellow-400',
          borderDimmed: 'border-yellow-400/40',
          text: 'text-yellow-400',
          accent: 'bg-yellow-400'
        };
      case 'CUSTOM':
        return !isActive ? {
          border: 'border-fuchsia-400/30',
          borderDimmed: 'border-fuchsia-400/30',
          text: 'text-fuchsia-400/60',
          accent: 'bg-fuchsia-400/30'
        } : {
          border: 'border-fuchsia-400',
          borderDimmed: 'border-fuchsia-400/40',
          text: 'text-fuchsia-400',
          accent: 'bg-fuchsia-400'
        };
      default:
        return !isActive ? {
          border: 'border-gray-400/30',
          borderDimmed: 'border-gray-400/30',
          text: 'text-gray-400/60',
          accent: 'bg-gray-400/30'
        } : {
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

  // Filter strategies by search
  const filterStrategiesBySearch = (strategies: StrategyPerformance[]): StrategyPerformance[] => {
    if (!strategySearch.trim()) return strategies;
    
    const searchLower = strategySearch.toLowerCase();
    
    return strategies.filter(perf => {
      // Search by strategy name
      if (perf.strategyName.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search by indicators used in custom strategies
      if (perf.strategyType === 'CUSTOM' && perf.customConfig) {
        const config = perf.customConfig;
        
        // Check entry conditions
        const checkConditions = (conditions: any): boolean => {
          if (!conditions || !conditions.conditions) return false;
          
          return conditions.conditions.some((cond: any) => {
            if ('conditions' in cond) {
              return checkConditions(cond);
            }
            return cond.indicator?.toLowerCase().includes(searchLower);
          });
        };
        
        if (config.longEntryConditions && checkConditions(config.longEntryConditions)) {
          return true;
        }
        if (config.shortEntryConditions && checkConditions(config.shortEntryConditions)) {
          return true;
        }
        if (config.longExitConditions && checkConditions(config.longExitConditions)) {
          return true;
        }
        if (config.shortExitConditions && checkConditions(config.shortExitConditions)) {
          return true;
        }
      }
      
      // Search by strategy type
      if (perf.strategyType.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      return false;
    });
  };

  // Trier les stratégies selon plusieurs critères
  const sortedPerformances = filterStrategiesBySearch(sortStrategies(performances));

  // Find best strategy (safe with empty array)
  const bestStrategy = performances.length > 0 
    ? performances.reduce((best, current) => current.totalPnL > best.totalPnL ? current : best)
    : null;

  return (
    <div className="bg-gray-800 border-b border-gray-700">
      {/* View Mode Toggle */}
      <div className="px-4 py-2 flex items-center justify-between">
        {/* Best Strategy Indicator + AI Button */}
        <div className="flex items-center gap-3">
          {bestStrategy && (
          <div 
            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-lg cursor-pointer hover:border-yellow-500/50 transition-all"
            onClick={() => {
              // Find the best trade of this strategy
              const bestStrategyTrades = bestStrategy.completedTrades || [];
              if (bestStrategyTrades.length > 0) {
                const bestTrade = bestStrategyTrades.reduce((best, current) => 
                  current.pnl > best.pnl ? current : best
                );
                const tradeElement = document.getElementById(`trade-${bestTrade.exitTime}`);
                if (tradeElement) {
                  tradeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Highlight effect
                  tradeElement.classList.add('ring-2', 'ring-yellow-400', 'ring-offset-2', 'ring-offset-gray-900');
                  setTimeout(() => {
                    tradeElement.classList.remove('ring-2', 'ring-yellow-400', 'ring-offset-2', 'ring-offset-gray-900');
                  }, 2000);
                }
              }
            }}
            title="Cliquer pour voir le meilleur trade"
          >
              <span className="text-yellow-400 text-base"><HiStar className="w-4 h-4" /></span>
              <span className="text-xs font-bold text-yellow-400">{bestStrategy.strategyName}</span>
              <span className="px-2 py-0.5 bg-yellow-500/20 rounded text-xs font-bold text-yellow-300">
                +{bestStrategy.totalPnL.toFixed(2)} USDT
              </span>
            </div>
          )}

          {/* AI Generate & Create Strategy Buttons - Always visible */}
          <div className="flex items-center gap-2">
            <button
              onClick={onGenerateAIStrategy}
              disabled={isGeneratingAI}
              className={`flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-all ${
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
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-all"
              title="Créer une nouvelle stratégie personnalisée"
            >
              <HiPlus className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-300">New</span>
            </button>
            

            {/* Indicators Overlay Toggle */}
            <button
              onClick={() => setShowInfoOverlay(v => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                showInfoOverlay
                  ? 'bg-gray-600/80 hover:bg-gray-600/60 border-gray-500'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-gray-600'
              }`}
              title="Afficher tous les indicateurs et leurs valeurs"
            >
              <HiChartBar className={`w-4 h-4 ${showInfoOverlay ? 'text-gray-300' : 'text-gray-400'}`} />
              <span className={`text-xs font-medium ${showInfoOverlay ? 'text-white' : 'text-gray-300'}`}>Indicators</span>
            </button>

            {/* Strategy Search Bar */}
            <div className="relative flex-1 max-w-xs">
              <HiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              <input
                type="text"
                value={strategySearch}
                onChange={(e) => setStrategySearch(e.target.value)}
                placeholder="Search strategies or indicators..."
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
              />
              {strategySearch && (
                <button
                  onClick={() => setStrategySearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <HiX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
            <span className="text-xs">{getSortLabel()}</span>
          </button>

          {/* Toggle All Strategies Button */}
          {(() => {
            const activeCount = performances.filter(p => p.isActive).length;
            const allActive = activeCount === performances.length;
            const someActive = activeCount > 0;
            
            return (
              <button
                onClick={() => {
                  // Toggle all strategies - optimized to avoid unnecessary API calls
                  const strategiesToToggle = performances.filter(perf => {
                    if (allActive) {
                      // If all active, stop all ACTIVE strategies
                      return perf.isActive;
                    } else {
                      // If not all active, start all INACTIVE strategies
                      return !perf.isActive;
                    }
                  });
                  
                  // Only make API calls for strategies that actually need to be toggled
                  strategiesToToggle.forEach(perf => {
                    if (onToggleStrategy) {
                      onToggleStrategy(perf.strategyName);
                    }
                  });
                  
                  console.log(`${allActive ? 'Stopping' : 'Starting'} ${strategiesToToggle.length} strategies (${allActive ? 'active' : 'inactive'} ones)`);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                  allActive
                    ? 'bg-red-900/20 border-red-600/50 text-red-400 hover:bg-red-900/30'
                    : someActive
                    ? 'bg-orange-900/20 border-orange-600/50 text-orange-400 hover:bg-orange-900/30'
                    : 'bg-green-900/20 border-green-600/50 text-green-400 hover:bg-green-900/30'
                }`}
                title={allActive ? 'Stop all strategies' : 'Start all strategies'}
              >
                {allActive ? (
                  <>
                    <HiX className="w-4 h-4" />
                    <span className="text-xs font-medium">Stop All</span>
                  </>
                ) : (
                  <>
                    <HiLightningBolt className="w-4 h-4" />
                    <span className="text-xs font-medium">Start All</span>
                  </>
                )}
                <span className="text-[10px] opacity-70">({activeCount}/{performances.length})</span>
              </button>
            );
          })()}

        {/* View Mode Buttons */}
        <div className="flex gap-1 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <button
            onClick={() => setViewMode('compact')}
            className={`px-3 py-1.5 rounded-lg transition-all duration-200 ${
              viewMode === 'compact' 
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
            title="Mode compact - Informations essentielles"
          >
            <HiViewGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('normal')}
            className={`px-3 py-1.5 rounded-lg transition-all duration-200 ${
              viewMode === 'normal' 
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
            title="Mode normal - Vue équilibrée"
          >
            <HiChartSquareBar className="w-4 h-4" />
          </button>
          </div>
          {/* Reset All Button */}
          <button
            onClick={async () => {
              if (!resetAllConfirm) {
                setResetAllConfirm(true);
                setTimeout(() => setResetAllConfirm(false), 3000); // Auto-cancel after 3s
                return;
              }
              try {
                await fetch('/api/reset', { 
                  method: 'POST', 
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ timeframe: currentTimeframe || '1m' })
                });
                onRefresh?.();
                console.log('Trades reset, data will refresh via SSE stream');
              } catch (e) {
                console.error('Reset all failed', e);
              }
            }}
            className={`p-2 rounded-lg border transition-all ${
              resetAllConfirm
                ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                : 'bg-gray-800/50 border-gray-700/50 hover:border-red-500/60 text-red-400 hover:text-red-300'
            }`}
            title={resetAllConfirm ? `Click again to confirm reset all ${currentTimeframe || '1m'} strategies` : `Reset All (delete all ${currentTimeframe || '1m'} trades and stop strategies)`}
          >
            <HiRefresh className="w-4 h-4 transition-all" />
          </button>
        </div>
      </div>
      {/* Draggable Indicators Info Overlay with Category Filters */}
      {showInfoOverlay && (
        <div
          className={`fixed z-[1000] bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl max-h-[80vh] flex flex-col transition-all ${
            overlayCollapsed ? 'w-auto' : 'w-[520px]'
          }`}
          style={{ left: overlayPos.x, top: overlayPos.y }}
        >
          {/* Header - Draggable */}
          <div
            className={`cursor-move flex items-center bg-gray-800 select-none transition-all ${
              overlayCollapsed ? 'rounded-lg gap-6' : 'rounded-t-lg border-b border-gray-700 justify-between'
            } ${
              isStatsSticky ? 'px-2 py-1' : 'px-3 py-2'
            }`}
            onMouseDown={(e) => {
              setDragging(true);
              dragMoved.current = false;
              const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
              dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
              dragStartPos.current = { x: e.clientX, y: e.clientY };
            }}
          >
            <div className={`flex items-center gap-2 text-gray-200 font-semibold transition-all ${
              isStatsSticky ? 'text-xs' : 'text-sm'
            }`}>
              <HiChartBar className={`transition-all ${isStatsSticky ? 'w-3 h-3' : 'w-4 h-4'}`} />
              {!overlayCollapsed && (
                <>
              <span>Indicators (Live)</span>
              {highlightLabel && (
                <span className={`ml-2 px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-300 whitespace-nowrap transition-all ${
                  isStatsSticky ? 'text-[9px]' : 'text-[10px]'
                }`}>
                  {highlightLabel}
                </span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!overlayCollapsed && (
                <button 
                  onClick={() => setOverlayCollapsed(true)}
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                  title="Collapse"
                >
                  <HiChevronLeft className="w-3 h-3" />
                  <span className="text-xs">Hide</span>
                </button>
              )}
              {overlayCollapsed && (
                <button 
                  onClick={() => setOverlayCollapsed(false)}
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                  title="Expand"
                >
                  <HiChevronRight className="w-3 h-3" />
                </button>
              )}
              <button onClick={() => setShowInfoOverlay(false)} className="text-gray-400 hover:text-white transition-colors">
                <HiX className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          {!overlayCollapsed && (
            <>
              {/* Category Filters - Sticky */}
              <div className="sticky top-0 z-10 bg-gray-800/95 border-b border-gray-700 px-3 py-2">
                <div className="text-xs text-gray-400 mb-2 font-semibold">Categories:</div>
                <div className="flex flex-wrap gap-1.5">
                  {/* Advanced Indicators Toggle */}
                  <button
                    onClick={() => setShowAdvancedIndicators(!showAdvancedIndicators)}
                    className={`flex items-center gap-1.5 px-2 py-1 text-[10px] rounded-md border transition-all ${
                      showAdvancedIndicators
                        ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                        : 'bg-gray-700/50 border-gray-600/50 text-gray-300 hover:bg-gray-600/50'
                    }`}
                  >
                    <HiChartBar className="w-3 h-3" />
                    <span>Advanced</span>
                    <span className="text-[9px] opacity-60">
                      ({Object.keys(advancedIndicators || {}).length})
                    </span>
                  </button>
                  
                  {INDICATOR_CATEGORIES.map((category) => {
                    const isActive = activeCategories.has(category.id);
                    // Count available indicators
                    const numCount = category.numericKeys.filter(k => indicatorData?.[k.key] !== undefined).length;
                    const boolCount = category.booleanKeys.filter(k => indicatorData?.[k.key] !== undefined).length;
                    const totalCount = numCount + boolCount;
                    
                    if (totalCount === 0) return null; // Skip if no data
                    
                    return (
                      <button
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        className={`flex items-center gap-1.5 px-2 py-1 text-[10px] rounded-md border transition-all ${
                          isActive
                            ? `${category.color} bg-gray-700/50 border-current shadow-sm`
                            : 'text-gray-500 bg-gray-800/50 border-gray-700 hover:border-gray-600'
                        }`}
                        title={`${category.label} (${totalCount} indicators)`}
                      >
                        <category.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{category.label}</span>
                        <span className="opacity-60">({totalCount})</span>
                      </button>
                    );
                  })}
                </div>
                
                {/* Search Bar & Quick Actions */}
                <div className="mt-2 flex items-center gap-2">
                  {/* Search Input */}
                  <div className="flex-1 relative">
                    <HiSearch className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
                    <input
                      type="text"
                      value={indicatorSearch}
                      onChange={(e) => setIndicatorSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Search..."
                      className="w-full pl-6 pr-7 py-0.5 text-[10px] bg-gray-800/50 border border-gray-700 rounded text-gray-300 placeholder-gray-500 focus:outline-none focus:border-gray-600"
                    />
                    {indicatorSearch && (
                      <button
                        onClick={() => setIndicatorSearch('')}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        <HiX className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Select All Icon */}
                  <button
                    onClick={() => setActiveCategories(new Set(INDICATOR_CATEGORIES.map(c => c.id)))}
                    className="p-1 text-green-400 hover:text-green-300 bg-gray-800/50 border border-gray-700 hover:border-green-500/50 rounded transition-all"
                    title="Select all categories"
                  >
                    <HiCheckCircle className="w-3.5 h-3.5" />
                  </button>
                  
                  {/* Deselect All Icon */}
                  <button
                    onClick={() => setActiveCategories(new Set())}
                    className="p-1 text-red-400 hover:text-red-300 bg-gray-800/50 border border-gray-700 hover:border-red-500/50 rounded transition-all"
                    title="Deselect all categories"
                  >
                    <HiX className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              {/* Main Indicator Tabs */}
              <div className="flex gap-1 p-2 border-b border-gray-700/50">
                <button
                  onClick={() => setShowAdvancedIndicators(false)}
                  className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-2 ${
                    !showAdvancedIndicators 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <HiChartBar className="w-3 h-3" />
                  Essential
                </button>
                <button
                  onClick={() => setShowAdvancedIndicators(true)}
                  className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-2 ${
                    showAdvancedIndicators 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <HiBeaker className="w-3 h-3" />
                  Advanced
                </button>
              </div>
              
              {/* Indicators Content - Scrollable */}
              <div className="overflow-y-auto p-3 space-y-3 text-xs text-gray-300">
            {indicatorData ? (
                  <>
                    {/* Essential Indicators */}
                    {!showAdvancedIndicators && INDICATOR_CATEGORIES.map((category) => {
                    if (!activeCategories.has(category.id)) return null;
                    
                    // Filter out undefined values and apply search filter
                    const searchLower = indicatorSearch.toLowerCase();
                    const numericIndicators = category.numericKeys.filter(k => {
                      if (indicatorData[k.key] === undefined) return false;
                      if (!searchLower) return true;
                      return k.label.toLowerCase().includes(searchLower) || 
                             (k.formula && k.formula.toLowerCase().includes(searchLower));
                    });
                    const booleanIndicators = category.booleanKeys.filter(k => {
                      if (indicatorData[k.key] === undefined) return false;
                      if (!searchLower) return true;
                      return k.label.toLowerCase().includes(searchLower) || 
                             (k.formula && k.formula.toLowerCase().includes(searchLower));
                    });
                    
                    if (numericIndicators.length === 0 && booleanIndicators.length === 0) return null;
                    
                    const isCollapsed = collapsedCategories.has(category.id);
                    
                return (
                      <div key={category.id} className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/50">
                        {/* Category Header - Clickable */}
                        <div 
                          className={`flex items-center justify-between gap-2 mb-2 pb-1 border-b border-gray-700/50 ${category.color} cursor-pointer hover:opacity-80 transition-opacity`}
                          onClick={() => toggleCategoryCollapse(category.id)}
                        >
                          <div className="flex items-center gap-2">
                            <category.icon className="w-4 h-4" />
                            <span className="font-semibold text-xs">{category.label}</span>
                            <span className="text-[10px] opacity-60">
                              ({numericIndicators.length + booleanIndicators.length})
                            </span>
                          </div>
                          {isCollapsed ? (
                            <HiChevronRight className="w-4 h-4" />
                          ) : (
                            <HiChevronDown className="w-4 h-4" />
                          )}
                        </div>
                        
                        {/* Category Content - Collapsible */}
                        {!isCollapsed && (
                          <>
                            {/* Numeric Indicators */}
                            {numericIndicators.length > 0 && (
                              <div className="space-y-0.5 mb-2">
                                {numericIndicators.map(({ key, label, formula, format, icon: IndicatorIcon }) => {
                                  const value = indicatorData[key] as number;
                                  const formattedValue = format ? format(value) : value.toFixed(2);
                                  const isExpanded = expandedIndicators.has(String(key));
                                  const displayText = isExpanded && formula ? formula : label;
                                  
                                  return (
                                    <div 
                                      key={String(key)} 
                                      className="flex items-center justify-between gap-3 py-0.5 cursor-pointer hover:bg-gray-700/30 px-1 rounded transition-colors"
                                      onClick={() => toggleIndicatorExpand(String(key))}
                                      title={formula ? "Click to see calculation formula" : undefined}
                                    >
                                      <div className="flex items-center gap-2 flex-1 text-gray-400">
                                        {IndicatorIcon && <IndicatorIcon className="w-3.5 h-3.5 flex-shrink-0" />}
                                        <span className={isExpanded ? 'text-xs' : ''}>{displayText}</span>
                      </div>
                                      <div className="font-mono text-white">{formattedValue}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            
                            {/* Boolean Indicators */}
                            {booleanIndicators.length > 0 && (
                              <div className="space-y-0.5">
                                {booleanIndicators.map(({ key, label, formula, nearKey, icon: IndicatorIcon }) => {
                                  const value = indicatorData[key] as boolean;
                                  const near = nearKey ? indicatorData[nearKey] as boolean : false;
                                  const color = value ? 'text-green-400' : near ? 'text-orange-400' : 'text-gray-500';
                                  const dot = value ? 'bg-green-500' : near ? 'bg-orange-400' : 'bg-gray-500/40';
                                  const isExpanded = expandedIndicators.has(String(key));
                                  const displayText = isExpanded && formula ? formula : label;
                                  
                      return (
                                    <div 
                                      key={String(key)} 
                                      className="flex items-center justify-between gap-3 py-0.5 cursor-pointer hover:bg-gray-700/30 px-1 rounded transition-colors"
                                      onClick={() => toggleIndicatorExpand(String(key))}
                                      title={formula ? "Click to see calculation formula" : undefined}
                                    >
                                      <div className="flex items-center gap-2 flex-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`}></span>
                                        {IndicatorIcon && <IndicatorIcon className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />}
                                        <span className={`${color} ${isExpanded ? 'text-xs' : ''}`}>{displayText}</span>
                          </div>
                                      <div className={`font-mono text-[10px] ${color}`}>
                                        {value ? 'true' : near ? 'close' : 'false'}
                                      </div>
                        </div>
                      );
                    })}
                              </div>
                            )}
                  </>
                        )}
                      </div>
                );
                  })}
                    
                    {/* Advanced Indicators with Tabs */}
                    {showAdvancedIndicators && advancedIndicators && (
                      <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/50">
                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-gray-700/50 text-purple-400">
                          <HiChartBar className="w-4 h-4" />
                          <span className="font-semibold text-xs">Advanced Indicators</span>
                          <span className="text-[10px] opacity-60">({Object.keys(advancedIndicators).length})</span>
                        </div>
                        
                        {/* Advanced Indicators Tabs */}
                        <div className="flex gap-1 mb-2">
                          <button
                            onClick={() => setActiveAdvancedTab('trend')}
                            className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                              activeAdvancedTab === 'trend' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            <HiTrendingUp className="w-3 h-3" />
                            Trend
                          </button>
                          <button
                            onClick={() => setActiveAdvancedTab('momentum')}
                            className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                              activeAdvancedTab === 'momentum' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            <HiLightningBolt className="w-3 h-3" />
                            Momentum
                          </button>
                          <button
                            onClick={() => setActiveAdvancedTab('volatility')}
                            className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                              activeAdvancedTab === 'volatility' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            <HiScale className="w-3 h-3" />
                            Volatility
                          </button>
                          <button
                            onClick={() => setActiveAdvancedTab('volume')}
                            className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                              activeAdvancedTab === 'volume' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            <HiChartBar className="w-3 h-3" />
                            Volume
                          </button>
                        </div>
                        
                        <div className="space-y-0.5">
                          {Object.entries(advancedIndicators).map(([key, value]) => {
                            // Filter by category
                            const isTrend = ['sma20', 'sma50', 'sma100', 'sma200', 'ema10', 'ema20', 'ema50', 'ema100', 'ema200', 'wma20', 'hma20', 'dema20', 'tema20', 'kama20', 'smma20', 'zlema20', 'alma20', 'vwma20', 'tenkanSen', 'kijunSen', 'senkouSpanA', 'senkouSpanB', 'chikouSpan', 'alligatorJaw', 'alligatorTeeth', 'alligatorLips', 'supertrend', 'aroonUp', 'aroonDown', 'aroonOscillator'].includes(key);
                            const isMomentum = ['rsi', 'rsi9', 'rsi21', 'stochK', 'stochD', 'williamsR', 'cci', 'roc', 'momentum', 'ultimateOscillator', 'awesomeOscillator', 'chandeMomentumOscillator', 'fisherTransform', 'coppockCurve', 'detrendedPriceOscillator', 'macd', 'macdSignal', 'macdHistogram', 'ppo', 'trix', 'vortexIndicator', 'adx', 'parabolicSAR', 'isRSICrossedAbove30', 'isRSICrossedBelow70'].includes(key);
                            const isVolatility = ['bbUpper', 'bbMiddle', 'bbLower', 'bbWidth', 'bbPercent', 'atr', 'atr14', 'atr21', 'natr', 'keltnerUpper', 'keltnerMiddle', 'keltnerLower', 'donchianUpper', 'donchianMiddle', 'donchianLower', 'chaikinVolatility', 'massIndex', 'gatorOscillator'].includes(key);
                            const isVolume = ['obv', 'vwap', 'ad', 'chaikinMoneyFlow', 'chaikinOscillator', 'mfi', 'easeOfMovement', 'forceIndex', 'negativeVolumeIndex', 'positiveVolumeIndex', 'volumeProfile', 'volumeSMA20', 'volumeRatio'].includes(key);
                            
                            let shouldShow = false;
                            if (activeAdvancedTab === 'trend' && isTrend) shouldShow = true;
                            if (activeAdvancedTab === 'momentum' && isMomentum) shouldShow = true;
                            if (activeAdvancedTab === 'volatility' && isVolatility) shouldShow = true;
                            if (activeAdvancedTab === 'volume' && isVolume) shouldShow = true;
                            
                            if (!shouldShow) return null;
                            
                            // Get description for advanced indicators
                            const getAdvancedDescription = (indicatorKey: string) => {
                              const descriptions: Record<string, string> = {
                                // Trend indicators
                                'sma20': 'Simple Moving Average (20 periods) - Smooths price data to identify trend direction',
                                'sma50': 'Simple Moving Average (50 periods) - Medium-term trend indicator',
                                'sma100': 'Simple Moving Average (100 periods) - Long-term trend indicator',
                                'sma200': 'Simple Moving Average (200 periods) - Major trend indicator',
                                'ema10': 'Exponential Moving Average (10 periods) - Fast trend following',
                                'ema20': 'Exponential Moving Average (20 periods) - Short-term trend',
                                'ema50': 'Exponential Moving Average (50 periods) - Medium-term trend',
                                'ema100': 'Exponential Moving Average (100 periods) - Long-term trend',
                                'ema200': 'Exponential Moving Average (200 periods) - Major trend',
                                'tenkanSen': 'Ichimoku Tenkan-sen - Conversion line for trend direction',
                                'kijunSen': 'Ichimoku Kijun-sen - Base line for trend strength',
                                'senkouSpanA': 'Ichimoku Senkou Span A - Leading span A for future support/resistance',
                                'senkouSpanB': 'Ichimoku Senkou Span B - Leading span B for future support/resistance',
                                'chikouSpan': 'Ichimoku Chikou Span - Lagging span for trend confirmation',
                                'alligatorJaw': 'Alligator Jaw (SMMA 13) - Long-term trend filter',
                                'alligatorTeeth': 'Alligator Teeth (SMMA 8) - Medium-term trend filter',
                                'alligatorLips': 'Alligator Lips (SMMA 5) - Short-term trend filter',
                                'supertrend': 'SuperTrend - Trend following indicator with stop-loss',
                                'aroonUp': 'Aroon Up - Measures time since highest high',
                                'aroonDown': 'Aroon Down - Measures time since lowest low',
                                'aroonOscillator': 'Aroon Oscillator - Difference between Aroon Up and Down',
                                
                                // Momentum indicators
                                'rsi': 'Relative Strength Index - Momentum oscillator (0-100)',
                                'rsi9': 'RSI (9 periods) - Fast momentum indicator',
                                'rsi21': 'RSI (21 periods) - Slower momentum indicator',
                                'stochK': 'Stochastic %K - Momentum oscillator comparing closing price to price range',
                                'stochD': 'Stochastic %D - Smoothed version of %K',
                                'williamsR': 'Williams %R - Momentum oscillator measuring overbought/oversold',
                                'cci': 'Commodity Channel Index - Momentum oscillator for cyclical trends',
                                'roc': 'Rate of Change - Momentum indicator measuring price change rate',
                                'momentum': 'Momentum - Simple momentum indicator',
                                'ultimateOscillator': 'Ultimate Oscillator - Multi-timeframe momentum indicator',
                                'awesomeOscillator': 'Awesome Oscillator - Momentum indicator using SMA difference',
                                'chandeMomentumOscillator': 'Chande Momentum Oscillator - Momentum indicator',
                                'fisherTransform': 'Fisher Transform - Price transformation for better signals',
                                'coppockCurve': 'Coppock Curve - Long-term momentum indicator',
                                'detrendedPriceOscillator': 'Detrended Price Oscillator - Removes trend to show cycles',
                                'macd': 'MACD Line - Difference between EMA 12 and 26',
                                'macdSignal': 'MACD Signal Line - EMA of MACD line',
                                'macdHistogram': 'MACD Histogram - Difference between MACD and Signal',
                                'ppo': 'Percentage Price Oscillator - MACD as percentage',
                                'trix': 'TRIX - Rate of change of triple smoothed EMA',
                                'vortexIndicator': 'Vortex Indicator - Trend reversal indicator',
                                'adx': 'Average Directional Index - Trend strength indicator',
                                'parabolicSAR': 'Parabolic SAR - Trend following stop and reverse',
                                'isRSICrossedAbove30': 'RSI Crossed Above 30 - Bullish momentum signal',
                                'isRSICrossedBelow70': 'RSI Crossed Below 70 - Bearish momentum signal',
                                
                                // Volatility indicators
                                'bbUpper': 'Bollinger Bands Upper - Upper volatility band',
                                'bbMiddle': 'Bollinger Bands Middle - SMA center line',
                                'bbLower': 'Bollinger Bands Lower - Lower volatility band',
                                'bbWidth': 'Bollinger Bands Width - Volatility measurement',
                                'bbPercent': 'Bollinger Bands %B - Position within bands',
                                'atr': 'Average True Range - Volatility measurement',
                                'atr14': 'ATR (14 periods) - Standard volatility indicator',
                                'atr21': 'ATR (21 periods) - Longer-term volatility',
                                'natr': 'Normalized ATR - ATR as percentage of price',
                                'keltnerUpper': 'Keltner Channel Upper - Volatility-based upper band',
                                'keltnerMiddle': 'Keltner Channel Middle - EMA center line',
                                'keltnerLower': 'Keltner Channel Lower - Volatility-based lower band',
                                'donchianUpper': 'Donchian Channel Upper - Highest high over period',
                                'donchianMiddle': 'Donchian Channel Middle - Midpoint of channel',
                                'donchianLower': 'Donchian Channel Lower - Lowest low over period',
                                'chaikinVolatility': 'Chaikin Volatility - Rate of change of EMA',
                                'massIndex': 'Mass Index - Volatility indicator for trend changes',
                                'gatorOscillator': 'Gator Oscillator - Alligator indicator oscillator',
                                
                                // Volume indicators
                                'obv': 'On-Balance Volume - Cumulative volume indicator',
                                'vwap': 'Volume Weighted Average Price - Volume-weighted price',
                                'ad': 'Accumulation/Distribution - Volume-price relationship',
                                'chaikinMoneyFlow': 'Chaikin Money Flow - Volume-weighted accumulation/distribution',
                                'chaikinOscillator': 'Chaikin Oscillator - Difference of AD line EMAs',
                                'mfi': 'Money Flow Index - Volume-weighted RSI',
                                'easeOfMovement': 'Ease of Movement - Volume-price relationship',
                                'forceIndex': 'Force Index - Volume-price momentum',
                                'negativeVolumeIndex': 'Negative Volume Index - Performance on down volume',
                                'positiveVolumeIndex': 'Positive Volume Index - Performance on up volume',
                                'volumeProfile': 'Volume Profile - Volume distribution by price',
                                'volumeSMA20': 'Volume SMA (20) - Smoothed volume indicator',
                                'volumeRatio': 'Volume Ratio - Current vs average volume'
                              };
                              return descriptions[indicatorKey] || 'Advanced technical indicator';
                            };
                            
                            if (typeof value === 'number' && !isNaN(value)) {
                            const formattedValue = value.toFixed(2);
                            const color = value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-gray-400';
                            
                            return (
                                <div key={key} className="flex items-center justify-between gap-3 py-0.5 cursor-pointer hover:bg-gray-700/30 px-1 rounded transition-colors group">
                                <div className="flex items-center gap-2 flex-1 text-gray-400">
                                    <span className="text-xs">{key}</span>
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="absolute z-10 bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-gray-300 max-w-xs shadow-lg">
                                        {getAdvancedDescription(key)}
                                    </div>
                                  </div>
                                </div>
                                <div className="font-mono text-white">{formattedValue}</div>
                              </div>
                            );
                            } else if (typeof value === 'boolean') {
                            const color = value ? 'text-green-400' : 'text-red-400';
                            const dot = value ? 'bg-green-500' : 'bg-red-500';
                            
                            return (
                                <div key={key} className="flex items-center justify-between gap-3 py-0.5 cursor-pointer hover:bg-gray-700/30 px-1 rounded transition-colors group">
                                <div className="flex items-center gap-2 flex-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`}></span>
                                    <span className={`${color} text-xs`}>{key}</span>
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="absolute z-10 bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-gray-300 max-w-xs shadow-lg">
                                        {getAdvancedDescription(key)}
                                    </div>
                                  </div>
                                </div>
                                <div className={`font-mono text-[10px] ${color}`}>
                                  {value ? 'true' : 'false'}
                                </div>
                              </div>
                            );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    )}
                  </>
            ) : (
                  <div className="text-gray-500 text-center py-4">No data available</div>
            )}
          </div>
            </>
          )}
        </div>
      )}

      {/* Strategy Cards */}
      {sortedPerformances.length === 0 ? (
        <div className="px-4 pb-4 text-center py-12">
          <HiSearch className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No strategies found matching "{strategySearch}"</p>
          <button
            onClick={() => setStrategySearch('')}
            className="mt-4 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-lg text-xs text-gray-300 transition-colors"
          >
            Clear search
          </button>
        </div>
      ) : (
      <div className={`px-4 pb-4 grid gap-4 ${
        viewMode === 'compact' 
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6' 
          : flippedCards.size > 0
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-4'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-4'
      }`}>
        {sortedPerformances.map((perf) => {
          const colors = getStrategyColor(perf);
          // Use colors from getStrategyColor which now handles focus correctly
          
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
                  : selectedStrategy === perf.strategyName
                  ? colors.border
                    : 'border-gray-700'
              }`}
              title={selectedStrategy === perf.strategyName ? 'Cliquer pour retourner à la vue globale' : 'Cliquer pour voir les détails de cette stratégie'}
            >
              {viewMode === 'compact' ? (
                // COMPACT MODE
                <>
                  {/* Header: Name + Status Points + Toggle */}
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <h3 className={`text-sm font-semibold ${colors.text} truncate`}>{perf.strategyName}</h3>
                      {/* Status Indicator */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        perf.isActive 
                          ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse' 
                          : 'bg-red-500'
                      }`}></div>
                      {bestStrategy && perf.strategyName === bestStrategy.strategyName && perf.totalPnL > 0 && (
                        <span className="text-yellow-400 text-xs flex-shrink-0"><HiStar className="w-3 h-3" /></span>
                      )}
                    </div>
                    
                    {/* Status Points (Compact Mode) + Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
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
                    
                      {/* Expand/Collapse Action Buttons - Before Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActionButtons(perf.strategyName);
                        }}
                        className={`p-0.5 ${colors.text} hover:opacity-70 transition-all flex-shrink-0`}
                        title={expandedActionButtons.has(perf.strategyName) ? "Masquer les actions" : "Afficher les actions"}
                      >
                        <HiChevronLeft className={`w-3 h-3 transition-transform ${
                          expandedActionButtons.has(perf.strategyName) ? '-rotate-90' : ''
                        }`} />
                      </button>
                      
                      {/* Toggle Switch - Always visible */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStrategy?.(perf.strategyName);
                      }}
                      disabled={togglingStrategies?.has(perf.strategyName)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        perf.isActive ? 'bg-gray-700' : 'bg-gray-600'
                      } ${togglingStrategies?.has(perf.strategyName) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={togglingStrategies?.has(perf.strategyName) ? 'Changement en cours...' : (perf.isActive ? 'Désactiver la stratégie' : 'Activer la stratégie')}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full transition-transform ${
                        perf.isActive ? 'translate-x-5' : 'translate-x-1'
                      } ${
                        perf.isActive ? colors.accent : 'bg-gray-400'
                      }`} />
                    </button>
                    </div>
                  </div>

                  {/* Cooldown Display */}
                  {strategyCriteria && strategyCriteria.cooldownRemaining > 0 && (
                    <div className="flex items-center gap-1 mb-1">
                      <HiClock className="w-3 h-3 text-orange-400" />
                      <span className="text-xs text-orange-400">
                        {formatCooldown(strategyCriteria.cooldownRemaining)}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons - Compact Mode (shown when expanded) */}
                  {expandedActionButtons.has(perf.strategyName) && (
                    <div className="flex items-center gap-1 mb-1 pb-1 border-b border-gray-700/30">
                      {/* Settings */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openSettings(perf.strategyName, perf.strategyType, perf.customConfig);
                        }}
                        className={`p-1 ${colors.text} hover:opacity-70 transition-opacity`}
                        title="Settings"
                      >
                        <HiAdjustments className="w-3.5 h-3.5" />
                      </button>

                      {/* Timeframe Comparison */}
                      {onShowTimeframeComparison && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onShowTimeframeComparison(perf.strategyName);
                          }}
                          className={`p-1 ${colors.text} hover:opacity-70 transition-opacity`}
                          title="Comparer TF"
                        >
                          <HiChartBar className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Multi-TF */}
                      {perf.strategyType === 'CUSTOM' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openMultiTimeframeModal(perf.strategyName);
                          }}
                          className={`p-1 ${colors.text} hover:opacity-70 transition-opacity`}
                          title="Multi-TF"
                        >
                          <HiViewGrid className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Local Backtest */}
                      {perf.strategyType === 'CUSTOM' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openLocalBacktestModal(perf.strategyName, perf.timeframe);
                          }}
                          className={`p-1 ${colors.text} hover:opacity-70 transition-opacity`}
                          title="Local Backtest"
                        >
                          <HiBeaker className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Reset */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setResetConfirm(perf.strategyName);
                        }}
                        className={`p-1 ${colors.text} hover:opacity-70 transition-opacity`}
                        title="Reset"
                      >
                        <HiRefresh className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete - CUSTOM only */}
                      {perf.strategyType === 'CUSTOM' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(perf.strategyName);
                          }}
                          className="p-1 text-red-400 hover:opacity-70 transition-opacity"
                          title="Supprimer"
                        >
                          <HiTrash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Capital */}
                  <div className="mb-1 flex items-center gap-2">
                    {/* Timeframe Badge */}
                    <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-gray-700/50 text-gray-300 border border-gray-600 flex-shrink-0">
                      {perf.timeframe}
                    </span>
                    <span className={`text-lg font-bold ${
                      perf.currentCapital >= 100000 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${perf.currentCapital.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  {/* Total P&L */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Total P&L:</span>
                    <span className={`text-sm font-bold ${
                      perf.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {perf.totalPnL >= 0 ? '+' : ''}{perf.totalPnL.toFixed(2)} USDT
                    </span>
                  </div>

                  {/* Exit Conditions & Unrealized P&L - Compact Mode */}
                  {perf.currentPosition.type !== 'NONE' && (
                    <>
                      {/* Exit Conditions */}
                      {perf.customConfig && (
                        <div className="flex items-center justify-between pt-1 mt-1 border-t border-gray-700/50 mb-1 w-full">
                          <div className="flex items-center gap-1.5">
                            <BiSquare className="w-4 h-4 text-orange-400 flex-shrink-0" />
                            <span className="text-xs text-orange-400 font-semibold">EXIT:</span>
                          </div>
                          <div className="flex items-center gap-1.5 max-w-[60%]">
                            {perf.currentPosition.type === 'LONG' 
                              ? renderExitConditionsWithStatus(perf.customConfig.longExitConditions, indicatorData)
                              : renderExitConditionsWithStatus(perf.customConfig.shortExitConditions, indicatorData)
                            }
                          </div>
                        </div>
                      )}
                      
                      {/* Unrealized P&L */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-700/50">
                      <div className="flex items-center gap-1.5">
                      {perf.currentPosition.type === 'LONG' ? <BiUpArrow className="w-4 h-4 text-green-400 flex-shrink-0" /> : <BiDownArrow className="w-4 h-4 text-red-400 flex-shrink-0" />}

                          <span className={`text-xs font-semibold ${
                            perf.currentPosition.type === 'LONG' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {perf.currentPosition.type}:
                          </span>
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
                    </>
                  )}
                </>
              ) : (
                // NORMAL MODE
                <>
                  {/* Header: Strategy Name + Buttons (TOUJOURS VISIBLE) */}
                  <div className="mb-3 pb-3 border-b border-gray-700/50 flex items-start justify-between gap-2">
                    <div 
                      className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity min-w-0 flex-1"
                      onClick={(e) => {
                        if (settingsOpen === perf.strategyName) {
                        e.stopPropagation();
                          closeSettings();
                        }
                      }}
                      title={settingsOpen === perf.strategyName ? "Cliquer pour fermer les paramètres" : ""}
                    >
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className={`text-base font-semibold ${colors.text} truncate`}>{perf.strategyName}</h3>
                        {/* Status Indicator */}
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          perf.isActive 
                            ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse' 
                            : 'bg-red-500'
                        }`}></div>
                      {bestStrategy && perf.strategyName === bestStrategy.strategyName && perf.totalPnL > 0 && (
                        <span className="text-yellow-400 text-sm flex-shrink-0"><HiStar className="w-3 h-3" /></span>
                      )}
                    </div>
                      <div className={`h-0.5 w-24 ${colors.accent} mt-1.5 mb-1.5 rounded-full`}></div>
                      <div className="flex items-center gap-3">
                      {/* Timeframe Badge */}
                      <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-gray-700/50 text-gray-300 border border-gray-600 flex-shrink-0">
                        {perf.timeframe}
                      </span>
                      <span className={`text-sm font-bold flex-shrink-0 ${
                      perf.currentCapital >= 100000 ? 'text-green-400' : 'text-red-400'
                      }`}>
                      ${perf.currentCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {/* Active Duration - Shows cumulative time + current session */}
                        {(perf.totalActiveTime || perf.activatedAt) && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <HiClock className="w-3 h-3 text-blue-400" />
                            <span className="text-xs text-blue-400">
                              {formatActiveDuration(perf.totalActiveTime || 0, perf.activatedAt)}
                      </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 flex-shrink-0">

                      {/* Action Buttons - Hidden by default, shown when expanded */}
                      {expandedActionButtons.has(perf.strategyName) && (
                        <>
                      {/* Edit Strategy Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Ouvrir l'éditeur de stratégie pour cette stratégie
                          if (perf.strategyType === 'CUSTOM' && perf.customConfig) {
                            // Pour les stratégies custom, ouvrir l'éditeur avec la config existante
                            onEditStrategy?.(perf.strategyName, perf.customConfig);
                          } else {
                            // Pour les stratégies prédéfinies, afficher un message ou permettre la conversion
                            alert('Cette stratégie prédéfinie ne peut pas être éditée. Créez une stratégie personnalisée basée sur cette stratégie.');
                          }
                        }}
                        className={`p-1.5 ${colors.text} hover:opacity-70 transition-opacity`}
                        title="Éditer la stratégie (conditions d'achat/vente)"
                      >
                        <HiTrendingUp className="w-3.5 h-3.5" />
                      </button>

                          {/* Timeframe Comparison Button */}
                          {onShowTimeframeComparison && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onShowTimeframeComparison(perf.strategyName);
                              }}
                              className={`p-1.5 ${colors.text} hover:opacity-70 transition-opacity`}
                              title="Comparer les performances sur toutes les timeframes"
                            >
                              <HiChartBar className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Multi-Timeframe Button - Only for CUSTOM strategies */}
                          {perf.strategyType === 'CUSTOM' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openMultiTimeframeModal(perf.strategyName);
                              }}
                              className={`p-1.5 ${colors.text} hover:opacity-70 transition-opacity`}
                              title="Activer sur plusieurs timeframes"
                            >
                              <HiViewGrid className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Local Backtest Button - Only for CUSTOM strategies */}
                          {perf.strategyType === 'CUSTOM' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openLocalBacktestModal(perf.strategyName, perf.timeframe);
                              }}
                              className={`p-1.5 ${colors.text} hover:opacity-70 transition-opacity`}
                              title="Local Backtest Strategy"
                            >
                              <HiBeaker className="w-3.5 h-3.5" />
                            </button>
                          )}


                      {/* Delete Button - Only for CUSTOM strategies */}
                      {perf.strategyType === 'CUSTOM' && (
                        deleteConfirm === perf.strategyName ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStrategy(perf.strategyName, perf.strategyType, perf.timeframe);
                              }}
                              className="px-2 py-1 text-green-400 hover:opacity-70 text-xs font-medium transition-opacity flex items-center gap-1"
                              title="Confirmer la suppression"
                            >
                              <HiCheckCircle className="w-3 h-3" />
                              ✓
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(null);
                              }}
                              className="px-2 py-1 text-red-400 hover:opacity-70 text-xs font-medium transition-opacity flex items-center gap-1"
                              title="Annuler"
                            >
                              <HiXCircle className="w-3 h-3" />
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
                              handleResetStrategy(perf.strategyName, perf.timeframe);
                            }}
                            className="px-2 py-1 text-green-400 hover:opacity-70 text-xs font-medium transition-opacity flex items-center gap-1"
                            title="Confirmer"
                          >
                            <HiCheckCircle className="w-3 h-3" />
                            ✓
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setResetConfirm(null);
                            }}
                            className="px-2 py-1 text-red-400 hover:opacity-70 text-xs font-medium transition-opacity flex items-center gap-1"
                            title="Annuler"
                          >
                            <HiXCircle className="w-3 h-3" />
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
                        </>
                      )}
                      
                      {/* Expand/Collapse Action Buttons - Before Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActionButtons(perf.strategyName);
                        }}
                        className={`p-1 ${colors.text} hover:opacity-70 transition-all flex-shrink-0`}
                        title={expandedActionButtons.has(perf.strategyName) ? "Masquer les actions" : "Afficher les actions"}
                      >
                        <HiChevronLeft className={`w-3.5 h-3.5 transition-transform ${
                          expandedActionButtons.has(perf.strategyName) ? '-rotate-90' : ''
                        }`} />
                      </button>
                      
                      {/* Toggle Switch - Always visible */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStrategy?.(perf.strategyName);
                        }}
                        disabled={togglingStrategies?.has(perf.strategyName)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          perf.isActive ? 'bg-gray-700' : 'bg-gray-600'
                        } ${togglingStrategies?.has(perf.strategyName) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={togglingStrategies?.has(perf.strategyName) ? 'Changement en cours...' : (perf.isActive ? 'Désactiver' : 'Activer')}
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
                    <div 
                      className="space-y-2 bg-gray-800/50 rounded-lg border border-gray-600/50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Risk/Reward Affichage */}
                      <div className="px-3 py-2 bg-gray-700/50 border-b border-gray-600/50 flex items-center justify-between">
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
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
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
                          <h4 className="text-sm font-bold text-green-400">Conditions d'ACHAT (LONG)</h4>
                          {isSectionExpanded(perf.strategyName, 'long') ? (
                            <HiChevronDown className="w-4 h-4 text-green-400" />
                          ) : (
                            <HiChevronRight className="w-4 h-4 text-green-400" />
                          )}
                        </div>
                        {isSectionExpanded(perf.strategyName, 'long') && (
                          perf.strategyType === 'CUSTOM' && perf.customConfig?.longExitConditions ? (
                            <div className="px-3 pb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <HiXCircle className="w-4 h-4 text-orange-400" />
                                <span className="text-orange-400 font-semibold text-xs">Exit Conditions:</span>
                              </div>
                              {renderExitConditionsWithStatus(perf.customConfig.longExitConditions, indicatorData)}
                            </div>
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
                          <h4 className="text-sm font-bold text-red-400">Conditions de VENTE (SHORT)</h4>
                          {isSectionExpanded(perf.strategyName, 'short') ? (
                            <HiChevronDown className="w-4 h-4 text-red-400" />
                          ) : (
                            <HiChevronRight className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        {isSectionExpanded(perf.strategyName, 'short') && (
                          perf.strategyType === 'CUSTOM' && perf.customConfig?.shortExitConditions ? (
                            <div className="px-3 pb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <HiXCircle className="w-4 h-4 text-orange-400" />
                                <span className="text-orange-400 font-semibold text-xs">Exit Conditions:</span>
                              </div>
                              {renderExitConditionsWithStatus(perf.customConfig.shortExitConditions, indicatorData)}
                            </div>
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

                  {/* Exit Conditions & Unrealized P&L - Show when in position */}
                  {perf.currentPosition.type !== 'NONE' && (
                    <>
                      {/* Exit Conditions - Above Unrealized */}
                      {perf.customConfig && (
                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-700/50 w-full">
                      <div className="flex items-center gap-1.5">
                            <BiSquare className="w-4 h-4 text-orange-400 flex-shrink-0" />
                            <span className="text-xs text-orange-400 font-semibold">EXIT:</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {perf.currentPosition.type === 'LONG' 
                              ? renderExitConditionsWithStatus(perf.customConfig.longExitConditions, indicatorData)
                              : renderExitConditionsWithStatus(perf.customConfig.shortExitConditions, indicatorData)
                            }
                          </div>
                        </div>
                      )}
                      
                      {/* Unrealized P&L */}
                      
                      <div className="flex items-center justify-between pt-2 w-full">
                      <div className="flex items-center gap-1.5">
                        {perf.currentPosition.type === 'LONG' ? <BiUpArrow className="w-4 h-4 text-green-400 flex-shrink-0" /> : <BiDownArrow className="w-4 h-4 text-red-400 flex-shrink-0" />}
                        <span className={`text-xs font-semibold ${
                          perf.currentPosition.type === 'LONG' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {perf.currentPosition.type}:
                        </span>
                        
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          perf.currentPosition.type === 'LONG' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                      </div>
                      <span className={`text-xs font-semibold ${
                        perf.currentPosition.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {perf.currentPosition.unrealizedPnL >= 0 ? '+' : ''}
                        {perf.currentPosition.unrealizedPnL.toFixed(2)} USDT
                        <span className="text-[10px] ml-1">
                          ({perf.currentPosition.unrealizedPnLPercent >= 0 ? '+' : ''}{perf.currentPosition.unrealizedPnLPercent.toFixed(2)}%)
                        </span>
                      </span>
                    </div>
                    </>
                  )}
                </>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* Summary Stats */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-700">
        <div className="flex items-center gap-6 text-sm">
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
          
      {/* Multi-Timeframe Modal */}
      {showMultiTimeframeModal && selectedStrategyForMultiTF && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowMultiTimeframeModal(false)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <HiViewGrid className="w-5 h-5 text-blue-400" />
                Activer sur plusieurs timeframes
              </h3>
          <button
                onClick={() => setShowMultiTimeframeModal(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <HiX className="w-5 h-5" />
          </button>
      </div>

            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">Stratégie : <span className="text-white font-semibold">{selectedStrategyForMultiTF}</span></p>
              <p className="text-xs text-gray-500 mb-3">Sélectionnez les timeframes sur lesquels activer cette stratégie</p>
              
              {/* Legend */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-600 rounded"></div>
                  <span className="text-gray-400">Actuelle</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-600/30 border border-green-500 rounded"></div>
                  <span className="text-gray-400">Déjà disponible</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-gray-400">Sélectionné</span>
                </div>
              </div>
              </div>
              
            <div className="grid grid-cols-3 gap-2 mb-6">
              {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => {
                // Check if strategy already exists on this timeframe
                const performancesToCheck = allPerformances || performances;
                const alreadyExists = performancesToCheck.some(p => p.strategyName === selectedStrategyForMultiTF && p.timeframe === tf);
                const isCurrentTimeframe = tf === currentTimeframe;
                const isNonDeselectable = alreadyExists && !isCurrentTimeframe;
                
                return (
                  <button
                    key={tf}
                    onClick={() => !isCurrentTimeframe && !isNonDeselectable && toggleTimeframeSelection(tf)}
                    disabled={isCurrentTimeframe || isNonDeselectable}
                    className={`py-3 px-4 rounded-lg font-medium transition-all ${
                      isCurrentTimeframe
                        ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                        : isNonDeselectable
                        ? 'bg-green-600/30 text-green-400 border border-green-500 cursor-not-allowed'
                        : selectedTimeframes.has(tf)
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                    title={
                      isCurrentTimeframe 
                        ? 'Timeframe actuelle (déjà active)'
                        : isNonDeselectable
                        ? 'Déjà disponible sur cette timeframe (non désélectionnable)'
                        : 'Nouvelle timeframe'
                    }
                  >
                    <div className="flex items-center justify-center gap-1">
                      {tf}
                      {isCurrentTimeframe && <span className="text-xs">✓</span>}
                      {isNonDeselectable && <span className="text-xs">✓</span>}
                    </div>
                  </button>
                );
              })}
              </div>
              
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setShowMultiTimeframeModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={activateMultiTimeframe}
                disabled={isActivatingMultiTF || selectedTimeframes.size === 0}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  isActivatingMultiTF || selectedTimeframes.size === 0
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                }`}
              >
                {isActivatingMultiTF ? 'Activation...' : `Activer (${selectedTimeframes.size})`}
              </button>
                </div>
          </div>
        </div>
      )}

      {/* Local Backtest Modal */}
      {showLocalBacktestModal && selectedStrategyForLocalBacktest && (
        <LocalBacktestModal
          isOpen={showLocalBacktestModal}
          onClose={() => {
            setShowLocalBacktestModal(false);
            setSelectedStrategyForLocalBacktest(null);
            setLocalBacktestResults(null);
          }}
          strategyName={selectedStrategyForLocalBacktest}
          timeframe={selectedTimeframeForLocalBacktest}
          onBacktestComplete={handleLocalBacktestComplete}
        />
      )}
    </div>
  );
}