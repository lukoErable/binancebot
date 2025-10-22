import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || '91.99.163.156',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'tradingbot_db',
  user: process.env.DB_USER || 'tradingbot_user',
  password: process.env.DB_PASSWORD || 'tradingbot_secure_2024',
});

async function cleanDuplicates() {
  console.log('🧹 Checking for duplicate strategies...');
  
  try {
    // Find duplicates
    const duplicates = await pool.query(`
      SELECT name, timeframe, user_email, COUNT(*) as count
      FROM strategies
      GROUP BY name, timeframe, user_email
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.rows.length === 0) {
      console.log('✅ No duplicates found!');
      await pool.end();
      process.exit(0);
      return;
    }
    
    console.log(`⚠️  Found ${duplicates.rows.length} duplicate groups:`);
    duplicates.rows.forEach(row => {
      console.log(`   - ${row.name} [${row.timeframe}] for ${row.user_email || 'NULL'}: ${row.count} copies`);
    });
    
    // Delete duplicates (keep most recent - highest id)
    const result = await pool.query(`
      DELETE FROM strategies a
      USING strategies b
      WHERE a.id < b.id
        AND a.name = b.name
        AND a.timeframe = b.timeframe
        AND COALESCE(a.user_email, '') = COALESCE(b.user_email, '')
    `);
    
    console.log(`✅ Removed ${result.rowCount} duplicate strategies`);
    
    // Show final count
    const finalCount = await pool.query('SELECT COUNT(*) FROM strategies');
    console.log(`📊 Total strategies remaining: ${finalCount.rows[0].count}`);
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning duplicates:', error);
    await pool.end();
    process.exit(1);
  }
}

cleanDuplicates().catch(console.error);

