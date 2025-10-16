import TradeRepository from '@/lib/db/trade-repository';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🔄 Resetting all trading data...');

  try {
    const body = await request.json();
    const { strategyName } = body;

    if (strategyName) {
      // Reset specific strategy
      const deleted = await TradeRepository.deleteStrategyTrades(strategyName);
      
      return NextResponse.json({
        success: true,
        message: `Strategy "${strategyName}" reset successfully`,
        deletedTrades: deleted
      });
    } else {
      // Reset all strategies - delete all trades
      // Note: This only works if user has permissions
      const { pool } = await import('@/lib/db/database');
      
      // Get count before deletion
      const beforeCount = await pool.query('SELECT COUNT(*) as count FROM trades');
      const count = parseInt(beforeCount.rows[0].count);
      
      // Delete all trades
      await pool.query('DELETE FROM trades');
      await pool.query('DELETE FROM strategy_performances');
      await pool.query('UPDATE strategies SET is_active = false');
      
      console.log(`✅ Deleted ${count} trades`);
      
      return NextResponse.json({
        success: true,
        message: 'All trading data reset successfully',
        deletedTrades: count,
        note: 'Capital will restart at 100,000 USDT'
      });
    }
    
  } catch (error: any) {
    console.error('❌ Reset failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      note: 'Use SSH method for full database reset: ssh root@91.99.163.156'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { pool } = await import('@/lib/db/database');
    
    // Get current state
    const trades = await pool.query('SELECT COUNT(*) as count FROM trades');
    const performances = await pool.query('SELECT COUNT(*) as count FROM strategy_performances');
    const strategies = await pool.query('SELECT name, is_active FROM strategies ORDER BY id');
    
    return NextResponse.json({
      success: true,
      data: {
        tradesCount: parseInt(trades.rows[0].count),
        performancesCount: parseInt(performances.rows[0].count),
        strategies: strategies.rows
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching reset info:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

