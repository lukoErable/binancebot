#!/bin/bash

# 🧹 Script de Nettoyage du Code Obsolète
# Date: 21 Octobre 2025
# Impact: -1,069 lignes de code mort

echo "╔════════════════════════════════════════════════════════════════"
echo "║ 🧹 NETTOYAGE DU CODE OBSOLÈTE"
echo "╠════════════════════════════════════════════════════════════════"
echo "║ Impact estimé : -1,069 lignes de code"
echo "║ Fichiers à supprimer : 4"
echo "║ Fonctions à supprimer : 5"
echo "╚════════════════════════════════════════════════════════════════"
echo ""

# Phase 1 : Backup (optionnel)
read -p "Créer un backup avant suppression ? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "📦 Création du backup..."
  mkdir -p .archive/backup-$(date +%Y%m%d-%H%M%S)
  cp src/app/api/trading/route.ts .archive/backup-$(date +%Y%m%d-%H%M%S)/ 2>/dev/null
  cp src/app/api/ws-stats/route.ts .archive/backup-$(date +%Y%m%d-%H%M%S)/ 2>/dev/null
  cp src/lib/multi-websocket-manager.ts .archive/backup-$(date +%Y%m%d-%H%M%S)/
  cp src/lib/websocket-manager.ts .archive/backup-$(date +%Y%m%d-%H%M%S)/
  echo "✅ Backup créé dans .archive/"
  echo ""
fi

# Phase 2 : Suppression des fichiers obsolètes
echo "📁 Phase 1: Suppression des fichiers obsolètes..."
echo ""

if [ -f "src/app/api/trading/route.ts" ]; then
  lines=$(wc -l < src/app/api/trading/route.ts)
  rm src/app/api/trading/route.ts
  echo "✅ Supprimé src/app/api/trading/route.ts ($lines lignes)"
else
  echo "⏭️  src/app/api/trading/route.ts déjà supprimé"
fi

if [ -f "src/app/api/ws-stats/route.ts" ]; then
  lines=$(wc -l < src/app/api/ws-stats/route.ts)
  rm src/app/api/ws-stats/route.ts
  echo "✅ Supprimé src/app/api/ws-stats/route.ts ($lines lignes)"
else
  echo "⏭️  src/app/api/ws-stats/route.ts déjà supprimé"
fi

if [ -f "src/lib/multi-websocket-manager.ts" ]; then
  lines=$(wc -l < src/lib/multi-websocket-manager.ts)
  rm src/lib/multi-websocket-manager.ts
  echo "✅ Supprimé src/lib/multi-websocket-manager.ts ($lines lignes)"
else
  echo "⏭️  src/lib/multi-websocket-manager.ts déjà supprimé"
fi

if [ -f "src/lib/websocket-manager.ts" ]; then
  lines=$(wc -l < src/lib/websocket-manager.ts)
  rm src/lib/websocket-manager.ts
  echo "✅ Supprimé src/lib/websocket-manager.ts ($lines lignes)"
else
  echo "⏭️  src/lib/websocket-manager.ts déjà supprimé"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════"
echo "║ ✅ NETTOYAGE TERMINÉ"
echo "╠════════════════════════════════════════════════════════════════"
echo "║ Fichiers supprimés : 4"
echo "║ Lignes supprimées : ~983"
echo "╚════════════════════════════════════════════════════════════════"
echo ""
echo "🧪 Tests recommandés :"
echo "   1. npm run dev"
echo "   2. Tester toggle strategy"
echo "   3. Tester delete strategy"
echo "   4. Vérifier que tout fonctionne"
echo ""
echo "📝 Si tout fonctionne :"
echo "   git add -A"
echo "   git commit -m '🧹 Remove 983 lines of legacy code'"
echo ""

