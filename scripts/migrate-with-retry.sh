#!/bin/sh
# Neon's free tier puts the database to sleep when idle; the first connection can
# time out while it wakes up. Try the migration a few times before failing the build.
for attempt in 1 2 3 4 5; do
  if npx prisma migrate deploy; then
    exit 0
  fi
  echo "Database not reachable yet (attempt $attempt of 5). Waiting 10 seconds for it to wake up..."
  sleep 10
done
echo "Could not reach the database after 5 attempts."
exit 1
