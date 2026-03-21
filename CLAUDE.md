# Nexus — Development Guide

## Project Overview
Cross-platform personal assistant PWA: tasks, shopping, notes, calendar unified in one Notion-inspired app.

## Tech Stack
- **Frontend:** Expo SDK 55, React Native 0.83, TypeScript strict, Expo Router v4, NativeWind v4, Zustand 5, TanStack Query v5
- **Backend:** Hono 4.12+ on Bun 1.3+, Drizzle ORM, SQLite (WAL mode)
- **Monorepo:** Turborepo + pnpm workspaces
- **Linting:** Biome (tabs, double quotes, semicolons)

## Monorepo Structure
```
apps/mobile/     — Expo app (iOS, Android, Web PWA)
apps/api/        — Hono backend on Bun
packages/db/     — Drizzle ORM schema (shared between client & server)
packages/shared/ — Zod validators, TypeScript types, constants
packages/ui/     — Shared React Native component library
packages/sync/   — Offline-first sync engine (stub)
packages/config/ — Shared Biome and TypeScript configs
```

## Key Conventions
- All DB tables use soft deletes (`deleted_at` column)
- All tables include `id` (UUID), `created_at`, `updated_at`, `sync_version`
- API responses: `{ data: ... }` for success, `{ error: { message, code } }` for errors
- Auth: JWT (access 15m + refresh 7d) via Jose library
- Zod validators defined in `packages/shared`, used by both API and mobile
- Notion-inspired palette: ink `#1A1A2E`, accent `#4361EE`, surface `#FAFAFA`
- No hardcoded secrets — all secrets via environment variables (see `.env.example`)

## Running Locally
```bash
# Install deps
pnpm install

# Copy env and fill in values
cp .env.example apps/api/.env

# Start API (from apps/api/)
bun run dev

# Start mobile (from apps/mobile/)
pnpm run dev
```

## API Endpoints
- `POST /api/auth/register|login|refresh` — Authentication
- `GET|POST|PATCH|DELETE /api/tasks` — Tasks + labels
- `GET|POST|PATCH|DELETE /api/shopping/lists|items` — Shopping lists & items
- `POST /api/shopping/routes/optimize` — Nearest-neighbor route optimization
- `GET|POST|PATCH|DELETE /api/notes` — Notes + folders + documents + FTS5 search
- `GET /api/calendar/google/auth|callback` — Google OAuth flow
- `GET|POST|PATCH|DELETE /api/calendar/events` — Calendar events proxy (cached)
- `POST /api/sync/push` | `GET /api/sync/pull` — Offline sync engine
- `GET /api/search?q=` — Global search across all modules

## Database
- Schema: `packages/db/src/schema/` (13 tables)
- Initialized: `apps/api/src/lib/db.ts` via `initializeDatabase()`
- Migration path: SQLite → Postgres/Supabase (swap Drizzle dialect)

## Code Style
- Use Biome for formatting/linting (`pnpm check`)
- Prefer small, focused components
- Use TanStack Query hooks for all server state
- Use Zustand stores for client-only state (auth, workspace)
