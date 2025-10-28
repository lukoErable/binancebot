import { CustomStrategy } from '@/lib/custom-strategy';
import CustomStrategyRepository from '@/lib/db/custom-strategy-repository';
import { LocalBacktestEngine } from '@/lib/local-backtest-engine';
import { LocalDataLoader } from '@/lib/local-data-loader';
import { StrategyManager } from '@/lib/strategy-manager';
import { BacktestConfig, BacktestResult } from '@/types/trading';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '../auth/[...nextauth]/route';

const dataLoader = new LocalDataLoader();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const config: BacktestConfig = body;

    // Validation des paramètres
    if (!config.strategyName || !config.timeframe || !config.startDate || !config.endDate) {
      return NextResponse.json({ 
        error: 'Missing required parameters: strategyName, timeframe, startDate, endDate' 
      }, { status: 400 });
    }

    // Validation des dates
    const startDate = new Date(config.startDate);
    const endDate = new Date(config.endDate);
    const now = new Date();

    if (startDate >= endDate) {
      return NextResponse.json({ 
        error: 'Start date must be before end date' 
      }, { status: 400 });
    }

    if (endDate > now) {
      return NextResponse.json({ 
        error: 'End date cannot be in the future' 
      }, { status: 400 });
    }

    // Essayer d'abord StrategyManager (même source que le live), sinon fallback vers CustomStrategyRepository
    console.log(`🔍 Looking for strategy: ${config.strategyName}`);
    let strategy;
    let strategySource = '';

    // 1. Essayer StrategyManager d'abord (préféré pour la synchronisation)
    const strategyManager = StrategyManager.getGlobalInstance();
    if (strategyManager) {
      const liveStrategy = strategyManager.getStrategy(config.strategyName, config.timeframe);
      if (liveStrategy) {
        console.log(`✅ Strategy found in StrategyManager: ${config.strategyName}`);
        strategy = liveStrategy;
        strategySource = 'StrategyManager (live)';
        
        // Log de la configuration live
        const liveConfig = liveStrategy.getConfig();
        console.log(`📋 Live strategy config:`, {
          name: liveConfig.name,
          longEntryConditions: liveConfig.longEntryConditions,
          shortEntryConditions: liveConfig.shortEntryConditions,
          profitTarget: liveConfig.profitTargetPercent,
          stopLoss: liveConfig.stopLossPercent,
          maxTime: liveConfig.maxPositionTime
        });
      }
    }

    // 2. Fallback vers CustomStrategyRepository si StrategyManager n'est pas disponible
    if (!strategy) {
      console.log(`⚠️ StrategyManager not available, using database fallback...`);
      const strategyConfig = await CustomStrategyRepository.loadCustomStrategy(config.strategyName);
      if (!strategyConfig) {
        console.log(`❌ Strategy "${config.strategyName}" not found in database`);
        return NextResponse.json({ 
          error: `Strategy "${config.strategyName}" not found` 
        }, { status: 404 });
      }
      console.log(`✅ Strategy found in database: ${config.strategyName}`);
      strategy = new CustomStrategy(strategyConfig);
      strategySource = 'Database (fallback)';
      
      // Log de la configuration de base de données
      console.log(`📋 Database strategy config:`, {
        name: strategyConfig.name,
        longEntryConditions: strategyConfig.longEntryConditions,
        shortEntryConditions: strategyConfig.shortEntryConditions,
        profitTarget: strategyConfig.profitTargetPercent,
        stopLoss: strategyConfig.stopLossPercent,
        maxTime: strategyConfig.maxPositionTime
      });
    }

    console.log(`🔧 Using strategy from: ${strategySource}`);

    // Vérifier que les données locales sont disponibles
    const hasData = await dataLoader.hasDataForPeriod(
      config.symbol,
      config.timeframe,
      config.startDate,
      config.endDate
    );

    if (!hasData) {
      return NextResponse.json({ 
        error: `No local data available for ${config.symbol} ${config.timeframe} from ${config.startDate} to ${config.endDate}. Please ensure the data file exists in the data/historical directory.` 
      }, { status: 404 });
    }

    // La stratégie est déjà définie dans la logique ci-dessus

    // Créer et exécuter le backtest
    console.log(`🚀 Starting backtest engine...`);
    const backtestEngine = new LocalBacktestEngine(config, strategy, dataLoader);
    console.log(`⚙️ Running backtest...`);
    const result: BacktestResult = await backtestEngine.runBacktest();

    console.log(`✅ Local backtest completed for ${config.strategyName}: ${result.totalReturnPercent.toFixed(2)}% return`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Local backtest error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Local backtest failed' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Retourner les datasets disponibles
    const availableData = await dataLoader.getAvailableDataSets();
    
    return NextResponse.json({
      message: 'Local backtest API is running',
      availableData,
      dataDirectory: './data/historical',
      supportedFormats: ['CSV'],
      maxFileSize: '100MB'
    });

  } catch (error) {
    console.error('❌ Local backtest API error:', error);
    return NextResponse.json({ 
      error: 'Failed to get local backtest info' 
    }, { status: 500 });
  }
}
