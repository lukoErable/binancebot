#!/bin/bash

# Script pour réinitialiser complètement les données de trading
# Usage: ./scripts/reset-database.sh

set -e

echo "⚠️  ATTENTION: Ce script va supprimer TOUTES les données de trading!"
echo ""
echo "📋 Données qui seront supprimées:"
echo "   - Tous les trades historiques"
echo "   - Toutes les performances enregistrées"
echo "   - Tous les snapshots de marché"
echo "   - Les stratégies seront désactivées (mais conservées)"
echo ""
echo "✅ Ce qui sera conservé:"
echo "   - Structure de la base de données"
echo "   - Configuration des stratégies"
echo "   - Capital initial: 100,000 USDT"
echo ""

# Demander confirmation
read -p "Voulez-vous continuer? (oui/non): " confirmation

if [ "$confirmation" != "oui" ]; then
    echo "❌ Annulé"
    exit 1
fi

echo ""
echo "🔄 Connexion au serveur et réinitialisation..."
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables
SSH_HOST="91.99.163.156"
SSH_USER="root"

# Exécuter via SSH
ssh ${SSH_USER}@${SSH_HOST} << 'ENDSSH'

# Créer le fichier SQL temporaire
cat > /tmp/reset-database.sql << 'ENDOSQL'
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

-- Supprimer toutes les données
TRUNCATE TABLE trades RESTART IDENTITY CASCADE;
TRUNCATE TABLE strategy_performances RESTART IDENTITY CASCADE;
TRUNCATE TABLE market_snapshots RESTART IDENTITY CASCADE;

-- Réinitialiser le statut des stratégies
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
FROM market_snapshots;

\echo ''
\echo '✅ Base de données réinitialisée! Capital de départ: 100,000 USDT'
ENDOSQL

# Exécuter le script
sudo -i -u postgres psql -f /tmp/reset-database.sql

# Nettoyer
rm /tmp/reset-database.sql

ENDSSH

echo ""
echo -e "${GREEN}🎉 Réinitialisation terminée!${NC}"
echo ""
echo "Prochaines étapes:"
echo "  1. Redémarrer votre application"
echo "  2. Activer les stratégies souhaitées"
echo "  3. Le trading repartira avec 100,000 USDT de capital initial"

