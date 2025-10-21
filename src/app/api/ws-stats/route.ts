import SharedBinanceWebSocket from '@/lib/shared-binance-websocket';
import UserSessionManager from '@/lib/user-session-manager';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API to get WebSocket statistics
 * Shows how many users are connected and sharing resources
 */

export async function GET(request: NextRequest) {
  try {
    const sessionManager = UserSessionManager.getInstance();
    const stats = sessionManager.getStats();
    
    // Get individual WebSocket stats
    const sharedWS = SharedBinanceWebSocket.getAllInstances();
    const wsDetails = Array.from(sharedWS.entries()).map(([tf, ws]) => {
      const data = ws.getCurrentData();
      return {
        timeframe: tf,
        subscribers: ws.getSubscriberCount(),
        lastUpdate: data?.lastUpdate || null,
        candlesCount: data?.candles.length || 0,
        currentPrice: data?.currentPrice || 0
      };
    });
    
    // Calculate efficiency metrics
    const totalPossibleConnections = stats.totalSubscriptions;
    const actualConnections = stats.sharedWebSockets.length;
    const efficiency = totalPossibleConnections > 0 
      ? ((totalPossibleConnections - actualConnections) / totalPossibleConnections * 100).toFixed(1)
      : 0;
    
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      summary: {
        activeSessions: stats.totalSessions,
        totalSubscriptions: stats.totalSubscriptions,
        sharedWebSockets: actualConnections,
        efficiency: `${efficiency}% reduction in connections`,
        savings: `${totalPossibleConnections - actualConnections} connections saved`
      },
      websockets: wsDetails,
      sessions: stats.totalSessions
    });
  } catch (error: any) {
    console.error('❌ Error fetching WebSocket stats:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

