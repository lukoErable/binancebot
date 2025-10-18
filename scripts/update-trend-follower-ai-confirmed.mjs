import pg from 'pg';

const pool = new pg.Pool({
  host: '91.99.163.156',
  port: 5432,
  user: 'tradingbot_user',
  password: 'tradingbot_secure_2024',
  database: 'tradingbot_db'
});

async function run() {
  const name = 'Trend Follower AI';
  try {
    const sel = await pool.query('SELECT config FROM strategies WHERE name = $1', [name]);
    if (sel.rows.length === 0) {
      console.error('❌ Strategy not found:', name);
      return;
    }
    const oldConfig = typeof sel.rows[0].config === 'string' ? JSON.parse(sel.rows[0].config) : sel.rows[0].config;

    const newConfig = {
      ...oldConfig,
      // Replace entries with 3-candle confirmation
      longEntryConditions: {
        operator: 'AND',
        conditions: [
          { type: 'boolean', indicator: 'isUptrend', value: true },
          { type: 'boolean', indicator: 'isUptrendConfirmed3', value: true }
        ]
      },
      shortEntryConditions: {
        operator: 'AND',
        conditions: [
          { type: 'boolean', indicator: 'isDowntrend', value: true },
          { type: 'boolean', indicator: 'isDowntrendConfirmed3', value: true }
        ]
      },
      longExitConditions: {
        operator: 'OR',
        conditions: [
          { type: 'boolean', indicator: 'isDowntrendConfirmed3', value: true }
        ]
      },
      shortExitConditions: {
        operator: 'OR',
        conditions: [
          { type: 'boolean', indicator: 'isUptrendConfirmed3', value: true }
        ]
      },
      // Update notes to reflect new logic
      longNotes: '🟢 P>50 + Conf✓ (3 bougies > EMA50)',
      shortNotes: '🔴 P<50 + Conf✓ (3 bougies < EMA50)',
      strategyLogic: '💡 Entrée quand le prix est au-dessus/au-dessous de l’EMA50 ET confirmé par 3 clôtures consécutives. Sortie sur confirmation opposée.'
    };

    const upd = await pool.query(
      `UPDATE strategies SET config = $2::jsonb, updated_at = CURRENT_TIMESTAMP WHERE name = $1 RETURNING name`,
      [name, JSON.stringify(newConfig)]
    );
    console.log('✅ Updated strategy:', upd.rows[0].name);
  } catch (e) {
    console.error('❌ Update error:', e.message);
  } finally {
    await pool.end();
  }
}

run();


