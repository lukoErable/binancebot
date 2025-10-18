import { CustomStrategyConfig } from '../custom-strategy';
import { db } from './database';

/**
 * Repository for custom user-created strategies
 */

export class CustomStrategyRepository {
  /**
   * Save a custom strategy configuration
   */
  static async saveCustomStrategy(config: CustomStrategyConfig): Promise<void> {
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
      cooldownPeriod: config.cooldownPeriod / (60 * 1000), // Convert to minutes
      simulationMode: config.simulationMode,
      color: config.color || 'fuchsia' // Store color
    });
    
    await db.query(`
      INSERT INTO strategies (name, type, is_active, config)
      VALUES ($1, $2, $3, $4::jsonb)
      ON CONFLICT (name) 
      DO UPDATE SET 
        type = $2,
        config = $4::jsonb,
        updated_at = CURRENT_TIMESTAMP
    `, [config.name, config.strategyType, false, configJson]);
    
    console.log(`✅ Custom strategy "${config.name}" saved to database`);
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
        profitTargetPercent: config.profitTargetPercent || 2.0,
        stopLossPercent: config.stopLossPercent || 1.5,
        maxPositionTime: (config.maxPositionTime || 60) * 60 * 1000, // Convert from minutes
        positionSize: config.positionSize || 0.05,
        cooldownPeriod: (config.cooldownPeriod || 5) * 60 * 1000, // Convert from minutes
        simulationMode: config.simulationMode !== false,
        isActive: row.is_active !== false, // Get active state from DB
        color: config.color || 'fuchsia' // Get color from DB
      };
    } catch (error) {
      console.error(`Failed to parse custom strategy config for ${name}:`, error);
      return null;
    }
  }
  
  /**
   * Get all custom strategies
   */
  static async getAllCustomStrategies(): Promise<CustomStrategyConfig[]> {
    const result = await db.query('SELECT * FROM strategies WHERE type = $1', ['CUSTOM']);
    
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
          profitTargetPercent: config.profitTargetPercent || 2.0,
          stopLossPercent: config.stopLossPercent || 1.5,
          maxPositionTime: (config.maxPositionTime || 60) * 60 * 1000,
          positionSize: config.positionSize || 0.05,
          cooldownPeriod: (config.cooldownPeriod || 5) * 60 * 1000,
          simulationMode: config.simulationMode !== false,
          isActive: row.is_active !== false, // Get active state from DB
          color: config.color || 'fuchsia' // Get color from DB
        });
      } catch (error) {
        console.error(`Failed to parse strategy ${row.name}:`, error);
      }
    }
    
    return strategies;
  }
  
  /**
   * Delete a custom strategy
   */
  static async deleteCustomStrategy(name: string): Promise<void> {
    await db.query('DELETE FROM strategies WHERE name = $1 AND type = $2', [name, 'CUSTOM']);
    
    console.log(`✅ Custom strategy "${name}" deleted from database`);
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

