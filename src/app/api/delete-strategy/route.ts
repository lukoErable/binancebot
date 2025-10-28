import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import CompletedTradeRepository from '@/lib/db/completed-trade-repository';
import CustomStrategyRepository from '@/lib/db/custom-strategy-repository';
import OpenPositionRepository from '@/lib/db/open-position-repository';
import StrategyRepository from '@/lib/db/strategy-repository';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Delete Strategy
 * Deletes a strategy from a specific timeframe
 */

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const strategyName = searchParams.get('strategyName');
    const timeframe = searchParams.get('timeframe') || '1m';

    if (!strategyName) {
      return NextResponse.json(
        { error: 'strategyName is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log(`🗑️ Deleting strategy: ${strategyName} [${timeframe}] for ${userEmail}`);

    // Delete from custom_strategies (strategies table handles it via CASCADE)
    await CustomStrategyRepository.deleteCustomStrategy(strategyName, timeframe);

    // Delete completed trades for this strategy+timeframe
    await CompletedTradeRepository.deleteStrategyCompletedTrades(strategyName, timeframe);

    // Delete open position for this strategy+timeframe  
    await OpenPositionRepository.deleteOpenPosition(strategyName, timeframe, userEmail);

    // Clear caches
    StrategyRepository.clearCache();
    CustomStrategyRepository.clearCache();

    console.log(`✅ Strategy "${strategyName}" [${timeframe}] deleted successfully for ${userEmail}`);

    // Reload StrategyManager
    const { StrategyManager } = await import('@/lib/strategy-manager');
    const strategyManager = StrategyManager.getGlobalInstance();
    if (strategyManager) {
      // Disable RL before reloading if it was enabled
      if (strategyManager.isRLEnabled(strategyName, timeframe)) {
        try {
          await strategyManager.disableRL(strategyName, timeframe);
          console.log(`🧠 RL automatically disabled for deleted strategy: ${strategyName} [${timeframe}]`);
        } catch (error) {
          console.error(`❌ Error disabling RL for deleted strategy ${strategyName} [${timeframe}]:`, error);
        }
      }
      
      // Remove from in-memory map
      await strategyManager.reloadAllData();
      console.log(`✅ StrategyManager reloaded after deletion`);
    }

    return NextResponse.json({
      success: true,
      message: `Strategy "${strategyName}" [${timeframe}] deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    return NextResponse.json(
      { error: 'Failed to delete strategy' },
      { status: 500 }
    );
  }
}

