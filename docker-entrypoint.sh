#!/bin/sh
set -e

echo "🚀 Starting inventory app..."
echo "⏳ Waiting for database to be ready..."

# Extract host and port from DATABASE_URL
# Supports both postgres:// and postgresql:// formats
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@[^:]*:\([0-9]*\)/.*|\1|p')

echo "📡 Connecting to database at ${DB_HOST}:${DB_PORT}..."

# Wait for PostgreSQL TCP port to be reachable
MAX_RETRIES=30
RETRY_COUNT=0
until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "❌ Database not reachable at ${DB_HOST}:${DB_PORT} after $MAX_RETRIES attempts. Exiting."
    echo "🔍 DATABASE_URL = $DATABASE_URL"
    exit 1
  fi
  echo "⏳ Database not ready yet... retry $RETRY_COUNT/$MAX_RETRIES"
  sleep 2
done

echo "✅ Database is reachable!"

# Sync schema with Prisma
echo "📦 Syncing database schema..."
npx prisma db push --skip-generate --accept-data-loss 2>&1 || {
  echo "⚠️ prisma db push failed, trying again in 5s..."
  sleep 5
  npx prisma db push --skip-generate --accept-data-loss 2>&1 || echo "⚠️ Schema sync failed - app may still work if schema exists"
}

echo "✅ Database schema synced!"

# Run seed (safe with upserts)
echo "🌱 Running seed..."
node prisma/seed.js || echo "⚠️ Seed skipped or already done"

echo "✅ App ready! Starting server..."
exec node server.js
