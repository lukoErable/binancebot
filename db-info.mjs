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

} catch (error) {
  console.error('❌ Erreur:', error.message);
} finally {
  await pool.end();
}

