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
  const type = 'CUSTOM';
  const isActive = true;

  // Store minutes in DB for times (repository converts minutes<->ms)
  const config = {
    description: 'Suivi de tendance EMA50/EMA200 avec confirmation et force de tendance.',
    longNotes: "🟢 Prix > EMA50, tendance haussière confirmée (EMA50 > EMA200), ADX > 20",
    shortNotes: "🔴 Prix < EMA50, tendance baissière confirmée (EMA50 < EMA200), ADX > 20",
    strategyLogic: "💡 Entrer dans le sens de la tendance confirmée; sortir sur inversion de tendance opposée.",
    longEntryConditions: {
      operator: 'AND',
      conditions: [
        { type: 'boolean', indicator: 'isBullishTrend', value: true },
        { type: 'boolean', indicator: 'isUptrend', value: true },
        { type: 'comparison', indicator: 'adx', operator: 'GT', value: 20 }
      ]
    },
    shortEntryConditions: {
      operator: 'AND',
      conditions: [
        { type: 'boolean', indicator: 'isBearishTrend', value: true },
        { type: 'boolean', indicator: 'isDowntrend', value: true },
        { type: 'comparison', indicator: 'adx', operator: 'GT', value: 20 }
      ]
    },
    longExitConditions: {
      operator: 'OR',
      conditions: [
        { type: 'boolean', indicator: 'isDowntrend', value: true },
        { type: 'boolean', indicator: 'isBearishTrend', value: true }
      ]
    },
    shortExitConditions: {
      operator: 'OR',
      conditions: [
        { type: 'boolean', indicator: 'isUptrend', value: true },
        { type: 'boolean', indicator: 'isBullishTrend', value: true }
      ]
    },
    profitTargetPercent: 1.7,
    stopLossPercent: 0.8,
    maxPositionTime: 240, // minutes
    positionSize: 0.05,
    cooldownPeriod: 0, // minutes
    simulationMode: true,
    color: 'sky'
  };

  const query = `
    INSERT INTO strategies (name, type, is_active, config)
    VALUES ($1, $2, $3, $4::jsonb)
    ON CONFLICT (name)
    DO UPDATE SET
      type = EXCLUDED.type,
      is_active = EXCLUDED.is_active,
      config = EXCLUDED.config,
      updated_at = CURRENT_TIMESTAMP
    RETURNING name, type, is_active, config->>'color' as color;
  `;

  try {
    const res = await pool.query(query, [name, type, isActive, JSON.stringify(config)]);
    console.log('✅ Upserted strategy:', res.rows[0]);
  } catch (e) {
    console.error('❌ Insert error:', e.message);
  } finally {
    await pool.end();
  }
}

run();


