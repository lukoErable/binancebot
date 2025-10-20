#!/usr/bin/env node

/**
 * Script to add database indexes for optimal performance
 * Run this to speed up queries with large amounts of trades
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || '91.99.163.156',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'tradingbot_db',
  user: process.env.DB_USER || 'tradingbot_user',
  password: process.env.DB_PASSWORD || 'tradingbot_secure_2024',
});

async function optimizeDatabase() {
  console.log('🚀 Starting database optimization...\n');

  try {
    // Index on strategy_name for completed_trades (most common query)
    console.log('📊 Creating index on completed_trades(strategy_name)...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_completed_trades_strategy_name 
      ON completed_trades(strategy_name)
    `);
    console.log('✅ Index created: idx_completed_trades_strategy_name\n');

    // Index on strategy_name + timeframe for filtered queries
    console.log('📊 Creating index on completed_trades(strategy_name, timeframe)...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_completed_trades_strategy_timeframe 
      ON completed_trades(strategy_name, timeframe)
    `);
    console.log('✅ Index created: idx_completed_trades_strategy_timeframe\n');

    // Index on exit_time for sorting
    console.log('📊 Creating index on completed_trades(exit_time)...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_completed_trades_exit_time 
      ON completed_trades(exit_time DESC)
    `);
    console.log('✅ Index created: idx_completed_trades_exit_time\n');

    // Composite index for optimal query performance
    console.log('📊 Creating composite index on completed_trades(strategy_name, exit_time)...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_completed_trades_strategy_exit 
      ON completed_trades(strategy_name, exit_time DESC)
    `);
    console.log('✅ Index created: idx_completed_trades_strategy_exit\n');

    // Index on strategies table
    console.log('📊 Creating index on strategies(name, timeframe)...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_strategies_name_timeframe 
      ON strategies(name, timeframe)
    `);
    console.log('✅ Index created: idx_strategies_name_timeframe\n');

    // Index on open_positions table
    console.log('📊 Creating index on open_positions(strategy_name, timeframe)...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_open_positions_strategy_timeframe 
      ON open_positions(strategy_name, timeframe)
    `);
    console.log('✅ Index created: idx_open_positions_strategy_timeframe\n');

    // Analyze tables to update statistics
    console.log('📊 Analyzing tables to update statistics...');
    await pool.query('ANALYZE completed_trades');
    await pool.query('ANALYZE strategies');
    await pool.query('ANALYZE open_positions');
    console.log('✅ Tables analyzed\n');

    // Show index information
    console.log('📋 Indexes on completed_trades:');
    const indexes = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'completed_trades'
      ORDER BY indexname
    `);
    
    indexes.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });

    // Show table statistics
    console.log('\n📊 Table statistics:');
    const stats = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      WHERE tablename IN ('completed_trades', 'strategies', 'open_positions')
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);
    
    console.table(stats.rows);

    console.log('\n✅ Database optimization complete!');
    console.log('🚀 Queries should now be much faster with large amounts of trades.\n');

  } catch (error) {
    console.error('❌ Error optimizing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

optimizeDatabase();

