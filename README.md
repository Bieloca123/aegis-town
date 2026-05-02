# Aegis City

A multiplayer spatial workspace — customizable rooms, tile-based movement, and (optional) proximity video chat. Scaffolded from the Gather-clone reference architecture and rebranded.

Built with TypeScript, Next.js (App Router), Supabase, Socket.io, Tailwind CSS, Pixi.js, and Agora.

## Project layout

```
aegis-city/
├── frontend/   # Next.js app (UI, Pixi scene, Agora client, Socket.io client)
├── backend/    # Express + Socket.io server, Supabase realtime subscriptions
├── package.json # root convenience scripts (concurrently)
└── Procfile    # for Heroku-style deploys
```

## Prerequisites

- Node.js 20+ (tested on 22.x)
- npm 10+
- A Supabase project with the expected schema (the `realms` table is referenced by the backend realtime subscription)
- (Optional) An Agora project for video chat — leave the keys blank to disable video features

## Setup

```bash
# from the project root
npm install                  # installs the root concurrently dev dep
npm run install:all          # installs frontend + backend deps
```

Environment files:

- `frontend/.env.local` — copy from `frontend/.env.local.example` and fill in
- `backend/.env` — copy from `backend/.env.example` and fill in

## Running locally

From the project root:

```bash
npm run dev
```

This starts both servers via `concurrently`:
- frontend → http://localhost:3000
- backend  → http://localhost:3001

If you prefer separate terminals:

```bash
# terminal 1
cd frontend && npm run dev
# terminal 2
cd backend  && npm run dev
```

## Environment variables

### `frontend/.env.local`

| Key | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for client-side auth/db |
| `NEXT_PUBLIC_BASE_URL` | Frontend origin (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_BACKEND_URL` | Socket.io backend URL (e.g. `http://localhost:3001`) |
| `SERVICE_ROLE` | Supabase service role (used by server actions) |
| `NEXT_PUBLIC_AGORA_APP_ID` | Agora App ID — leave blank to disable video |
| `APP_CERTIFICATE` | Agora App Certificate for token signing |

### `backend/.env`

| Key | Purpose |
|-----|---------|
| `FRONTEND_URL` | CORS origin for Express + Socket.io |
| `SUPABASE_URL` | Supabase project URL |
| `SERVICE_ROLE` | Supabase service role (server-side privileged) |
| `PORT` | Backend port (defaults to 3001) |

## Build

```bash
npm run build  # builds frontend (next build) and backend (tsc → backend/dist)
```
