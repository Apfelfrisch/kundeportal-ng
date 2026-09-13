---
name: verify
description: Build, launch and drive the Kundenportal (Laravel API + TanStack Start SPA) to verify frontend/API changes at runtime.
---

# Verify Kundenportal changes

## Launch

Usually already running in dev. Check first:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/up   # API
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000      # SPA
```

If not: `make dev` (needs `make up` containers; starts api :8000, queue,
scheduler, vite :3000 with `/api` + `/sanctum` proxy).

## Login (seeded users, password `password`)

- Kunde: `kunde@example.com` → lands on `/kunde/2/vertrag/1`
- Admin: `admin@example.com`

Route params use the **local user id** (`/kunde/2/...`), NOT the
customer number 10001.

## Drive with Playwright

`playwright-core` + `executablePath: '/usr/bin/google-chrome'` works
headless. Gotchas:

- `networkidle` never fires (Vite HMR websocket + TanStack devtools keep
  connections open) — use `domcontentloaded` + explicit
  `waitForSelector`/`waitForTimeout`.
- A React hydration warning on the login page is pre-existing noise.
- Radix popovers animate in — wait ~600ms before screenshots.

## Useful pages

- `/kunde/2/strompreis` — Börsenpreise chart + DayPager (date navigation)
- `/kunde/2/vertrag/1/lastgaenge`, `/kunde/2/vertrag/1/abrechnung` — same DayPager
