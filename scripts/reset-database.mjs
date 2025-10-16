#!/usr/bin/env node
import pg from 'pg';
const { Pool } = pg;

console.log('🔄 Réinitialisation de la base de données...\n');

const pool = new Pool({
  user: 'tradingbot_user',
  host: '91.99.163.156',
  database: 'tradingbot_db',
  password: 'tradingbot_secure_2024',
  port: 5432,
});

async function resetDatabase() {
  try {
    // Afficher l'état actuel
    console.log('📊 État actuel de la base de données:');
    const before = await pool.query(`
      SELECT 'trades' as table_name, COUNT(*) as row_count FROM trades
      UNION ALL
      SELECT 'strategy_performances', COUNT(*) FROM strategy_performances
      UNION ALL
      SELECT 'market_snapshots', COUNT(*) FROM market_snapshots
    `);
    console.table(before.rows);
    
    // Demander confirmation
    console.log('\n⚠️  ATTENTION: Toutes les données de trading vont être supprimées!');
    console.log('Capital repartira à: 100,000 USDT\n');
    
    // Note: En production, utiliser readline pour la confirmation
    // Pour l'instant, on suppose que l'utilisateur veut vraiment reset
    
    console.log('🗑️  Suppression des données...\n');
    
    // Supprimer les données (CASCADE supprime aussi dans strategy_performances si FK)
    await pool.query('TRUNCATE TABLE trades RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE strategy_performances RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE market_snapshots RESTART IDENTITY CASCADE');
    
    // Désactiver toutes les stratégies
    await pool.query('UPDATE strategies SET is_active = false');
    
    console.log('✅ Données supprimées avec succès!\n');
    
    // Vérifier l'état final
    console.log('📋 Vérification finale:');
    const after = await pool.query(`
      SELECT 'trades' as table_name, COUNT(*) as row_count FROM trades
      UNION ALL
      SELECT 'strategy_performances', COUNT(*) FROM strategy_performances
      UNION ALL
      SELECT 'market_snapshots', COUNT(*) FROM market_snapshots
      UNION ALL
      SELECT 'strategies', COUNT(*) FROM strategies
    `);
    console.table(after.rows);
    
    // Afficher les stratégies disponibles
    console.log('🎯 Stratégies disponibles:');
    const strategies = await pool.query('SELECT name, type, is_active FROM strategies ORDER BY id');
    console.table(strategies.rows);
    
    console.log('\n✅ Base de données réinitialisée!');
    console.log('🚀 Capital de départ: 100,000 USDT');
    console.log('\nProchaines étapes:');
    console.log('  1. Redémarrer votre application');
    console.log('  2. Activer les stratégies souhaitées');
    console.log('  3. Le trading repartira à zéro\n');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

resetDatabase();

