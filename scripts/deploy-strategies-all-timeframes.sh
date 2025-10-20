#!/bin/bash

# Script to deploy the 3 strategies on ALL timeframes

echo "🚀 Deploying 3 strategies on all timeframes..."

ssh root@91.99.163.156 << 'ENDSSH'

echo "════════════════════════════════════════════════════════════════"
echo "  DEPLOYING STRATEGIES ON ALL TIMEFRAMES"
echo "════════════════════════════════════════════════════════════════"
echo ""

su - postgres -c "psql tradingbot_db" << 'EOF'

\echo '📊 Current strategies:'
SELECT name, timeframe FROM strategies ORDER BY name, timeframe;

\echo ''
\echo '🔄 Creating strategies on all timeframes (1m, 5m, 15m, 1h, 4h, 1d)...'
\echo ''

-- Get existing configurations
\echo '1. Copying QuickStrike Scalp configuration to all timeframes'
DO $$
DECLARE
    existing_config jsonb;
    timeframes text[] := ARRAY['1m', '5m', '15m', '1h', '4h', '1d'];
    tf text;
BEGIN
    -- Get existing config from 1m
    SELECT config INTO existing_config 
    FROM strategies 
    WHERE name = 'QuickStrike Scalp' AND timeframe = '1m'
    LIMIT 1;
    
    IF existing_config IS NOT NULL THEN
        FOREACH tf IN ARRAY timeframes
        LOOP
            INSERT INTO strategies (name, type, is_active, config, timeframe, activated_at, total_active_time, created_at, updated_at)
            VALUES ('QuickStrike Scalp', 'CUSTOM', false, existing_config, tf, NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (name, timeframe) 
            DO UPDATE SET 
                config = existing_config,
                updated_at = CURRENT_TIMESTAMP;
            
            RAISE NOTICE '  ✅ QuickStrike Scalp [%]', tf;
        END LOOP;
    ELSE
        RAISE NOTICE '  ⚠️  QuickStrike Scalp config not found';
    END IF;
END$$;

\echo ''
\echo '2. Copying Trend Follower AI configuration to all timeframes'
DO $$
DECLARE
    existing_config jsonb;
    timeframes text[] := ARRAY['1m', '5m', '15m', '1h', '4h', '1d'];
    tf text;
BEGIN
    -- Get existing config from 1m
    SELECT config INTO existing_config 
    FROM strategies 
    WHERE name = 'Trend Follower AI' AND timeframe = '1m'
    LIMIT 1;
    
    IF existing_config IS NOT NULL THEN
        FOREACH tf IN ARRAY timeframes
        LOOP
            INSERT INTO strategies (name, type, is_active, config, timeframe, activated_at, total_active_time, created_at, updated_at)
            VALUES ('Trend Follower AI', 'CUSTOM', false, existing_config, tf, NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (name, timeframe) 
            DO UPDATE SET 
                config = existing_config,
                updated_at = CURRENT_TIMESTAMP;
            
            RAISE NOTICE '  ✅ Trend Follower AI [%]', tf;
        END LOOP;
    ELSE
        RAISE NOTICE '  ⚠️  Trend Follower AI config not found';
    END IF;
END$$;

\echo ''
\echo '3. Copying ConservativeTrendTrader configuration to all timeframes'
DO $$
DECLARE
    existing_config jsonb;
    timeframes text[] := ARRAY['1m', '5m', '15m', '1h', '4h', '1d'];
    tf text;
BEGIN
    -- Get existing config from 1m
    SELECT config INTO existing_config 
    FROM strategies 
    WHERE name = 'ConservativeTrendTrader' AND timeframe = '1m'
    LIMIT 1;
    
    IF existing_config IS NOT NULL THEN
        FOREACH tf IN ARRAY timeframes
        LOOP
            INSERT INTO strategies (name, type, is_active, config, timeframe, activated_at, total_active_time, created_at, updated_at)
            VALUES ('ConservativeTrendTrader', 'CUSTOM', false, existing_config, tf, NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (name, timeframe) 
            DO UPDATE SET 
                config = existing_config,
                updated_at = CURRENT_TIMESTAMP;
            
            RAISE NOTICE '  ✅ ConservativeTrendTrader [%]', tf;
        END LOOP;
    ELSE
        RAISE NOTICE '  ⚠️  ConservativeTrendTrader config not found';
    END IF;
END$$;

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '📊 Final result - All strategies on all timeframes:'
\echo ''
SELECT 
    name,
    timeframe,
    is_active,
    total_active_time
FROM strategies
ORDER BY name, 
    CASE timeframe
        WHEN '1m' THEN 1
        WHEN '5m' THEN 2
        WHEN '15m' THEN 3
        WHEN '1h' THEN 4
        WHEN '4h' THEN 5
        WHEN '1d' THEN 6
    END;

\echo ''
\echo '📈 Total strategies per name:'
SELECT 
    name,
    COUNT(*) as timeframe_count
FROM strategies
GROUP BY name
ORDER BY name;

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '✅ DEPLOYMENT COMPLETE'
\echo '════════════════════════════════════════════════════════════════'
\echo ''
\echo 'You now have:'
\echo '  • QuickStrike Scalp on 6 timeframes'
\echo '  • Trend Follower AI on 6 timeframes'
\echo '  • ConservativeTrendTrader on 6 timeframes'
\echo '  • Total: 18 strategy instances'
\echo ''

EOF

ENDSSH

echo ""
echo "✅ All strategies deployed on all timeframes!"
echo "🔄 Restart your app to load the new strategies."

