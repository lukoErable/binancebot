-- Add unique constraint to completed_trades table to prevent duplicates
-- A trade is unique by: strategy_name, position_type, entry_price, exit_price, pnl
-- This combination should be unique enough to prevent real duplicates

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_completed_trade 
ON completed_trades (
  strategy_name, 
  position_type,
  entry_price, 
  exit_price,
  pnl
);

-- Commentaire
COMMENT ON INDEX idx_unique_completed_trade IS 'Prevents duplicate completed trades with same strategy, position type, entry/exit prices, and pnl';

