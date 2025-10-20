#!/bin/bash

# Script to clean database and keep only 3 strategies:
# - QuickStrike Scalp
# - Trend Follower AI
# - ConservativeTrendTrader

echo "🧹 Cleaning database - keeping only 3 strategies..."

ssh root@91.99.163.156 << 'ENDSSH'

echo "📊 Current strategies in database:"
su - postgres -c "psql tradingbot_db -c \"SELECT name, timeframe FROM strategies ORDER BY name, timeframe;\""

echo ""
echo "🗑️  Deleting all strategies EXCEPT the 3 to keep..."

# Delete completed trades for strategies we don't want
su - postgres -c "psql tradingbot_db" << 'EOF'
DELETE FROM completed_trades 
WHERE strategy_name NOT IN ('QuickStrike Scalp', 'Trend Follower AI', 'ConservativeTrendTrader');

DELETE FROM open_positions 
WHERE strategy_name NOT IN ('QuickStrike Scalp', 'Trend Follower AI', 'ConservativeTrendTrader');

DELETE FROM strategy_performances 
WHERE strategy_name NOT IN ('QuickStrike Scalp', 'Trend Follower AI', 'ConservativeTrendTrader');

DELETE FROM strategies 
WHERE name NOT IN ('QuickStrike Scalp', 'Trend Follower AI', 'ConservativeTrendTrader');

DELETE FROM custom_strategies 
WHERE name NOT IN ('QuickStrike Scalp', 'Trend Follower AI', 'ConservativeTrendTrader');

-- Clean up global_strategy_state
DELETE FROM global_strategy_state 
WHERE strategy_name NOT IN ('QuickStrike Scalp', 'Trend Follower AI', 'ConservativeTrendTrader');

-- Reset the 3 strategies to inactive state with clean timers
UPDATE strategies 
SET is_active = false, activated_at = NULL, total_active_time = 0
WHERE name IN ('QuickStrike Scalp', 'Trend Follower AI', 'ConservativeTrendTrader');

UPDATE global_strategy_state 
SET is_globally_active = false, activated_at = NULL, total_active_time = 0
WHERE strategy_name IN ('QuickStrike Scalp', 'Trend Follower AI', 'ConservativeTrendTrader');

-- Delete ALL trades for the 3 strategies (fresh start)
DELETE FROM completed_trades 
WHERE strategy_name IN ('QuickStrike Scalp', 'Trend Follower AI', 'ConservativeTrendTrader');

DELETE FROM open_positions 
WHERE strategy_name IN ('QuickStrike Scalp', 'Trend Follower AI', 'ConservativeTrendTrader');
EOF

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Remaining strategies:"
su - postgres -c "psql tradingbot_db -c \"SELECT name, timeframe, is_active, total_active_time FROM strategies ORDER BY name, timeframe;\""

echo ""
echo "📈 Trades count by strategy:"
su - postgres -c "psql tradingbot_db -c \"SELECT strategy_name, timeframe, COUNT(*) as trade_count FROM completed_trades GROUP BY strategy_name, timeframe ORDER BY strategy_name, timeframe;\""

echo ""
echo "🎯 Database is now clean with only 3 strategies!"

ENDSSH

echo ""
echo "✅ Done! Database cleaned successfully."
echo "🔄 Now restart your app to reload the clean data."

