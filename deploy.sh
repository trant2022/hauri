#!/bin/bash
set -e

echo "=== Pulling latest changes ==="
git pull

echo "=== Stopping old containers ==="
docker compose down

echo "=== Rebuilding & restarting containers ==="
docker compose up -d --build

echo "=== Done ==="
