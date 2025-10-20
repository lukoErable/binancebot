import { getGlobalStrategyManager } from '@/lib/websocket-manager';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Get performances from all timeframes
 * GET: Returns strategy performances across all timeframes
 */
export async function GET(request: NextRequest) {
  try {
    const strategyManager = getGlobalStrategyManager();
    
    if (!strategyManager) {
      return NextResponse.json(
        { error: 'Strategy manager not initialized' },
        { status: 503 }
      );
    }

    // Get all performances across all timeframes
    const allPerformances = strategyManager.getAllPerformances();

    return NextResponse.json({
      success: true,
      performances: allPerformances,
      count: allPerformances.length
    });

  } catch (error: any) {
    console.error('❌ Error fetching all performances:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

