# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is a Bun workspace monorepo. The React Router app lives in `packages/web/`.

```
rental-app/
├── package.json          # workspace root — delegates scripts via --filter web
├── tsconfig.base.json    # shared TS compiler options
├── biome.json            # shared linter/formatter (runs from root)
└── packages/
    └── web/              # React Router 7 app
        ├── app/
        ├── vite.config.ts
        ├── drizzle.config.ts
        └── ...
```

## Commands

All commands run from the **repo root** and delegate to the `web` package.

```bash
# Development
bun run dev          # Start dev server at http://localhost:5173

# Build & Type checking
bun run build        # Production build
bun run typecheck    # Run react-router typegen + tsc

# Testing
bun run test         # Run all tests (sets NODE_ENV=test automatically)

# Database
bun run db-generate  # Generate Drizzle migrations from schema changes
bun run db-migrate   # Apply migrations
bun run db-push      # Push schema directly (no migration file)

# Linting & formatting (runs Biome across all packages)
bun run lint
bun run lint:fix
bun run format
```

To run tests in watch mode, cd into `packages/web/` first:
```bash
cd packages/web && bun test --watch
```

## Architecture

Full-stack rental property management app using **React Router 7** (SSR enabled). The framework handles both client and server bundling in a single project.

**Stack:**
- React Router 7 with SSR (`packages/web/react-router.config.ts`: `ssr: true`)
- SQLite via `@libsql/client` + Drizzle ORM (async driver — swap to Turso or Postgres at launch by changing the client config in `packages/web/app/db/index.ts`)
- TailwindCSS 4 with Vite
- TypeScript with path alias `~/*` → `./app/*` (defined in `packages/web/tsconfig.json`)

**Data flow:** Routes in `packages/web/app/routes/` use React Router's `loader`/`action` pattern for server-side data fetching and mutations. The DB client is initialized in `packages/web/app/db/index.ts` with WAL mode and snake_case casing.

**Database schema** (`packages/web/app/db/schema.ts`):
- `applications` — rental applications with `status`, `desiredMoveInDate`, and `smokes`
- `residents` — linked to applications via `applicationId`, tracks `fullName`, `dateOfBirth`, `email`, `phone`, and `role` (`"primary"` | `"co-applicant"` | `"dependent"` | `"child"`)
- `pets` — linked to applications via `applicationId`, tracks `type`, `breed`, `name`, and `notes`

**Server layer** (`packages/web/app/server/`):
- `repositories/` — repositories use the **factory function pattern**: `export function applicationRepository(db: DbInstance)` returns a plain object of methods. The `db` instance is injected once at construction via closure. In production, call with the default db; in tests, pass the in-memory db from `createTestDb()`.

```ts
// production (route action/loader)
const repo = applicationRepository(db);
repo.create(input);

// test
const repo = applicationRepository(await createTestDb());
repo.create(input);
```

**Route configuration:** `packages/web/app/routes.ts` defines the route tree. React Router generates types automatically (run `typecheck` to regenerate after adding routes).

**Environment / database URLs** (`packages/web/app/db/config.ts`):

| `NODE_ENV`    | Default database URL                          |
|---------------|-----------------------------------------------|
| `development` | `file:data/rental_app_development.sqlite`     |
| `test`        | `file:data/rental_app_test.sqlite`            |
| `production`  | `DATABASE_URL` env var (required)             |

Override any environment by setting `DATABASE_URL` in `packages/web/.env`. The `data/` directory is created automatically if it doesn't exist (at `packages/web/data/`).

## Testing

Tests live in `__tests__/` co-located next to the logic they cover:

```
packages/web/app/server/repositories/
  application.repository.ts
  __tests__/
    test-db.ts                        # creates a temp-file SQLite db with schema applied
    application.repository.test.ts
```

**Pattern:** Repository factory functions accept an injected `db` instance. Tests create an isolated db via `createTestDb()` and pass it in — no module mocking required.

```ts
// in a test
const testDb = await createTestDb();
const repo = applicationRepository(testDb.db);
```

`createTestDb()` returns `{ db, cleanup }`. It uses `generateSQLiteDrizzleJson` + `generateSQLiteMigration` from `drizzle-kit/api` to derive CREATE TABLE statements from `~/db/schema` — no duplicated SQL.

**Why temp files instead of `:memory:`:** `@libsql/client` sets `this.#db = null` after every `transaction()` call so it can lazily reconnect. For `:memory:` that creates a brand-new empty database. Temp files reopen the same file on reconnect, so committed data persists across the transaction boundary.

```ts
let testDb: TestDb;
beforeEach(async () => { testDb = await createTestDb(); });
afterEach(() => { testDb.cleanup(); }); // deletes the temp file
```

## shadcn/ui

Run `bunx shadcn add` from `packages/web/`, or pass `--cwd packages/web` when running from the repo root.
