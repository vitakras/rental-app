# CLAUDE.md

This file provides guidance to AI coding assistants when working with code in this repository.

## Monorepo Structure

This is a Bun workspace monorepo.

```
rental-app/
├── package.json          # workspace root
├── tsconfig.base.json    # shared TS compiler options
├── biome.json            # shared linter/formatter (runs from root)
└── packages/
    ├── web/              # React Router 7 app (CSR) — see packages/web/CLAUDE.md
    └── api/              # Hono API on Cloudflare Workers — see packages/api/CLAUDE.md
```

## Commands

Run from the repo root:

```bash
# Dev
bun run dev            # Start both the web app and API in parallel

# Build / deploy
bun run build          # Build the React Router web app
bun run start          # Start the built web server

# Type checking
bun run typecheck      # Run API typegen + React Router typegen + tsc for both packages

# Database
bun run db:generate    # Generate Drizzle migrations from schema changes
bun run db:migrate     # Apply migrations to local D1 via wrangler

# Testing
bun run test           # Run API tests

# Quality
bun run lint           # Run Biome checks
bun run lint:fix       # Run Biome checks with fixes
bun run format         # Format the repo with Biome
```

## File Naming

Use `<name>.<type>.ts` convention across all packages:

- `users.routes.ts`
- `users.service.ts`
- `users.repository.ts`

## Architecture

- `packages/web` — React Router 7 frontend (CSR, `ssr: false`), calls the API over HTTP
- `packages/api` — Hono app deployed on Cloudflare Workers, uses Cloudflare D1 (SQLite) and R2 storage

### Stack

- React Router 7 in `packages/web` (client-side rendered)
- Hono in `packages/api` (Cloudflare Workers)
- Cloudflare D1 (SQLite) via Drizzle ORM (`drizzle-orm/d1`)
- Cloudflare R2 for file storage
- TailwindCSS 4 + Vite in the web package
- TypeScript with `~/*` path aliases

### Path aliases

- In `packages/api`, `~/*` maps to `packages/api/src/*`
- In `packages/web`, `~/*` maps to both `packages/web/app/*` and `packages/api/src/*`

### Key files

- Route configuration: `packages/web/app/routes.ts`
- Database client: `packages/api/src/db/index.ts`
- Database schema: `packages/api/src/db/schema.ts`
- Cloudflare bindings: `packages/api/src/worker-env.ts`
- Service container: `packages/api/src/container.ts`

## Database

Runs on Cloudflare D1 (SQLite). Schema defined in `packages/api/src/db/schema.ts`.

Core tables:

- `applications`
- `residents`
- `residences`
- `income_sources`
- `pets`
- `users`
- `sessions`
- `login_codes`
- `files`
- `application_documents`
- `application_access`

### Date and timestamp storage

Dates and timestamps are stored as `text`. Use these conventions:

- Date-only values: `YYYY-MM-DD`
- Timestamps: UTC ISO strings `YYYY-MM-DDTHH:mm:ss.sssZ`
- Keep date-only fields (`desiredMoveInDate`, `dateOfBirth`, `startDate`, `endDate`) as strings, not Unix epoch integers

## Data flow

- The web package renders the UI and defines route modules under `packages/web/app/routes/`
- The API package exposes route handlers under `packages/api/src/routes/`
- Database operations are implemented in repositories under `packages/api/src/repositories/`
- Validation and orchestration logic lives in `packages/api/src/services/`
- Services and repositories are wired together in `packages/api/src/container.ts`

## Repository pattern

Repositories use the factory-function pattern and accept a `DbInstance`:

```ts
const repo = applicationRepository(db);
```

## Testing

Tests run inside the Cloudflare Workers runtime via `@cloudflare/vitest-pool-workers`.

Test helpers are colocated in `packages/api/src/**/__tests__/`.

`createTestDb()` is defined in `packages/api/src/repositories/__tests__/db.helper.ts` and returns:

```ts
const testDb = await createTestDb();
testDb.db;        // DbInstance backed by the D1 test environment
testDb.cleanup(); // clears all tables
```

The helper applies Drizzle migrations directly to the `cloudflare:test` D1 environment and clears tables between tests.
