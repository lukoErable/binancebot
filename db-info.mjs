import pg from 'pg';

const pool = new pg.Pool({
  host: '91.99.163.156',
  port: 5432,
  user: 'tradingbot_user',
  password: 'tradingbot_secure_2024',
  database: 'tradingbot_db'
});

async function displayDatabaseInfo() {
  try {
    console.log('\n');
    console.log('═'.repeat(120));
    console.log('📊 TRADING BOT 👑 - DATABASE STRUCTURE & DATA');
    console.log('═'.repeat(120));
    
    // ==================== DATABASE STRUCTURE ====================
    console.log('\n🏗️  DETAILED TABLE STRUCTURES');
    console.log('═'.repeat(120));
    
    const tablesResult = await pool.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    for (const table of tablesResult.rows) {
      const columnsResult = await pool.query(`
        SELECT 
          column_name, 
          data_type, 
          character_maximum_length,
          is_nullable, 
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table.table_name]);
      
      // Get row count
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
      const rowCount = countResult.rows[0].count;
      
      console.log(`\n  📋 ${table.table_name.toUpperCase()}`);
      console.log(`     Rows: ${rowCount} | Columns: ${table.column_count}`);
      console.log('     ─'.repeat(60));
      
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '🟢 NULL' : '🔴 NOT NULL';
        const type = col.character_maximum_length 
          ? `${col.data_type}(${col.character_maximum_length})`
          : col.data_type;
        const defaultValue = col.column_default 
          ? ` 🔧 default: ${col.column_default.substring(0, 30)}${col.column_default.length > 30 ? '...' : ''}` 
          : '';
        
        console.log(`     ${col.column_name.padEnd(30)} ${type.padEnd(25)} ${nullable.padEnd(12)} ${defaultValue}`);
      });
    }
    
    // ==================== STRATEGIES ====================
    console.log('\n\n🎯 STRATEGIES');
    console.log('═'.repeat(120));
    const strategiesResult = await pool.query(`
      SELECT 
        user_email,
        name,
        type,
        timeframe,
        is_active,
        config->>'color' as color,
        config->>'positionSize' as position_size,
        config->>'profitTargetPercent' as tp,
        config->>'stopLossPercent' as sl,
        config->>'maxPositionTime' as max_time,
        total_active_time,
        created_at
      FROM strategies
      ORDER BY user_email, name, timeframe
    `);
    
    if (strategiesResult.rows.length > 0) {
      console.table(strategiesResult.rows.map(row => ({
        'User Email': row.user_email.substring(0, 25),
        'Name': row.name.substring(0, 20),
        'TF': row.timeframe,
        'Type': row.type,
        'Active': row.is_active ? '✅' : '❌',
        'Color': row.color || '-',
        'TP%': row.tp || '-',
        'SL%': row.sl || '-',
        'ActiveTime': `${Math.floor((row.total_active_time || 0) / 60)}m`,
        'Created': new Date(row.created_at).toLocaleDateString('fr-FR')
      })));
      
      console.log(`\n  📊 Total: ${strategiesResult.rows.length} strategies`);
    } else {
      console.log('  ℹ️  No strategies');
    }
    
    // ==================== OPEN POSITIONS ====================
    console.log('\n\n💼 OPEN POSITIONS');
    console.log('═'.repeat(120));
    const positionsResult = await pool.query(`
      SELECT 
        user_email,
        strategy_name,
        timeframe,
        position_type,
        entry_price,
        quantity,
        unrealized_pnl,
        unrealized_pnl_percent,
        entry_time,
        updated_at
      FROM open_positions
      ORDER BY user_email, entry_time DESC
    `);
    
    if (positionsResult.rows.length > 0) {
      console.table(positionsResult.rows.map(row => ({
        'User Email': row.user_email.substring(0, 25),
        'Strategy': row.strategy_name.substring(0, 20),
        'TF': row.timeframe,
        'Type': row.position_type === 'LONG' ? '🟢 LONG' : '🔴 SHORT',
        'Entry': `$${parseFloat(row.entry_price).toFixed(2)}`,
        'Qty': parseFloat(row.quantity).toFixed(4),
        'Unrealized P&L': `$${parseFloat(row.unrealized_pnl).toFixed(2)}`,
        '%': `${parseFloat(row.unrealized_pnl_percent).toFixed(2)}%`,
        'Duration': (() => {
          const duration = Date.now() - parseInt(row.entry_time);
          const minutes = Math.floor(duration / 60000);
          const hours = Math.floor(minutes / 60);
          return `${hours}h ${minutes % 60}m`;
        })()
      })));
      
      console.log(`\n  📊 Total: ${positionsResult.rows.length} open positions`);
    } else {
      console.log('  ℹ️  No open positions');
    }
    
    // ==================== COMPLETED TRADES ====================
    console.log('\n\n📊 COMPLETED TRADES (Last 30)');
    console.log('═'.repeat(120));
    const tradesResult = await pool.query(`
      SELECT 
        user_email,
        strategy_name,
        timeframe,
        strategy_type,
        position_type,
        entry_price,
        exit_price,
        pnl,
        pnl_percent,
        duration,
        exit_reason,
        is_win,
        exit_time
      FROM completed_trades
      ORDER BY exit_time DESC
      LIMIT 30
    `);
    
    if (tradesResult.rows.length > 0) {
      console.table(tradesResult.rows.map(row => ({
        'User Email': row.user_email.substring(0, 20),
        'Strategy': row.strategy_name.substring(0, 15),
        'TF': row.timeframe,
        'Type': row.position_type === 'LONG' ? '🟢' : '🔴',
        'Entry': `$${parseFloat(row.entry_price).toFixed(2)}`,
        'Exit': `$${parseFloat(row.exit_price).toFixed(2)}`,
        'P&L': `$${parseFloat(row.pnl).toFixed(2)}`,
        '%': `${parseFloat(row.pnl_percent).toFixed(2)}%`,
        'Duration': `${Math.floor(row.duration / 60000)}m`,
        'Reason': row.exit_reason.substring(0, 12),
        'Win': row.is_win ? '✅' : '❌',
        'Date': new Date(row.exit_time).toLocaleString('fr-FR').substring(0, 14)
      })));
      
      // Get total count
      const totalTradesResult = await pool.query(`SELECT COUNT(*) as count FROM completed_trades`);
      console.log(`\n  📊 Showing 30 of ${totalTradesResult.rows[0].count} total trades`);
    } else {
      console.log('  ℹ️  No completed trades');
    }
    
    // ==================== SUMMARY BY USER ====================
    console.log('\n\n👥 SUMMARY BY USER');
    console.log('═'.repeat(120));
    
    const userSummaryResult = await pool.query(`
      SELECT 
        user_email,
        COUNT(DISTINCT name || timeframe) as total_strategies,
        COUNT(DISTINCT name || timeframe) FILTER (WHERE is_active = true) as active_strategies,
        COUNT(DISTINCT timeframe) as timeframes_used
      FROM strategies
      GROUP BY user_email
      ORDER BY user_email
    `);
    
    if (userSummaryResult.rows.length > 0) {
      for (const user of userSummaryResult.rows) {
        // Get open positions count
        const posResult = await pool.query(`
          SELECT COUNT(*) as count FROM open_positions WHERE user_email = $1
        `, [user.user_email]);
        
        // Get trades stats
        const tradesStatsResult = await pool.query(`
          SELECT 
            COUNT(*) as total_trades,
            SUM(pnl) as total_pnl,
            COUNT(*) FILTER (WHERE is_win = true) as winning_trades,
            MIN(exit_time) as first_trade,
            MAX(exit_time) as last_trade
          FROM completed_trades
          WHERE user_email = $1
        `, [user.user_email]);
        
        const trades = tradesStatsResult.rows[0];
        const winRate = trades.total_trades > 0 ? ((trades.winning_trades / trades.total_trades) * 100).toFixed(2) : '0.00';
        
        console.log(`\n  👤 ${user.user_email}`);
        console.log(`     ├─ 📊 Strategies: ${user.total_strategies} total (${user.active_strategies} active)`);
        console.log(`     ├─ 📅 Timeframes: ${user.timeframes_used} used`);
        console.log(`     ├─ 💼 Open Positions: ${posResult.rows[0].count}`);
        console.log(`     ├─ 📈 Completed Trades: ${trades.total_trades}`);
        console.log(`     ├─ 🎯 Win Rate: ${winRate}%`);
        console.log(`     └─ 💰 Total P&L: ${trades.total_pnl ? parseFloat(trades.total_pnl).toFixed(2) : '0.00'} USDT`);
      }
    } else {
      console.log('  ℹ️  No users found');
    }
    
    // ==================== GLOBAL SUMMARY ====================
    console.log('\n\n🌍 GLOBAL SUMMARY');
    console.log('═'.repeat(120));
    
    const globalSummaryResult = await pool.query(`
      SELECT 
        (SELECT COUNT(DISTINCT user_email) FROM strategies) as total_users,
        (SELECT COUNT(*) FROM strategies) as total_strategies,
        (SELECT COUNT(*) FROM strategies WHERE is_active = true) as active_strategies,
        (SELECT COUNT(*) FROM open_positions) as total_positions,
        (SELECT COUNT(*) FROM completed_trades) as total_trades,
        (SELECT SUM(pnl) FROM completed_trades) as total_pnl,
        (SELECT COUNT(*) FROM completed_trades WHERE is_win = true) as winning_trades
    `);
    
    const g = globalSummaryResult.rows[0];
    const globalWinRate = g.total_trades > 0 ? ((g.winning_trades / g.total_trades) * 100).toFixed(2) : '0.00';
    
    console.log(`
    🌐 PLATFORM STATISTICS
       ├─ 👥 Total Users: ${g.total_users}
       ├─ 🎯 Total Strategies: ${g.total_strategies} (${g.active_strategies} active, ${g.total_strategies - g.active_strategies} inactive)
       ├─ 💼 Open Positions: ${g.total_positions}
       ├─ 📊 Completed Trades: ${g.total_trades}
       ├─ 🎯 Global Win Rate: ${globalWinRate}%
       └─ 💰 Global P&L: ${g.total_pnl ? parseFloat(g.total_pnl).toFixed(2) : '0.00'} USDT
    `);
    
    // ==================== STRATEGIES BY TIMEFRAME ====================
    console.log('\n📅 STRATEGIES BY TIMEFRAME');
    console.log('═'.repeat(120));
    const timeframeResult = await pool.query(`
      SELECT 
        timeframe,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_active = false) as inactive,
        COUNT(DISTINCT name) as unique_strategies,
        COUNT(DISTINCT user_email) as users
      FROM strategies
      GROUP BY timeframe
      ORDER BY 
        CASE timeframe
          WHEN '1m' THEN 1
          WHEN '5m' THEN 2
          WHEN '15m' THEN 3
          WHEN '1h' THEN 4
          WHEN '4h' THEN 5
          WHEN '1d' THEN 6
          ELSE 7
        END
    `);
    
    if (timeframeResult.rows.length > 0) {
      console.table(timeframeResult.rows.map(row => ({
        'Timeframe': row.timeframe,
        'Total': row.total,
        'Active': row.active,
        'Inactive': row.inactive,
        'Unique Strategies': row.unique_strategies,
        'Users': row.users
      })));
    }
    
    // ==================== TOP PERFORMING STRATEGIES ====================
    console.log('\n\n🏆 TOP PERFORMING STRATEGIES (By P&L)');
    console.log('═'.repeat(120));
    const topStrategiesResult = await pool.query(`
      SELECT 
        user_email,
        strategy_name,
        timeframe,
        COUNT(*) as trades,
        SUM(pnl) as total_pnl,
        COUNT(*) FILTER (WHERE is_win = true) as wins,
        AVG(pnl) as avg_pnl
      FROM completed_trades
      GROUP BY user_email, strategy_name, timeframe
      HAVING COUNT(*) >= 3
      ORDER BY total_pnl DESC
      LIMIT 10
    `);
    
    if (topStrategiesResult.rows.length > 0) {
      console.table(topStrategiesResult.rows.map(row => ({
        'User': row.user_email.substring(0, 20),
        'Strategy': row.strategy_name.substring(0, 20),
        'TF': row.timeframe,
        'Trades': row.trades,
        'Total P&L': `$${parseFloat(row.total_pnl).toFixed(2)}`,
        'Avg P&L': `$${parseFloat(row.avg_pnl).toFixed(2)}`,
        'Win Rate': `${((row.wins / row.trades) * 100).toFixed(1)}%`
      })));
    } else {
      console.log('  ℹ️  No strategies with >= 3 trades');
    }
    
    console.log('\n' + '═'.repeat(120));
    console.log('✅ Database info displayed successfully');
    console.log('═'.repeat(120) + '\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

displayDatabaseInfo();
