#!/bin/bash

# Script pour ajouter l'index manquant sur strategies(type)

echo "🚀 Adding missing index on strategies(type)..."
echo ""

DB_HOST="${DB_HOST:-91.99.163.156}"
SSH_USER="${SSH_USER:-root}"

echo "📊 Connecting to $SSH_USER@$DB_HOST via SSH"
echo ""

ssh "$SSH_USER@$DB_HOST" << 'ENDSSH'

echo "Creating index on strategies(type)..."

su - postgres -c "psql tradingbot_db" << 'ENDPG'

-- Créer l'index sur la colonne type
\echo '📊 Creating index on strategies(type)...'
CREATE INDEX IF NOT EXISTS idx_strategies_type ON strategies(type);
\echo '✅ Index created!'
\echo ''

-- Analyser la table
\echo '📊 Analyzing table...'
ANALYZE strategies;
\echo '✅ Table analyzed!'
\echo ''

-- Vérifier les index
\echo '📋 Indexes on strategies table:'
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'strategies'
ORDER BY indexname;

\echo ''
\echo '✅ Optimization complete!'

ENDPG

ENDSSH

echo ""
echo "✅ Done! The slow query should now be fast."
echo ""

