# EventHub — Backend (Laravel 12 API)

A JSON API for the EventHub event management SaaS. Built with Laravel 12, Sanctum, Spatie Permissions, and Laravel Reverb (WebSockets).

---

## Requirements

- PHP 8.2+ with extensions: `openssl`, `mbstring`, `curl`, `pdo_sqlite` (dev) or `pdo_mysql` (prod), `zip`, `fileinfo`
- Composer (or use `php ../composer.phar`)
- Node 20+ and npm (for the Vite asset pipeline)

---

## Local setup

```bash
# From backend/
php ../composer.phar install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
```

Then start the dev server:

```bash
php artisan serve          # API on http://127.0.0.1:8000
php artisan reverb:start   # WebSocket server on ws://127.0.0.1:8080
php artisan queue:listen   # Queue worker (for jobs/mail)
```

---

## Demo accounts (after `db:seed`)

| Email | Password | Role |
|-------|----------|------|
| `admin@eventhub.local` | `password` | admin |
| `organizer@eventhub.local` | `password` | organizer |

---

## Testing

```bash
php artisan test
```

Uses an in-memory SQLite database. 28 feature tests covering auth, registrations, QR scan, and admin approval.

---

## Key configuration

| `.env` variable | Purpose |
|-----------------|---------|
| `DB_CONNECTION` | `sqlite` (dev) or `mysql` (prod) |
| `BROADCAST_CONNECTION` | `reverb` (real-time seats) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend URLs — use `*` for dev only |
| `QUEUE_CONNECTION` | `database` (default) or `redis`/`sqs` |
| `MAIL_MAILER` | `log` (dev), `smtp`/`mailgun`/`ses` (prod) |
| `REVERB_APP_KEY` / `SECRET` / `ID` | Laravel Reverb WebSocket credentials |

---

## API overview

All endpoints are prefixed with `/api`. Auth endpoints are rate-limited to 10 requests/minute.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register (role: attendee/organizer/sponsor) |
| POST | `/auth/login` | — | Login → Sanctum token |
| POST | `/auth/logout` | ✓ | Revoke token |
| GET | `/auth/me` | ✓ | Current user |
| GET | `/events` | — | List approved events |
| GET | `/events/calendar` | — | Events in date range |
| GET | `/events/{id}` | — | Event detail |
| POST | `/events` | organizer | Create draft event |
| PUT | `/events/{id}` | organizer | Update event |
| DELETE | `/events/{id}` | organizer | Delete event |
| POST | `/events/{id}/submit` | organizer | Submit for approval |
| POST | `/events/{id}/register` | ✓ | Register / join waitlist |
| DELETE | `/events/{id}/register` | ✓ | Cancel registration |
| GET | `/events/{id}/ticket` | ✓ | QR ticket (SVG) |
| POST | `/attendance/scan` | organizer | Scan QR check-in |
| GET | `/events/{id}/attendance` | organizer | Attendance list |
| GET | `/admin/events/pending` | admin | Pending approvals |
| POST | `/admin/events/{id}/approve` | admin | Approve event |
| POST | `/admin/events/{id}/reject` | admin | Reject event |
| GET | `/admin/analytics/summary` | admin | KPI summary |
| GET | `/sponsorships/mine` | sponsor | My sponsorships |
| POST | `/events/{id}/sponsor` | sponsor | Apply to sponsor |
| PUT | `/sponsorships/{id}` | sponsor | Edit application |
| DELETE | `/sponsorships/{id}` | sponsor | Withdraw application |
| GET | `/events/{id}/sponsorships` | organizer | Sponsorships for event |
| POST | `/admin/sponsorships/{id}/review` | admin | Approve/reject sponsorship |

---

## Production checklist

- [ ] Switch `DB_CONNECTION` to `mysql` and set credentials
- [ ] Set `CORS_ALLOWED_ORIGINS` to your frontend domain
- [ ] Set `APP_ENV=production` and `APP_DEBUG=false`
- [ ] Configure `MAIL_MAILER` for transactional email
- [ ] Run a queue worker: `php artisan queue:work --daemon`
- [ ] Start Reverb: `php artisan reverb:start --host=0.0.0.0`
- [ ] Change seed demo passwords before going live
- [ ] Review security advisories: `php composer.phar audit`
