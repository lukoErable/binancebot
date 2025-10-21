/**
 * Daemon Status Monitoring API
 * Shows detailed stats about the 24/7 trading system
 */

import SharedBinanceWebSocket from '@/lib/shared-binance-websocket';
import { StrategyManager } from '@/lib/strategy-manager';
import { tradingDaemon } from '@/lib/trading-daemon';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Daemon stats
    const stats = tradingDaemon.getStats();
    const isActive = tradingDaemon.isActive();
    
    // StrategyManager stats
    const strategyManager = StrategyManager.getGlobalInstance();
    const allPerformances = strategyManager?.getAllPerformances() || [];
    const activeStrategies = allPerformances.filter(p => p.isActive);
    
    // Group strategies by user (for multi-tenant)
    const strategiesByUser: Record<number, { total: number; active: number }> = {};
    allPerformances.forEach(perf => {
      // Assuming we'll add userId to performances later
      const userId = 1; // Default for now
      if (!strategiesByUser[userId]) {
        strategiesByUser[userId] = { total: 0, active: 0 };
      }
      strategiesByUser[userId].total++;
      if (perf.isActive) {
        strategiesByUser[userId].active++;
      }
    });
    
    // WebSocket stats
    const websockets = SharedBinanceWebSocket.getAllInstances();
    const websocketStats = Array.from(websockets.entries()).map(([tf, ws]) => {
      const data = ws.getCurrentData();
      return {
        timeframe: tf,
        connected: data !== null,
        candles: data?.candles.length || 0,
        lastPrice: data?.currentPrice || 0,
        lastUpdate: data?.lastUpdate || 0,
        subscribers: ws.getSubscriberCount()
      };
    });
    
    // Calculate uptime
    const uptimeMs = stats.uptime;
    const uptimeMinutes = Math.floor(uptimeMs / 1000 / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    const uptimeDays = Math.floor(uptimeHours / 24);
    
    let uptimeStr = '';
    if (uptimeDays > 0) {
      uptimeStr = `${uptimeDays}d ${uptimeHours % 24}h ${uptimeMinutes % 60}m`;
    } else if (uptimeHours > 0) {
      uptimeStr = `${uptimeHours}h ${uptimeMinutes % 60}m`;
    } else {
      uptimeStr = `${uptimeMinutes}m`;
    }
    
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      daemon: {
        status: isActive ? '🟢 RUNNING 24/7' : '🔴 STOPPED',
        isActive,
        startTime: stats.startTime,
        uptime: uptimeStr,
        uptimeMs,
        totalAnalyses: stats.totalAnalyses,
        tradesExecuted: stats.tradesExecuted
      },
      strategies: {
        total: allPerformances.length,
        active: activeStrategies.length,
        inactive: allPerformances.length - activeStrategies.length,
        byUser: strategiesByUser,
        byTimeframe: allPerformances.reduce((acc, p) => {
          const tf = p.timeframe || '1m';
          if (!acc[tf]) acc[tf] = { total: 0, active: 0 };
          acc[tf].total++;
          if (p.isActive) acc[tf].active++;
          return acc;
        }, {} as Record<string, { total: number; active: number }>)
      },
      websockets: {
        total: websocketStats.length,
        connected: websocketStats.filter(w => w.connected).length,
        details: websocketStats
      },
      system: {
        uptime24h: isActive && uptimeDays >= 1,
        autoReconnect: true,
        multiUser: true,
        backgroundTrading: true
      }
    });
  } catch (error) {
    console.error('❌ Error getting daemon status:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

