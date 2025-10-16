-- Script pour nettoyer les signaux en double dans la table trades
-- Un signal est considéré comme doublon si :
-- - Même strategy_name
-- - Même signal_type
-- - Même price (à 0.01 près)
-- - Timestamps à moins de 1 seconde d'écart

BEGIN;

-- 1. Afficher les doublons avant suppression
SELECT 
  COUNT(*) as total_duplicates,
  strategy_name,
  signal_type,
  price
FROM trades
WHERE id IN (
  SELECT a.id
  FROM trades a
  INNER JOIN trades b ON 
    a.strategy_name = b.strategy_name AND
    a.signal_type = b.signal_type AND
    ABS(a.price - b.price) < 0.01 AND
    ABS(a.timestamp - b.timestamp) < 1000 AND
    a.id > b.id
)
GROUP BY strategy_name, signal_type, price
ORDER BY total_duplicates DESC;

-- 2. Supprimer les doublons (garde le plus ancien, supprime les suivants)
DELETE FROM trades a
USING trades b
WHERE a.id > b.id 
  AND a.strategy_name = b.strategy_name
  AND a.signal_type = b.signal_type
  AND ABS(a.price - b.price) < 0.01
  AND ABS(a.timestamp - b.timestamp) < 1000;

-- 3. Afficher le résultat
SELECT 
  strategy_name,
  signal_type,
  COUNT(*) as remaining_signals
FROM trades
GROUP BY strategy_name, signal_type
ORDER BY strategy_name, signal_type;

COMMIT;

