import { Position } from '@/types/trading';
import { pool } from './database';

class OpenPositionRepository {
  /**
   * Save or update an open position for a strategy
   */
  static async saveOpenPosition(
    strategyName: string,
    position: Position
  ): Promise<void> {
    if (position.type === 'NONE') {
      // If position is NONE, delete any existing open position
      await this.deleteOpenPosition(strategyName);
      return;
    }

    try {
      const query = `
        INSERT INTO open_positions (
          strategy_name, position_type, entry_price, entry_time, 
          quantity, unrealized_pnl, unrealized_pnl_percent, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (strategy_name)
        DO UPDATE SET
          position_type = $2,
          entry_price = $3,
          entry_time = $4,
          quantity = $5,
          unrealized_pnl = $6,
          unrealized_pnl_percent = $7,
          updated_at = CURRENT_TIMESTAMP
      `;

      await pool.query(query, [
        strategyName,
        position.type,
        position.entryPrice,
        position.entryTime,
        position.quantity,
        position.unrealizedPnL || 0,
        position.unrealizedPnLPercent || 0
      ]);

      console.log(`💾 Saved open ${position.type} position for "${strategyName}" @ ${position.entryPrice.toFixed(2)}`);
    } catch (error) {
      console.error(`❌ Error saving open position for "${strategyName}":`, error);
      throw error;
    }
  }

  /**
   * Get open position for a strategy
   */
  static async getOpenPosition(strategyName: string): Promise<Position | null> {
    try {
      const query = `
        SELECT * FROM open_positions
        WHERE strategy_name = $1
      `;

      const result = await pool.query(query, [strategyName]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        type: row.position_type as 'LONG' | 'SHORT',
        entryPrice: parseFloat(row.entry_price),
        entryTime: parseInt(row.entry_time),
        quantity: parseFloat(row.quantity),
        unrealizedPnL: parseFloat(row.unrealized_pnl) || 0,
        unrealizedPnLPercent: parseFloat(row.unrealized_pnl_percent) || 0
      };
    } catch (error) {
      console.error(`❌ Error getting open position for "${strategyName}":`, error);
      return null;
    }
  }

  /**
   * Delete open position for a strategy
   */
  static async deleteOpenPosition(strategyName: string): Promise<void> {
    try {
      const query = `DELETE FROM open_positions WHERE strategy_name = $1`;
      await pool.query(query, [strategyName]);
      console.log(`🗑️ Deleted open position for "${strategyName}"`);
    } catch (error) {
      console.error(`❌ Error deleting open position for "${strategyName}":`, error);
      throw error;
    }
  }

  /**
   * Get all open positions
   */
  static async getAllOpenPositions(): Promise<Map<string, Position>> {
    try {
      const query = `SELECT * FROM open_positions`;
      const result = await pool.query(query);

      const positions = new Map<string, Position>();
      
      result.rows.forEach(row => {
        positions.set(row.strategy_name, {
          type: row.position_type as 'LONG' | 'SHORT',
          entryPrice: parseFloat(row.entry_price),
          entryTime: parseInt(row.entry_time),
          quantity: parseFloat(row.quantity),
          unrealizedPnL: parseFloat(row.unrealized_pnl) || 0,
          unrealizedPnLPercent: parseFloat(row.unrealized_pnl_percent) || 0
        });
      });

      return positions;
    } catch (error) {
      console.error('❌ Error getting all open positions:', error);
      return new Map();
    }
  }

  /**
   * Delete all open positions for a strategy (used during reset)
   */
  static async deleteStrategyPositions(strategyName: string): Promise<void> {
    await this.deleteOpenPosition(strategyName);
  }
}

export default OpenPositionRepository;

