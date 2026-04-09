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

# Sync schema with Prisma via node_modules (no global install)
echo "📦 Syncing database schema..."
SCHEMA_PUSHED=false

# Cara 1: node modules/prisma/build (paling reliable di standalone)
if [ "$SCHEMA_PUSHED" = "false" ]; then
  echo "Mencoba: node ./node_modules/prisma/build/index.js db push..."
  node ./node_modules/prisma/build/index.js db push --accept-data-loss 2>&1 && SCHEMA_PUSHED=true || echo "⚠️ node prisma/build gagal"
fi

# Cara 2: npx prisma (kalau tersedia)
if [ "$SCHEMA_PUSHED" = "false" ]; then
  echo "Mencoba: npx prisma db push..."
  npx prisma db push --accept-data-loss 2>&1 && SCHEMA_PUSHED=true || echo "⚠️ npx prisma gagal"
fi

# Cara 3: retry setelah delay
if [ "$SCHEMA_PUSHED" = "false" ]; then
  echo "⏳ Retry setelah 5 detik..."
  sleep 5
  node ./node_modules/prisma/build/index.js db push --accept-data-loss 2>&1 && SCHEMA_PUSHED=true || echo "⚠️ Schema sync gagal - gunakan /api/setup endpoint"
fi

if [ "$SCHEMA_PUSHED" = "true" ]; then
  echo "✅ Database schema synced!"
else
  echo "⚠️ Schema push gagal - app tetap berjalan, akses /api/setup?secret=setup-zaneva-2024 untuk setup manual"
fi

# Run seed (safe with upserts)
echo "🌱 Running seed..."
node prisma/seed.js 2>&1 || echo "⚠️ Seed skipped atau gagal - gunakan /api/setup endpoint"

echo "✅ App ready! Starting server..."
exec node server.js
