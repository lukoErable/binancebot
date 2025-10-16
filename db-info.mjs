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

  // Derniers trades
  console.log('\n🕐 5 derniers signaux:');
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
    LIMIT 5;
  `);
  console.table(recent.rows);

} catch (error) {
  console.error('❌ Erreur:', error.message);
} finally {
  await pool.end();
}

