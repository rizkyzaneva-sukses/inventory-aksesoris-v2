#!/bin/sh
set -e

echo "🚀 Starting inventory app..."
echo "⏳ Waiting for database to be ready..."

# Wait for PostgreSQL to be ready
MAX_RETRIES=30
RETRY_COUNT=0
until npx prisma db push --skip-generate 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "❌ Database not ready after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "⏳ Database not ready yet... retry $RETRY_COUNT/$MAX_RETRIES"
  sleep 2
done

echo "✅ Database schema synced!"

# Run seed (safe with upserts)
echo "🌱 Running seed..."
node prisma/seed.js || echo "⚠️ Seed skipped or already done"

echo "✅ App ready! Starting server..."
exec node server.js
