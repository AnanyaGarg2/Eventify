EventManager – Full‑Stack Event Management System

Overview
EventManager lets customers discover events, register, download QR‑coded PDF tickets, and post reviews, while organizers create/manage events, see participants, export CSVs, and perform real‑time check‑ins.

Tech Stack
- Backend: Node.js, Express.js, MongoDB (Mongoose), JWT auth
- Frontend: React (Vite), React Router, Axios, Tailwind CSS
- Realtime: Socket.IO (server + client)
- PDFs/QR: html2canvas + jsPDF for tickets; custom QR
- Tooling: ESLint, Prettier, Nodemon, PostCSS

Monorepo Structure
- backend/ – Express API, Socket.IO, MongoDB models, routes, controllers
- frontend/ – Vite React app (Tailwind), pages and hooks

Getting Started
Prerequisites
- Node.js 18+
- MongoDB running locally or a connection string

1) Clone and install
```bash
git clone <your-repo-url>
cd Event-management-system

# Backend deps
cd backend && npm install

# Frontend deps
cd ../frontend && npm install
```

2) Configure environment
Create `backend/.env` with values similar to:
```env
PORT=5050
MONGODB_URI=mongodb://localhost:27017/eventmanager
JWT_SECRET=supersecret
CLIENT_ORIGIN=http://localhost:5173
```

3) Run locally
Terminal A (backend):
```bash
cd backend
npm run dev
```

Terminal B (frontend):
```bash
cd frontend
npm run dev
```

Seeding (optional)
```bash
cd backend
node src/seed.js
```

Demo Accounts
- Customer: customer@example.com / password
- Organizer: organizer@example.com / password
- Admin: admin@example.com / password

Key Features
- Customers: browse events, register, download branded PDF tickets with QR, post reviews
- Organizers: create/manage events, view participants, export CSV, real‑time check‑in
- Events created by organizers are published immediately; admin approval is not required
- Home: recommendations, all events, statistics
- Dark mode, toast notifications, responsive UI

Sponsorship
-----------
Organizers configure event-specific packages from the dashboard (name, description, INR amount, benefits, sponsor limit, and availability). Customers submit one request per event; no payment is processed. Requests remain pending until the event owner approves or rejects them.

Sponsorship API:
- `GET /api/events/:eventId/sponsorship` - view event sponsorship details and available packages
- `POST /api/events/:eventId/sponsorship` - submit an authenticated sponsorship request (multipart form; optional `logo`)
- `GET /api/organizer/events/:eventId/sponsors` - list requests and totals for an event owned by the authenticated organizer
- `PATCH /api/sponsorship/:sponsorshipId/status` - approve or reject a pending request (event owner only)

MongoDB stores requests in a new `sponsorships` collection. The existing Event document adds `sponsorshipEnabled` (default `false`) and an embedded `sponsorshipPackages` array. Existing event documents need no migration; sponsorship stays disabled until an organizer configures it.

Participant approvals
---------------------
New registrations start as `pending`. Organizers can configure an optional event participant limit; pending requests do not consume it, and accepting requests is guarded by an atomic event counter so concurrent approvals cannot exceed the limit. Existing `registered` and `attended` records count as accepted for compatibility.

Participant API:
- `POST /api/events/:eventId/register` - create a pending registration for the authenticated user
- `GET /api/events/:eventId/participants` - list requests and event limit totals (event owner only)
- `PATCH /api/registrations/:registrationId/status` - accept or reject a pending request (event owner only)
- `PATCH /api/events/:eventId/participant-limit` - update the limit or set it to `null` for unlimited (event owner only)
- `GET /api/users/me/events` - get the authenticated user's event registrations and approval statuses

The Event document gains `participantLimit` (null means unlimited) and an internal `acceptedParticipantCount` used to serialize concurrent acceptances. Registration documents add `reviewedAt` and `reviewedBy`, and use `pending`, `accepted`, and `rejected` for new requests. No new registration collection is introduced.

Notable Hooks
- useTicketPDF: generate branded ticket PDFs from HTML
- useQrCheckIn: perform QR/ID check‑ins with live status (Socket.IO)

Scripts
Backend (`backend/package.json`):
- `npm run dev` – start server with nodemon

Frontend (`frontend/package.json`):
- `npm run dev` – start Vite dev server
- `npm run build` – production build
- `npm run preview` – preview build

Deployment Notes
- Set environment variables (`PORT`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`)
- Serve frontend build (Vite `dist/`) via your host or CDN
- Run backend as a service (PM2/Docker) and ensure CORS allows your frontend origin

License
MIT
