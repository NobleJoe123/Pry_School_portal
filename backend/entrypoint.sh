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
python manage.py migrate --noinput
echo "✓ Migrations complete"

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear
echo "✓ Static files collected"

# Superuser initialization check
echo "Checking superuser..."
python manage.py shell <<EOF
import os
from django.conf import settings
from accounts.models import User

admin_email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
admin_password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
admin_username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')

if admin_email and admin_password:
    if not User.objects.filter(email=admin_email).exists():
        User.objects.create_superuser(
            email=admin_email,
            username=admin_username,
            first_name='Admin',
            last_name='User',
            password=admin_password
        )
        print(f'✓ Superuser created from environment: {admin_email}')
    else:
        print(f'✓ Superuser already exists: {admin_email}')
elif settings.DEBUG:
    dev_email = 'admin@school.com'
    if not User.objects.filter(email=dev_email).exists():
        User.objects.create_superuser(
            email=dev_email,
            username='admin',
            first_name='Admin',
            last_name='User',
            password='admin123'
        )
        print('✓ Dev superuser created: admin@school.com / admin123 (DEBUG=True)')
    else:
        print('✓ Dev superuser already exists: admin@school.com')
else:
    print('ℹ Production mode (DEBUG=False): skipping automatic default superuser creation.')
EOF

echo "=== Backend Ready! ==="
echo ""

# Execute the command
exec "$@"