import { pool } from './database';

/**
 * Repository for managing global strategy state (shared across all timeframes)
 * Handles shared timer and activation state
 */
export class GlobalStrategyRepository {
  /**
   * Get global state for a strategy
   */
  static async getGlobalState(strategyName: string): Promise<{
    totalActiveTime: number;
    activatedAt: number | null;
    isGloballyActive: boolean;
  } | null> {
    try {
      const query = `
        SELECT total_active_time, activated_at, is_globally_active
        FROM global_strategy_state
        WHERE strategy_name = $1
      `;
      
      const result = await pool.query(query, [strategyName]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        totalActiveTime: parseInt(row.total_active_time) || 0,
        activatedAt: row.activated_at ? parseInt(row.activated_at) : null,
        isGloballyActive: row.is_globally_active || false
      };
    } catch (error) {
      console.error('❌ Error fetching global strategy state:', error);
      return null;
    }
  }

  /**
   * Update global state when toggling strategy
   */
  static async updateGlobalState(
    strategyName: string,
    isActive: boolean,
    activatedAt: number | null,
    totalActiveTime: number
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO global_strategy_state (strategy_name, is_globally_active, activated_at, total_active_time, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (strategy_name)
        DO UPDATE SET
          is_globally_active = $2,
          activated_at = $3,
          total_active_time = $4,
          updated_at = NOW()
      `;
      
      await pool.query(query, [strategyName, isActive, activatedAt, totalActiveTime]);
      
      console.log(`💾 Global state updated for "${strategyName}": ${isActive ? 'ACTIVE' : 'INACTIVE'}, Time: ${Math.floor(totalActiveTime / 60)}m`);
    } catch (error) {
      console.error('❌ Error updating global strategy state:', error);
    }
  }

  /**
   * Ensure global state exists for a strategy
   */
  static async ensureGlobalStateExists(strategyName: string): Promise<void> {
    try {
      const query = `
        INSERT INTO global_strategy_state (strategy_name, is_globally_active, total_active_time)
        VALUES ($1, false, 0)
        ON CONFLICT (strategy_name) DO NOTHING
      `;
      
      await pool.query(query, [strategyName]);
    } catch (error) {
      console.error('❌ Error ensuring global state exists:', error);
    }
  }

  /**
   * Get all global states
   */
  static async getAllGlobalStates(): Promise<Map<string, {
    totalActiveTime: number;
    activatedAt: number | null;
    isGloballyActive: boolean;
  }>> {
    try {
      const query = `SELECT * FROM global_strategy_state`;
      const result = await pool.query(query);
      
      const statesMap = new Map();
      result.rows.forEach(row => {
        statesMap.set(row.strategy_name, {
          totalActiveTime: parseInt(row.total_active_time) || 0,
          activatedAt: row.activated_at ? parseInt(row.activated_at) : null,
          isGloballyActive: row.is_globally_active || false
        });
      });
      
      return statesMap;
    } catch (error) {
      console.error('❌ Error fetching all global states:', error);
      return new Map();
    }
  }
}

export default GlobalStrategyRepository;

