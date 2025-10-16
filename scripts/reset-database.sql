-- Script pour réinitialiser les données de trading
-- Supprime toutes les données mais garde la structure

\c tradingbot_db

-- Afficher l'état actuel
\echo '📊 État actuel de la base de données:'
\echo ''

SELECT 
    'trades' as table_name,
    COUNT(*) as row_count
FROM trades
UNION ALL
SELECT 
    'strategy_performances' as table_name,
    COUNT(*) as row_count
FROM strategy_performances
UNION ALL
SELECT 
    'market_snapshots' as table_name,
    COUNT(*) as row_count
FROM market_snapshots;

\echo ''
\echo '🗑️  Suppression de toutes les données de trading...'
\echo ''

-- Supprimer toutes les données de trades
TRUNCATE TABLE trades RESTART IDENTITY CASCADE;

-- Supprimer toutes les performances enregistrées
TRUNCATE TABLE strategy_performances RESTART IDENTITY CASCADE;

-- Supprimer les snapshots de marché (optionnel)
TRUNCATE TABLE market_snapshots RESTART IDENTITY CASCADE;

-- Réinitialiser le statut des stratégies à inactif
UPDATE strategies SET is_active = false;

\echo '✅ Données supprimées avec succès!'
\echo ''
\echo '📋 Vérification finale:'
\echo ''

SELECT 
    'trades' as table_name,
    COUNT(*) as row_count
FROM trades
UNION ALL
SELECT 
    'strategy_performances' as table_name,
    COUNT(*) as row_count
FROM strategy_performances
UNION ALL
SELECT 
    'market_snapshots' as table_name,
    COUNT(*) as row_count
FROM market_snapshots
UNION ALL
SELECT 
    'strategies' as table_name,
    COUNT(*) as row_count
FROM strategies;

\echo ''
\echo '🎯 Stratégies disponibles (toutes inactives):'
\echo ''

SELECT 
    name,
    type,
    is_active,
    config
FROM strategies
ORDER BY id;

\echo ''
\echo '✅ Base de données réinitialisée! Capital de départ: 100,000 USDT'

