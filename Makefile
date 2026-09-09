.PHONY: setup setup-mobile dev mobile up down test test-api test-frontend test-mobile stan lint lint-api lint-frontend lint-mobile

up:
	docker compose up -d --wait mysql mailpit minio
	docker compose run --rm minio-init

down:
	docker compose down

setup: up
	cd api && composer install
	cd api && cp -n .env.example .env || true
	cd api && php artisan key:generate --ansi
	cd api && php artisan migrate --seed
	cd frontend && npm install

setup-mobile:
	cd mobile && npm install --legacy-peer-deps
	cd mobile && cp -n .env.example .env || true

dev: up
	npx concurrently -n api,queue,schedule,web -c blue,magenta,yellow,green \
		"cd api && php artisan serve --host=0.0.0.0" \
		"cd api && php artisan queue:listen --tries=1" \
		"cd api && php artisan schedule:work" \
		"cd frontend && npm run dev"

mobile:
	cd mobile && npx expo start

test: test-api test-frontend test-mobile

test-api:
	cd api && php artisan test

test-frontend:
	cd frontend && npm run test -- --run

test-mobile:
	cd mobile && npm test

stan:
	cd api && vendor/bin/phpstan analyse --memory-limit=1G

lint: lint-api lint-frontend lint-mobile

lint-api:
	cd api && vendor/bin/pint --test

lint-frontend:
	cd frontend && npm run typecheck && npm run lint

lint-mobile:
	cd mobile && npm run typecheck
