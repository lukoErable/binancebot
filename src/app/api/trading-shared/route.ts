import SharedMultiTimeframeWebSocketManager from '@/lib/shared-multi-websocket-manager';
import UserSessionManager from '@/lib/user-session-manager';
import { NextRequest } from 'next/server';
// Initialize Trading Daemon (24/7 background trading)
import { tradingDaemon } from '@/lib/trading-daemon';

// Map to track active user managers
const activeManagers = new Map<string, SharedMultiTimeframeWebSocketManager>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const timeframe = searchParams.get('timeframe') || '1m';
  const trading = searchParams.get('trading') === 'true';

  // Generate unique user ID from request (IP + timestamp)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'localhost';
  const userId = `${ip}_${Date.now()}`;

  // === SSE STREAMING ===
  if (action === 'start') {
    // Ensure daemon is running
    if (!tradingDaemon.isActive()) {
      console.log('⚠️  Trading Daemon not running, starting now...');
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
    // Find user's manager (approximate match by IP)
    let foundUserId: string | null = null;
    for (const [uid, _] of activeManagers) {
      if (uid.startsWith(ip)) {
        foundUserId = uid;
        break;
      }
    }
    
    if (foundUserId) {
      const manager = activeManagers.get(foundUserId);
      if (manager) {
        await manager.disconnect();
        activeManagers.delete(foundUserId);
      }
    }
    
    return Response.json({ success: true });
  }

  if (action === 'changeTimeframe') {
    const newTimeframe = searchParams.get('timeframe') || '1m';
    
    // Find user's manager
    let foundUserId: string | null = null;
    for (const [uid, _] of activeManagers) {
      if (uid.startsWith(ip)) {
        foundUserId = uid;
        break;
      }
    }
    
    if (foundUserId) {
      const manager = activeManagers.get(foundUserId);
      if (manager) {
        await manager.changePrimaryTimeframe(newTimeframe);
        return Response.json({ success: true, timeframe: newTimeframe });
      }
    }
    
    return Response.json({ error: 'Manager not found' }, { status: 404 });
  }

  if (action === 'toggleStrategy') {
    const strategyName = searchParams.get('strategyName');
    if (!strategyName) {
      return Response.json({ error: 'Strategy name is required' }, { status: 400 });
    }

    // Find user's manager
    let foundUserId: string | null = null;
    for (const [uid, _] of activeManagers) {
      if (uid.startsWith(ip)) {
        foundUserId = uid;
        break;
      }
    }
    
    if (foundUserId) {
      const manager = activeManagers.get(foundUserId);
      if (manager) {
        const tf = timeframe || '1m';
        const success = await manager.toggleStrategy(strategyName, tf);
        
        if (success) {
          return Response.json({ 
            success: true, 
            message: `Strategy "${strategyName}" [${tf}] toggled` 
          });
        }
      }
    }
    
    return Response.json({ 
      error: `Failed to toggle strategy` 
    }, { status: 500 });
  }

  if (action === 'resetStrategy') {
    const strategyName = searchParams.get('strategyName');
    if (!strategyName) {
      return Response.json({ error: 'Strategy name is required' }, { status: 400 });
    }

    // Find user's manager
    let foundUserId: string | null = null;
    for (const [uid, _] of activeManagers) {
      if (uid.startsWith(ip)) {
        foundUserId = uid;
        break;
      }
    }
    
    if (foundUserId) {
      const manager = activeManagers.get(foundUserId);
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
    }
    
    return Response.json({ 
      error: `Failed to reset strategy` 
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

  // Get user IP for manager lookup
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'localhost';
  
  // Find user's manager
  let foundUserId: string | null = null;
  for (const [uid, _] of activeManagers) {
    if (uid.startsWith(ip)) {
      foundUserId = uid;
      break;
    }
  }
  
  if (!foundUserId) {
    return Response.json({ error: 'No active session found' }, { status: 404 });
  }
  
  const manager = activeManagers.get(foundUserId);
  if (!manager) {
    return Response.json({ error: 'Manager not found' }, { status: 404 });
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

  return Response.json({ error: 'Unknown action or missing parameters' }, { status: 400 });
}

