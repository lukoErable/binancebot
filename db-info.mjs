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
    console.log('📊 Trading Bot - Database Info\n');
    
    // ==================== DATABASE STRUCTURE ====================
    console.log('\n🏗️  DATABASE STRUCTURE');
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
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table.table_name]);
      
      console.log(`\n  📋 ${table.table_name.toUpperCase()} (${table.column_count} columns)`);
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '🟢' : '🔴';
        const defaultValue = col.column_default ? ` [default: ${col.column_default.substring(0, 20)}...]` : '';
        console.log(`     ${nullable} ${col.column_name.padEnd(30)} ${col.data_type}${defaultValue}`);
      });
    }
    
    // ==================== USERS ====================
    console.log('\n\n👥 USERS');
    console.log('═'.repeat(120));
    const usersResult = await pool.query(`
      SELECT 
        id,
        email,
        name,
        created_at,
        (SELECT COUNT(*) FROM strategies WHERE user_id = users.id) as strategy_count,
        (SELECT COUNT(*) FROM completed_trades WHERE user_id = users.id) as trade_count
      FROM users
      ORDER BY id
    `);
    
    if (usersResult.rows.length > 0) {
      console.table(usersResult.rows.map(row => ({
        ID: row.id,
        Email: row.email,
        Name: row.name || '-',
        Strategies: row.strategy_count,
        Trades: row.trade_count,
        'Created': new Date(row.created_at).toLocaleString('fr-FR').substring(0, 16)
      })));
    } else {
      console.log('  ℹ️  No users');
    }
    
    // ==================== STRATEGIES ====================
    console.log('\n🎯 STRATEGIES');
    console.log('═'.repeat(120));
    const strategiesResult = await pool.query(`
      SELECT 
        user_id,
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
      ORDER BY user_id, name, timeframe
    `);
    
    if (strategiesResult.rows.length > 0) {
      console.table(strategiesResult.rows.map(row => ({
        User: row.user_id,
        Name: row.name,
        TF: row.timeframe,
        Type: row.type,
        Active: row.is_active ? '✅' : '❌',
        Color: row.color || '-',
        'TP%': row.tp || '-',
        'SL%': row.sl || '-',
        'ActiveTime': `${Math.floor((row.total_active_time || 0) / 60)}m`,
        Created: new Date(row.created_at).toLocaleString('fr-FR').substring(0, 16)
      })));
    }
    
    // ==================== OPEN POSITIONS ====================
    console.log('\n💼 OPEN POSITIONS');
    console.log('═'.repeat(120));
    const positionsResult = await pool.query(`
      SELECT 
        user_id,
        strategy_name,
        timeframe,
        position_type,
        entry_price,
        quantity,
        unrealized_pnl,
        unrealized_pnl_percent,
        entry_time
      FROM open_positions
      ORDER BY user_id, entry_time DESC
    `);
    
    if (positionsResult.rows.length > 0) {
      console.table(positionsResult.rows.map(row => ({
        User: row.user_id,
        Strategy: row.strategy_name,
        TF: row.timeframe,
        Type: row.position_type === 'LONG' ? '🟢 LONG' : '🔴 SHORT',
        'Entry': `$${parseFloat(row.entry_price).toFixed(2)}`,
        Qty: parseFloat(row.quantity).toFixed(4),
        'Unrealized P&L': `$${parseFloat(row.unrealized_pnl).toFixed(2)}`,
        '%': `${parseFloat(row.unrealized_pnl_percent).toFixed(2)}%`,
        'Duration': (() => {
          const duration = Date.now() - parseInt(row.entry_time);
          const minutes = Math.floor(duration / 60000);
          const hours = Math.floor(minutes / 60);
          return `${hours}h ${minutes % 60}m`;
        })()
      })));
    } else {
      console.log('  ℹ️  No open positions');
    }
    
    // ==================== COMPLETED TRADES ====================
    console.log('\n📊 COMPLETED TRADES (Last 20)');
    console.log('═'.repeat(120));
    const tradesResult = await pool.query(`
      SELECT 
        user_id,
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
      ORDER BY user_id, exit_time DESC
      LIMIT 20
    `);
    
    if (tradesResult.rows.length > 0) {
      console.table(tradesResult.rows.map(row => ({
        User: row.user_id,
        Strategy: row.strategy_name.substring(0, 15),
        TF: row.timeframe,
        Type: row.position_type,
        Entry: `$${parseFloat(row.entry_price).toFixed(2)}`,
        Exit: `$${parseFloat(row.exit_price).toFixed(2)}`,
        'P&L': `$${parseFloat(row.pnl).toFixed(2)}`,
        '%': `${parseFloat(row.pnl_percent).toFixed(2)}%`,
        Duration: `${Math.floor(row.duration / 60000)}m`,
        Reason: row.exit_reason.substring(0, 15),
        Win: row.is_win ? '✅' : '❌'
      })));
    } else {
      console.log('  ℹ️  No completed trades');
    }
    
    // ==================== SUMMARY ====================
    console.log('\n📈 SUMMARY');
    console.log('═'.repeat(120));
    
    // Summary by user
    const userSummaryResult = await pool.query(`
      SELECT 
        u.id,
        u.email,
        COUNT(DISTINCT s.name || s.timeframe) as total_strategies,
        COUNT(DISTINCT s.name || s.timeframe) FILTER (WHERE s.is_active = true) as active_strategies,
        COUNT(DISTINCT s.timeframe) FILTER (WHERE s.name IS NOT NULL) as timeframes_used,
        (SELECT COUNT(*) FROM open_positions WHERE user_id = u.id) as open_positions,
        (SELECT COUNT(*) FROM completed_trades WHERE user_id = u.id) as total_trades,
        (SELECT SUM(pnl) FROM completed_trades WHERE user_id = u.id) as total_pnl,
        (SELECT COUNT(*) FROM completed_trades WHERE user_id = u.id AND is_win = true) as winning_trades
      FROM users u
      LEFT JOIN strategies s ON u.id = s.user_id
      GROUP BY u.id, u.email
      ORDER BY u.id
    `);
    
    if (userSummaryResult.rows.length > 0) {
      userSummaryResult.rows.forEach(user => {
        const winRate = user.total_trades > 0 ? ((user.winning_trades / user.total_trades) * 100).toFixed(2) : '0.00';
        console.log(`
    👤 ${user.email} (ID: ${user.id})
       ├─ Strategies: ${user.total_strategies} total (${user.active_strategies} active)
       ├─ Timeframes: ${user.timeframes_used}
       ├─ Open Positions: ${user.open_positions}
       ├─ Completed Trades: ${user.total_trades}
       ├─ Win Rate: ${winRate}%
       └─ Total P&L: ${user.total_pnl ? parseFloat(user.total_pnl).toFixed(2) : '0.00'} USDT
        `);
      });
    }
    
    // Global summary
    const globalSummaryResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
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
    🌍 GLOBAL STATS
       ├─ Total Users: ${g.total_users}
       ├─ Total Strategies: ${g.total_strategies} (${g.active_strategies} active)
       ├─ Total Open Positions: ${g.total_positions}
       ├─ Total Completed Trades: ${g.total_trades}
       ├─ Global Win Rate: ${globalWinRate}%
       └─ Global P&L: ${g.total_pnl ? parseFloat(g.total_pnl).toFixed(2) : '0.00'} USDT
    `);
    
    // ==================== STRATEGIES BY TIMEFRAME ====================
    console.log('\n📅 STRATEGIES BY TIMEFRAME');
    console.log('═'.repeat(120));
    const timeframeResult = await pool.query(`
      SELECT 
        timeframe,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(DISTINCT name) as unique_strategies
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
        Timeframe: row.timeframe,
        Total: row.total,
        Active: row.active,
        'Unique Strategies': row.unique_strategies
      })));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

displayDatabaseInfo();
