import StrategyRepository from '@/lib/db/strategy-repository';
import TradeRepository from '@/lib/db/trade-repository';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const strategyName = searchParams.get('strategy');
  const limit = parseInt(searchParams.get('limit') || '100');

  try {
    switch (action) {
      case 'getAll':
        // Get all trades (optionally filtered by strategy)
        const trades = strategyName
          ? await TradeRepository.getTradesByStrategy(strategyName, limit)
          : await TradeRepository.getAllTrades(limit);
        
        return NextResponse.json({ success: true, trades });

      case 'getStats':
        // Get statistics for a specific strategy
        if (!strategyName) {
          return NextResponse.json({ 
            success: false, 
            error: 'Strategy name required' 
          }, { status: 400 });
        }
        
        const stats = await TradeRepository.getStrategyStats(strategyName);
        return NextResponse.json({ success: true, stats });

      case 'getPerformanceHistory':
        // Get performance history for a strategy
        if (!strategyName) {
          return NextResponse.json({ 
            success: false, 
            error: 'Strategy name required' 
          }, { status: 400 });
        }
        
        const history = await StrategyRepository.getPerformanceHistory(
          strategyName,
          limit
        );
        return NextResponse.json({ success: true, history });

      case 'getAllStrategies':
        // Get all strategies from database
        const strategies = await StrategyRepository.getAllStrategies();
        return NextResponse.json({ success: true, strategies });

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'cleanup':
        // Delete old trades
        const daysToKeep = body.daysToKeep || 30;
        const deletedCount = await TradeRepository.deleteOldTrades(daysToKeep);
        
        return NextResponse.json({ 
          success: true, 
          deletedCount,
          message: `Deleted ${deletedCount} old trades` 
        });

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

