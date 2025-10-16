import { StrategyPerformance } from '@/types/trading';
import { pool } from './database';

export class StrategyRepository {
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
   * Update strategy active status
   */
  static async updateStrategyStatus(
    strategyName: string,
    isActive: boolean
  ): Promise<void> {
    try {
      const query = `
        UPDATE strategies
        SET is_active = $1, updated_at = CURRENT_TIMESTAMP
        WHERE name = $2
      `;
      
      await pool.query(query, [isActive, strategyName]);
      console.log(`✅ Strategy "${strategyName}" status updated: ${isActive ? 'ON' : 'OFF'}`);
    } catch (error) {
      console.error('❌ Error updating strategy status:', error);
    }
  }

  /**
   * Get all strategies from database
   */
  static async getAllStrategies(): Promise<Record<string, unknown>[]> {
    try {
      const query = `SELECT * FROM strategies ORDER BY name`;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching strategies:', error);
      return [];
    }
  }
}

export default StrategyRepository;

