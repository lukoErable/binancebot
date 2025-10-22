import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Get performances from all timeframes
 * GET: Returns strategy performances across all timeframes for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get StrategyManager instance
    const { StrategyManager } = await import('@/lib/strategy-manager');
    const strategyManager = StrategyManager.getGlobalInstance();
    
    if (!strategyManager) {
      return NextResponse.json(
        { error: 'Strategy manager not initialized' },
        { status: 503 }
      );
    }

    // Get all performances across all timeframes
    const allPerformances = strategyManager.getAllPerformances();
    
    // Filter by user email
    const userPerformances = allPerformances.filter(
      (perf: any) => perf.userEmail === userEmail
    );

    console.log(`📊 [ALL-PERFORMANCES] Returning ${userPerformances.length} strategies for ${userEmail} (filtered from ${allPerformances.length} total)`);

    return NextResponse.json({
      success: true,
      performances: userPerformances,
      count: userPerformances.length
    });

  } catch (error: any) {
    console.error('❌ Error fetching all performances:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

