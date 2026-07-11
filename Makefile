.PHONY: setup dev up down test test-api test-frontend stan lint lint-api lint-frontend

up:
	docker compose up -d --wait

down:
	docker compose down

setup: up
	cd api && composer install
	cd api && cp -n .env.example .env || true
	cd api && php artisan key:generate --ansi
	cd api && php artisan migrate --seed
	cd frontend && npm install

dev: up
	npx concurrently -n api,queue,schedule,web -c blue,magenta,yellow,green \
		"cd api && php artisan serve" \
		"cd api && php artisan queue:listen --tries=1" \
		"cd api && php artisan schedule:work" \
		"cd frontend && npm run dev"

test: test-api test-frontend

test-api:
	cd api && php artisan test

test-frontend:
	cd frontend && npm run test -- --run

stan:
	cd api && vendor/bin/phpstan analyse --memory-limit=1G

lint: lint-api lint-frontend

lint-api:
	cd api && vendor/bin/pint --test

lint-frontend:
	cd frontend && npm run typecheck && npm run lint
