#!/bin/bash

# Script to test shared WebSocket architecture
# Simulates multiple users connecting simultaneously

echo "🧪 Testing Shared WebSocket Architecture"
echo "========================================="
echo ""

BASE_URL="http://localhost:3000"

# Function to connect a user via SSE
connect_user() {
  local user_id=$1
  local timeframe=${2:-1m}
  
  echo "👤 Connecting User $user_id to $timeframe..."
  
  # Start SSE connection in background
  curl -N -H "Accept: text/event-stream" \
    "${BASE_URL}/api/trading-shared?action=start&timeframe=${timeframe}" \
    2>/dev/null | head -n 5 &
  
  local pid=$!
  echo "  ✅ User $user_id connected (PID: $pid)"
  
  # Store PID for cleanup
  echo $pid >> /tmp/shared_ws_test_pids.txt
}

# Cleanup function
cleanup() {
  echo ""
  echo "🧹 Cleaning up test connections..."
  
  if [ -f /tmp/shared_ws_test_pids.txt ]; then
    while read pid; do
      kill $pid 2>/dev/null
    done < /tmp/shared_ws_test_pids.txt
    rm /tmp/shared_ws_test_pids.txt
  fi
  
  echo "✅ Cleanup complete"
}

# Set trap for cleanup on exit
trap cleanup EXIT INT TERM

# Clear previous test PIDs
rm -f /tmp/shared_ws_test_pids.txt

echo "📊 Initial Stats:"
curl -s "${BASE_URL}/api/ws-stats" | jq '.summary' 2>/dev/null || echo "Stats API not yet responding"
echo ""

echo "🚀 Simulating 5 concurrent users..."
echo ""

# Connect 5 users to different timeframes
connect_user "User1" "1m"
sleep 1

connect_user "User2" "5m"
sleep 1

connect_user "User3" "15m"
sleep 1

connect_user "User4" "1m"  # Same as User1
sleep 1

connect_user "User5" "1h"
sleep 2

echo ""
echo "⏳ Waiting 5 seconds for connections to establish..."
sleep 5

echo ""
echo "📊 Stats After Connections:"
curl -s "${BASE_URL}/api/ws-stats" | jq '.' 2>/dev/null || echo "Could not fetch stats"

echo ""
echo "🎯 Expected Results:"
echo "  - Active Sessions: 5"
echo "  - Total Subscriptions: 5"
echo "  - Shared WebSockets: 4 (1m, 5m, 15m, 1h)"
echo "  - Efficiency: ~20% (1 connection saved)"
echo ""

echo "⏳ Keeping connections open for 10 seconds..."
sleep 10

echo ""
echo "📊 Final Stats:"
curl -s "${BASE_URL}/api/ws-stats" | jq '.summary' 2>/dev/null || echo "Could not fetch stats"

echo ""
echo "✅ Test complete!"
echo ""
echo "💡 To see real-time logs:"
echo "   tail -f .next/server.log"
echo ""

# Cleanup will run automatically on exit

