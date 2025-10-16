#!/bin/bash

# Script pour nettoyer les doublons dans la BDD distante
# Usage: ./scripts/clean-duplicates-remote.sh

echo "🧹 Nettoyage des doublons dans la base de données distante..."
echo ""

PGPASSWORD='tradingbot_secure_2024' psql \
  -h 91.99.163.156 \
  -U tradingbot_user \
  -d tradingbot_db \
  -f scripts/clean-duplicates.sql

echo ""
echo "✅ Nettoyage terminé !"

