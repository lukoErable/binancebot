/**
 * Initialize StrategyManager at server startup
 * This ensures strategies are loaded before any user connects
 */
import { StrategyManager } from './strategy-manager';

let isInitialized = false;

export async function initStrategyManager(): Promise<void> {
  if (isInitialized) {
    console.log('📦 StrategyManager already initialized');
    return;
  }

  try {
    console.log('🚀 Initializing StrategyManager at server startup...');
    
    // Create singleton if it doesn't exist
    let manager = StrategyManager.getGlobalInstance();
    
    if (!manager) {
      manager = new StrategyManager();
      // Wait for strategies to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      manager = StrategyManager.getGlobalInstance();
    }
    
    if (manager) {
      const performances = manager.getAllPerformances();
      console.log(`✅ StrategyManager initialized with ${performances.length} strategies`);
      isInitialized = true;
    } else {
      console.error('❌ Failed to initialize StrategyManager');
    }
  } catch (error) {
    console.error('❌ Error initializing StrategyManager:', error);
  }
}

// Auto-initialize when imported
initStrategyManager();

