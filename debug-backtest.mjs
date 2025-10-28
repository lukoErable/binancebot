import { CustomStrategy } from './src/lib/custom-strategy.js';
import { CustomStrategyRepository } from './src/lib/db/custom-strategy-repository.js';
import { LocalDataLoader } from './src/lib/local-data-loader.js';

async function debugBacktest() {
  console.log('🔍 Debugging backtest...');
  
  try {
    // 1. Vérifier les données disponibles
    console.log('\n📊 Checking available data...');
    const dataLoader = new LocalDataLoader();
    const availableData = await dataLoader.getAvailableDataSets();
    console.log('Available datasets:', availableData);
    
    // 2. Charger un petit échantillon de données
    console.log('\n📈 Loading sample data...');
    const candles = await dataLoader.loadHistoricalData(
      'BTCUSDT',
      '1d',
      '2024-01-01',
      '2024-01-31' // Juste janvier 2024
    );
    
    console.log(`Loaded ${candles.length} candles`);
    console.log('First candle:', candles[0]);
    console.log('Last candle:', candles[candles.length - 1]);
    
    // 3. Vérifier la stratégie
    console.log('\n🎯 Checking strategy...');
    const strategyConfig = await CustomStrategyRepository.loadCustomStrategy('Trend Follower AI');
    if (!strategyConfig) {
      console.log('❌ Strategy not found');
      return;
    }
    
    console.log('Strategy config:', {
      name: strategyConfig.name,
      description: strategyConfig.description,
      longEntryConditions: strategyConfig.longEntryConditions,
      shortEntryConditions: strategyConfig.shortEntryConditions
    });
    
    // 4. Tester la stratégie sur quelques bougies
    console.log('\n🧪 Testing strategy on sample data...');
    const strategy = new CustomStrategy(strategyConfig);
    
    for (let i = 0; i < Math.min(10, candles.length); i++) {
      const historicalCandles = candles.slice(0, i + 1);
      const signal = strategy.analyzeMarket(historicalCandles);
      
      console.log(`Candle ${i}:`, {
        time: new Date(candles[i].time).toISOString(),
        close: candles[i].close,
        signal: signal ? {
          type: signal.type,
          reason: signal.reason
        } : null
      });
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugBacktest().catch(console.error);
