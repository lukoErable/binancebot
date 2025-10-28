'use client';

import { AvailableDataSets, BacktestConfig, BacktestResult, HistoricalDataInfo } from '@/types/trading';
import { useEffect, useState } from 'react';

interface LocalBacktestModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategyName: string;
  timeframe: string;
  onBacktestComplete: (result: BacktestResult) => void;
}

export default function LocalBacktestModal({ 
  isOpen, 
  onClose, 
  strategyName, 
  timeframe,
  onBacktestComplete 
}: LocalBacktestModalProps) {
  const [config, setConfig] = useState<BacktestConfig>({
    strategyName,
    timeframe,
    startDate: '',
    endDate: '',
    initialCapital: 10000,
    positionSize: 0.1,
    symbol: 'BTCUSDT'
  });

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableData, setAvailableData] = useState<AvailableDataSets | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<HistoricalDataInfo | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Charger les datasets disponibles au montage
  useEffect(() => {
    if (isOpen) {
      loadAvailableData();
    }
  }, [isOpen, loadAvailableData]);

  const loadAvailableData = async () => {
    try {
      const response = await fetch('/api/local-backtest');
      if (response.ok) {
        const data = await response.json();
        setAvailableData(data.availableData);
        
        // Auto-sélectionner le meilleur dataset pour le timeframe demandé
        autoSelectBestDataset(data.availableData.datasets);
      }
    } catch (err) {
      console.error('Error loading available data:', err);
    }
  };

  const autoSelectBestDataset = (datasets: HistoricalDataInfo[]) => {
    // Chercher d'abord le timeframe exact
    const exactTimeframeDatasets = datasets.filter(d => d.timeframe === timeframe);
    if (exactTimeframeDatasets.length > 0) {
      // Prendre le dataset avec le plus de bougies (le plus complet)
      const bestDataset = exactTimeframeDatasets.reduce((best, current) => 
        current.totalCandles > best.totalCandles ? current : best
      );
      setSelectedDataset(bestDataset);
      updateConfigFromDataset(bestDataset);
      return;
    }
    
    // Si pas de timeframe exact, prendre le plus proche
    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
    const currentIndex = timeframes.indexOf(timeframe);
    
    for (let i = 0; i < timeframes.length; i++) {
      const checkTimeframe = timeframes[currentIndex + i] || timeframes[currentIndex - i];
      const matchingDatasets = datasets.filter(d => d.timeframe === checkTimeframe);
      if (matchingDatasets.length > 0) {
        const bestDataset = matchingDatasets.reduce((best, current) => 
          current.totalCandles > best.totalCandles ? current : best
        );
        setSelectedDataset(bestDataset);
        updateConfigFromDataset(bestDataset);
        return;
      }
    }
  };

  const updateConfigFromDataset = (dataset: HistoricalDataInfo) => {
    setConfig(prev => ({
      ...prev,
      symbol: dataset.symbol,
      timeframe: dataset.timeframe,
      startDate: dataset.startDate,
      endDate: dataset.endDate
    }));
  };

  const handleRunBacktest = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setProgress('Initializing backtest...');
    setProgressPercent(0);

    try {
      // Utiliser la nouvelle route avec progression en temps réel
      const response = await fetch('/api/local-backtest-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Backtest failed');
        setProgress('');
        setProgressPercent(0);
        return;
      }

      // Lire le stream SSE
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setError('Failed to read backtest stream');
        setProgress('');
        setProgressPercent(0);
        return;
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'start') {
                setProgress(data.message);
                setProgressPercent(0);
              } else if (data.type === 'progress') {
                setProgress(data.message);
                setProgressPercent(data.progress || 0);
              } else if (data.type === 'complete') {
                setResult(data.result);
                onBacktestComplete(data.result);
                setProgress('');
                setProgressPercent(100);
              } else if (data.type === 'error') {
                setError(data.error);
                setProgress('');
                setProgressPercent(0);
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Backtest timeout - please try with a shorter period or different timeframe');
      } else {
        setError('Network error occurred');
      }
      setProgress('');
      setProgressPercent(0);
    } finally {
      setIsRunning(false);
    }
  };

  const handleDatasetSelect = (dataset: HistoricalDataInfo) => {
    setSelectedDataset(dataset);
    updateConfigFromDataset(dataset);
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    setSelectedDataset(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            Local Backtest: {strategyName}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {!result ? (
          <div className="space-y-6">
            {/* Available Datasets - 3 per row */}
            {availableData && availableData.datasets.length > 0 && (
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-cyan-400 mb-3">
                  📊 Available Local Datasets ({availableData.datasets.length})
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {availableData.datasets.map((dataset, index) => (
                    <div
                      key={index}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedDataset?.symbol === dataset.symbol && 
                        selectedDataset?.timeframe === dataset.timeframe
                          ? 'border-cyan-500 bg-cyan-500/20'
                          : 'border-gray-600 hover:border-cyan-400 hover:bg-gray-700'
                      }`}
                      onClick={() => handleDatasetSelect(dataset)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-cyan-500 text-white px-2 py-1 rounded text-sm font-medium">
                          {dataset.timeframe}
                        </span>
                        <span className="font-medium text-white text-sm">
                          {dataset.symbol}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mb-1">
                        {dataset.startDate} to {dataset.endDate}
                      </div>
                      <div className="text-xs text-gray-500">
                        {dataset.totalCandles.toLocaleString()} candles • {dataset.fileSize}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Configuration - Simplified */}
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                ⚙️ Backtest Configuration
              </h3>
              
              {/* Selected Dataset Info */}
              {selectedDataset && (
                <div className="bg-green-900/30 border border-green-500 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-400">✓</span>
                    <span className="font-medium text-green-400">Selected Dataset</span>
                  </div>
                  <div className="text-sm text-green-300">
                    <strong>{selectedDataset.symbol} {selectedDataset.timeframe}</strong> • 
                    {selectedDataset.startDate} to {selectedDataset.endDate} • 
                    {selectedDataset.totalCandles.toLocaleString()} candles
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Initial Capital */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Initial Capital (USDT)
                  </label>
                  <input
                    type="number"
                    value={config.initialCapital}
                    onChange={(e) => setConfig(prev => ({ ...prev, initialCapital: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    min="100"
                    step="100"
                  />
                </div>

                {/* Position Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Position Size (%)
                  </label>
                  <input
                    type="number"
                    value={config.positionSize}
                    onChange={(e) => setConfig(prev => ({ ...prev, positionSize: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    min="0.01"
                    max="100"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Auto-filled Info */}
              <div className="mt-4 p-3 bg-cyan-900/30 border border-cyan-500 rounded-lg">
                <div className="text-sm text-cyan-300">
                  <div><strong>Strategy:</strong> {config.strategyName}</div>
                  <div><strong>Symbol:</strong> {config.symbol}</div>
                  <div><strong>Timeframe:</strong> {config.timeframe}</div>
                  <div><strong>Period:</strong> {config.startDate} to {config.endDate}</div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
                <div className="text-red-300">
                  <strong>Error:</strong> {error}
                </div>
              </div>
            )}

              {/* Progress Indicator */}
              {isRunning && progress && (
                <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                    <div className="text-blue-300 font-medium">{progress}</div>
                  </div>
                  
                  {/* Barre de progression */}
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-400">
                      {progressPercent.toFixed(0)}% complete
                    </span>
                    <span className="text-gray-400">
                      {progressPercent < 50 ? 'This may take 1-2 minutes...' : 'Almost done...'}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-300 border border-gray-600 rounded-md hover:bg-gray-700 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRunBacktest}
                  disabled={isRunning || !selectedDataset}
                  className="px-6 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRunning ? 'Running...' : 'Run Backtest'}
                </button>
              </div>
          </div>
        ) : (
          /* Results Display */
          <div className="space-y-6">
            <div className="bg-green-900/30 border border-green-500 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-400 mb-3">
                ✅ Backtest Completed
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Total Return</div>
                  <div className={`font-bold ${result.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {result.totalReturn >= 0 ? '+' : ''}{result.totalReturn.toFixed(2)} USDT
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Return %</div>
                  <div className={`font-bold ${result.totalReturnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {result.totalReturnPercent >= 0 ? '+' : ''}{result.totalReturnPercent.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Win Rate</div>
                  <div className="font-bold text-cyan-400">
                    {result.winRate.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Total Trades</div>
                  <div className="font-bold text-white">
                    {result.totalTrades}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}