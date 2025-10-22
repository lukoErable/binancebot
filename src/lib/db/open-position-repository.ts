import { Position } from '@/types/trading';
import { pool } from './database';

class OpenPositionRepository {
  /**
   * Save or update an open position for a strategy
   */
  static async saveOpenPosition(
    strategyName: string,
    position: Position,
    timeframe: string = '1m',
    userEmail: string = 'system@trading.bot'
  ): Promise<void> {
    if (position.type === 'NONE') {
      // If position is NONE, delete any existing open position
      await this.deleteOpenPosition(strategyName, timeframe, userEmail);
      return;
    }

    try {
      const query = `
        INSERT INTO open_positions (
          user_email, strategy_name, position_type, entry_price, entry_time, 
          quantity, unrealized_pnl, unrealized_pnl_percent, timeframe, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        ON CONFLICT (user_email, strategy_name, timeframe)
        DO UPDATE SET
          position_type = $3,
          entry_price = $4,
          entry_time = $5,
          quantity = $6,
          unrealized_pnl = $7,
          unrealized_pnl_percent = $8,
          updated_at = CURRENT_TIMESTAMP
      `;

      await pool.query(query, [
        userEmail,
        strategyName,
        position.type,
        position.entryPrice,
        position.entryTime,
        position.quantity,
        position.unrealizedPnL || 0,
        position.unrealizedPnLPercent || 0,
        timeframe
      ]);

      console.log(`💾 Saved open ${position.type} position for "${strategyName}" [${timeframe}] @ ${position.entryPrice.toFixed(2)}`);
    } catch (error) {
      console.error(`❌ Error saving open position for "${strategyName}" [${timeframe}]:`, error);
      throw error;
    }
  }

  /**
   * Get open position for a strategy on a specific timeframe
   */
  static async getOpenPosition(strategyName: string, timeframe: string = '1m', userEmail: string = 'system@trading.bot'): Promise<Position | null> {
    try {
      const query = `
        SELECT * FROM open_positions
        WHERE strategy_name = $1 AND timeframe = $2 AND user_email = $3
      `;

      const result = await pool.query(query, [strategyName, timeframe, userEmail]);

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
      console.error(`❌ Error getting open position for "${strategyName}" [${timeframe}]:`, error);
      return null;
    }
  }

  /**
   * Delete open position for a strategy on a specific timeframe
   */
  static async deleteOpenPosition(strategyName: string, timeframe: string = '1m', userEmail: string = 'system@trading.bot'): Promise<void> {
    try {
      const query = `DELETE FROM open_positions WHERE strategy_name = $1 AND timeframe = $2 AND user_email = $3`;
      await pool.query(query, [strategyName, timeframe, userEmail]);
      console.log(`🗑️ Deleted open position for "${strategyName}" [${timeframe}]`);
    } catch (error) {
      console.error(`❌ Error deleting open position for "${strategyName}" [${timeframe}]:`, error);
      throw error;
    }
  }

  /**
   * Get all open positions (key format: "strategyName:timeframe")
   */
  static async getAllOpenPositions(userEmail: string = 'system@trading.bot'): Promise<Map<string, Position>> {
    try {
      const query = `SELECT * FROM open_positions WHERE user_email = $1`;
      const result = await pool.query(query, [userEmail]);

      const positions = new Map<string, Position>();
      
      result.rows.forEach(row => {
        const key = `${row.strategy_name}:${row.timeframe || '1m'}`;
        positions.set(key, {
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
   * Delete all open positions for a strategy across ALL timeframes (used during reset)
   */
  static async deleteStrategyPositions(strategyName: string): Promise<void> {
    try {
      const query = `DELETE FROM open_positions WHERE strategy_name = $1`;
      const result = await pool.query(query, [strategyName]);
      console.log(`🗑️ Deleted ${result.rowCount} open position(s) for "${strategyName}" (all timeframes)`);
    } catch (error) {
      console.error(`❌ Error deleting strategy positions for "${strategyName}":`, error);
      throw error;
    }
  }
}

export default OpenPositionRepository;

