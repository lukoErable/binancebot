/**
 * Next.js Instrumentation Hook
 * This file is called once when the server starts
 * Perfect for initializing background services like the Trading Daemon
 */

// Global flag to prevent double initialization (especially in dev mode)
declare global {
  var daemonInitialized: boolean | undefined;
}

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Prevent double initialization
    if (global.daemonInitialized) {
      console.log('⏭️  Trading Daemon already initialized, skipping...');
      return;
    }
    
    global.daemonInitialized = true;
    console.log('🎬 Server starting... Initializing Trading Daemon');
    
    // Dynamic import to avoid edge runtime issues
    const { initializeTradingDaemon } = await import('./src/lib/trading-daemon');
    
    // Start the daemon
    await initializeTradingDaemon();
    
    console.log('✅ Trading Daemon initialized and running 24/7');
  }
}

