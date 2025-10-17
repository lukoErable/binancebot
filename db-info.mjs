import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: 'tradingbot_user',
  host: '91.99.163.156',
  database: 'tradingbot_db',
  password: 'tradingbot_secure_2024',
  port: 5432,
});

console.log('🔍 Informations de la base de données\n');

try {
  // Structure de la table trades
  console.log('📋 Structure de la table "trades":');
  const structure = await pool.query(`
    SELECT 
      column_name, 
      data_type, 
      numeric_precision,
      numeric_scale
    FROM information_schema.columns 
    WHERE table_name = 'trades' 
    ORDER BY ordinal_position;
  `);
  console.table(structure.rows);

  // Nombre total de trades
  console.log('\n📊 Statistiques globales:');
  const total = await pool.query('SELECT COUNT(*) as total FROM trades');
  console.log(`Total de signaux: ${total.rows[0].total}`);

  // Par stratégie
  console.log('\n📈 Statistiques par stratégie:');
  const byStrategy = await pool.query(`
    SELECT 
      strategy_name,
      COUNT(*) as total_signals,
      COUNT(CASE WHEN signal_type IN ('CLOSE_LONG', 'CLOSE_SHORT') THEN 1 END) as closed_trades,
      COUNT(CASE WHEN total_pnl IS NOT NULL THEN 1 END) as trades_with_pnl
    FROM trades 
    GROUP BY strategy_name
    ORDER BY strategy_name;
  `);
  console.table(byStrategy.rows);

  // Configuration des stratégies
  console.log('\n⚙️ Configuration des stratégies:');
  const strategiesConfig = await pool.query(`
    SELECT 
      name,
      is_active,
      config->'profitTargetPercent' as take_profit,
      config->'stopLossPercent' as stop_loss,
      config->'maxPositionTime' as max_position_time,
      TO_CHAR(updated_at, 'DD/MM HH24:MI') as last_update
    FROM strategies
    ORDER BY name;
  `);
  
  console.log('\n📊 Paramètres de Trading par Stratégie:');
  strategiesConfig.rows.forEach(row => {
    const tp = row.take_profit || 'Default';
    const sl = row.stop_loss || 'Default';
    const maxPos = row.max_position_time || 'Default';
    const riskReward = (tp && sl && tp !== 'Default' && sl !== 'Default') 
      ? `1:${(parseFloat(tp) / parseFloat(sl)).toFixed(2)}`
      : 'N/A';
    
    console.log(`\n${row.name} ${row.is_active ? '🟢' : '🔴'}`);
    console.log(`  TP: ${tp}% | SL: ${sl}% | Max: ${maxPos} min | R/R: ${riskReward}`);
    console.log(`  Dernière modif: ${row.last_update}`);
  });

  // Derniers signaux
  console.log('\n🕐 Derniers signaux:');
  const recent = await pool.query(`
    SELECT 
      strategy_name,
      signal_type,
      price,
      timestamp,
      total_pnl,
      current_capital
    FROM trades 
    ORDER BY timestamp DESC 
    LIMIT 100;
  `);
  console.table(recent.rows);

  // Structure de la table completed_trades
  console.log('\n\n📋 Structure de la table "completed_trades":');
  const completedStructure = await pool.query(`
    SELECT 
      column_name, 
      data_type, 
      numeric_precision,
      numeric_scale
    FROM information_schema.columns 
    WHERE table_name = 'completed_trades' 
    ORDER BY ordinal_position;
  `);
  
  if (completedStructure.rows.length > 0) {
    console.table(completedStructure.rows);

    // Statistiques des completed trades
    console.log('\n📊 Statistiques des trades complétés:');
    const completedTotal = await pool.query('SELECT COUNT(*) as total FROM completed_trades');
    console.log(`Total de trades complétés: ${completedTotal.rows[0].total}`);

    // Par stratégie
    console.log('\n📈 Trades complétés par stratégie:');
    const completedByStrategy = await pool.query(`
      SELECT 
        strategy_name,
        COUNT(*) as total_trades,
        COUNT(CASE WHEN is_win = true THEN 1 END) as wins,
        COUNT(CASE WHEN is_win = false THEN 1 END) as losses,
        ROUND(AVG(CASE WHEN is_win = true THEN 1 ELSE 0 END) * 100, 2) as win_rate,
        ROUND(SUM(pnl)::numeric, 2) as total_pnl,
        ROUND(AVG(pnl)::numeric, 2) as avg_pnl,
        ROUND(AVG(duration)::numeric / 1000, 2) as avg_duration_sec
      FROM completed_trades 
      GROUP BY strategy_name
      ORDER BY strategy_name;
    `);
    console.table(completedByStrategy.rows);

    // Derniers trades complétés
    console.log('\n🎯 Derniers trades complétés:');
    const recentCompleted = await pool.query(`
      SELECT 
        strategy_name,
        position_type,
        entry_price,
        exit_price,
        pnl,
        pnl_percent,
        is_win,
        exit_reason,
        entry_reason,
        EXTRACT(EPOCH FROM entry_time) * 1000 as entry_timestamp,
        EXTRACT(EPOCH FROM exit_time) * 1000 as exit_timestamp
      FROM completed_trades 
      ORDER BY exit_time DESC 
      LIMIT 20;
    `);
    console.table(recentCompleted.rows);
  } else {
    console.log('⚠️  La table "completed_trades" n\'existe pas encore.');
  }

  // 🎯 Afficher les positions ouvertes
  const openPositionsExists = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'open_positions'
    );
  `);

  if (openPositionsExists.rows[0].exists) {
    console.log('\n🎯 Positions Ouvertes Actuelles:');
    const openPositions = await pool.query(`
      SELECT 
        strategy_name,
        position_type,
        entry_price,
        entry_time,
        quantity,
        unrealized_pnl,
        unrealized_pnl_percent,
        created_at,
        updated_at
      FROM open_positions 
      ORDER BY updated_at DESC;
    `);
    
    if (openPositions.rows.length === 0) {
      console.log('  ℹ️  Aucune position ouverte actuellement');
    } else {
      console.table(openPositions.rows);
      
      openPositions.rows.forEach(pos => {
        const entryDate = new Date(parseInt(pos.entry_time));
        const duration = Date.now() - parseInt(pos.entry_time);
        const minutes = Math.floor(duration / 60000);
        const hours = Math.floor(minutes / 60);
        
        console.log(`\n${pos.strategy_name}:`);
        console.log(`  Type: ${pos.position_type === 'LONG' ? '🟢 LONG' : '🔴 SHORT'}`);
        console.log(`  Entry: $${parseFloat(pos.entry_price).toFixed(2)} @ ${entryDate.toLocaleString('fr-FR')}`);
        console.log(`  Quantity: ${pos.quantity}`);
        console.log(`  Unrealized P&L: ${pos.unrealized_pnl >= 0 ? '+' : ''}${parseFloat(pos.unrealized_pnl).toFixed(2)} USDT (${pos.unrealized_pnl_percent >= 0 ? '+' : ''}${parseFloat(pos.unrealized_pnl_percent).toFixed(2)}%)`);
        console.log(`  Duration: ${hours}h ${minutes % 60}m`);
      });
    }
  } else {
    console.log('\n⚠️  La table "open_positions" n\'existe pas encore.');
  }

} catch (error) {
  console.error('❌ Erreur:', error.message);
} finally {
  await pool.end();
}

