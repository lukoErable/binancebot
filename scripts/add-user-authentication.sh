#!/bin/bash

# Script to add user authentication tables and columns

echo "🔐 Adding user authentication to database..."

ssh root@91.99.163.156 << 'ENDSSH'

su - postgres -c "psql tradingbot_db" << 'EOF'

\echo '════════════════════════════════════════════════════════════════'
\echo '  STEP 1: CREATE USERS TABLE'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

\echo '✅ Users table created'
\echo ''

\echo '════════════════════════════════════════════════════════════════'
\echo '  STEP 2: ADD USER_ID TO STRATEGIES'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

-- Add user_id column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'strategies' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE strategies ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added user_id column to strategies';
  ELSE
    RAISE NOTICE '⚠️  user_id column already exists in strategies';
  END IF;
END $$;

\echo ''

\echo '════════════════════════════════════════════════════════════════'
\echo '  STEP 3: ADD USER_ID TO COMPLETED_TRADES'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'completed_trades' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE completed_trades ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added user_id column to completed_trades';
  ELSE
    RAISE NOTICE '⚠️  user_id column already exists in completed_trades';
  END IF;
END $$;

\echo ''

\echo '════════════════════════════════════════════════════════════════'
\echo '  STEP 4: ADD USER_ID TO OPEN_POSITIONS'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'open_positions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE open_positions ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added user_id column to open_positions';
  ELSE
    RAISE NOTICE '⚠️  user_id column already exists in open_positions';
  END IF;
END $$;

\echo ''

\echo '════════════════════════════════════════════════════════════════'
\echo '  STEP 5: CREATE DEFAULT USER (lucasfabregoule@gmail.com)'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

INSERT INTO users (email, name, created_at, updated_at)
VALUES ('lucasfabregoule@gmail.com', 'Lucas Fabre-Goule', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING
RETURNING id;

\echo ''
\echo '✅ Default user created'
\echo ''

\echo '════════════════════════════════════════════════════════════════'
\echo '  STEP 6: ASSIGN EXISTING STRATEGIES TO lucasfabregoule@gmail.com'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

-- Get user ID
DO $$
DECLARE
  lucas_user_id INTEGER;
  updated_count INTEGER;
BEGIN
  SELECT id INTO lucas_user_id FROM users WHERE email = 'lucasfabregoule@gmail.com';
  
  IF lucas_user_id IS NOT NULL THEN
    -- Update strategies
    UPDATE strategies SET user_id = lucas_user_id WHERE user_id IS NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Assigned % strategies to lucasfabregoule@gmail.com', updated_count;
    
    -- Update completed_trades
    UPDATE completed_trades SET user_id = lucas_user_id WHERE user_id IS NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Assigned % trades to lucasfabregoule@gmail.com', updated_count;
    
    -- Update open_positions
    UPDATE open_positions SET user_id = lucas_user_id WHERE user_id IS NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Assigned % positions to lucasfabregoule@gmail.com', updated_count;
  ELSE
    RAISE NOTICE '❌ User lucasfabregoule@gmail.com not found';
  END IF;
END $$;

\echo ''

\echo '════════════════════════════════════════════════════════════════'
\echo '  STEP 7: UPDATE UNIQUE CONSTRAINTS'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

-- Drop old constraint
ALTER TABLE strategies DROP CONSTRAINT IF EXISTS strategies_name_timeframe_key;

-- Add new constraint with user_id
ALTER TABLE strategies 
ADD CONSTRAINT strategies_user_name_timeframe_key 
UNIQUE (user_id, name, timeframe);

\echo '✅ Updated unique constraint for strategies'
\echo ''

-- Same for open_positions
ALTER TABLE open_positions DROP CONSTRAINT IF EXISTS open_positions_strategy_name_timeframe_key;

ALTER TABLE open_positions 
ADD CONSTRAINT open_positions_user_strategy_timeframe_key 
UNIQUE (user_id, strategy_name, timeframe);

\echo '✅ Updated unique constraint for open_positions'
\echo ''

\echo '════════════════════════════════════════════════════════════════'
\echo '  STEP 8: CREATE INDEXES'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_completed_trades_user_id ON completed_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_open_positions_user_id ON open_positions(user_id);

\echo '✅ Indexes created'
\echo ''

\echo '════════════════════════════════════════════════════════════════'
\echo '  VERIFICATION'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

\echo 'Users table:'
SELECT id, email, name, created_at FROM users;

\echo ''
\echo 'Strategies by user:'
SELECT user_id, COUNT(*) as strategy_count FROM strategies GROUP BY user_id;

\echo ''
\echo 'Trades by user:'
SELECT user_id, COUNT(*) as trade_count FROM completed_trades GROUP BY user_id;

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '✅ USER AUTHENTICATION SETUP COMPLETE'
\echo '════════════════════════════════════════════════════════════════'

EOF

ENDSSH

echo ""
echo "✅ Database updated with user authentication!"
echo "🔑 Next: Add Google OAuth credentials to .env.local"

