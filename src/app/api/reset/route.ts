import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🔄 Resetting all trading data...');

  try {
    // Accept empty body; if parsing fails, default to {}
    let body: any = {};
    try {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const raw = await request.text();
        body = raw ? JSON.parse(raw) : {};
      }
    } catch {
      body = {};
    }
    const { strategyName, timeframe } = body as { strategyName?: string; timeframe?: string };

    if (strategyName) {
      // Reset specific strategy - only completed trades and open positions
      const { pool } = await import('@/lib/db/database');
      
      await pool.query('DELETE FROM open_positions WHERE strategy_name = $1', [strategyName]);
      const result = await pool.query('DELETE FROM completed_trades WHERE strategy_name = $1', [strategyName]);
      
      return NextResponse.json({
        success: true,
        message: `Strategy "${strategyName}" reset successfully`,
        deletedTrades: result.rowCount || 0
      });
    } else if (timeframe) {
      // Reset all strategies for a specific timeframe
      const { pool } = await import('@/lib/db/database');
      
      // Get count before deletion
      const beforeCount = await pool.query('SELECT COUNT(*) as count FROM completed_trades WHERE timeframe = $1', [timeframe]);
      const count = parseInt(beforeCount.rows[0].count);
      
      // Delete timeframe-specific data
      await pool.query('DELETE FROM open_positions WHERE timeframe = $1', [timeframe]);
      await pool.query('DELETE FROM completed_trades WHERE timeframe = $1', [timeframe]);
      await pool.query('UPDATE strategies SET is_active = false, activated_at = NULL, total_active_time = 0 WHERE timeframe = $1', [timeframe]);
      
      console.log(`✅ Deleted ${count} completed trades for ${timeframe}`);
      
      return NextResponse.json({
        success: true,
        message: `All ${timeframe} trading data reset successfully`,
        deletedTrades: count,
        timeframe
      });
    } else {
      // Reset all strategies - delete all data (all timeframes)
      const { pool } = await import('@/lib/db/database');
      
      // Get count before deletion
      const beforeCount = await pool.query('SELECT COUNT(*) as count FROM completed_trades');
      const count = parseInt(beforeCount.rows[0].count);
      
      // Delete all strategy-derived data (open positions, completed trades, performances)
      await pool.query('DELETE FROM open_positions');
      await pool.query('DELETE FROM completed_trades');
      await pool.query('DELETE FROM strategy_performances');
      await pool.query('UPDATE strategies SET is_active = false, activated_at = NULL, total_active_time = 0');
      
      console.log(`✅ Deleted ${count} completed trades`);
      
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
    const completedTrades = await pool.query('SELECT COUNT(*) as count FROM completed_trades');
    const openPositions = await pool.query('SELECT COUNT(*) as count FROM open_positions');
    const strategies = await pool.query('SELECT name, is_active FROM strategies ORDER BY id');
    
    return NextResponse.json({
      success: true,
      data: {
        completedTradesCount: parseInt(completedTrades.rows[0].count),
        openPositionsCount: parseInt(openPositions.rows[0].count),
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

