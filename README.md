# Kundenportal NG

Rewrite des Kundenportals als Monorepo:

- **`api/`** — Laravel 12 (PHP 8.4), reine JSON-API. Externe Stammdaten (Verträge, Rechnungen, Zählpunkte, Lastgänge) kommen aus der KVS/Pebs `customer-data-api` und werden über [Saloon](https://docs.saloon.dev)-Connectoren in strikte readonly-DTOs gemappt — keine Fake-Eloquent-Models mehr. Lokale MySQL-DB nur für Auth, Ticket-/Postfach-Nachrichten, Uploads, Mail-Log und Börsenpreise. PHPStan level max, Pint, PHPUnit.
- **`frontend/`** — TanStack Start (React) SPA mit TanStack Query, shadcn/ui (Tailwind v4) und Recharts. Deutsche UI, mandantenfähiges Theming (`voltaik-check`, `friesen-werk`).
- **`mobile/`** — Expo-App (React Native, expo-router, TanStack Query) für den Kundenbereich: Startseite je nach Tarif (aktueller Börsenpreis bzw. „Auf einen Blick“), Profil, Rechnungen, Zählerstände inkl. Melden, Zahlungsmethode, Vertrags- und Tarifdetails. Dunkles Design, ein Farbsatz pro Mandant unter `mobile/src/theme/tenants/`.

Auth: Sanctum SPA-Cookie-Modus (stateful, same-origin über Dev-Proxy bzw. nginx in Produktion). Die App tauscht ihre Zugangsdaten über `POST /api/auth/token` gegen einen Bearer-Token (Sanctum Personal Access Token) und widerruft ihn mit `DELETE /api/auth/token`.

## Entwicklung

Voraussetzungen: PHP 8.4 + Composer, Node 22+, Docker.

```bash
make setup   # Container starten, composer/npm install, migrate --seed
make dev     # api :8000, queue, scheduler, frontend :3000 (proxied /api + /sanctum)
```

Dienste: MySQL (:3306), Mailpit UI (http://localhost:8025), MinIO Console (http://localhost:9001, Bucket `customer-api` für Vertragsdokumente).

### App

```bash
make setup-mobile   # npm install in mobile/, .env aus .env.example
make mobile         # expo start (Expo Go bzw. Dev-Client)
```

In `mobile/.env` zeigt `EXPO_PUBLIC_API_URL` auf die laufende API — im Simulator/Emulator oder auf dem Gerät die LAN-IP des Rechners statt `localhost`. `EXPO_PUBLIC_CLIENT` wählt den Mandanten-Farbsatz.

## Qualitäts-Gates

```bash
make stan    # PHPStan level max, keine Baseline
make lint    # Pint --test, tsc --noEmit, eslint
make test    # PHPUnit + Vitest + Jest (mobile)
```

## Deployment

Empfohlen: **Same-Origin hinter einem nginx** pro Mandant — das SPA-Build als
statische Dateien, `/api`, `/sanctum` und `/up` an PHP-FPM proxied. Dadurch
entfallen CORS und Cross-Domain-Cookies vollständig.

```nginx
server {
    server_name portal.example.de;
    root /srv/kundenportal/frontend/dist/client;

    location / {
        try_files $uri /_shell.html;   # SPA-Shell
    }

    location ~ ^/(api|sanctum|up) {
        # Laravel public/ als Backend (php-fpm oder Octane)
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Pro Mandant eine eigene `.env` (`CLIENT`, `APP_URL`, `FRONTEND_URL`,
`SANCTUM_STATEFUL_DOMAINS=portal.example.de`, `SESSION_DOMAIN`). Cron:
`* * * * * php artisan schedule:run` (Queue-Worker und Börsenpreis-Fetch
laufen über den Scheduler; der Preis-Fetch nur bei aktiviertem
`dynamic-electric-prices`-Flag).

**Datenübernahme:** Die Tabellen `users`, `contract_to_users`,
`customer_messages`, `company_messages`, `customer_uploaded_files`,
`company_uploaded_files`, `user_mail_logs`, `market_prices` sind
spaltenkompatibel zur alten Anwendung (`mysqldump` dieser Tabellen genügt).
Passwörter (bcrypt) bleiben gültig; Sessions und bereits versandte signierte
Mail-Links verfallen — der Admin-Button „Setup-Mail senden" deckt den
Neuversand ab. Chat-Uploads liegen unter `storage/app` (`customer-uploads/`,
`company-uploads/`) und werden mitkopiert.

**Bewusst nicht portiert:** `/logs` (Log-Viewer), `TestController`,
installierbare PWA (Manifest pro Mandant kann später als statische Datei
ergänzt werden), Mobile-Detect-Serverweiche (responsive Navigation im SPA).

## Paritäts-Checkliste (manuell, pro Mandant)

- [ ] Login / Logout, Passwort vergessen → Mail → Reset
- [ ] Account-Setup-Link (Admin legt Benutzer an → Mail → Passwort setzen)
- [ ] E-Mail-Verifizierung inkl. erneutem Versand
- [ ] Vertragsliste (1 Vertrag → Direktweiterleitung), Vertrags-Dashboard-Karten
- [ ] Dokument-Download (inline + Download)
- [ ] Alle 8 Änderungsformulare → Ticket + Firmen-Mail + Infotext
- [ ] Postfach: Nachricht + Datei-Upload beidseitig, Gelesen-Markierung
- [ ] Profil: E-Mail-Änderung (Re-Verifizierung), Passwort-Änderung
- [ ] Admin: Dashboard-Zähler, Vertrags-/Benutzersuche, Zuordnung
      (Auto-Bestätigung vs. Bestätigungsmail), Ticket-Workflow, Ausgang
- [ ] friesen-werk: Börsenpreise, Abrechnung, Lastgänge (Flag-Gating prüfen)
- [ ] Mails in Mailpit: Absender, Anrede/Grußformel des Mandanten, Links

## Architektur-Konventionen (api/)

- Jede Klasse `final`, jede Datei `declare(strict_types=1)`.
- Externe API-Zugriffe nur über `app/Integrations/*` (Saloon). DTOs sind `final readonly`, gebaut über `fromArray()` mit strikten Extraktoren — fehlende/falsch typisierte Keys werfen `InvalidApiPayloadException`.
- Domain-Logik (`app/Domain/*`) ist rein: keine Facades, kein `config()`.
- JSON-Ausgabe über API Resources; das Backend liefert rohe Zahlen/ISO-Daten, formatiert wird im Frontend.
- Mandanten-Konfiguration über `CLIENT` env + `config/clients/{slug}.php`, gekapselt in `App\Support\TenantConfig`.
