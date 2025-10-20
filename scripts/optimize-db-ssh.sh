#!/bin/bash

# Script d'optimisation de la base de données via SSH
# Créé des index pour améliorer les performances avec tous les trades

echo "🚀 Starting database optimization via SSH..."
echo ""

# Configuration
DB_HOST="${DB_HOST:-91.99.163.156}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tradingbot_db}"
DB_USER="${DB_USER:-tradingbot_user}"
DB_PASSWORD="${DB_PASSWORD:-tradingbot_secure_2024}"

echo "📊 Connecting to database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
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

# Créer les index
echo "════════════════════════════════════════════════════════════════"
echo "  CREATING INDEXES FOR PERFORMANCE OPTIMIZATION"
echo "════════════════════════════════════════════════════════════════"
echo ""

execute_sql "CREATE INDEX IF NOT EXISTS idx_completed_trades_strategy_name ON completed_trades(strategy_name);" \
    "Creating index on completed_trades(strategy_name)"

execute_sql "CREATE INDEX IF NOT EXISTS idx_completed_trades_strategy_timeframe ON completed_trades(strategy_name, timeframe);" \
    "Creating index on completed_trades(strategy_name, timeframe)"

execute_sql "CREATE INDEX IF NOT EXISTS idx_completed_trades_exit_time ON completed_trades(exit_time DESC);" \
    "Creating index on completed_trades(exit_time)"

execute_sql "CREATE INDEX IF NOT EXISTS idx_completed_trades_strategy_exit ON completed_trades(strategy_name, exit_time DESC);" \
    "Creating composite index on completed_trades(strategy_name, exit_time)"

execute_sql "CREATE INDEX IF NOT EXISTS idx_strategies_name_timeframe ON strategies(name, timeframe);" \
    "Creating index on strategies(name, timeframe)"

execute_sql "CREATE INDEX IF NOT EXISTS idx_open_positions_strategy_timeframe ON open_positions(strategy_name, timeframe);" \
    "Creating index on open_positions(strategy_name, timeframe)"

# Analyser les tables
echo "════════════════════════════════════════════════════════════════"
echo "  ANALYZING TABLES"
echo "════════════════════════════════════════════════════════════════"
echo ""

execute_sql "ANALYZE completed_trades;" "Analyzing completed_trades"
execute_sql "ANALYZE strategies;" "Analyzing strategies"
execute_sql "ANALYZE open_positions;" "Analyzing open_positions"

# Afficher les index créés
echo "════════════════════════════════════════════════════════════════"
echo "  INDEXES ON completed_trades"
echo "════════════════════════════════════════════════════════════════"
echo ""

PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
SELECT 
    indexname,
    indexdef 
FROM pg_indexes 
WHERE tablename = 'completed_trades'
ORDER BY indexname;
EOF

echo ""

# Afficher les statistiques des tables
echo "════════════════════════════════════════════════════════════════"
echo "  TABLE STATISTICS"
echo "════════════════════════════════════════════════════════════════"
echo ""

PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE tablename IN ('completed_trades', 'strategies', 'open_positions')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
EOF

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Database optimization complete!"
echo "🚀 Queries should now be much faster with large amounts of trades."
echo "════════════════════════════════════════════════════════════════"
echo ""

