#!/bin/bash

# Script to clean up obsolete tables from database

echo "🧹 Cleaning up obsolete tables..."

ssh root@91.99.163.156 << 'ENDSSH'

echo "════════════════════════════════════════════════════════════════"
echo "  CLEANING UP OBSOLETE TABLES"
echo "════════════════════════════════════════════════════════════════"
echo ""

su - postgres -c "psql tradingbot_db" << 'EOF'

\echo '📊 Tables before cleanup:'
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

\echo ''
\echo '🗑️  Dropping obsolete tables...'
\echo ''

\echo '1. Dropping global_strategy_state (no longer used after timeframe independence)'
DROP TABLE IF EXISTS global_strategy_state CASCADE;
\echo '✅ Dropped global_strategy_state'
\echo ''

\echo '2. Dropping market_snapshots (not used in code)'
DROP TABLE IF EXISTS market_snapshots CASCADE;
\echo '✅ Dropped market_snapshots'
\echo ''

\echo '3. Dropping strategy_performances (never populated, only used in reset)'
DROP TABLE IF EXISTS strategy_performances CASCADE;
\echo '✅ Dropped strategy_performances'
\echo ''

\echo '════════════════════════════════════════════════════════════════'
\echo '📊 Tables after cleanup:'
SELECT tablename, pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '✅ CLEANUP COMPLETE'
\echo '════════════════════════════════════════════════════════════════'
\echo ''
\echo 'Remaining tables:'
\echo '  • strategies - Strategy configurations (NEEDED)'
\echo '  • completed_trades - Trade history (NEEDED)'
\echo '  • open_positions - Current positions (NEEDED)'
\echo ''

EOF

ENDSSH

echo ""
echo "✅ Obsolete tables cleaned up successfully!"
echo "🔄 Now update the reset endpoint to remove references to these tables."

