/**
 * RL Strategy Repository - Manages RL state persistence
 */

import { db } from './database';

export interface RLStrategyConfig {
  strategyName: string;
  timeframe: string;
  userEmail: string;
  isEnabled: boolean;
  learningRate: number;
  evaluationPeriod: number;
  minTradesForEvaluation: number;
  adaptationThreshold: number;
  agentData: any;
}

class RLStrategyRepository {
  private static instance: RLStrategyRepository;

  private constructor() {
    this.initializeTable();
  }

  public static getInstance(): RLStrategyRepository {
    if (!RLStrategyRepository.instance) {
      RLStrategyRepository.instance = new RLStrategyRepository();
    }
    return RLStrategyRepository.instance;
  }

  /**
   * Initialize RL strategies table
   */
  private async initializeTable(): Promise<void> {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS rl_strategies (
          id SERIAL PRIMARY KEY,
          strategy_name VARCHAR(255) NOT NULL,
          timeframe VARCHAR(10) NOT NULL,
          user_email VARCHAR(255) NOT NULL,
          is_enabled BOOLEAN DEFAULT false,
          learning_rate DECIMAL(10,6) DEFAULT 0.001,
          evaluation_period INTEGER DEFAULT 30,
          min_trades_for_evaluation INTEGER DEFAULT 5,
          adaptation_threshold DECIMAL(10,4) DEFAULT 0.1,
          agent_data JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(strategy_name, timeframe, user_email)
        )
      `);
      console.log('✅ RL strategies table initialized');
    } catch (error) {
      console.error('❌ Error initializing RL strategies table:', error);
    }
  }

  /**
   * Enable RL for a strategy
   */
  async enableRL(
    strategyName: string,
    timeframe: string,
    userEmail: string = 'system@trading.bot',
    config: Partial<RLStrategyConfig> = {}
  ): Promise<void> {
    try {
      const defaultConfig = {
        learningRate: 0.001,
        evaluationPeriod: 30,
        minTradesForEvaluation: 5,
        adaptationThreshold: 0.1,
        agentData: {}
      };

      const finalConfig = { ...defaultConfig, ...config };

      await db.query(`
        INSERT INTO rl_strategies (
          strategy_name, timeframe, user_email, is_enabled,
          learning_rate, evaluation_period, min_trades_for_evaluation,
          adaptation_threshold, agent_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (strategy_name, timeframe, user_email)
        DO UPDATE SET
          is_enabled = $4,
          learning_rate = $5,
          evaluation_period = $6,
          min_trades_for_evaluation = $7,
          adaptation_threshold = $8,
          agent_data = $9,
          updated_at = CURRENT_TIMESTAMP
      `, [
        strategyName,
        timeframe,
        userEmail,
        true,
        finalConfig.learningRate,
        finalConfig.evaluationPeriod,
        finalConfig.minTradesForEvaluation,
        finalConfig.adaptationThreshold,
        JSON.stringify(finalConfig.agentData)
      ]);

      console.log(`🧠 RL enabled for ${strategyName} [${timeframe}] in database`);
    } catch (error) {
      console.error(`❌ Error enabling RL for ${strategyName} [${timeframe}]:`, error);
      throw error;
    }
  }

  /**
   * Disable RL for a strategy
   */
  async disableRL(
    strategyName: string,
    timeframe: string,
    userEmail: string = 'system@trading.bot'
  ): Promise<void> {
    try {
      await db.query(`
        UPDATE rl_strategies 
        SET is_enabled = false, updated_at = CURRENT_TIMESTAMP
        WHERE strategy_name = $1 AND timeframe = $2 AND user_email = $3
      `, [strategyName, timeframe, userEmail]);

      console.log(`🧠 RL disabled for ${strategyName} [${timeframe}] in database`);
    } catch (error) {
      console.error(`❌ Error disabling RL for ${strategyName} [${timeframe}]:`, error);
      throw error;
    }
  }

  /**
   * Check if RL is enabled for a strategy
   */
  async isRLEnabled(
    strategyName: string,
    timeframe: string,
    userEmail: string = 'system@trading.bot'
  ): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT is_enabled FROM rl_strategies
        WHERE strategy_name = $1 AND timeframe = $2 AND user_email = $3
      `, [strategyName, timeframe, userEmail]);

      return result.rows.length > 0 ? result.rows[0].is_enabled : false;
    } catch (error) {
      console.error(`❌ Error checking RL status for ${strategyName} [${timeframe}]:`, error);
      return false;
    }
  }

  /**
   * Get RL configuration for a strategy
   */
  async getRLConfig(
    strategyName: string,
    timeframe: string,
    userEmail: string = 'system@trading.bot'
  ): Promise<RLStrategyConfig | null> {
    try {
      const result = await db.query(`
        SELECT * FROM rl_strategies
        WHERE strategy_name = $1 AND timeframe = $2 AND user_email = $3
      `, [strategyName, timeframe, userEmail]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        strategyName: row.strategy_name,
        timeframe: row.timeframe,
        userEmail: row.user_email,
        isEnabled: row.is_enabled,
        learningRate: parseFloat(row.learning_rate),
        evaluationPeriod: row.evaluation_period,
        minTradesForEvaluation: row.min_trades_for_evaluation,
        adaptationThreshold: parseFloat(row.adaptation_threshold),
        agentData: row.agent_data
      };
    } catch (error) {
      console.error(`❌ Error getting RL config for ${strategyName} [${timeframe}]:`, error);
      return null;
    }
  }

  /**
   * Get all enabled RL strategies
   */
  async getAllEnabledRLStrategies(userEmail: string = 'system@trading.bot'): Promise<RLStrategyConfig[]> {
    try {
      const result = await db.query(`
        SELECT * FROM rl_strategies
        WHERE user_email = $1 AND is_enabled = true
        ORDER BY strategy_name, timeframe
      `, [userEmail]);

      return result.rows.map(row => ({
        strategyName: row.strategy_name,
        timeframe: row.timeframe,
        userEmail: row.user_email,
        isEnabled: row.is_enabled,
        learningRate: parseFloat(row.learning_rate),
        evaluationPeriod: row.evaluation_period,
        minTradesForEvaluation: row.min_trades_for_evaluation,
        adaptationThreshold: parseFloat(row.adaptation_threshold),
        agentData: row.agent_data
      }));
    } catch (error) {
      console.error('❌ Error getting all enabled RL strategies:', error);
      return [];
    }
  }

  /**
   * Update agent data for a strategy
   */
  async updateAgentData(
    strategyName: string,
    timeframe: string,
    agentData: any,
    userEmail: string = 'system@trading.bot'
  ): Promise<void> {
    try {
      await db.query(`
        UPDATE rl_strategies 
        SET agent_data = $1, updated_at = CURRENT_TIMESTAMP
        WHERE strategy_name = $2 AND timeframe = $3 AND user_email = $4
      `, [JSON.stringify(agentData), strategyName, timeframe, userEmail]);

      console.log(`🧠 Agent data updated for ${strategyName} [${timeframe}]`);
    } catch (error) {
      console.error(`❌ Error updating agent data for ${strategyName} [${timeframe}]:`, error);
      throw error;
    }
  }

  /**
   * Delete RL configuration for a strategy
   */
  async deleteRLConfig(
    strategyName: string,
    timeframe: string,
    userEmail: string = 'system@trading.bot'
  ): Promise<void> {
    try {
      await db.query(`
        DELETE FROM rl_strategies
        WHERE strategy_name = $1 AND timeframe = $2 AND user_email = $3
      `, [strategyName, timeframe, userEmail]);

      console.log(`🧠 RL config deleted for ${strategyName} [${timeframe}]`);
    } catch (error) {
      console.error(`❌ Error deleting RL config for ${strategyName} [${timeframe}]:`, error);
      throw error;
    }
  }

  /**
   * Clean up orphaned RL configurations (strategies that no longer exist)
   */
  async cleanupOrphanedRLConfigs(): Promise<void> {
    try {
      // Get all RL configurations
      const rlConfigs = await db.query(`
        SELECT strategy_name, timeframe, user_email FROM rl_strategies
      `);

      let cleanedCount = 0;

      for (const config of rlConfigs.rows) {
        // Check if strategy still exists in custom_strategies
        const strategyExists = await db.query(`
          SELECT 1 FROM custom_strategies 
          WHERE name = $1 AND timeframe = $2 AND user_email = $3
        `, [config.strategy_name, config.timeframe, config.user_email]);

        if (strategyExists.rows.length === 0) {
          // Strategy doesn't exist anymore, delete RL config
          await this.deleteRLConfig(config.strategy_name, config.timeframe, config.user_email);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧠 Cleaned up ${cleanedCount} orphaned RL configurations`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up orphaned RL configurations:', error);
    }
  }
}

export default RLStrategyRepository;
