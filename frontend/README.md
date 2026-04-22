# EventHub — Frontend (React 19 + Vite)

The SPA frontend for EventHub. Built with React 19, React Router 7, Tailwind 4, shadcn/ui, Recharts, FullCalendar, and Laravel Echo (Reverb).

---

## Requirements

- Node 20+
- The Laravel backend running on `http://127.0.0.1:8000`
- Laravel Reverb running on `ws://127.0.0.1:8080` (for real-time seat updates)

---

## Local setup

```bash
# From frontend/
npm install
npm run dev      # Vite dev server on http://localhost:5173
```

The Vite dev server proxies all `/api` requests to `http://127.0.0.1:8000`, so there's no CORS configuration needed in development.

---

## Build for production

```bash
npm run build    # Outputs to dist/
```

Set `VITE_API_BASE` in a `.env` file if the API is on a different origin:

```
VITE_API_BASE=https://api.eventhub.example
```

---

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_BASE` | `/api` | Backend API base URL |
| `VITE_REVERB_APP_KEY` | — | Reverb/Pusher app key |
| `VITE_REVERB_HOST` | `127.0.0.1` | Reverb WebSocket host |
| `VITE_REVERB_PORT` | `8080` | Reverb WebSocket port |
| `VITE_REVERB_SCHEME` | `http` | `http` or `https` |

Copy these from the backend `.env` (the `VITE_REVERB_*` vars are already set to forward from `REVERB_*`).

---

## Pages & routes

| Path | Access | Description |
|------|--------|-------------|
| `/` | Public | Browse & search approved events |
| `/calendar` | Public | FullCalendar visual grid of events |
| `/events/:id` | Public | Event detail + register + QR ticket + live seats |
| `/login` | Guest | Login |
| `/register` | Guest | Register (choose role) |
| `/me/registrations` | Auth | My registrations |
| `/organizer/events` | Organizer | Create/edit/submit events |
| `/organizer/attendance` | Organizer | QR scan + attendance list |
| `/sponsor` | Sponsor | Apply to sponsor events, track applications |
| `/admin` | Admin | Approve events, review sponsorships, KPIs |

---

## Real-time seats

When any user registers or cancels on an event, the seat count on `EventDetailPage` updates live via Laravel Reverb (WebSocket). A green "Live" indicator appears next to the seat count once the WebSocket connection is established.
