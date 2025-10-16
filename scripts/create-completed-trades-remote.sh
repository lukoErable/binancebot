#!/bin/bash

SERVER="root@91.99.163.156"

echo "🔌 Création de la table completed_trades sur le serveur distant..."

ssh $SERVER << 'EOF'
sudo -i -u postgres psql -d tradingbot_db << 'SQL'

-- Créer la table pour les trades complets (paire entrée/sortie)
CREATE TABLE IF NOT EXISTS completed_trades (
  id SERIAL PRIMARY KEY,
  strategy_name VARCHAR(100) NOT NULL REFERENCES strategies(name) ON DELETE CASCADE,
  strategy_type VARCHAR(50) NOT NULL,
  position_type VARCHAR(10) NOT NULL CHECK (position_type IN ('LONG', 'SHORT')),
  
  -- Entry data
  entry_price DECIMAL(20, 8) NOT NULL,
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
  entry_reason TEXT,
  
  -- Exit data
  exit_price DECIMAL(20, 8) NOT NULL,
  exit_time TIMESTAMP WITH TIME ZONE NOT NULL,
  exit_reason TEXT,
  
  -- Trade results
  quantity DECIMAL(20, 8) NOT NULL,
  pnl DECIMAL(20, 8) NOT NULL,
  pnl_percent DECIMAL(10, 4) NOT NULL,
  fees DECIMAL(20, 8) DEFAULT 0,
  duration BIGINT NOT NULL,
  is_win BOOLEAN NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherche rapide par stratégie
CREATE INDEX IF NOT EXISTS idx_completed_trades_strategy 
  ON completed_trades(strategy_name, exit_time DESC);

-- Index pour recherche globale
CREATE INDEX IF NOT EXISTS idx_completed_trades_exit_time 
  ON completed_trades(exit_time DESC);

-- Index pour statistiques
CREATE INDEX IF NOT EXISTS idx_completed_trades_win 
  ON completed_trades(strategy_name, is_win);

-- Vérifier que la table a été créée
\d completed_trades

SQL
EOF

echo "✅ Table completed_trades créée"

