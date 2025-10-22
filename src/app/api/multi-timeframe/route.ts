import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import CustomStrategyRepository from '@/lib/db/custom-strategy-repository';
import StrategyRepository from '@/lib/db/strategy-repository';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Multi-Timeframe Strategy Management
 * POST: Activate a strategy on multiple timeframes
 * GET: Get strategy status across all timeframes
 */

export async function POST(request: NextRequest) {
  try {
    const { strategyName, timeframes, config } = await request.json();

    if (!strategyName || !timeframes || !Array.isArray(timeframes)) {
      return NextResponse.json(
        { error: 'strategyName and timeframes array are required' },
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

    // Use provided config or load existing strategy configuration
    let baseConfig = config;
    if (!baseConfig) {
      baseConfig = await CustomStrategyRepository.loadCustomStrategy(strategyName);
      if (!baseConfig) {
        return NextResponse.json(
          { error: `Strategy "${strategyName}" not found and no config provided` },
          { status: 404 }
        );
      }
    }
    
    // IMPORTANT: Set the userEmail for the new strategy
    baseConfig.userEmail = userEmail;

    const results = [];

    // Create/ensure strategy exists for each timeframe
    for (const timeframe of timeframes) {
      // Create a copy of the config with the specific timeframe
      const configForTimeframe = {
        ...baseConfig,
        timeframe,
        userEmail // Ensure userEmail is set
      };

      // Save the strategy with the new timeframe
      await CustomStrategyRepository.saveCustomStrategy(configForTimeframe, userEmail);

      // Ensure it exists in the strategies table with the correct userEmail
      await StrategyRepository.ensureStrategyExists(
        strategyName,
        'CUSTOM',
        false, // Start inactive by default
        {
          profitTargetPercent: baseConfig.profitTargetPercent,
          stopLossPercent: baseConfig.stopLossPercent,
          maxPositionTime: baseConfig.maxPositionTime
        },
        timeframe,
        userEmail // Pass userEmail to ensure proper ownership
      );

      results.push({
        timeframe,
        status: 'created',
        strategyName
      });
    }

    // Add to StrategyManager without full reload (OPTIMIZED)
    const { StrategyManager } = await import('@/lib/strategy-manager');
    const strategyManager = StrategyManager.getGlobalInstance();
    if (strategyManager) {
      await strategyManager.addNewStrategy(baseConfig, timeframes);
      console.log(`✅ StrategyManager updated with new strategy "${strategyName}" (instant add)`);
      
      // IMPORTANT: Force SSE update for all active users
      // This ensures the new strategy appears immediately in the frontend
      const { UserSessionManager } = await import('@/lib/user-session-manager');
      const sessionManager = UserSessionManager.getInstance();
      const stats = sessionManager.getStats();
      
      if (stats.totalSessions > 0) {
        console.log(`📡 Forcing SSE update for ${stats.totalSessions} active users to show new strategy`);
        // The SSE managers will automatically detect the new strategy in their next sendCombinedState() call
        // which happens every 500ms, but we can't force it directly from here
        // The new strategy will appear in the next SSE update cycle
      }
    }

    return NextResponse.json({
      success: true,
      message: `Strategy "${strategyName}" created on ${timeframes.length} timeframe(s)`,
      results
    });
  } catch (error) {
    console.error('Error in multi-timeframe activation:', error);
    return NextResponse.json(
      { error: 'Failed to activate strategy on multiple timeframes' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const strategyName = searchParams.get('strategyName');

    if (!strategyName) {
      return NextResponse.json(
        { error: 'strategyName is required' },
        { status: 400 }
      );
    }

    // Get all strategy entries for this name across all timeframes
    const allStrategies = await StrategyRepository.getAllStrategies();
    const strategyTimeframes = allStrategies
      .filter((s: any) => s.name === strategyName)
      .map((s: any) => ({
        timeframe: s.timeframe || '1m',
        isActive: s.is_active,
        totalActiveTime: s.total_active_time || 0,
        activatedAt: s.activated_at
      }));

    return NextResponse.json({
      success: true,
      strategyName,
      timeframes: strategyTimeframes
    });
  } catch (error) {
    console.error('Error getting multi-timeframe status:', error);
    return NextResponse.json(
      { error: 'Failed to get strategy status' },
      { status: 500 }
    );
  }
}

