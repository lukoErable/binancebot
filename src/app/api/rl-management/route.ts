/**
 * API Route for RL (Reinforcement Learning) Management
 * Handles enabling/disabling RL for strategies
 */

import { StrategyManager } from '@/lib/strategy-manager';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, strategyName, timeframe } = body;

    if (!action || !strategyName || !timeframe) {
      return NextResponse.json(
        { error: 'Missing required fields: action, strategyName, timeframe' },
        { status: 400 }
      );
    }

    let strategyManager = StrategyManager.getGlobalInstance();
    if (!strategyManager) {
      // Try to initialize StrategyManager by starting the trading daemon
      console.log('🧠 StrategyManager not initialized, attempting to start trading daemon...');
      
      try {
        const { tradingDaemon } = await import('@/lib/trading-daemon');
        if (!tradingDaemon.isActive()) {
          await tradingDaemon.start();
          console.log('🧠 Trading daemon started, StrategyManager should now be available');
        }
        
        // Try again after starting daemon
        const retryStrategyManager = StrategyManager.getGlobalInstance();
        if (!retryStrategyManager) {
          return NextResponse.json(
            { error: 'StrategyManager still not initialized after starting daemon' },
            { status: 503 }
          );
        }
        
        // Use the retry instance
        strategyManager = retryStrategyManager;
      } catch (daemonError) {
        console.error('❌ Failed to start trading daemon:', daemonError);
        return NextResponse.json(
          { error: 'Failed to initialize StrategyManager' },
          { status: 503 }
        );
      }
    }

    switch (action) {
      case 'enable':
        await strategyManager.enableRL(strategyName, timeframe);
        return NextResponse.json({
          success: true,
          message: `RL learning enabled for ${strategyName} [${timeframe}]`
        });

      case 'disable':
        await strategyManager.disableRL(strategyName, timeframe);
        return NextResponse.json({
          success: true,
          message: `RL learning disabled for ${strategyName} [${timeframe}]`
        });

      case 'status':
        const isEnabled = strategyManager.isRLEnabled(strategyName, timeframe);
        return NextResponse.json({
          success: true,
          enabled: isEnabled,
          message: `RL status for ${strategyName} [${timeframe}]: ${isEnabled ? 'enabled' : 'disabled'}`
        });

      case 'suggestions':
        const suggestions = await strategyManager.getRLAdaptationSuggestions(strategyName, timeframe);
        return NextResponse.json({
          success: true,
          suggestions: suggestions,
          message: `Generated ${suggestions.length} adaptation suggestions for ${strategyName} [${timeframe}]`
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: enable, disable, status, suggestions' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('RL API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const strategyName = searchParams.get('strategyName');
    const timeframe = searchParams.get('timeframe');

    const strategyManager = StrategyManager.getGlobalInstance();
    if (!strategyManager) {
      return NextResponse.json(
        { error: 'StrategyManager not initialized' },
        { status: 500 }
      );
    }

    if (strategyName && timeframe) {
      // Get status for specific strategy
      const isEnabled = strategyManager.isRLEnabled(strategyName, timeframe);
      return NextResponse.json({
        success: true,
        strategyName,
        timeframe,
        rlEnabled: isEnabled,
        message: `RL status for ${strategyName} [${timeframe}]: ${isEnabled ? 'enabled' : 'disabled'}`
      });
    } else {
      // Get all enabled RL strategies
      const enabledStrategies = new Set<string>();
      
      // Get all strategy performances and check RL status
      const performances = strategyManager.getAllPerformances();
      for (const perf of performances) {
        const key = `${perf.strategyName}:${perf.timeframe}`;
        if (strategyManager.isRLEnabled(perf.strategyName, perf.timeframe)) {
          enabledStrategies.add(key);
        }
      }

      return NextResponse.json({
        success: true,
        enabledStrategies: Array.from(enabledStrategies)
      });
    }

  } catch (error) {
    console.error('RL API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
