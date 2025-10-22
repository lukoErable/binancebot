import pg from 'pg';

const pool = new pg.Pool({
  host: '91.99.163.156',
  port: 5432,
  user: 'tradingbot_user',
  password: 'tradingbot_secure_2024',
  database: 'tradingbot_db'
});

async function clearTrades() {
  try {
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('🗑️  CLEARING ALL TRADES AND POSITIONS');
    console.log('═'.repeat(80));
    
    // Show current state
    console.log('\n📊 BEFORE CLEANUP:');
    const beforeResult = await pool.query(`
      SELECT 
        'completed_trades' as table,
        COUNT(*) as rows
      FROM completed_trades
      UNION ALL
      SELECT 
        'open_positions',
        COUNT(*)
      FROM open_positions
    `);
    
    console.table(beforeResult.rows);
    
    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will DELETE ALL trades and positions!');
    console.log('   - All completed trades will be lost');
    console.log('   - All open positions will be closed');
    console.log('   - P&L will reset to 0 for all strategies');
    console.log('\n🔄 Proceeding in 3 seconds...\n');
    
    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Clear tables
    console.log('🗑️  Clearing completed_trades...');
    await pool.query('TRUNCATE TABLE completed_trades CASCADE');
    console.log('✅ completed_trades cleared');
    
    console.log('🗑️  Clearing open_positions...');
    await pool.query('TRUNCATE TABLE open_positions CASCADE');
    console.log('✅ open_positions cleared');
    
    // Show final state
    console.log('\n📊 AFTER CLEANUP:');
    const afterResult = await pool.query(`
      SELECT 
        'completed_trades' as table,
        COUNT(*) as rows
      FROM completed_trades
      UNION ALL
      SELECT 
        'open_positions',
        COUNT(*)
      FROM open_positions
    `);
    
    console.table(afterResult.rows);
    
    console.log('\n' + '═'.repeat(80));
    console.log('✅ ALL TRADES AND POSITIONS CLEARED SUCCESSFULLY');
    console.log('═'.repeat(80));
    
    // Force StrategyManager reload via API
    console.log('\n🔄 Reloading StrategyManager in-memory data...');
    
    try {
      const response = await fetch('http://localhost:3000/api/reload-strategies');
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ StrategyManager reloaded from database');
        console.log(`   - Loaded ${result.strategiesCount} strategies`);
      } else {
        console.log('⚠️  Could not reload StrategyManager (server may be offline)');
      }
    } catch (error) {
      console.log('⚠️  Could not reach server (make sure it\'s running)');
    }
    
    console.log('\n💡 Next steps:');
    console.log('   1. Refresh your browser (F5)');
    console.log('   2. Strategies will start trading fresh with P&L = 0');
    console.log('   3. New trades will appear as they are executed\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

clearTrades();

