import { StrategyPerformance } from '@/types/trading';
import { pool } from './database';

export class StrategyRepository {
  // Cache to avoid reloading strategies on every call
  private static cache: Record<string, unknown>[] | null = null;
  private static cacheTimestamp: number = 0;
  private static CACHE_TTL = 30000; // 30 seconds cache
  /**
   * Ensure a strategy row exists in DB; if missing, create it
   */
  static async ensureStrategyExists(
    name: string,
    type: string,
    isActive: boolean = false,
    config?: { profitTargetPercent?: number; stopLossPercent?: number; maxPositionTime?: number },
    timeframe: string = '1m'
  ): Promise<void> {
    try {
      const checkQuery = `SELECT 1 FROM strategies WHERE name = $1 AND timeframe = $2 LIMIT 1`;
      const exists = await pool.query(checkQuery, [name, timeframe]);
      if (exists.rowCount && exists.rowCount > 0) return;

      const insertQuery = `
        INSERT INTO strategies (name, type, is_active, config, timeframe, activated_at, total_active_time, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      // Initialize activated_at to NULL and total_active_time to 0
      const activatedAt = null;
      const totalActiveTime = 0;
      
      await pool.query(insertQuery, [name, type, isActive, JSON.stringify(config || {}), timeframe, activatedAt, totalActiveTime]);
      console.log(`✅ Strategy created in DB: ${name} [${timeframe}] (${type}) - initialized with activated_at=NULL, total_active_time=0`);
    } catch (error) {
      console.error('❌ Error ensuring strategy exists:', error);
    }
  }
  /**
   * Save strategy performance snapshot
   */
  static async savePerformance(performance: StrategyPerformance): Promise<void> {
    try {
      const query = `
        INSERT INTO strategy_performances (
          strategy_name, strategy_type,
          total_pnl, total_trades, winning_trades, win_rate, current_capital,
          current_position_type, current_position_entry_price, 
          current_position_quantity, current_position_pnl
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      const values = [
        performance.strategyName,
        performance.strategyType,
        performance.totalPnL,
        performance.totalTrades,
        performance.winningTrades,
        performance.winRate,
        performance.currentCapital,
        performance.currentPosition.type,
        performance.currentPosition.entryPrice,
        performance.currentPosition.quantity,
        performance.currentPosition.unrealizedPnL
      ];

      await pool.query(query, values);
    } catch (error) {
      console.error('❌ Error saving performance:', error);
    }
  }

  /**
   * Get latest performance snapshot for a strategy
   */
  static async getLatestPerformance(strategyName: string): Promise<Record<string, unknown> | null> {
    try {
      const query = `
        SELECT * FROM strategy_performances
        WHERE strategy_name = $1
        ORDER BY snapshot_time DESC
        LIMIT 1
      `;
      
      const result = await pool.query(query, [strategyName]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error fetching performance:', error);
      return null;
    }
  }

  /**
   * Get performance history for a strategy
   */
  static async getPerformanceHistory(
    strategyName: string,
    limit: number = 100
  ): Promise<Record<string, unknown>[]> {
    try {
      const query = `
        SELECT * FROM strategy_performances
        WHERE strategy_name = $1
        ORDER BY snapshot_time DESC
        LIMIT $2
      `;
      
      const result = await pool.query(query, [strategyName, limit]);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching performance history:', error);
      return [];
    }
  }

  /**
   * Update strategy active status and track cumulative activation time
   */
  static async updateStrategyStatusWithTime(
    strategyName: string,
    isActive: boolean,
    activatedAt: number | null,
    totalActiveTime: number,
    timeframe: string = '1m'
  ): Promise<void> {
    try {
      const query = `
        UPDATE strategies
        SET is_active = $1, 
            activated_at = $2,
            total_active_time = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE name = $4 AND timeframe = $5
      `;
      
      // Convert timestamp to SQL timestamp or NULL
      const activatedAtSQL = activatedAt ? new Date(activatedAt).toISOString() : null;
      
      await pool.query(query, [isActive, activatedAtSQL, totalActiveTime, strategyName, timeframe]);
      
      // Clear cache after status update
      this.clearCache();
      
      console.log(`✅ Strategy "${strategyName}" [${timeframe}] status updated: ${isActive ? 'ACTIVE' : 'PAUSED'} (total runtime: ${Math.floor(totalActiveTime / 60)}m)`);
    } catch (error) {
      console.error('❌ Error updating strategy status with time:', error);
    }
  }
  
  /**
   * Update strategy active status (legacy method - kept for compatibility)
   */
  static async updateStrategyStatus(
    strategyName: string,
    isActive: boolean
  ): Promise<void> {
    // Call new method with default values
    await this.updateStrategyStatusWithTime(strategyName, isActive, isActive ? Date.now() : null, 0);
  }

  /**
   * Get all strategies from database (with caching)
   */
  static async getAllStrategies(useCache: boolean = true): Promise<Record<string, unknown>[]> {
    try {
      // Check cache first
      const now = Date.now();
      if (useCache && this.cache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
        console.log(`📦 Using cached strategy states (${this.cache.length} strategies, age: ${Math.floor((now - this.cacheTimestamp) / 1000)}s)`);
        return this.cache;
      }
      
      const query = `SELECT * FROM strategies ORDER BY name`;
      const result = await pool.query(query);
      
      // Update cache
      this.cache = result.rows;
      this.cacheTimestamp = Date.now();
      
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching strategies:', error);
      return [];
    }
  }
  
  /**
   * Clear cache (call this after updating strategy status/config)
   */
  static clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Update strategy configuration (TP, SL, Max Position Time)
   */
  static async updateStrategyConfig(
    strategyName: string,
    config: {
      profitTarget?: number;
      stopLoss?: number;
      maxPositionTime?: number;
      cooldownPeriod?: number | null;
    },
    timeframe: string = '1m'
  ): Promise<void> {
    try {
      // Get current config
      const currentQuery = `SELECT config FROM strategies WHERE name = $1 AND timeframe = $2`;
      const currentResult = await pool.query(currentQuery, [strategyName, timeframe]);
      const currentConfig = currentResult.rows[0]?.config || {};

      // Merge with new config (null = désactivé)
      const updatedConfig = {
        ...currentConfig,
        profitTargetPercent: config.profitTarget !== undefined ? config.profitTarget : currentConfig.profitTargetPercent,
        stopLossPercent: config.stopLoss !== undefined ? config.stopLoss : currentConfig.stopLossPercent,
        maxPositionTime: config.maxPositionTime !== undefined ? config.maxPositionTime : currentConfig.maxPositionTime,
        cooldownPeriod: config.cooldownPeriod !== undefined ? config.cooldownPeriod : currentConfig.cooldownPeriod
      };

      // Update in database
      const updateQuery = `
        UPDATE strategies
        SET config = $1, updated_at = CURRENT_TIMESTAMP
        WHERE name = $2 AND timeframe = $3
      `;
      
      await pool.query(updateQuery, [JSON.stringify(updatedConfig), strategyName, timeframe]);
      
      // Clear cache after config update
      this.clearCache();
      
      console.log(`✅ Strategy "${strategyName}" [${timeframe}] config updated:`, config);
    } catch (error) {
      console.error('❌ Error updating strategy config:', error);
      throw error;
    }
  }
}

export default StrategyRepository;