/**
 * Daemon initialization endpoint
 * This is called automatically when Next.js server starts
 */

import { initializeTradingDaemon, tradingDaemon } from '@/lib/trading-daemon';
import { NextResponse } from 'next/server';

// Initialize daemon on module load (server startup)
initializeTradingDaemon().then(() => {
  console.log('✅ Trading Daemon initialized via module import');
}).catch(error => {
  console.error('❌ Failed to initialize daemon:', error);
});

/**
 * GET endpoint to check daemon status
 */
export async function GET() {
  const stats = tradingDaemon.getStats();
  const isActive = tradingDaemon.isActive();
  
  const uptimeMinutes = Math.floor(stats.uptime / 1000 / 60);
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
    daemon: {
      status: isActive ? 'RUNNING' : 'STOPPED',
      startTime: stats.startTime,
      uptime: uptimeStr,
      uptimeMs: stats.uptime,
      totalAnalyses: stats.totalAnalyses,
      tradesExecuted: stats.tradesExecuted,
      activeWebSockets: stats.activeWebSockets,
      activeStrategies: stats.activeStrategies
    },
    message: isActive 
      ? `Trading Daemon running 24/7. Uptime: ${uptimeStr}` 
      : 'Trading Daemon is stopped'
  });
}

/**
 * POST endpoint to manually restart daemon
 */
export async function POST() {
  try {
    tradingDaemon.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await tradingDaemon.start();
    
    return NextResponse.json({
      success: true,
      message: 'Trading Daemon restarted successfully'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

