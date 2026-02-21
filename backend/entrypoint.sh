#!/bin/bash

set -e

echo "=== Primary Portal Backend Starting ==="

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
while ! nc -z $DB_HOST 5432; do
  sleep 0.1
done
echo "✓ PostgreSQL is ready"

# Wait for Redis
echo "Waiting for Redis..."
while ! nc -z redis 6379; do
  sleep 0.1
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