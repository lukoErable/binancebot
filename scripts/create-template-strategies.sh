#!/bin/bash
# Create template strategies for anonymous users

set -e

echo "🎨 Creating template strategies..."

# PostgreSQL connection details
DB_NAME="tradingbot_db"
DB_USER="tradingbot_user"
DB_HOST="91.99.163.156"
DB_PORT="5432"

PGPASSWORD="tradingbot_secure_2024" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'SQL'

-- Delete existing templates if any
DELETE FROM strategies WHERE user_email = 'template@system';

-- Insert 3 template strategies (inactive)
INSERT INTO strategies (
  user_email, name, type, is_active, config, timeframe, 
  activated_at, total_active_time, created_at, updated_at
) VALUES 
(
  'template@system',
  'RSI Momentum',
  'CUSTOM',
  false,
  '{"description":"Simple RSI-based momentum strategy","longNotes":"Buy when RSI is oversold (<30)","shortNotes":"Sell when RSI is overbought (>70)","strategyLogic":"BOTH","longEntryConditions":{"conditions":[{"type":"indicator","indicator":"rsi","comparison":"<","value":30}],"logic":"AND"},"shortEntryConditions":{"conditions":[{"type":"indicator","indicator":"rsi","comparison":">","value":70}],"logic":"AND"},"longExitConditions":{"conditions":[{"type":"indicator","indicator":"rsi","comparison":">","value":50}],"logic":"OR"},"shortExitConditions":{"conditions":[{"type":"indicator","indicator":"rsi","comparison":"<","value":50}],"logic":"OR"},"profitTargetPercent":2,"stopLossPercent":1,"maxPositionTime":60,"positionSize":0.1,"cooldownPeriod":5,"simulationMode":false,"color":"blue"}',
  '1m',
  NULL,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'template@system',
  'EMA Crossover',
  'CUSTOM',
  false,
  '{"description":"Classic EMA crossover strategy","longNotes":"Buy when EMA12 crosses above EMA26","shortNotes":"Sell when EMA12 crosses below EMA26","strategyLogic":"BOTH","longEntryConditions":{"conditions":[{"type":"indicator","indicator":"ema12","comparison":">","indicatorCompare":"ema26"}],"logic":"AND"},"shortEntryConditions":{"conditions":[{"type":"indicator","indicator":"ema12","comparison":"<","indicatorCompare":"ema26"}],"logic":"AND"},"longExitConditions":{"conditions":[{"type":"indicator","indicator":"ema12","comparison":"<","indicatorCompare":"ema26"}],"logic":"OR"},"shortExitConditions":{"conditions":[{"type":"indicator","indicator":"ema12","comparison":">","indicatorCompare":"ema26"}],"logic":"OR"},"profitTargetPercent":1.5,"stopLossPercent":0.75,"maxPositionTime":30,"positionSize":0.1,"cooldownPeriod":3,"simulationMode":false,"color":"green"}',
  '1m',
  NULL,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'template@system',
  'Trend Following',
  'CUSTOM',
  false,
  '{"description":"Multi-timeframe trend following","longNotes":"Buy when price > EMA50 and RSI > 50","shortNotes":"Sell when price < EMA50 and RSI < 50","strategyLogic":"BOTH","longEntryConditions":{"conditions":[{"type":"price","comparison":">","indicatorCompare":"ema50"},{"type":"indicator","indicator":"rsi","comparison":">","value":50}],"logic":"AND"},"shortEntryConditions":{"conditions":[{"type":"price","comparison":"<","indicatorCompare":"ema50"},{"type":"indicator","indicator":"rsi","comparison":"<","value":50}],"logic":"AND"},"longExitConditions":{"conditions":[{"type":"price","comparison":"<","indicatorCompare":"ema50"}],"logic":"OR"},"shortExitConditions":{"conditions":[{"type":"price","comparison":">","indicatorCompare":"ema50"}],"logic":"OR"},"profitTargetPercent":3,"stopLossPercent":1.5,"maxPositionTime":120,"positionSize":0.1,"cooldownPeriod":10,"simulationMode":false,"color":"purple"}',
  '1m',
  NULL,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Summary
SELECT name, is_active, user_email FROM strategies WHERE user_email = 'template@system';

SQL

echo "✅ Template strategies created!"

