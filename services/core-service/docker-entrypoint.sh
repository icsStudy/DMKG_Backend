#!/bin/sh
set -e

DB_PKG="/app/node_modules/@spacode/db"
if [ -n "$DATABASE_URL" ] && [ -d "$DB_PKG/prisma" ]; then
  echo "Running prisma generate..."
  cd "$DB_PKG" && prisma generate
  echo "Running prisma migrate deploy..."
  cd "$DB_PKG" && prisma migrate deploy
  cd /app
fi

exec "$@"
