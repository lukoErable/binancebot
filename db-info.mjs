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
    
    // ==================== STRATEGIES ====================
    console.log('\n🎯 STRATEGIES');
    console.log('═'.repeat(120));
    const strategiesResult = await pool.query(`
      SELECT 
        name,
        type,
        is_active,
        config->>'color' as color,
        config->>'positionSize' as position_size,
        config->>'profitTargetPercent' as tp,
        config->>'stopLossPercent' as sl,
        config->>'maxPositionTime' as max_time,
        created_at
      FROM strategies
      ORDER BY type, name
    `);
    
    if (strategiesResult.rows.length > 0) {
      console.table(strategiesResult.rows.map(row => ({
        Name: row.name,
        Type: row.type,
        Active: row.is_active ? '✅' : '❌',
        Color: row.color || '-',
        'Pos Size': row.position_size || '-',
        'TP %': row.tp || '-',
        'SL %': row.sl || '-',
        'Max (min)': row.max_time || '-',
        Created: new Date(row.created_at).toLocaleString('fr-FR').substring(0, 16)
      })));
    }
    
    // ==================== OPEN POSITIONS ====================
    console.log('\n💼 OPEN POSITIONS');
    console.log('═'.repeat(120));
    const positionsResult = await pool.query(`
      SELECT 
        strategy_name,
        position_type,
        entry_price,
        quantity,
        unrealized_pnl,
        unrealized_pnl_percent,
        entry_time
      FROM open_positions
      ORDER BY entry_time DESC
    `);
    
    if (positionsResult.rows.length > 0) {
      console.table(positionsResult.rows.map(row => ({
        Strategy: row.strategy_name,
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
    console.log('\n📊 COMPLETED TRADES (Last 10)');
    console.log('═'.repeat(120));
    const tradesResult = await pool.query(`
      SELECT 
        strategy_name,
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
      LIMIT 10
    `);
    
    if (tradesResult.rows.length > 0) {
      console.table(tradesResult.rows.map(row => ({
        Strategy: row.strategy_name,
        Type: row.position_type,
        Entry: `$${parseFloat(row.entry_price).toFixed(2)}`,
        Exit: `$${parseFloat(row.exit_price).toFixed(2)}`,
        'P&L': `$${parseFloat(row.pnl).toFixed(2)}`,
        '%': `${parseFloat(row.pnl_percent).toFixed(2)}%`,
        Duration: `${Math.floor(row.duration / 60000)}m`,
        Reason: row.exit_reason.substring(0, 20),
        Win: row.is_win ? '✅' : '❌'
      })));
    } else {
      console.log('  ℹ️  No completed trades');
    }
    
    // ==================== SUMMARY ====================
    console.log('\n📈 SUMMARY');
    console.log('═'.repeat(120));
    
    const summaryResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE type = 'CUSTOM') as custom_strategies,
        COUNT(*) FILTER (WHERE type != 'CUSTOM') as default_strategies,
        COUNT(*) FILTER (WHERE is_active = true) as active_strategies,
        (SELECT COUNT(*) FROM open_positions) as open_positions,
        (SELECT COUNT(*) FROM completed_trades) as total_completed_trades,
        (SELECT SUM(pnl) FROM completed_trades) as total_pnl,
        (SELECT COUNT(*) FILTER (WHERE is_win = true) FROM completed_trades) as winning_trades,
        (SELECT COUNT(*) FROM trades) as total_signals
      FROM strategies
    `);
    
    const s = summaryResult.rows[0];
    const winRate = s.total_completed_trades > 0 ? ((s.winning_trades / s.total_completed_trades) * 100).toFixed(2) : '0.00';
    
    console.log(`
    📊 Strategies: ${parseInt(s.custom_strategies) + parseInt(s.default_strategies)} total
       ├─ CUSTOM (AI): ${s.custom_strategies} 🎨
       ├─ Default: ${s.default_strategies}
       └─ Active: ${s.active_strategies} ✅
    
    💼 Open Positions: ${s.open_positions}
    
    📈 Trading Performance:
       ├─ Completed Trades: ${s.total_completed_trades}
       ├─ Win Rate: ${winRate}%
       ├─ Total P&L: ${s.total_pnl ? parseFloat(s.total_pnl).toFixed(2) : '0.00'} USDT
       └─ Total Signals: ${s.total_signals}
    `);
    
    // ==================== CUSTOM STRATEGIES COLORS ====================
    console.log('\n🎨 CUSTOM STRATEGIES COLORS');
    console.log('═'.repeat(120));
    const colorsResult = await pool.query(`
      SELECT 
        name,
        config->>'color' as color
      FROM strategies
      WHERE type = 'CUSTOM'
      ORDER BY name
    `);
    
    if (colorsResult.rows.length > 0) {
      colorsResult.rows.forEach(row => {
        const colorEmoji = {
          emerald: '🟢', rose: '🌸', indigo: '🔵', violet: '🟣',
          amber: '🟠', lime: '🟢', sky: '🔷', fuchsia: '💗',
          pink: '💗', teal: '🟢', cyan: '🔷', orange: '🟠',
          purple: '🟣', yellow: '🟡', red: '🔴', green: '🟢', blue: '🔵'
        }[row.color] || '⚪';
        
        console.log(`  ${colorEmoji} ${row.name.padEnd(25)} → ${row.color || 'none'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

displayDatabaseInfo();
