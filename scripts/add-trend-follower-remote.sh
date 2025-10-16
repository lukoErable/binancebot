#!/bin/bash

# Script pour ajouter la stratégie Trend Follower sur le serveur distant
# Usage: ./scripts/add-trend-follower-remote.sh

SERVER="root@91.99.163.156"

echo "🔌 Connexion au serveur PostgreSQL distant..."

# Se connecter au serveur et exécuter la commande SQL
ssh $SERVER << 'EOF'
sudo -i -u postgres psql -d tradingbot_db << 'SQL'
-- Ajouter la stratégie Trend Follower
INSERT INTO strategies (name, type, is_active, config) 
VALUES ('Trend Follower', 'TREND_FOLLOWER', false, '{}')
ON CONFLICT (name) DO NOTHING;

-- Vérifier que la stratégie a été ajoutée
SELECT * FROM strategies WHERE name = 'Trend Follower';

-- Afficher toutes les stratégies
SELECT name, type, is_active FROM strategies ORDER BY name;
SQL
EOF

echo "✅ Commande exécutée sur le serveur distant"

