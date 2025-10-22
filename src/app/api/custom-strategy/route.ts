import CustomStrategyRepository from '@/lib/db/custom-strategy-repository';
import { NextResponse } from 'next/server';

/**
 * API routes for custom strategy management
 */

// GET - Get all custom strategies
export async function GET() {
  try {
    const strategies = await CustomStrategyRepository.getAllCustomStrategies();
    
    return NextResponse.json({ 
      success: true,
      strategies 
    });
  } catch (error: any) {
    console.error('Error fetching custom strategies:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

// POST - Create a new custom strategy
export async function POST(request: Request) {
  try {
    const config = await request.json();
    
    // Check if strategy name already exists
    const exists = await CustomStrategyRepository.strategyExists(config.name);
    if (exists) {
      return NextResponse.json({
        success: false,
        error: 'A strategy with this name already exists'
      }, { status: 400 });
    }
    
    await CustomStrategyRepository.saveCustomStrategy(config);
    
    return NextResponse.json({ 
      success: true,
      message: `Strategy "${config.name}" created successfully`
    });
  } catch (error: any) {
    console.error('Error creating custom strategy:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

// PUT - Update an existing custom strategy
export async function PUT(request: Request) {
  try {
    const config = await request.json();
    
    await CustomStrategyRepository.saveCustomStrategy(config);
    
    return NextResponse.json({ 
      success: true,
      message: `Strategy "${config.name}" updated successfully`
    });
  } catch (error: any) {
    console.error('Error updating custom strategy:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

// DELETE - Delete a custom strategy (for a specific timeframe)
export async function DELETE(request: Request) {
  try {
    const { name, timeframe } = await request.json();
    const tf = timeframe || '1m'; // Default to 1m if not specified
    
    console.log(`🗑️ Deleting strategy "${name}" [${tf}] completely...`);
    
    // 1. Delete strategy configuration
    await CustomStrategyRepository.deleteCustomStrategy(name, tf);
    
    // 2. Delete ALL related data for this strategy+timeframe
    const { pool } = await import('@/lib/db/database');
    
    // Delete completed trades for this strategy+timeframe
    const tradesResult = await pool.query(
      'DELETE FROM completed_trades WHERE strategy_name = $1 AND timeframe = $2', 
      [name, tf]
    );
    console.log(`🗑️ Deleted ${tradesResult.rowCount} completed trades for "${name}" [${tf}]`);
    
    // Delete open positions for this strategy+timeframe
    const positionsResult = await pool.query(
      'DELETE FROM open_positions WHERE strategy_name = $1 AND timeframe = $2', 
      [name, tf]
    );
    console.log(`🗑️ Deleted ${positionsResult.rowCount} open positions for "${name}" [${tf}]`);
    
    // 3. IMPORTANT: Remove strategy from StrategyManager in memory
    const { StrategyManager } = await import('@/lib/strategy-manager');
    const strategyManager = StrategyManager.getGlobalInstance();
    
    if (strategyManager) {
      // Remove strategy from StrategyManager
      const key = `${name}:${tf}`;
      const strategyData = (strategyManager as any).strategies?.get(key);
      
      if (strategyData) {
        (strategyManager as any).strategies.delete(key);
        console.log(`🗑️ Removed strategy "${name}" [${tf}] from StrategyManager`);
        
        // Force SSE update by triggering a state refresh
        // This will be handled by the SSE manager automatically
        console.log('📡 StrategyManager updated - SSE will refresh frontend');
      }
    }
    
    console.log(`✅ Strategy "${name}" [${tf}] completely deleted (config + trades + positions + memory)`);
    
    return NextResponse.json({ 
      success: true,
      message: `Strategy "${name}" [${tf}] deleted completely`
    });
  } catch (error: any) {
    console.error('Error deleting custom strategy:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

