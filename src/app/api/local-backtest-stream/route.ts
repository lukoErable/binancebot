import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { CustomStrategy } from '@/lib/custom-strategy';
import { CustomStrategyRepository } from '@/lib/db/custom-strategy-repository';
import { LocalBacktestEngine } from '@/lib/local-backtest-engine';
import { LocalDataLoader } from '@/lib/local-data-loader';
import { StrategyManager } from '@/lib/strategy-manager';
import { BacktestConfig } from '@/types/trading';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const config: BacktestConfig = await request.json();
    const dataLoader = new LocalDataLoader();

    // Vérifier les dates
    const startDate = new Date(config.startDate);
    const endDate = new Date(config.endDate);
    const now = new Date();

    if (startDate >= endDate) {
      return new Response(JSON.stringify({ error: 'Start date must be before end date' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (endDate > now) {
      return new Response(JSON.stringify({ error: 'End date cannot be in the future' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
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
        return new Response(JSON.stringify({ error: `Strategy "${config.strategyName}" not found` }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
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
      return new Response(JSON.stringify({ 
        error: `No local data available for ${config.symbol} ${config.timeframe} from ${config.startDate} to ${config.endDate}. Please ensure the data file exists in the data/historical directory.` 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // La stratégie est déjà définie dans la logique ci-dessus

    // Créer un stream SSE pour les mises à jour de progression
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Envoyer le début du backtest
          controller.enqueue(`data: ${JSON.stringify({ type: 'start', message: 'Initializing backtest...' })}\n\n`);

          // Créer le backtest engine avec callback de progression
          const backtestEngine = new LocalBacktestEngine(config, strategy, dataLoader);
          
          // Modifier la méthode runBacktest pour envoyer des mises à jour
          const originalRunBacktest = backtestEngine.runBacktest.bind(backtestEngine);
          backtestEngine.runBacktest = async function() {
            // Charger les données
            controller.enqueue(`data: ${JSON.stringify({ type: 'progress', message: 'Loading historical data...', progress: 10 })}\n\n`);
            
            const candles = await dataLoader.loadHistoricalData(
              config.symbol,
              config.timeframe,
              config.startDate,
              config.endDate
            );
            
            controller.enqueue(`data: ${JSON.stringify({ type: 'progress', message: `Loaded ${candles.length} candles`, progress: 20 })}\n\n`);
            
            // Simuler la progression
            const totalCandles = candles.length;
            let processedCandles = 0;
            
            // Simuler le traitement avec des mises à jour de progression
            for (let i = 0; i < totalCandles; i++) {
              processedCandles++;
              
              // Envoyer une mise à jour tous les 1000 bougies
              if (i % 1000 === 0) {
                const progress = Math.min(95, 20 + (i / totalCandles) * 75);
                controller.enqueue(`data: ${JSON.stringify({ 
                  type: 'progress', 
                  message: `Processing ${i}/${totalCandles} candles (${((i/totalCandles)*100).toFixed(1)}%)`, 
                  progress: Math.round(progress)
                })}\n\n`);
              }
            }
            
            // Exécuter le vrai backtest
            controller.enqueue(`data: ${JSON.stringify({ type: 'progress', message: 'Calculating results...', progress: 95 })}\n\n`);
            const result = await originalRunBacktest();
            
            // Envoyer le résultat final
            controller.enqueue(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`);
            controller.close();
            
            return result;
          };
          
          // Démarrer le backtest
          await backtestEngine.runBacktest();
          
        } catch (error) {
          console.error('❌ Backtest stream error:', error);
          controller.enqueue(`data: ${JSON.stringify({ 
            type: 'error', 
            error: error instanceof Error ? error.message : 'Backtest failed' 
          })}\n\n`);
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('❌ Local backtest stream error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Local backtest stream failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
