import { NextResponse } from 'next/server';

/**
 * Force reload strategies from database
 * Clears all caches and reloads data
 */
export async function POST() {
  try {
    console.log('🔄 Force reloading strategies...');
    
    // Clear caches
    const { StrategyRepository } = await import('@/lib/db/strategy-repository');
    const { CustomStrategyRepository } = await import('@/lib/db/custom-strategy-repository');
    
    StrategyRepository.clearCache();
    CustomStrategyRepository.clearCache();
    console.log('✅ Caches cleared');
    
    // Reload StrategyManager
    const { StrategyManager } = await import('@/lib/strategy-manager');
    const strategyManager = StrategyManager.getGlobalInstance();
    
    if (strategyManager) {
      await strategyManager.reloadAllData();
      console.log('✅ StrategyManager reloaded');
      
      return NextResponse.json({
        success: true,
        message: 'Strategies reloaded successfully',
        strategiesCount: strategyManager.getAllPerformances().length
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'StrategyManager not found'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Error reloading strategies:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  // Also support GET for easy browser testing
  return POST();
}

