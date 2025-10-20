#!/bin/bash

# Script to deactivate all strategies

echo "⏸️  Deactivating all strategies..."

ssh root@91.99.163.156 << 'ENDSSH'

su - postgres -c "psql tradingbot_db" << 'EOF'

\echo '🔄 Setting all strategies to INACTIVE...'

UPDATE strategies 
SET is_active = false, 
    activated_at = NULL, 
    total_active_time = 0,
    updated_at = CURRENT_TIMESTAMP;

\echo ''
\echo '✅ All strategies deactivated'
\echo ''
\echo '📊 Current status:'
SELECT 
    name,
    timeframe,
    is_active
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

EOF

ENDSSH

echo ""
echo "✅ All strategies are now INACTIVE"
echo "🔄 Ready to start fresh!"

