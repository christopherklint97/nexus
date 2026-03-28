# ─── Base: pnpm + bun ────────────────────────────────────────────
FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
RUN apt-get update && apt-get install -y curl unzip && \
    curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ─── Install deps ────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/sync/package.json packages/sync/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile

# ─── Build everything ───────────────────────────────────────────
FROM deps AS build
COPY . .
RUN pnpm build

# ─── API runtime ─────────────────────────────────────────────────
FROM base AS api
WORKDIR /app
COPY --from=build /app /app
EXPOSE 3000
CMD ["bun", "run", "apps/api/dist/index.js"]

# ─── Web runtime ─────────────────────────────────────────────────
FROM base AS web
WORKDIR /app/apps/mobile
COPY --from=build /app/apps/mobile/dist ./dist
COPY --from=build /app/apps/mobile/serve.ts ./serve.ts
EXPOSE 4001
CMD ["bun", "run", "serve.ts"]
