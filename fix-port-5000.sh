#!/bin/bash

echo "Finding process using port 5000..."
PID=$(lsof -ti:5000)

if [ -z "$PID" ]; then
    echo "No process found on port 5000"
else
    echo "Found process: $PID"
    echo "Killing process $PID..."
    kill -9 $PID
    echo "Process killed. Port 5000 is now free."
fi

echo ""
echo "You can now start the backend server:"
echo "  cd backend"
echo "  npm run dev"
