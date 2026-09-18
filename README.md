# Kundenportal NG

Rewrite des Kundenportals als Monorepo:

- **`api/`** — Laravel 12 (PHP 8.4), reine JSON-API. Externe Stammdaten (Verträge, Rechnungen, Zählpunkte, Lastgänge) kommen aus der KVS/Pebs `customer-data-api` und werden über [Saloon](https://docs.saloon.dev)-Connectoren in strikte readonly-DTOs gemappt — keine Fake-Eloquent-Models mehr. Lokale MySQL-DB nur für Auth, Ticket-/Postfach-Nachrichten, Uploads, Mail-Log und Börsenpreise. PHPStan level max, Pint, PHPUnit.
- **`frontend/`** — TanStack Start (React) SPA mit TanStack Query, shadcn/ui (Tailwind v4) und Recharts. Deutsche UI, mandantenfähiges Theming (`voltaik-check`, `friesen-werk`).
- **`mobile/`** — Expo-App (React Native, expo-router, TanStack Query) für den Kundenbereich: Startseite je nach Tarif (aktueller Börsenpreis bzw. „Auf einen Blick“), Profil, Rechnungen, Zählerstände inkl. Melden, Verbrauch (abgerechnete plus noch nicht abgerechnete Lastgänge je Tag/Monat/Jahr mit Kostensplit inkl. anteiliger Grundpreise, nur dynamische Tarife), Zahlungsmethode, Vertrags- und Tarifdetails. Dunkles Design, ein Farbsatz pro Mandant unter `mobile/src/theme/tenants/`.

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

Die App braucht die laufende API (`make dev`) und spricht sie ausschließlich
über `/api/*` mit Bearer-Token an — kein Cookie, kein CSRF, kein CORS
(`php artisan serve --host=0.0.0.0` lauscht bereits auf allen Interfaces).
Seed-Login: `kunde@example.com` / `password`.

#### `.env` der API (`api/.env`) für die App

| Variable | Zweck für die App |
| --- | --- |
| `APP_URL` | Muss die Adresse sein, unter der die App die API erreicht (z. B. `http://192.168.1.10:8000`). Signierte URLs und Mail-Links werden damit gebaut. |
| `CLIENT` | Mandant (`voltaik-check` \| `friesen-werk`). Muss zu `EXPO_PUBLIC_CLIENT` passen — `GET /api/tenant` liefert Name, Kontakt und Feature-Flags, die App zeigt die Startseite je nach Flag `dynamic-electric-prices` (aus `config/clients/{slug}.php`). |
| `CUSTOMER_DATA_API_URL`, `CUSTOMER_DATA_API_ROOT`, `CUSTOMER_DATA_API_TOKEN` | KVS/Pebs `customer-data-api`. Ohne diese Werte sind Verträge, Rechnungen, Zählerstände, Zahlungsmethode und Tarifdetails leer bzw. die Requests schlagen fehl. |
| `MARKETPARTNER_API_URL`, `MARKETPARTNER_API_TOKEN` | Börsenpreise für die Startseite bei `friesen-werk`. Der Fetch läuft über den Scheduler (`app:fetch-market-prices`, alle 10 Minuten) und nur bei aktivem Flag `dynamic-electric-prices`; ohne Token bleibt `GET /api/customers/{id}/market-prices` leer. |
| `MAIL_*`, `QUEUE_CONNECTION` | Änderungsformulare (Umzug, Rechnungsadresse, Bankverbindung, Abschlag, Zählerstand, Kündigung) erzeugen ein Ticket und eine Firmen-Mail über die Queue — `make dev` startet Queue-Worker und Scheduler mit, Mails landen in Mailpit. |
| `SANCTUM_TOKEN_PREFIX` | Optional, Präfix für die Personal Access Tokens (Secret-Scanning). |

Nicht benötigt für die App: `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`,
`FRONTEND_URL` (nur SPA/Cookie-Session und Mail-Links) sowie `CUSTOMER_API_S3_*`
(die App listet Rechnungen nur, lädt keine PDFs).

#### `.env` der App (`mobile/.env`)

| Variable | Zweck |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Basis-URL der API **ohne** `/api`, z. B. `http://192.168.1.10:8000`. Im Simulator/Emulator und auf dem Gerät die LAN-IP des Rechners statt `localhost` (Android-Emulator alternativ `http://10.0.2.2:8000`). Der Wert wird beim Bundling eingebacken — nach einer Änderung `expo start --clear`. |
| `EXPO_PUBLIC_CLIENT` | Mandanten-Slug wie `CLIENT` der API; wählt den Farbsatz unter `mobile/src/theme/tenants/`. |

Der Token liegt im `expo-secure-store` und wird beim Start über
`GET /api/auth/session` geprüft. Eine `401`-Antwort irgendeines Requests
verwirft ihn lokal (Login-Screen); „Abmelden" widerruft ihn per
`DELETE /api/auth/token`. `POST /api/auth/token` ist auf 10 Versuche pro
Minute gedrosselt.

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

## Bekannte Lücken ggü. der alten Anwendung

Durch einen manuellen Vergleich mit `kundenportal` identifizierte Funktionen,
die noch fehlen oder sich verhalten anders verhalten. Vor einem
Produktivgang durchgehen und bewusst entscheiden (nachbauen oder als
akzeptierte Abweichung dokumentieren).

**Sicherheit / Daten**
- [ ] `customer_messages.data` ist unverschlüsselt (JSON-Cast), im alten
      Portal per `EncryptedArrayFields`-Cast feldweise mit dem APP_KEY
      verschlüsselt (IBAN, Adressen, Kontaktdaten liegen aktuell im
      Klartext in der DB).
- [ ] Kein Schutz vor versehentlicher APP_KEY-Rotation in Produktion (alt:
      `KeyGenerateCommand`-Override), wird erst mit obigem Punkt relevant.
- [ ] IP-Beschränkung für den Admin-/Intern-Bereich (alt: `RestrictAdminIp`
      + `config('admin.allowed_ips')`) nicht portiert.

**Fachprozesse**
- [ ] Automatisches Anlegen von Benutzerkonten + Einladungsmail für neue
      Verträge ohne Zuordnung (alt: `app:sync-contract-index` +
      `app:create-missing-user-accounts`, täglich per Scheduler). Aktuell
      nur manuell über „Benutzer anlegen“ möglich.
- [ ] „System-Todos“ (alt: `Todo`-Model, Dashboard-Widget „Offene Todos“,
      Erledigt-Markieren) komplett nicht portiert.

**Admin-Bedienbarkeit**
- [ ] Mailverkehr-Log pro Benutzer einsehbar (`UserMailLog` wird weiterhin
      geschrieben, aber nirgends angezeigt, weder API-Endpoint noch UI).
- [ ] Vertrag einem Benutzer zuweisen per E-Mail-Suche mit Autocomplete
      (alt: `datalist` über bestehende Nutzer); neu nur per numerischer
      Benutzer-ID.
- [ ] Ticket-Filter „Bearbeiter“ als Dropdown mit Namen aller Admins; neu
      nur Freitext-Eingabe der Bearbeiter-ID.
- [ ] Schnelllinks „Kundenblatt“ / „Vertragsblatt“ / externer KVS-Link aus
      Ticket- und Ausgang-Listen heraus.
- [ ] Direktnachricht an einen Kunden aus Vertrags-, Benutzer- oder
      Ticket-Zeile heraus (aktuell nur zentral über das Postfach möglich).
- [ ] Filter „Setup-Mail erhalten“ in der Benutzerübersicht.
- [ ] „Vertragszuweisung entfernen“ ist nur noch auf der Benutzerseite
      verfügbar, nicht mehr direkt aus der Vertragsliste heraus.

**Mobile App** (Web-Frontend und API decken bereits alle 8 Formulare ab)
- [ ] Änderungsformular Kontaktdaten
- [ ] Änderungsformular Widerruf
- [ ] Postfach/Chat-Screen inkl. Datei-Upload

## Architektur-Konventionen (api/)

- Jede Klasse `final`, jede Datei `declare(strict_types=1)`.
- Externe API-Zugriffe nur über `app/Integrations/*` (Saloon). DTOs sind `final readonly`, gebaut über `fromArray()` mit strikten Extraktoren — fehlende/falsch typisierte Keys werfen `InvalidApiPayloadException`.
- Domain-Logik (`app/Domain/*`) ist rein: keine Facades, kein `config()`.
- JSON-Ausgabe über API Resources; das Backend liefert rohe Zahlen/ISO-Daten, formatiert wird im Frontend.
- Mandanten-Konfiguration über `CLIENT` env + `config/clients/{slug}.php`, gekapselt in `App\Support\TenantConfig`.
