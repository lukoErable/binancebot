import { MultiTimeframeWebSocketManager } from '@/lib/multi-websocket-manager';
import { NextRequest } from 'next/server';

let multiWsManager: MultiTimeframeWebSocketManager | null = null;

export async function GET(request: NextRequest) {
  // Check if client wants SSE (Server-Sent Events)
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const timeframe = searchParams.get('timeframe') || '1m';
  const trading = searchParams.get('trading') === 'true';

  if (action === 'start') {
    // Stop existing connection if any
    if (multiWsManager) {
      console.log('🔄 Stopping existing connections before starting new ones...');
      multiWsManager.disconnect();
      multiWsManager = null;
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Start the Multi-WebSocket connection
    const encoder = new TextEncoder();
    let isClosed = false;
    const stream = new ReadableStream({
      async start(controller) {
        multiWsManager = new MultiTimeframeWebSocketManager((state) => {
          // Send state updates to client via SSE only if stream is open
          if (!isClosed) {
            try {
              const data = `data: ${JSON.stringify(state)}\n\n`;
              controller.enqueue(encoder.encode(data));
            } catch (error) {
              // Stream is closed, mark it
              isClosed = true;
            }
          }
        }, trading);

        try {
          await multiWsManager.initialize(timeframe);
          console.log(`✅ Multi-WebSocket system initialized with primary: ${timeframe}`);
        } catch (error: any) {
          console.error('Failed to initialize multi-WS:', error);
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
        isClosed = true;
        if (multiWsManager) {
          multiWsManager.disconnect();
          multiWsManager = null;
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

  if (action === 'stop') {
    if (multiWsManager) {
      multiWsManager.disconnect();
      multiWsManager = null;
      return Response.json({ success: true, message: 'All WebSockets stopped' });
    }
    return Response.json({ success: false, message: 'No active connection' });
  }

  if (action === 'changeTimeframe') {
    if (multiWsManager) {
      try {
        await multiWsManager.changePrimaryTimeframe(timeframe);
        return Response.json({ success: true, message: `Primary timeframe changed to ${timeframe}` });
      } catch (error) {
        return Response.json({ success: false, error: 'Failed to change timeframe' }, { status: 500 });
      }
    }
    return Response.json({ success: false, message: 'No active connection' }, { status: 400 });
  }

  if (action === 'toggleTrading') {
    if (multiWsManager) {
      try {
        multiWsManager.setTradingMode(trading);
        return Response.json({ success: true, message: `Trading mode set to ${trading} for all timeframes` });
      } catch (error) {
        return Response.json({ success: false, error: 'Failed to toggle trading mode' }, { status: 500 });
      }
    }
    return Response.json({ success: false, message: 'No active connection' }, { status: 400 });
  }

  if (action === 'getStrategies') {
    if (multiWsManager) {
      const performances = multiWsManager.getStrategyPerformances();
      return Response.json({ success: true, strategies: performances });
    }
    return Response.json({ success: false, message: 'No active connection' }, { status: 400 });
  }

  if (action === 'toggleStrategy') {
    const strategyName = searchParams.get('strategyName');
    const timeframeParam = searchParams.get('timeframe');
    if (multiWsManager && strategyName) {
      const newState = await multiWsManager.toggleStrategy(strategyName, timeframeParam || undefined);
      return Response.json({ success: true, isActive: newState });
    }
    return Response.json({ success: false, message: 'No active connection or missing strategy name' }, { status: 400 });
  }

  if (action === 'status') {
    if (multiWsManager) {
      const state = multiWsManager.getState();
      const activeTimeframes = multiWsManager.getActiveTimeframes();
      return Response.json({ connected: true, state, activeTimeframes });
    }
    return Response.json({ connected: false });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, strategyName, timeframe } = body;

    if (action === 'resetStrategy') {
      if (!strategyName) {
        return Response.json({ error: 'Strategy name is required' }, { status: 400 });
      }

      if (!multiWsManager) {
        return Response.json({ error: 'WebSocket manager not initialized' }, { status: 400 });
      }

      const tf = timeframe || '1m'; // Default to 1m if not specified
      console.log(`🔄 Resetting strategy: ${strategyName} [${tf}]`);
      const success = await multiWsManager.resetStrategy(strategyName, tf);

      if (success) {
        return Response.json({ 
          success: true, 
          message: `Strategy "${strategyName}" [${tf}] has been reset successfully` 
        });
      } else {
        return Response.json({ 
          error: `Failed to reset strategy "${strategyName}" [${tf}]` 
        }, { status: 500 });
      }
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/trading:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

