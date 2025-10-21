import { CustomStrategyConfig } from '../custom-strategy';
import { db } from './database';

/**
 * Repository for custom user-created strategies
 */

export class CustomStrategyRepository {
  // Cache to avoid reloading strategies on every call
  private static cache: CustomStrategyConfig[] | null = null;
  private static cacheTimestamp: number = 0;
  private static CACHE_TTL = 30000; // 30 seconds cache
  /**
   * Save a custom strategy configuration
   */
  static async saveCustomStrategy(config: CustomStrategyConfig, userId: number = 1): Promise<void> {
    // Serialize the entire config as JSON
    const configJson = JSON.stringify({
      description: config.description,
      longNotes: config.longNotes,
      shortNotes: config.shortNotes,
      strategyLogic: config.strategyLogic,
      longEntryConditions: config.longEntryConditions,
      shortEntryConditions: config.shortEntryConditions,
      longExitConditions: config.longExitConditions,
      shortExitConditions: config.shortExitConditions,
      profitTargetPercent: config.profitTargetPercent,
      stopLossPercent: config.stopLossPercent,
      maxPositionTime: config.maxPositionTime / (60 * 1000), // Convert to minutes
      positionSize: config.positionSize,
      cooldownPeriod: config.cooldownPeriod > 0 ? config.cooldownPeriod / (60 * 1000) : 0, // Convert to minutes, 0 stays 0
      simulationMode: config.simulationMode,
      color: config.color || 'fuchsia' // Store color
    });
    
    const timeframe = config.timeframe || '1m';
    
    await db.query(`
      INSERT INTO strategies (user_id, name, type, is_active, config, timeframe, activated_at, total_active_time, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, name, timeframe) 
      DO UPDATE SET 
        type = $3,
        config = $5::jsonb,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, config.name, config.strategyType, false, configJson, timeframe]);
    
    // Clear cache after saving
    this.clearCache();
    
    console.log(`✅ Custom strategy "${config.name}" [${timeframe}] saved to database (activated_at=NULL, total_active_time=0)`);
  }
  
  /**
   * Load a custom strategy configuration
   */
  static async loadCustomStrategy(name: string): Promise<CustomStrategyConfig | null> {
    const result = await db.query('SELECT * FROM strategies WHERE name = $1', [name]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    
    try {
      const config = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
      
      // Validate that we have the required fields
      if (!config.longEntryConditions || !config.shortEntryConditions) {
        console.error(`Invalid strategy config for ${name}: missing entry conditions`);
        return null;
      }
      
      return {
        name: row.name,
        strategyType: row.type,
        description: config.description,
        longNotes: config.longNotes,
        shortNotes: config.shortNotes,
        strategyLogic: config.strategyLogic,
        longEntryConditions: config.longEntryConditions,
        shortEntryConditions: config.shortEntryConditions,
        longExitConditions: config.longExitConditions,
        shortExitConditions: config.shortExitConditions,
        profitTargetPercent: config.profitTargetPercent ?? 2.0,
        stopLossPercent: config.stopLossPercent ?? 1.5,
        maxPositionTime: (config.maxPositionTime ?? 60) * 60 * 1000, // Convert from minutes, null stays null
        positionSize: config.positionSize || 0.05,
        cooldownPeriod: config.cooldownPeriod !== null && config.cooldownPeriod !== undefined ? config.cooldownPeriod * 60 * 1000 : 0, // Convert from minutes, null/undefined = 0 (no cooldown)
        simulationMode: config.simulationMode !== false,
        isActive: row.is_active !== false, // Get active state from DB
        color: config.color || 'fuchsia', // Get color from DB
        timeframe: row.timeframe || '1m' // Get timeframe from DB
      };
    } catch (error) {
      console.error(`Failed to parse custom strategy config for ${name}:`, error);
      return null;
    }
  }
  
  /**
   * Get all custom strategies (with caching)
   */
  static async getAllCustomStrategies(useCache: boolean = true, userId: number = 1): Promise<CustomStrategyConfig[]> {
    // Check cache first
    const now = Date.now();
    if (useCache && this.cache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      console.log(`📦 Using cached strategies (${this.cache.length} strategies, age: ${Math.floor((now - this.cacheTimestamp) / 1000)}s)`);
      return this.cache;
    }
    
    const result = await db.query('SELECT * FROM strategies WHERE type = $1 AND user_id = $2', ['CUSTOM', userId]);
    
    const strategies: CustomStrategyConfig[] = [];
    
    for (const row of result.rows) {
      try {
        const config = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
        
        // Validate that we have the required fields
        if (!config.longEntryConditions || !config.shortEntryConditions) {
          console.error(`Invalid strategy config for ${row.name}: missing entry conditions`);
          continue;
        }
        
        strategies.push({
          name: row.name,
          strategyType: row.type,
          description: config.description,
          longNotes: config.longNotes,
          shortNotes: config.shortNotes,
          strategyLogic: config.strategyLogic,
          longEntryConditions: config.longEntryConditions,
          shortEntryConditions: config.shortEntryConditions,
          longExitConditions: config.longExitConditions,
          shortExitConditions: config.shortExitConditions,
          profitTargetPercent: config.profitTargetPercent ?? 2.0,
          stopLossPercent: config.stopLossPercent ?? 1.5,
          maxPositionTime: (config.maxPositionTime ?? 60) * 60 * 1000, // Convert from minutes
          positionSize: config.positionSize || 0.05,
          cooldownPeriod: config.cooldownPeriod !== null && config.cooldownPeriod !== undefined ? config.cooldownPeriod * 60 * 1000 : 0, // Convert from minutes, null/undefined = 0 (no cooldown)
          simulationMode: config.simulationMode !== false,
          isActive: row.is_active !== false, // Get active state from DB
          color: config.color || 'fuchsia', // Get color from DB
          timeframe: row.timeframe || '1m' // Get timeframe from DB
        });
      } catch (error) {
        console.error(`Failed to parse strategy ${row.name}:`, error);
      }
    }
    
    // Update cache
    this.cache = strategies;
    this.cacheTimestamp = Date.now();
    
    return strategies;
  }
  
  /**
   * Clear cache (call this after creating/updating/deleting a strategy)
   */
  static clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
  
  /**
   * Delete a custom strategy (for a specific timeframe)
   */
  static async deleteCustomStrategy(name: string, timeframe: string = '1m'): Promise<void> {
    await db.query('DELETE FROM strategies WHERE name = $1 AND type = $2 AND timeframe = $3', [name, 'CUSTOM', timeframe]);
    
    // Clear cache after deletion
    this.clearCache();
    
    console.log(`✅ Custom strategy "${name}" [${timeframe}] deleted from database`);
  }
  
  /**
   * Check if a strategy name already exists
   */
  static async strategyExists(name: string): Promise<boolean> {
    const result = await db.query('SELECT COUNT(*) as count FROM strategies WHERE name = $1', [name]);
    const count = parseInt(result.rows[0].count);
    return count > 0;
  }
}

export default CustomStrategyRepository;

