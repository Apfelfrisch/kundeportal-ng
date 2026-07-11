# Kundenportal NG

Rewrite des Kundenportals als Monorepo:

- **`api/`** — Laravel 12 (PHP 8.4), reine JSON-API. Externe Stammdaten (Verträge, Rechnungen, Zählpunkte, Lastgänge) kommen aus der KVS/Pebs `customer-data-api` und werden über [Saloon](https://docs.saloon.dev)-Connectoren in strikte readonly-DTOs gemappt — keine Fake-Eloquent-Models mehr. Lokale MySQL-DB nur für Auth, Ticket-/Postfach-Nachrichten, Uploads, Mail-Log und Börsenpreise. PHPStan level max, Pint, PHPUnit.
- **`frontend/`** — TanStack Start (React) SPA mit TanStack Query, shadcn/ui (Tailwind v4) und Recharts. Deutsche UI, mandantenfähiges Theming (`voltaik-check`, `friesen-werk`).

Auth: Sanctum SPA-Cookie-Modus (stateful, same-origin über Dev-Proxy bzw. nginx in Produktion).

## Entwicklung

Voraussetzungen: PHP 8.4 + Composer, Node 22+, Docker.

```bash
make setup   # Container starten, composer/npm install, migrate --seed
make dev     # api :8000, queue, scheduler, frontend :3000 (proxied /api + /sanctum)
```

Dienste: MySQL (:3306), Mailpit UI (http://localhost:8025), MinIO Console (http://localhost:9001, Bucket `customer-api` für Vertragsdokumente).

## Qualitäts-Gates

```bash
make stan    # PHPStan level max, keine Baseline
make lint    # Pint --test, tsc --noEmit, eslint
make test    # PHPUnit + Vitest
```

## Architektur-Konventionen (api/)

- Jede Klasse `final`, jede Datei `declare(strict_types=1)`.
- Externe API-Zugriffe nur über `app/Integrations/*` (Saloon). DTOs sind `final readonly`, gebaut über `fromArray()` mit strikten Extraktoren — fehlende/falsch typisierte Keys werfen `InvalidApiPayloadException`.
- Domain-Logik (`app/Domain/*`) ist rein: keine Facades, kein `config()`.
- JSON-Ausgabe über API Resources; das Backend liefert rohe Zahlen/ISO-Daten, formatiert wird im Frontend.
- Mandanten-Konfiguration über `CLIENT` env + `config/clients/{slug}.php`, gekapselt in `App\Support\TenantConfig`.
