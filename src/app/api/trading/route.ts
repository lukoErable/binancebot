import { BinanceWebSocketManager } from '@/lib/websocket-manager';
import { NextRequest } from 'next/server';

let wsManager: BinanceWebSocketManager | null = null;

export async function GET(request: NextRequest) {
  // Check if client wants SSE (Server-Sent Events)
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const timeframe = searchParams.get('timeframe') || '1m';
  const trading = searchParams.get('trading') === 'true';

  if (action === 'start') {
    // Stop existing connection if any
    if (wsManager) {
      console.log('🔄 Stopping existing connection before starting new one...');
      wsManager.disconnect();
      wsManager = null;
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Start the WebSocket connection
    const encoder = new TextEncoder();
    let isClosed = false;
    const stream = new ReadableStream({
      start(controller) {
        wsManager = new BinanceWebSocketManager((state) => {
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
        }, timeframe, trading);

        wsManager.connect().catch((error) => {
          console.error('Failed to connect:', error);
          if (!isClosed) {
            try {
              const errorData = `data: ${JSON.stringify({ error: error.message })}\n\n`;
              controller.enqueue(encoder.encode(errorData));
            } catch (e) {
              isClosed = true;
            }
          }
        });
      },
      cancel() {
        isClosed = true;
        if (wsManager) {
          wsManager.disconnect();
          wsManager = null;
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
    if (wsManager) {
      wsManager.disconnect();
      wsManager = null;
      return Response.json({ success: true, message: 'WebSocket stopped' });
    }
    return Response.json({ success: false, message: 'No active connection' });
  }

  if (action === 'changeTimeframe') {
    if (wsManager) {
      try {
        await wsManager.changeTimeframe(timeframe);
        return Response.json({ success: true, message: `Timeframe changed to ${timeframe}` });
      } catch (error) {
        return Response.json({ success: false, error: 'Failed to change timeframe' }, { status: 500 });
      }
    }
    return Response.json({ success: false, message: 'No active connection' }, { status: 400 });
  }

  if (action === 'toggleTrading') {
    if (wsManager) {
      try {
        wsManager.setTradingMode(trading);
        return Response.json({ success: true, message: `Trading mode set to ${trading}` });
      } catch (error) {
        return Response.json({ success: false, error: 'Failed to toggle trading mode' }, { status: 500 });
      }
    }
    return Response.json({ success: false, message: 'No active connection' }, { status: 400 });
  }

  if (action === 'getStrategies') {
    if (wsManager) {
      const performances = wsManager.getStrategyPerformances();
      return Response.json({ success: true, strategies: performances });
    }
    return Response.json({ success: false, message: 'No active connection' }, { status: 400 });
  }

  if (action === 'toggleStrategy') {
    const strategyName = searchParams.get('strategyName');
    if (wsManager && strategyName) {
      const newState = wsManager.toggleStrategy(strategyName);
      return Response.json({ success: true, isActive: newState });
    }
    return Response.json({ success: false, message: 'No active connection or missing strategy name' }, { status: 400 });
  }

  if (action === 'status') {
    if (wsManager) {
      const state = wsManager.getState();
      return Response.json({ connected: true, state });
    }
    return Response.json({ connected: false });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, strategyName } = body;

    if (action === 'resetStrategy') {
      if (!strategyName) {
        return Response.json({ error: 'Strategy name is required' }, { status: 400 });
      }

      if (!wsManager) {
        return Response.json({ error: 'WebSocket manager not initialized' }, { status: 400 });
      }

      console.log(`🔄 Resetting strategy: ${strategyName}`);
      const success = await wsManager.resetStrategy(strategyName);

      if (success) {
        return Response.json({ 
          success: true, 
          message: `Strategy "${strategyName}" has been reset successfully` 
        });
      } else {
        return Response.json({ 
          error: `Failed to reset strategy "${strategyName}"` 
        }, { status: 500 });
      }
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/trading:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

