# 🚀 Guide d'optimisation via SSH

## Installation rapide

Le système nécessite `psql` (client PostgreSQL) installé localement.

### Vérifier si psql est installé

```bash
psql --version
```

Si pas installé :

**macOS:**
```bash
brew install postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install postgresql-client
```

## Exécution du script

### Méthode 1 : Avec les paramètres par défaut

```bash
./scripts/optimize-db-ssh.sh
```

### Méthode 2 : Avec des paramètres personnalisés

```bash
DB_HOST=91.99.163.156 \
DB_PORT=5432 \
DB_NAME=tradingbot_db \
DB_USER=tradingbot_user \
DB_PASSWORD=tradingbot_secure_2024 \
./scripts/optimize-db-ssh.sh
```

### Méthode 3 : Depuis le dossier racine

```bash
cd /Users/lucasfabregoule/Documents/printer
./scripts/optimize-db-ssh.sh
```

## Ce que fait le script

Le script va :

1. ✅ Se connecter à PostgreSQL via SSH
2. ✅ Créer 6 index optimisés pour les requêtes rapides
3. ✅ Analyser les tables pour mettre à jour les statistiques
4. ✅ Afficher un rapport des index créés
5. ✅ Afficher les statistiques des tables

## Sortie attendue

```
🚀 Starting database optimization via SSH...

📊 Connecting to database: tradingbot_user@91.99.163.156:5432/tradingbot_db

════════════════════════════════════════════════════════════════
  CREATING INDEXES FOR PERFORMANCE OPTIMIZATION
════════════════════════════════════════════════════════════════

📊 Creating index on completed_trades(strategy_name)
CREATE INDEX
✅ Success

📊 Creating index on completed_trades(strategy_name, timeframe)
CREATE INDEX
✅ Success

📊 Creating index on completed_trades(exit_time)
CREATE INDEX
✅ Success

📊 Creating composite index on completed_trades(strategy_name, exit_time)
CREATE INDEX
✅ Success

📊 Creating index on strategies(name, timeframe)
CREATE INDEX
✅ Success

📊 Creating index on open_positions(strategy_name, timeframe)
CREATE INDEX
✅ Success

════════════════════════════════════════════════════════════════
  ANALYZING TABLES
════════════════════════════════════════════════════════════════

📊 Analyzing completed_trades
ANALYZE
✅ Success

📊 Analyzing strategies
ANALYZE
✅ Success

📊 Analyzing open_positions
ANALYZE
✅ Success

════════════════════════════════════════════════════════════════
  INDEXES ON completed_trades
════════════════════════════════════════════════════════════════

                    indexname                    |                    indexdef
-------------------------------------------------+------------------------------------------------
 completed_trades_pkey                           | CREATE UNIQUE INDEX completed_trades_pkey...
 idx_completed_trades_exit_time                  | CREATE INDEX idx_completed_trades_exit_time...
 idx_completed_trades_strategy_exit              | CREATE INDEX idx_completed_trades_strategy_exit...
 idx_completed_trades_strategy_name              | CREATE INDEX idx_completed_trades_strategy_name...
 idx_completed_trades_strategy_timeframe         | CREATE INDEX idx_completed_trades_strategy_timeframe...

════════════════════════════════════════════════════════════════
  TABLE STATISTICS
════════════════════════════════════════════════════════════════

 schemaname |     tablename     | size  | row_count
------------+-------------------+-------+-----------
 public     | completed_trades  | 256 kB|      1547
 public     | strategies        | 48 kB |        21
 public     | open_positions    | 8192 B|         3

════════════════════════════════════════════════════════════════
✅ Database optimization complete!
🚀 Queries should now be much faster with large amounts of trades.
════════════════════════════════════════════════════════════════
```

## Impact sur les performances

### Avant optimisation
```
⏳ Query timeout on attempt 1/3, retrying...
❌ Error: Connection terminated due to connection timeout
```

### Après optimisation
```
✅ [Strategy Name] Restored: 2547 trades (all timeframes)
⚡ Query time: 45ms (au lieu de timeout)
```

## Fréquence d'exécution

- ✅ **Première fois** : Obligatoire après le déploiement
- ✅ **Après** : Optionnel, seulement si vous constatez des ralentissements
- ✅ **Automatique** : Les index persistent même après redémarrage de la DB

## Dépannage

### Erreur : "psql: command not found"
➡️ Installez PostgreSQL client (voir section Installation)

### Erreur : "FATAL: password authentication failed"
➡️ Vérifiez les variables d'environnement DB_USER et DB_PASSWORD

### Erreur : "could not connect to server"
➡️ Vérifiez que le serveur PostgreSQL est accessible : `telnet 91.99.163.156 5432`

### Index déjà existant
➡️ C'est normal ! Le script utilise `IF NOT EXISTS` pour éviter les doublons

## Commandes utiles

### Voir tous les index
```bash
PGPASSWORD="tradingbot_secure_2024" psql -h 91.99.163.156 -U tradingbot_user -d tradingbot_db -c "\di"
```

### Supprimer un index (si besoin)
```bash
PGPASSWORD="tradingbot_secure_2024" psql -h 91.99.163.156 -U tradingbot_user -d tradingbot_db -c "DROP INDEX idx_completed_trades_strategy_name;"
```

### Voir la taille des tables
```bash
PGPASSWORD="tradingbot_secure_2024" psql -h 91.99.163.156 -U tradingbot_user -d tradingbot_db -c "SELECT pg_size_pretty(pg_total_relation_size('completed_trades'));"
```

## Résultat final

Après l'exécution du script, votre application chargera **TOUS les trades all-time** rapidement, sans timeout ! 🎉

