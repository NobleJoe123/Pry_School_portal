# Primary Portal - School Management System

## Quick Start with Docker

### First Time Setup
```bash
# Build and start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# Admin Panel: http://localhost:8000/admin

# Default superuser credentials:
# Email: admin@school.com
# Password: admin123
```

### Daily Development Commands
```bash
# Start all services
docker-compose up

# Start in detached mode (background)
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a specific service
docker-compose restart backend

# Rebuild after code changes
docker-compose up --build
```

### Django Management Commands
```bash
# Run migrations
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Django shell
docker-compose exec backend python manage.py shell

# Collect static files
docker-compose exec backend python manage.py collectstatic
```

### Database Commands
```bash
# Access PostgreSQL
docker-compose exec db psql -U postgres -d primary_portal_db

# Backup database
docker-compose exec db pg_dump -U postgres primary_portal_db > backup.sql

# Restore database
docker-compose exec -T db psql -U postgres primary_portal_db < backup.sql
```

### Redis Commands
```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Check Redis keys
docker-compose exec redis redis-cli KEYS '*'

# Flush Redis cache
docker-compose exec redis redis-cli FLUSHALL
```

### Clean Up
```bash
# Remove containers and volumes
docker-compose down -v

# Remove everything including images
docker-compose down -v --rmi all

# Remove dangling images
docker system prune
```

## Project Structure
```
primary_portal/
├── backend/          # Django REST API
├── frontend/         # React TypeScript
└── docker-compose.yml
```

## Tech Stack

- **Backend**: Django 5.0, DRF, PostgreSQL, Redis, Celery
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Infrastructure**: Docker, Docker Compose