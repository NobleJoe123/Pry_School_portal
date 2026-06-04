#!/bin/bash

set -e

echo "=== Primary Portal Backend Starting ==="

# Give Docker networking a moment to settle
sleep 2

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
MAX_RETRIES=60
RETRY=0
while ! nc -z "$DB_HOST" 5432 2>/dev/null; do
  RETRY=$((RETRY+1))
  if [ $RETRY -ge $MAX_RETRIES ]; then
    echo "ERROR: Could not connect to PostgreSQL after ${MAX_RETRIES} retries."
    exit 1
  fi
  echo "  PostgreSQL not ready yet (attempt $RETRY/$MAX_RETRIES)..."
  sleep 2
done
echo "✓ PostgreSQL is ready"

# Wait for Redis
echo "Waiting for Redis..."
RETRY=0
while ! nc -z redis 6379 2>/dev/null; do
  RETRY=$((RETRY+1))
  if [ $RETRY -ge $MAX_RETRIES ]; then
    echo "ERROR: Could not connect to Redis after ${MAX_RETRIES} retries."
    exit 1
  fi
  echo "  Redis not ready yet (attempt $RETRY/$MAX_RETRIES)..."
  sleep 2
done
echo "✓ Redis is ready"

# Run migrations
echo "Running migrations..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput
echo "✓ Migrations complete"

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear
echo "✓ Static files collected"

# Create superuser
echo "Creating superuser..."
python manage.py shell <<EOF
from accounts.models import User

if not User.objects.filter(email='admin@school.com').exists():
    User.objects.create_superuser(
        email='admin@school.com',
        username='admin',
        first_name='Admin',
        last_name='User',
        password='admin123'
    )
    print('✓ Superuser created: admin@school.com / admin123')
else:
    print('✓ Superuser already exists')
EOF

echo "=== Backend Ready! ==="
echo ""

# Execute the command
exec "$@"