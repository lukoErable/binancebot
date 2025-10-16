-- Script pour ajouter une contrainte UNIQUE sur les signaux
-- Empêche les doublons au niveau de la base de données
-- Protection en plus du système de verrouillage dans le code

BEGIN;

-- 1. Vérifier qu'il n'y a plus de doublons
SELECT 
  COUNT(*) as total_duplicates,
  strategy_name,
  signal_type,
  ROUND(price::numeric, 2) as price_rounded
FROM trades
GROUP BY strategy_name, signal_type, ROUND(price::numeric, 2), CAST(timestamp/1000 AS INTEGER)
HAVING COUNT(*) > 1;

-- 2. Nettoyer les doublons restants avant d'ajouter la contrainte
DELETE FROM trades a
USING trades b
WHERE a.id > b.id 
  AND a.strategy_name = b.strategy_name
  AND a.signal_type = b.signal_type
  AND ABS(a.price - b.price) < 0.01
  AND ABS(a.timestamp - b.timestamp) < 1000;

-- 3. Créer un UNIQUE INDEX sur (strategy_name, signal_type, price, timestamp_second)
-- Note: Groupe les signaux par seconde pour éviter les faux positifs
-- Si 2 signaux identiques arrivent à 1+ seconde d'écart, c'est probablement légitime
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_signal_per_second 
ON trades (strategy_name, signal_type, price, (timestamp / 1000));

-- 4. Vérifier que l'index a été créé
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'trades'
  AND indexname = 'idx_unique_signal_per_second';

COMMIT;

-- Afficher le résultat
SELECT '✅ Contrainte UNIQUE ajoutée avec succès!' as status;

