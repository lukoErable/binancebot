#!/bin/bash

# Script pour donner tous les droits à tradingbot_user (en tant que postgres superuser)

echo "🔐 Granting all permissions to tradingbot_user..."
echo ""

# Configuration
DB_HOST="${DB_HOST:-91.99.163.156}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tradingbot_db}"
DB_USER="postgres"  # Superuser
DB_PASSWORD="${POSTGRES_PASSWORD:-}"  # À renseigner

# Si le mot de passe n'est pas fourni, on demande
if [ -z "$DB_PASSWORD" ]; then
    echo "⚠️  Please provide the postgres superuser password:"
    echo "   Run with: POSTGRES_PASSWORD=your_password ./scripts/grant-permissions-root.sh"
    echo ""
    echo "Or try with default postgres connection (local):"
    echo "   ssh root@$DB_HOST 'su - postgres -c \"psql $DB_NAME\"'"
    exit 1
fi

echo "📊 Connecting as postgres superuser to: $DB_HOST:$DB_PORT/$DB_NAME"
echo ""

# Fonction pour exécuter une commande SQL
execute_sql() {
    local sql="$1"
    local description="$2"
    
    echo "📊 $description"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$sql"
    
    if [ $? -eq 0 ]; then
        echo "✅ Success"
    else
        echo "❌ Failed"
    fi
    echo ""
}

echo "════════════════════════════════════════════════════════════════"
echo "  ANALYZING DATABASE STRUCTURE"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Afficher toutes les tables
echo "📋 Tables in database:"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
SELECT 
    schemaname,
    tablename,
    tableowner,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
EOF

echo ""

# Afficher les droits actuels de tradingbot_user
echo "📋 Current permissions for tradingbot_user:"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
SELECT 
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges 
WHERE grantee = 'tradingbot_user'
ORDER BY table_name, privilege_type;
EOF

echo ""

echo "════════════════════════════════════════════════════════════════"
echo "  GRANTING PERMISSIONS TO tradingbot_user"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Donner tous les droits sur toutes les tables existantes
execute_sql "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tradingbot_user;" \
    "Granting ALL privileges on all existing tables"

# Donner tous les droits sur toutes les séquences
execute_sql "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tradingbot_user;" \
    "Granting ALL privileges on all sequences"

# Donner les droits par défaut pour les tables futures
execute_sql "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO tradingbot_user;" \
    "Setting default privileges for future tables"

execute_sql "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO tradingbot_user;" \
    "Setting default privileges for future sequences"

# Donner la propriété des tables à tradingbot_user (si nécessaire)
echo "📊 Transferring ownership of tables to tradingbot_user"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
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
EOF

if [ $? -eq 0 ]; then
    echo "✅ Success"
else
    echo "❌ Failed"
fi
echo ""

# Donner les droits sur le schéma
execute_sql "GRANT ALL ON SCHEMA public TO tradingbot_user;" \
    "Granting ALL privileges on schema public"

execute_sql "GRANT CREATE ON SCHEMA public TO tradingbot_user;" \
    "Granting CREATE privilege on schema public"

echo "════════════════════════════════════════════════════════════════"
echo "  CREATING/UPDATING INDEXES"
echo "════════════════════════════════════════════════════════════════"
echo ""

execute_sql "CREATE INDEX IF NOT EXISTS idx_completed_trades_strategy_name ON completed_trades(strategy_name);" \
    "Creating index on completed_trades(strategy_name)"

execute_sql "CREATE INDEX IF NOT EXISTS idx_completed_trades_strategy_exit ON completed_trades(strategy_name, exit_time DESC);" \
    "Creating composite index on completed_trades(strategy_name, exit_time)"

execute_sql "CREATE INDEX IF NOT EXISTS idx_strategies_name_timeframe ON strategies(name, timeframe);" \
    "Creating index on strategies(name, timeframe)"

execute_sql "CREATE INDEX IF NOT EXISTS idx_open_positions_strategy_timeframe ON open_positions(strategy_name, timeframe);" \
    "Creating index on open_positions(strategy_name, timeframe)"

echo "════════════════════════════════════════════════════════════════"
echo "  ANALYZING TABLES"
echo "════════════════════════════════════════════════════════════════"
echo ""

execute_sql "ANALYZE completed_trades;" "Analyzing completed_trades"
execute_sql "ANALYZE strategies;" "Analyzing strategies"
execute_sql "ANALYZE open_positions;" "Analyzing open_positions"
execute_sql "ANALYZE global_strategy_state;" "Analyzing global_strategy_state"

echo "════════════════════════════════════════════════════════════════"
echo "  VERIFICATION - Final permissions for tradingbot_user"
echo "════════════════════════════════════════════════════════════════"
echo ""

PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
SELECT 
    table_name,
    string_agg(privilege_type, ', ') as privileges
FROM information_schema.table_privileges 
WHERE grantee = 'tradingbot_user' AND table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
EOF

echo ""

echo "════════════════════════════════════════════════════════════════"
echo "  TABLE OWNERSHIP"
echo "════════════════════════════════════════════════════════════════"
echo ""

PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
EOF

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ All permissions granted!"
echo "🔐 tradingbot_user now has full access to all tables"
echo "════════════════════════════════════════════════════════════════"
echo ""

