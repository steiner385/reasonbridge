#!/bin/bash

# Stop script for ReasonBridge Demo Mode

set -e  # Exit on any error

echo "🛑 Stopping ReasonBridge Demo Mode"
echo "=================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "⚠️  Docker is not running."
    exit 0
fi

echo "🐳 Stopping and removing containers..."
docker compose -f docker-compose.e2e.yml down -v

echo ""
echo "🧹 Cleaning up any remaining containers..."
docker ps -a -q -f "name=reasonbridge-.*-e2e" | xargs -r docker rm -f 2>/dev/null || true

echo ""
echo "✅ ReasonBridge Demo Mode has been stopped."
echo ""
echo "💡 To start again: ./run-demo.sh"