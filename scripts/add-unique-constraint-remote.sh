#!/bin/bash

# Script pour ajouter la contrainte UNIQUE à la BDD distante
# Usage: ./scripts/add-unique-constraint-remote.sh

echo "🔒 Ajout de la contrainte UNIQUE pour empêcher les doublons..."
echo ""

# Se connecter en tant que postgres (superuser) via SSH
ssh root@91.99.163.156 "sudo -u postgres psql -d tradingbot_db" < scripts/add-unique-constraint.sql

echo ""
echo "✅ Contrainte UNIQUE ajoutée avec succès !"
echo "   Désormais, la BDD rejettera automatiquement les signaux en double."

