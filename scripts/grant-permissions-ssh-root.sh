#!/bin/bash

# Script pour se connecter en SSH au serveur et exécuter les commandes en tant que postgres

echo "🔐 Granting permissions via SSH (as root/postgres)..."
echo ""

DB_HOST="${DB_HOST:-91.99.163.156}"
SSH_USER="${SSH_USER:-root}"

echo "📊 Connecting to $SSH_USER@$DB_HOST via SSH"
echo ""

# Se connecter en SSH et exécuter les commandes
ssh "$SSH_USER@$DB_HOST" << 'ENDSSH'

echo "════════════════════════════════════════════════════════════════"
echo "  ANALYZING DATABASE STRUCTURE"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Exécuter en tant que postgres
su - postgres -c "psql tradingbot_db" << 'ENDPG'

-- Afficher les tables
\echo '📋 Tables in database:'
SELECT 
    schemaname,
    tablename,
    tableowner,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

\echo ''
\echo '📋 Current permissions for tradingbot_user:'
SELECT 
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges 
WHERE grantee = 'tradingbot_user'
ORDER BY table_name, privilege_type;

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '  GRANTING PERMISSIONS TO tradingbot_user'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

-- Donner tous les droits sur toutes les tables existantes
\echo '📊 Granting ALL privileges on all existing tables'
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tradingbot_user;
\echo '✅ Success'
\echo ''

-- Donner tous les droits sur toutes les séquences
\echo '📊 Granting ALL privileges on all sequences'
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tradingbot_user;
\echo '✅ Success'
\echo ''

-- Donner les droits par défaut pour les tables futures
\echo '📊 Setting default privileges for future tables'
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO tradingbot_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO tradingbot_user;
\echo '✅ Success'
\echo ''

-- Transférer la propriété des tables
\echo '📊 Transferring ownership of tables to tradingbot_user'
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO tradingbot_user';
        RAISE NOTICE 'Changed owner of table % to tradingbot_user', r.tablename;
    END LOOP;
END$$;
\echo '✅ Success'
\echo ''

-- Donner les droits sur le schéma
\echo '📊 Granting ALL privileges on schema public'
GRANT ALL ON SCHEMA public TO tradingbot_user;
GRANT CREATE ON SCHEMA public TO tradingbot_user;
\echo '✅ Success'
\echo ''

\echo '════════════════════════════════════════════════════════════════'
\echo '  CREATING/UPDATING INDEXES'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

\echo '📊 Creating indexes...'
CREATE INDEX IF NOT EXISTS idx_completed_trades_strategy_name ON completed_trades(strategy_name);
CREATE INDEX IF NOT EXISTS idx_completed_trades_strategy_exit ON completed_trades(strategy_name, exit_time DESC);
CREATE INDEX IF NOT EXISTS idx_strategies_name_timeframe ON strategies(name, timeframe);
CREATE INDEX IF NOT EXISTS idx_open_positions_strategy_timeframe ON open_positions(strategy_name, timeframe);
\echo '✅ Indexes created'
\echo ''

\echo '════════════════════════════════════════════════════════════════'
\echo '  ANALYZING TABLES'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

\echo '📊 Analyzing tables...'
ANALYZE completed_trades;
ANALYZE strategies;
ANALYZE open_positions;
ANALYZE global_strategy_state;
\echo '✅ Tables analyzed'
\echo ''

\echo '════════════════════════════════════════════════════════════════'
\echo '  VERIFICATION - Final state'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

\echo '📋 Permissions for tradingbot_user:'
SELECT 
    table_name,
    string_agg(privilege_type, ', ') as privileges
FROM information_schema.table_privileges 
WHERE grantee = 'tradingbot_user' AND table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

\echo ''
\echo '📋 Table ownership:'
SELECT 
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

\echo ''
\echo '📋 Indexes on completed_trades:'
SELECT indexname FROM pg_indexes 
WHERE tablename = 'completed_trades' 
ORDER BY indexname;

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '✅ All permissions granted!'
\echo '🔐 tradingbot_user now has full access to all tables'
\echo '════════════════════════════════════════════════════════════════'

ENDPG

ENDSSH

echo ""
echo "✅ Script completed!"
echo ""

