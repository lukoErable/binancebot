import CustomStrategyRepository from '@/lib/db/custom-strategy-repository';
import StrategyRepository from '@/lib/db/strategy-repository';
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

    const results = [];

    // Create/ensure strategy exists for each timeframe
    for (const timeframe of timeframes) {
      // Create a copy of the config with the specific timeframe
      const configForTimeframe = {
        ...baseConfig,
        timeframe
      };

      // Save the strategy with the new timeframe
      await CustomStrategyRepository.saveCustomStrategy(configForTimeframe);

      // Ensure it exists in the strategies table
      await StrategyRepository.ensureStrategyExists(
        strategyName,
        'CUSTOM',
        false, // Start inactive by default
        {
          profitTargetPercent: baseConfig.profitTargetPercent,
          stopLossPercent: baseConfig.stopLossPercent,
          maxPositionTime: baseConfig.maxPositionTime
        },
        timeframe
      );

      results.push({
        timeframe,
        status: 'created',
        strategyName
      });
    }

    // Reload StrategyManager to load the new strategies
    const { StrategyManager } = await import('@/lib/strategy-manager');
    const strategyManager = StrategyManager.getGlobalInstance();
    if (strategyManager) {
      await strategyManager.reloadAllData();
      console.log(`✅ StrategyManager reloaded with new strategy "${strategyName}"`);
    }

    return NextResponse.json({
      success: true,
      message: `Strategy "${strategyName}" activated on ${timeframes.length} timeframe(s)`,
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

