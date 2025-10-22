#!/bin/bash
# Migration script: Replace user_id (INT) with user_email (VARCHAR)

set -e

echo "🔄 Starting migration to user_email..."

# PostgreSQL connection details
DB_NAME="tradingbot_db"
DB_USER="tradingbot_user"
DB_HOST="91.99.163.156"
DB_PORT="5432"

PGPASSWORD="tradingbot_secure_2024" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'SQL'

-- 1. Add user_email column to strategies table
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);

-- 2. Migrate existing data (ALL existing user_ids → lucasfabregoule@gmail.com)
UPDATE strategies 
SET user_email = 'lucasfabregoule@gmail.com' 
WHERE user_email IS NULL;

-- 3. Make user_email NOT NULL
ALTER TABLE strategies ALTER COLUMN user_email SET NOT NULL;

-- 4. Drop old constraints and create new ones
ALTER TABLE strategies DROP CONSTRAINT IF EXISTS strategies_user_id_name_timeframe_key;
ALTER TABLE strategies DROP CONSTRAINT IF EXISTS strategies_pkey;

-- 5. Add new primary key and unique constraint
ALTER TABLE strategies ADD CONSTRAINT strategies_pkey PRIMARY KEY (id);
ALTER TABLE strategies ADD CONSTRAINT strategies_user_email_name_timeframe_key 
  UNIQUE (user_email, name, timeframe);

-- 6. Create index for performance
CREATE INDEX IF NOT EXISTS idx_strategies_user_email ON strategies(user_email);

-- 7. Drop user_id column
ALTER TABLE strategies DROP COLUMN IF EXISTS user_id;

-- 8. Repeat for open_positions table
ALTER TABLE open_positions ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);

UPDATE open_positions 
SET user_email = 'lucasfabregoule@gmail.com' 
WHERE user_email IS NULL;

ALTER TABLE open_positions ALTER COLUMN user_email SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_open_positions_user_email ON open_positions(user_email);

ALTER TABLE open_positions DROP COLUMN IF EXISTS user_id;

-- 9. Repeat for completed_trades table
ALTER TABLE completed_trades ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);

UPDATE completed_trades 
SET user_email = 'lucasfabregoule@gmail.com' 
WHERE user_email IS NULL;

ALTER TABLE completed_trades ALTER COLUMN user_email SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_completed_trades_user_email ON completed_trades(user_email);

ALTER TABLE completed_trades DROP COLUMN IF EXISTS user_id;

-- 10. Summary
SELECT 
  'strategies' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT user_email) as unique_users
FROM strategies
UNION ALL
SELECT 
  'open_positions',
  COUNT(*),
  COUNT(DISTINCT user_email)
FROM open_positions
UNION ALL
SELECT 
  'completed_trades',
  COUNT(*),
  COUNT(DISTINCT user_email)
FROM completed_trades;

SQL

echo "✅ Migration complete!"

