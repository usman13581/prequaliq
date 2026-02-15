#!/bin/bash

echo "🔍 Finding all processes using port 5000..."

# Find all processes
PIDS=$(lsof -ti:5000)

if [ -z "$PIDS" ]; then
    echo "✅ No process found on port 5000"
else
    echo "Found processes: $PIDS"
    echo "🔪 Killing all processes..."
    
    # Kill all processes
    for PID in $PIDS; do
        echo "Killing process $PID..."
        kill -9 $PID 2>/dev/null
    done
    
    # Double check
    sleep 1
    REMAINING=$(lsof -ti:5000)
    if [ -z "$REMAINING" ]; then
        echo "✅ Port 5000 is now free!"
    else
        echo "⚠️  Some processes still running: $REMAINING"
        echo "Trying force kill..."
        lsof -ti:5000 | xargs kill -9 2>/dev/null
    fi
fi

echo ""
echo "📋 Current processes on port 5000:"
lsof -i:5000 || echo "Port 5000 is free"
