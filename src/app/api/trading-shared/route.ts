import SharedMultiTimeframeWebSocketManager from '@/lib/shared-multi-websocket-manager';
import UserSessionManager from '@/lib/user-session-manager';
import { NextRequest } from 'next/server';
// Initialize Trading Daemon (24/7 background trading)
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { hasStrategies, initializeDefaultStrategies } from '@/lib/default-strategies';
import { tradingDaemon } from '@/lib/trading-daemon';
import { getServerSession } from 'next-auth';

// Map to track active user managers (keyed by user email)
const activeManagers = new Map<string, SharedMultiTimeframeWebSocketManager>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const timeframe = searchParams.get('timeframe') || '1m';
  const trading = searchParams.get('trading') === 'true';

  // Get authenticated user
  const session = await getServerSession(authOptions);
  const userId = session?.user?.email || 'anonymous';

  // === SSE STREAMING ===
  if (action === 'start') {
    // Check if user is authenticated
    if (userId && userId.includes('@')) {
      // Check if user has strategies, if not create default ones
      const userHasStrategies = await hasStrategies(userId);
      if (!userHasStrategies) {
        console.log(`🆕 New user detected: ${userId}, creating default strategies...`);
        await initializeDefaultStrategies(userId);
        
        // Add to StrategyManager without full reload (OPTIMIZED)
        const { StrategyManager } = await import('@/lib/strategy-manager');
        const strategyManager = StrategyManager.getGlobalInstance();
        if (strategyManager) {
          // Load the 3 default strategies that were just created
          const CustomStrategyRepository = await import('@/lib/db/custom-strategy-repository');
          const defaultConfigs = await CustomStrategyRepository.default.getAllCustomStrategies(false, userId);
          
          // Add each one individually (faster than reloading all 60+ strategies)
          for (const config of defaultConfigs) {
            await strategyManager.addNewStrategy(config, [config.timeframe || '1m']);
          }
          
          console.log(`✅ Added ${defaultConfigs.length} default strategies for ${userId} (instant)`);
        }
      }
    }
    
    // Ensure daemon is running (silently start if needed - normal in dev mode)
    if (!tradingDaemon.isActive()) {
      try {
        await tradingDaemon.start();
      } catch (error) {
        console.error('❌ Failed to start daemon:', error);
      }
    }
    
    const encoder = new TextEncoder();
    let isClosed = false;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial loading message
          const initialMessage = {
            isConnected: false,
            currentPrice: 0,
            strategyPerformances: [],
            rsi: 0,
            ema12: 0,
            ema26: 0,
            ema50: 0,
            ema100: 0,
            ema200: 0,
            lastUpdate: Date.now()
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`));
        } catch (error) {
          console.error('Failed to send initial message:', error);
        }
        
        // Create shared WebSocket manager for this user
        const manager = new SharedMultiTimeframeWebSocketManager(
          userId,
          (state) => {
            // Send state updates to client via SSE
            if (!isClosed) {
              try {
                const data = `data: ${JSON.stringify(state)}\n\n`;
                controller.enqueue(encoder.encode(data));
              } catch (error) {
                isClosed = true;
              }
            }
          },
          trading
        );
        
        // Store manager
        activeManagers.set(userId, manager);
        
        try {
          await manager.initialize(timeframe);
          console.log(`✅ [USER ${userId}] SSE stream started`);
        } catch (error: any) {
          console.error(`❌ [USER ${userId}] Initialization failed:`, error);
          if (!isClosed) {
            try {
              const errorData = `data: ${JSON.stringify({ error: error.message })}\n\n`;
              controller.enqueue(encoder.encode(errorData));
            } catch (e) {
              isClosed = true;
            }
          }
        }
      },
      
      cancel() {
        console.log(`🔌 [USER ${userId}] SSE stream closed by client`);
        isClosed = true;
        
        // Cleanup
        const manager = activeManagers.get(userId);
        if (manager) {
          manager.disconnect();
          activeManagers.delete(userId);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  // === ACTIONS ===
  
  if (action === 'stop') {
    const manager = activeManagers.get(userId);
    if (manager) {
      await manager.disconnect();
      activeManagers.delete(userId);
    }
    return Response.json({ success: true });
  }

  if (action === 'resetStrategy') {
    const strategyName = searchParams.get('strategyName');
    if (!strategyName) {
      return Response.json({ error: 'Strategy name is required' }, { status: 400 });
    }

    const manager = activeManagers.get(userId);
    if (manager) {
      const tf = timeframe || '1m';
      const success = await manager.resetStrategy(strategyName, tf);
      
      if (success) {
        return Response.json({ 
          success: true, 
          message: `Strategy "${strategyName}" [${tf}] has been reset` 
        });
      }
    }
    
    return Response.json({ 
      error: `Failed to reset strategy. Manager not found for user: ${userId}` 
    }, { status: 500 });
  }

  if (action === 'stats') {
    // Get global statistics
    const sessionManager = UserSessionManager.getInstance();
    const stats = sessionManager.getStats();
    
    return Response.json({
      success: true,
      stats: {
        activeSessions: stats.totalSessions,
        totalSubscriptions: stats.totalSubscriptions,
        sharedWebSockets: stats.sharedWebSockets,
        activeManagers: activeManagers.size
      }
    });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, strategyName, timeframe, config } = body;

  // Get authenticated user
  const session = await getServerSession(authOptions);
  const userId = session?.user?.email || 'anonymous';
  
  const manager = activeManagers.get(userId);
  if (!manager) {
    return Response.json({ error: `Manager not found for user: ${userId}` }, { status: 404 });
  }

  if (action === 'updateConfig' && strategyName && config) {
    const tf = timeframe || '1m';
    const success = manager.updateStrategyConfig(strategyName, config, tf);
    
    if (success) {
      return Response.json({ 
        success: true, 
        message: `Strategy "${strategyName}" [${tf}] config updated` 
      });
    }
  }

  if (action === 'toggleStrategy' && strategyName) {
    const tf = timeframe || '1m';
    console.log(`🔧 [POST] Toggling strategy: ${strategyName} [${tf}] for user: ${userId}`);
    
    try {
      const success = await manager.toggleStrategy(strategyName, tf);
      
      if (success) {
        return Response.json({ 
          success: true, 
          message: `Strategy "${strategyName}" [${tf}] toggled` 
        });
      } else {
        // Strategy toggle failed, but frontend will still get updated via SSE
        return Response.json({ 
          success: false, 
          message: `Strategy "${strategyName}" [${tf}] toggle failed, but state will refresh` 
        });
      }
    } catch (error: any) {
      console.error(`❌ [POST] Error toggling strategy "${strategyName}":`, error);
      return Response.json({ 
        success: false, 
        message: `Error toggling strategy: ${error.message}` 
      });
    }
  }

  if (action === 'changeTimeframe' && timeframe) {
    const tf = timeframe;
    console.log(`🔄 [POST] Changing timeframe to: ${tf} for user: ${userId}`);
    
    await manager.changePrimaryTimeframe(tf);
    
    return Response.json({ 
      success: true, 
      timeframe: tf 
    });
  }

  if (action === 'resetStrategy' && strategyName) {
    const tf = timeframe || '1m';
    console.log(`🔄 [POST] Resetting strategy: ${strategyName} [${tf}] for user: ${userId}`);
    
    const success = await manager.resetStrategy(strategyName, tf);
    
    if (success) {
      return Response.json({ 
        success: true, 
        message: `Strategy "${strategyName}" [${tf}] has been reset` 
      });
    } else {
      return Response.json({ 
        error: `Failed to reset strategy` 
      }, { status: 500 });
    }
  }

  console.error(`❌ [POST] Unknown action: "${action}" or missing parameters`);
  console.error(`   - strategyName: ${strategyName}`);
  console.error(`   - timeframe: ${timeframe}`);
  console.error(`   - config: ${config ? 'present' : 'missing'}`);
  
  return Response.json({ error: 'Unknown action or missing parameters' }, { status: 400 });
}

