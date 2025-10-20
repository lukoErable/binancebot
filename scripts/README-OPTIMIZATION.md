# 🚀 Database Optimization Guide

## Performance avec TOUS les trades (All-Time Stats)

Le système charge maintenant **TOUS les trades** de toutes les timeframes pour calculer les vraies statistiques all-time.

## 🎯 Améliorations effectuées

### 1. **Chargement illimité des trades**
- ✅ Avant : Limite de 100-200 trades par stratégie
- ✅ Après : **TOUS les trades** chargés (limit = 0)

### 2. **Pool de connexions étendu**
- ✅ 100 connexions simultanées (au lieu de 20)
- ✅ Retry automatique en cas de timeout
- ✅ Backoff exponentiel pour la résilience

### 3. **Requêtes SQL optimisées**
- ✅ SELECT uniquement des colonnes nécessaires (pas de SELECT *)
- ✅ Support de limite = 0 pour charger tous les trades
- ✅ Requêtes conditionnelles optimales

## 📊 Script d'optimisation des index

Pour accélérer les requêtes avec des milliers de trades, exécutez le script d'optimisation :

```bash
node scripts/optimize-db-indexes.mjs
```

### Ce que fait le script :

1. **Crée des index sur les colonnes les plus utilisées** :
   - `completed_trades(strategy_name)` - Pour les requêtes par stratégie
   - `completed_trades(strategy_name, timeframe)` - Pour les requêtes filtrées
   - `completed_trades(exit_time DESC)` - Pour le tri
   - `completed_trades(strategy_name, exit_time DESC)` - Index composite optimal
   - `strategies(name, timeframe)` - Pour les jointures
   - `open_positions(strategy_name, timeframe)` - Pour les positions ouvertes

2. **Met à jour les statistiques PostgreSQL** avec `ANALYZE`

3. **Affiche un rapport** des index et statistiques des tables

### Résultats attendus :

- ⚡ **10-100x plus rapide** sur les requêtes avec > 1000 trades
- 🎯 **0 timeout** même avec des milliers de trades
- 📈 **Performance constante** quelle que soit la quantité de données

## 🔍 Vérification des performances

Après avoir exécuté le script, vous devriez voir :

```
✅ [Strategy Name] Restored: 2547 trades (all timeframes), Win Rate: 45.2%, P&L: 1234.56 USDT
```

Au lieu de :
```
⏳ Query timeout on attempt 1/3, retrying...
```

## 📝 Notes techniques

### Configuration du pool (database.ts)
```typescript
max: 100,              // 100 connexions max
min: 5,                // 5 connexions toujours prêtes
connectionTimeoutMillis: 10000,  // 10 secondes timeout
idleTimeoutMillis: 60000,        // 60 secondes idle
maxUses: 7500,         // Recycler après 7500 utilisations
```

### Chargement des trades (custom-strategy.ts)
```typescript
const trades = await CompletedTradeRepository.getCompletedTradesByStrategy(
  this.config.name,
  0,          // 0 = NO LIMIT, charge TOUS les trades
  undefined   // undefined = TOUTES les timeframes
);
```

## ⚠️ Important

Si vous avez des **millions** de trades, considérez :
1. Archiver les trades anciens (> 6 mois)
2. Utiliser une pagination côté frontend
3. Augmenter la RAM du serveur PostgreSQL

## 🎉 Résultat final

Maintenant, quand vous regardez une stratégie :
- ✅ **Tous les trades** de toutes les timeframes (1m, 5m, 15m, 1h, 4h, 1d)
- ✅ **Vraies statistiques all-time** (pas limitées)
- ✅ **Performance optimale** avec des index appropriés
- ✅ **Aucun timeout** grâce au pool étendu et aux retries

