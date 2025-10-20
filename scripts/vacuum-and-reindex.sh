#!/bin/bash

# Script pour VACUUM, REINDEX et optimiser PostgreSQL

echo "🚀 Vacuum and Reindex database..."
echo ""

DB_HOST="${DB_HOST:-91.99.163.156}"
SSH_USER="${SSH_USER:-root}"

echo "📊 Connecting to $SSH_USER@$DB_HOST via SSH"
echo ""

ssh "$SSH_USER@$DB_HOST" << 'ENDSSH'

echo "Running VACUUM ANALYZE and REINDEX..."

su - postgres -c "psql tradingbot_db" << 'ENDPG'

\echo '════════════════════════════════════════════════════════════════'
\echo '  VACUUM FULL on all tables'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

\echo '🧹 VACUUM FULL completed_trades...'
VACUUM FULL completed_trades;
\echo '✅ Done'
\echo ''

\echo '🧹 VACUUM FULL strategies...'
VACUUM FULL strategies;
\echo '✅ Done'
\echo ''

\echo '🧹 VACUUM FULL open_positions...'
VACUUM FULL open_positions;
\echo '✅ Done'
\echo ''

\echo '🧹 VACUUM FULL global_strategy_state...'
VACUUM FULL global_strategy_state;
\echo '✅ Done'
\echo ''

\echo '════════════════════════════════════════════════════════════════'
\echo '  REINDEX all tables'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

\echo '🔄 REINDEX strategies...'
REINDEX TABLE strategies;
\echo '✅ Done'
\echo ''

\echo '🔄 REINDEX completed_trades...'
REINDEX TABLE completed_trades;
\echo '✅ Done'
\echo ''

\echo '🔄 REINDEX open_positions...'
REINDEX TABLE open_positions;
\echo '✅ Done'
\echo ''

\echo '════════════════════════════════════════════════════════════════'
\echo '  ANALYZE all tables'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

\echo '📊 ANALYZE...'
ANALYZE strategies;
ANALYZE completed_trades;
ANALYZE open_positions;
ANALYZE global_strategy_state;
\echo '✅ Done'
\echo ''

\echo '════════════════════════════════════════════════════════════════'
\echo '  Checking query plan for slow query'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

\echo '📊 EXPLAIN for SELECT * FROM strategies WHERE type = $1:'
EXPLAIN ANALYZE SELECT * FROM strategies WHERE type = 'CUSTOM';

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '✅ Optimization complete!'
\echo '════════════════════════════════════════════════════════════════'

ENDPG

ENDSSH

echo ""
echo "✅ Done!"
echo ""

