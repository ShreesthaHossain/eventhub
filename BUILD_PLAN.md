# EventHub — build plan (low-error workflow)

This document is the single source of truth for **how to work on the repo** and **what to build next**. The codebase is a **monorepo**: `backend/` (Laravel 12 API) and `frontend/` (Vite + React + Tailwind + shadcn/ui).

## 1. Principles (fewer mistakes)

1. **Contract first**: API routes live in `backend/routes/api.php`. When adding a feature, define the route + validation + HTTP status codes before UI polish.
2. **One database change per migration file** (already split by table). Never reorder migrations after they ship to shared environments.
3. **Roles via Spatie** (`admin`, `organizer`, `attendee`, `sponsor`). Do not store a duplicate role column on `users`.
4. **Auth via Sanctum personal access tokens** for the SPA: send `Authorization: Bearer <token>`.
5. **Concurrency**: registration uses `lockForUpdate()` on the parent `events` row to avoid overbooking.
6. **QR payload**: JSON `{"t":"<token>","v":1}` — keep backward-compatible version bumps.

## 2. Local prerequisites (Windows)

- **PHP 8.2+** with extensions: `openssl`, `mbstring`, `curl`, `pdo_mysql` (or `pdo_sqlite`), `pdo_sqlite`, `zip`, `fileinfo`.
- **Node 20+** and npm.
- **Composer**: project ships `composer.phar` at repo root; use `php composer.phar` if `composer` is not on PATH.
- **SQLite** is the default for fast local dev (`backend/database/database.sqlite`). For MySQL, set `DB_*` in `backend/.env` and run migrations.

## 3. Commands (daily)

**Backend** (from `backend/`):

```bash
php artisan migrate
php artisan db:seed
php artisan serve
```

**Frontend** (from `frontend/`):

```bash
npm install
npm run dev
```

The Vite dev server proxies `/api` → `http://127.0.0.1:8000` (see `frontend/vite.config.js`). Run Laravel on port **8000** so the SPA can call `/api/...` without CORS friction.

**Composer** (from `backend/`):

```bash
php ../composer.phar install
```

If `composer install` fails on security advisories, this project sets `"audit": { "block-insecure": false }` in `composer.json` for local iteration; review advisories before production.

## 4. Seed accounts (demo)

After `php artisan db:seed`:

| Email                 | Password   | Role        |
|-----------------------|------------|-------------|
| `admin@eventhub.local`| `password` | admin       |
| `organizer@eventhub.local` | `password` | organizer |

## 5. What is implemented now

- **RBAC + auth API** (register with role, login, logout, `me`).
- **Events** (draft → submit → pending → approve/reject), categories, venues.
- **Registrations** with waitlist when full; **QR ticket** generation (SVG) and scan endpoint.
- **Recommendations** (rule-based, uses `user_interests`).
- **Admin analytics** summary endpoint.
- **Frontend**: browse events, login/register, event detail + register, my registrations, admin dashboard (pending + KPIs).

## 6. Suggested implementation order (remaining features)

1. **Real-time seat availability**: Laravel Reverb or Pusher; broadcast on `Registration` created/updated; subscribe from React on event detail/list.
2. **Calendar UI**: `GET /api/events/calendar?from=&to=` is ready — add FullCalendar (or similar) on a `/calendar` page.
3. **Organizer UX**: create/edit event forms, “my events” view, attendance list + manual check-in.
4. **Sponsor flows**: sponsor dashboards / sponsorships (tables + policies not added yet).
5. **Production hardening**: MySQL, queue workers, mail, rate limits, audit logging, tighten CORS, remove demo passwords.

## 7. Git

Initialize git in `Event HUB/` when ready; ignore `backend/vendor`, `frontend/node_modules`, `backend/.env`, `backend/database/database.sqlite`, and root `composer.phar` if you keep it local.
