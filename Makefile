.PHONY: build up down logs migrate shell test

# Build and start services
build:
	docker-compose up --build -d

# Start services
up:
	docker-compose up -d

# Stop services
down:
	docker-compose down

# View logs
logs:
	docker-compose logs -f

# Backend logs only
logs-backend:
	docker-compose logs -f backend

# Run migrations
migrate:
	docker-compose exec backend python manage.py makemigrations
	docker-compose exec backend python manage.py migrate

# Django shell
shell:
	docker-compose exec backend python manage.py shell

# Create superuser
superuser:
	docker-compose exec backend python manage.py createsuperuser

# Run tests
test:
	docker-compose exec backend python manage.py test

# Clean everything
clean:
	docker-compose down -v
	docker system prune -f

# Restart backend
restart-backend:
	docker-compose restart backend

# Access database
db-shell:
	docker-compose exec db psql -U postgres -d primary_portal_db