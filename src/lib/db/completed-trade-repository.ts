import { CompletedTrade } from '@/types/trading';
import { pool } from './database';

/**
 * Repository for managing completed trades (entry + exit pairs)
 */
export class CompletedTradeRepository {
  /**
   * Save a completed trade (entry + exit)
   */
  static async saveCompletedTrade(trade: CompletedTrade): Promise<void> {
    try {
      const query = `
        INSERT INTO completed_trades (
          strategy_name, strategy_type, position_type,
          entry_price, entry_time, entry_reason,
          exit_price, exit_time, exit_reason,
          quantity, pnl, pnl_percent, fees, duration, is_win, timeframe
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `;

      const values = [
        trade.strategyName,
        trade.strategyType,
        trade.type,
        trade.entryPrice,
        new Date(trade.entryTime),
        trade.entryReason,
        trade.exitPrice,
        new Date(trade.exitTime),
        trade.exitReason,
        trade.quantity,
        trade.pnl,
        trade.pnlPercent,
        trade.fees,
        trade.duration,
        trade.isWin,
        trade.timeframe || '1m'
      ];

      const result = await pool.query(query, values);
      const tradeId = result.rows[0]?.id;
      
      console.log(`💾 Completed trade saved [ID: ${tradeId}]: ${trade.strategyName} - ${trade.type} | Entry: $${trade.entryPrice.toFixed(2)} → Exit: $${trade.exitPrice.toFixed(2)} | PnL: ${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)} USDT (${trade.pnlPercent >= 0 ? '+' : ''}${trade.pnlPercent.toFixed(2)}%) ${trade.isWin ? '✅' : '❌'}`);
    } catch (error: any) {
      // Silently ignore duplicate key errors (code 23505)
      if (error.code === '23505') {
        console.log(`⏭️  Skipping duplicate completed trade: ${trade.strategyName} - ${trade.type} @ ${trade.exitPrice.toFixed(2)}`);
      } else {
        console.error('❌ Error saving completed trade:', error);
        console.error('Trade data:', trade);
      }
    }
  }

  /**
   * Get completed trades for a strategy
   * @param strategyName - Name of the strategy
   * @param limit - Maximum number of trades to return (0 = no limit, returns ALL trades)
   * @param timeframe - Optional timeframe filter
   */
  static async getCompletedTradesByStrategy(
    strategyName: string,
    limit: number = 100,
    timeframe?: string
  ): Promise<CompletedTrade[]> {
    try {
      let query: string;
      let values: any[];
      
      if (timeframe) {
        query = `
          SELECT 
            id, strategy_name, strategy_type, position_type,
            entry_price, entry_time, entry_reason,
            exit_price, exit_time, exit_reason,
            quantity, pnl, pnl_percent, fees, duration, is_win, timeframe
          FROM completed_trades
          WHERE strategy_name = $1 AND timeframe = $2
          ORDER BY exit_time DESC
          ${limit > 0 ? 'LIMIT $3' : ''}
        `;
        values = limit > 0 ? [strategyName, timeframe, limit] : [strategyName, timeframe];
      } else {
        query = `
          SELECT 
            id, strategy_name, strategy_type, position_type,
            entry_price, entry_time, entry_reason,
            exit_price, exit_time, exit_reason,
            quantity, pnl, pnl_percent, fees, duration, is_win, timeframe
          FROM completed_trades
          WHERE strategy_name = $1
          ORDER BY exit_time DESC
          ${limit > 0 ? 'LIMIT $2' : ''}
        `;
        values = limit > 0 ? [strategyName, limit] : [strategyName];
      }
      
      const result = await pool.query(query, values);
      
      return result.rows.map((row: any) => ({
        id: row.id,
        strategyName: row.strategy_name,
        strategyType: row.strategy_type,
        type: row.position_type,
        entryPrice: parseFloat(row.entry_price),
        entryTime: new Date(row.entry_time).getTime(),
        entryReason: row.entry_reason,
        exitPrice: parseFloat(row.exit_price),
        exitTime: new Date(row.exit_time).getTime(),
        exitReason: row.exit_reason,
        quantity: parseFloat(row.quantity),
        pnl: parseFloat(row.pnl),
        pnlPercent: parseFloat(row.pnl_percent),
        fees: parseFloat(row.fees),
        duration: parseInt(row.duration),
        isWin: row.is_win,
        timeframe: row.timeframe || '1m'
      }));
    } catch (error) {
      console.error('❌ Error fetching completed trades:', error);
      return [];
    }
  }

  /**
   * Get all completed trades
   * @param limit - Maximum number of trades to return (0 = no limit, returns ALL trades)
   */
  static async getAllCompletedTrades(limit: number = 100): Promise<CompletedTrade[]> {
    try {
      const query = limit > 0 
        ? `
          SELECT 
            id, strategy_name, strategy_type, position_type,
            entry_price, entry_time, entry_reason,
            exit_price, exit_time, exit_reason,
            quantity, pnl, pnl_percent, fees, duration, is_win, timeframe
          FROM completed_trades
          ORDER BY exit_time DESC
          LIMIT $1
        `
        : `
          SELECT 
            id, strategy_name, strategy_type, position_type,
            entry_price, entry_time, entry_reason,
            exit_price, exit_time, exit_reason,
            quantity, pnl, pnl_percent, fees, duration, is_win, timeframe
          FROM completed_trades
          ORDER BY exit_time DESC
        `;
      
      const result = limit > 0 
        ? await pool.query(query, [limit])
        : await pool.query(query);
      
      return result.rows.map((row: any) => ({
        id: row.id,
        strategyName: row.strategy_name,
        strategyType: row.strategy_type,
        type: row.position_type,
        entryPrice: parseFloat(row.entry_price),
        entryTime: new Date(row.entry_time).getTime(),
        entryReason: row.entry_reason,
        exitPrice: parseFloat(row.exit_price),
        exitTime: new Date(row.exit_time).getTime(),
        exitReason: row.exit_reason,
        quantity: parseFloat(row.quantity),
        pnl: parseFloat(row.pnl),
        pnlPercent: parseFloat(row.pnl_percent),
        fees: parseFloat(row.fees),
        duration: parseInt(row.duration),
        isWin: row.is_win,
        timeframe: row.timeframe || '1m'
      }));
    } catch (error) {
      console.error('❌ Error fetching all completed trades:', error);
      return [];
    }
  }

  /**
   * Delete completed trades for a strategy (for reset)
   * @param strategyName - Name of the strategy
   * @param timeframe - Optional timeframe filter (if provided, only delete trades for that timeframe)
   */
  static async deleteStrategyCompletedTrades(strategyName: string, timeframe?: string): Promise<void> {
    try {
      let query: string;
      let values: any[];
      
      if (timeframe) {
        query = `DELETE FROM completed_trades WHERE strategy_name = $1 AND timeframe = $2`;
        values = [strategyName, timeframe];
      } else {
        query = `DELETE FROM completed_trades WHERE strategy_name = $1`;
        values = [strategyName];
      }
      
      const result = await pool.query(query, values);
      const tfInfo = timeframe ? ` [${timeframe}]` : ' (all timeframes)';
      console.log(`🗑️ Deleted ${result.rowCount} completed trades for "${strategyName}"${tfInfo}`);
    } catch (error) {
      console.error('❌ Error deleting completed trades:', error);
    }
  }
}

export default CompletedTradeRepository;

