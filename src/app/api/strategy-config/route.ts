import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import StrategyRepository from '@/lib/db/strategy-repository';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to update strategy configuration
 * PUT /api/strategy-config
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { strategyName, config, timeframe } = body;

    if (!strategyName || !config) {
      return NextResponse.json(
        { error: 'Missing strategyName or config' },
        { status: 400 }
      );
    }

    // Validate config values (limites très larges) - null = désactivé
    if (config.profitTarget !== undefined && config.profitTarget !== null && (config.profitTarget < 0.1 || config.profitTarget > 100)) {
      return NextResponse.json(
        { error: 'profitTarget must be between 0.1 and 100' },
        { status: 400 }
      );
    }

    if (config.stopLoss !== undefined && config.stopLoss !== null && (config.stopLoss < 0.1 || config.stopLoss > 100)) {
      return NextResponse.json(
        { error: 'stopLoss must be between 0.1 and 100' },
        { status: 400 }
      );
    }

    if (config.maxPositionTime !== undefined && config.maxPositionTime !== null && (config.maxPositionTime < 1 || config.maxPositionTime > 9999)) {
      return NextResponse.json(
        { error: 'maxPositionTime must be between 1 and 9999 minutes' },
        { status: 400 }
      );
    }

    const tf = timeframe || '1m';

    // Update in database (persistent)
    await StrategyRepository.updateStrategyConfig(strategyName, config, tf);

    // Apply changes to running strategy (hot reload)
    const { StrategyManager } = await import('@/lib/strategy-manager');
    const strategyManager = StrategyManager.getGlobalInstance();
    if (strategyManager) {
      strategyManager.updateStrategyConfig(strategyName, config, tf);
      console.log(`Hot reload: Config applied to running strategy "${strategyName}" [${tf}] for ${userEmail}`);
    }

    return NextResponse.json({
      success: true,
      message: `Configuration updated for ${strategyName} [${tf}]`,
      config,
      appliedToRunning: strategyManager !== null
    });

  } catch (error) {
    console.error('❌ Error in strategy-config API:', error);
    return NextResponse.json(
      { error: 'Failed to update strategy configuration' },
      { status: 500 }
    );
  }
}

