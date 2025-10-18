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

// DELETE - Delete a custom strategy
export async function DELETE(request: Request) {
  try {
    const { name } = await request.json();
    
    await CustomStrategyRepository.deleteCustomStrategy(name);
    
    return NextResponse.json({ 
      success: true,
      message: `Strategy "${name}" deleted successfully`
    });
  } catch (error: any) {
    console.error('Error deleting custom strategy:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

