import { TradingSignal } from '@/types/trading';
import { pool } from './database';

export class TradeRepository {
  /**
   * Save a trade signal to database
   */
  static async saveTrade(
    strategyName: string,
    strategyType: string,
    signal: TradingSignal
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO trades (
          strategy_name, strategy_type, signal_type, price, timestamp, reason,
          position_type, entry_price, entry_time, quantity,
          unrealized_pnl, unrealized_pnl_percent, 
          total_pnl, total_pnl_percent, fees, current_capital,
          rsi, ema12, ema26, ema50, ema200, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      `;

      const values = [
        strategyName,
        strategyType,
        signal.type,
        signal.price,
        signal.timestamp, // Keep as bigint
        signal.reason || '',
        signal.position?.type || 'NONE',
        signal.position?.entryPrice || null,
        signal.position?.entryTime ? new Date(signal.position.entryTime) : null, // entry_time is TIMESTAMP WITH TIME ZONE
        signal.position?.quantity || 0, // Required field, use 0 if not provided
        signal.position?.unrealizedPnL || null,
        signal.position?.unrealizedPnLPercent || null,
        signal.position?.totalPnL || null,
        signal.position?.totalPnLPercent || null,
        signal.position?.fees || null,
        signal.position?.currentCapital || null,
        signal.rsi || null,
        signal.ema12 || null,
        signal.ema26 || null,
        signal.ema50 || null,
        signal.ema200 || null,
        JSON.stringify({
          ma7: signal.ma7,
          ma25: signal.ma25,
          ma99: signal.ma99
        })
      ];

      await pool.query(query, values);
      console.log(`💾 Trade saved: ${strategyName} - ${signal.type} at $${signal.price.toFixed(2)}${
        signal.position?.totalPnL ? ` | PnL: ${signal.position.totalPnL.toFixed(2)} USDT` : ''
      }`);
    } catch (error) {
      console.error('❌ Error saving trade:', error);
      console.error('Signal data:', signal);
      // Don't throw - we don't want to stop trading if DB fails
    }
  }

  /**
   * Get all trades for a strategy
   */
  static async getTradesByStrategy(strategyName: string, limit: number = 100): Promise<Record<string, unknown>[]> {
    try {
      const query = `
        SELECT * FROM trades
        WHERE strategy_name = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `;
      
      const result = await pool.query(query, [strategyName, limit]);
      console.log(`📊 Fetched ${result.rows.length} trades for "${strategyName}"`);
      return result.rows;
    } catch (error) {
      console.error(`❌ Error fetching trades for "${strategyName}":`, error);
      return [];
    }
  }

  /**
   * Get all trades (all strategies)
   */
  static async getAllTrades(limit: number = 100): Promise<Record<string, unknown>[]> {
    try {
      const query = `
        SELECT * FROM trades
        ORDER BY timestamp DESC
        LIMIT $1
      `;
      
      const result = await pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching all trades:', error);
      return [];
    }
  }

  /**
   * Get trade statistics for a strategy
   */
  static async getStrategyStats(strategyName: string): Promise<{
    totalTrades: number;
    winningTrades: number;
    totalPnL: number;
    avgPnL: number;
    winRate: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_trades,
          SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
          SUM(pnl) as total_pnl,
          AVG(pnl) as avg_pnl
        FROM trades
        WHERE strategy_name = $1
          AND signal_type IN ('CLOSE_LONG', 'CLOSE_SHORT')
      `;
      
      const result = await pool.query(query, [strategyName]);
      const row = result.rows[0];
      
      return {
        totalTrades: parseInt(row.total_trades) || 0,
        winningTrades: parseInt(row.winning_trades) || 0,
        totalPnL: parseFloat(row.total_pnl) || 0,
        avgPnL: parseFloat(row.avg_pnl) || 0,
        winRate: row.total_trades > 0 
          ? (parseInt(row.winning_trades) / parseInt(row.total_trades)) * 100 
          : 0
      };
    } catch (error) {
      console.error('❌ Error fetching strategy stats:', error);
      return {
        totalTrades: 0,
        winningTrades: 0,
        totalPnL: 0,
        avgPnL: 0,
        winRate: 0
      };
    }
  }

  /**
   * Delete old trades (cleanup)
   */
  static async deleteOldTrades(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      
      const query = `
        DELETE FROM trades
        WHERE timestamp < $1
      `;
      
      const result = await pool.query(query, [cutoffDate]);
      console.log(`🗑️ Deleted ${result.rowCount} old trades`);
      return result.rowCount || 0;
    } catch (error) {
      console.error('❌ Error deleting old trades:', error);
      return 0;
    }
  }

  /**
   * Delete all trades for a specific strategy (RESET)
   */
  static async deleteStrategyTrades(strategyName: string): Promise<number> {
    try {
      const query = `
        DELETE FROM trades
        WHERE strategy_name = $1
      `;
      
      const result = await pool.query(query, [strategyName]);
      console.log(`🗑️ Deleted ${result.rowCount} trades for strategy: ${strategyName}`);
      return result.rowCount || 0;
    } catch (error) {
      console.error('❌ Error deleting strategy trades:', error);
      return 0;
    }
  }
}

export default TradeRepository;

