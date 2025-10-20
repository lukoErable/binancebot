#!/bin/bash

# Script to verify database structure matches the code

echo "🔍 Verifying database structure..."

ssh root@91.99.163.156 << 'ENDSSH'

echo "════════════════════════════════════════════════════════════════"
echo "  DATABASE STRUCTURE VERIFICATION"
echo "════════════════════════════════════════════════════════════════"
echo ""

su - postgres -c "psql tradingbot_db" << 'EOF'

\echo '📋 1. ALL TABLES IN DATABASE:'
\echo ''
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '📋 2. STRATEGIES TABLE STRUCTURE:'
\echo ''
\d strategies

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '📋 3. COMPLETED_TRADES TABLE STRUCTURE:'
\echo ''
\d completed_trades

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '📋 4. OPEN_POSITIONS TABLE STRUCTURE:'
\echo ''
\d open_positions

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '📋 5. CUSTOM_STRATEGIES TABLE (if exists):'
\echo ''
\d custom_strategies

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '📋 6. GLOBAL_STRATEGY_STATE TABLE (if exists):'
\echo ''
\d global_strategy_state

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '📋 7. STRATEGY_PERFORMANCES TABLE (if exists):'
\echo ''
\d strategy_performances

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '📊 8. DATA COUNTS:'
\echo ''
SELECT 
    'strategies' as table_name, 
    COUNT(*) as row_count 
FROM strategies
UNION ALL
SELECT 
    'completed_trades', 
    COUNT(*) 
FROM completed_trades
UNION ALL
SELECT 
    'open_positions', 
    COUNT(*) 
FROM open_positions
UNION ALL
SELECT 
    'strategy_performances', 
    COUNT(*) 
FROM strategy_performances
ORDER BY table_name;

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '📊 9. CURRENT STRATEGIES DETAILS:'
\echo ''
SELECT 
    id,
    name,
    type,
    timeframe,
    is_active,
    total_active_time,
    activated_at,
    created_at
FROM strategies
ORDER BY name, timeframe;

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '📊 10. ALL INDEXES:'
\echo ''
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '📊 11. CHECKING FOR ORPHANED DATA:'
\echo ''

\echo 'Completed trades without matching strategy:'
SELECT DISTINCT ct.strategy_name, ct.timeframe
FROM completed_trades ct
LEFT JOIN strategies s ON ct.strategy_name = s.name AND ct.timeframe = s.timeframe
WHERE s.id IS NULL;

\echo ''
\echo 'Open positions without matching strategy:'
SELECT DISTINCT op.strategy_name, op.timeframe
FROM open_positions op
LEFT JOIN strategies s ON op.strategy_name = s.name AND op.timeframe = s.timeframe
WHERE s.id IS NULL;

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '✅ VERIFICATION COMPLETE'
\echo '════════════════════════════════════════════════════════════════'

EOF

ENDSSH

echo ""
echo "✅ Database structure verification completed!"

