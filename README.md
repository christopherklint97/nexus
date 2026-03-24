# Nexus

**Your Life, Unified.**

A cross-platform personal assistant Progressive Web App that unifies task management, shopping planning, note-taking, document storage, and calendar into one elegant, Notion-inspired interface.

## Features

- **Command Center** — Dashboard showing today's agenda, active tasks, shopping trips, and pinned notes with global search
- **Tasks** — Kanban board & list views, subtasks, recurring tasks, labels, priority levels (P1-P4), natural language dates
- **Smart Shopping** — Per-store lists with aisle grouping, check-off with running totals, nearest-neighbor route optimization
- **Recipes** — Structured ingredients & instructions, serving scaler, one-tap add-to-shopping-list, cuisine/difficulty/tag filtering
- **Notes** — Block-based editor (headings, checklists, code, quotes, callouts), slash commands, markdown shortcuts, full-text search, backlinks
- **Calendar** — Google Calendar integration with month/agenda views, event creation, unified timeline with tasks
- **Sync** — Offline-first architecture with push/pull sync and last-write-wins conflict resolution

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile/Web | Expo SDK 55, React Native 0.83, TypeScript |
| Navigation | Expo Router v4 (file-based, typed routes) |
| Styling | NativeWind v4 (Tailwind for RN) |
| State | Zustand 5 (client), TanStack Query v5 (server) |
| Backend | Hono 4.12+ on Bun 1.3+ |
| Database | SQLite (WAL mode) via Drizzle ORM |
| Auth | JWT (access + refresh) with bcrypt |
| Monorepo | Turborepo + pnpm workspaces |
| Linting | Biome |

## Quick Start

```bash
# Prerequisites: Node.js 20+, pnpm, Bun

# Clone and install
git clone https://github.com/christopherklint97/nexus.git
cd nexus
pnpm install

# Configure environment
cp .env.example apps/api/.env
# Edit apps/api/.env with your values (JWT_SECRET is required)

# Start the API server
cd apps/api
bun run dev

# In another terminal, start the mobile app
cd apps/mobile
pnpm run dev
```

## Project Structure

```
nexus/
├── apps/
│   ├── mobile/          # Expo app (21 routes)
│   │   ├── app/         # Expo Router screens
│   │   ├── components/  # UI components by module
│   │   ├── lib/         # API hooks, query clients
│   │   └── stores/      # Zustand state stores
│   └── api/             # Hono + Bun backend
│       └── src/
│           ├── routes/  # auth, tasks, shopping, recipes, notes, calendar, sync, search
│           ├── lib/     # db, auth helpers
│           └── middleware/
├── packages/
│   ├── db/              # Drizzle ORM schema (14 tables)
│   ├── shared/          # Zod validators, types, constants
│   ├── ui/              # Shared component library
│   ├── sync/            # Sync engine (stub)
│   └── config/          # Shared configs
└── CLAUDE.md            # Development conventions
```

## Architecture

**Offline-first:** All data lives in on-device SQLite and syncs to the server when online. The Drizzle ORM schema is shared between client and server, ensuring type safety end-to-end.

**Migration path:** The SQLite schema is designed to swap to Postgres/Supabase by changing the Drizzle dialect import — table definitions, relations, and queries stay identical.

## Design

Notion-inspired: clean white canvas, soft shadows, rounded corners, monochrome icons with color accents, typography-driven hierarchy.

| Token | Value |
|-------|-------|
| Ink | `#1A1A2E` |
| Accent | `#4361EE` |
| Surface | `#FAFAFA` |
| Success | `#10B981` |
| Warning | `#F59E0B` |
| Danger | `#EF4444` |

## License

MIT
