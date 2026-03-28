# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server at http://localhost:5173

# Build & Type checking
npm run build        # Production build
npm run typecheck    # Run react-router typegen + tsc

# Testing
bun test             # Run all tests
bun test --watch     # Watch mode

# Database
npm run db-generate  # Generate Drizzle migrations from schema changes
npm run db-migrate   # Apply migrations
npm run db-push      # Push schema directly (no migration file)
```

## Architecture

Full-stack rental property management app using **React Router 7** (SSR enabled). The framework handles both client and server bundling in a single project.

**Stack:**
- React Router 7 with SSR (`react-router.config.ts`: `ssr: true`)
- SQLite via `@libsql/client` + Drizzle ORM (async driver — swap to Turso or Postgres at launch by changing the client config in `app/db/index.ts`)
- TailwindCSS 4 with Vite
- TypeScript with path alias `~/*` → `./app/*`

**Data flow:** Routes in `app/routes/` use React Router's `loader`/`action` pattern for server-side data fetching and mutations. The DB client is initialized in `app/db/index.ts` with WAL mode and snake_case casing.

**Database schema** (`app/db/schema.ts`):
- `applications` — rental applications with `status`, `desiredMoveInDate`, and `smokes`
- `residents` — linked to applications via `applicationId`, tracks `fullName`, `dateOfBirth`, `email`, `phone`, and `role` (`"primary"` | `"co-applicant"` | `"dependent"` | `"child"`)
- `pets` — linked to applications via `applicationId`, tracks `type`, `breed`, `name`, and `notes`

**Server layer** (`app/server/`):
- `repositories/` — repositories use the **factory function pattern**: `export function applicationRepository(db: DbInstance)` returns a plain object of methods. The `db` instance is injected once at construction via closure. In production, call with the default db; in tests, pass the in-memory db from `createTestDb()`.

```ts
// production (route action/loader)
const repo = applicationRepository(db);
repo.create(input);

// test
const repo = applicationRepository(await createTestDb());
repo.create(input);
```

**Route configuration:** `app/routes.ts` defines the route tree. React Router generates types automatically (run `typecheck` to regenerate after adding routes).

**Environment:** `DB_FILE_NAME` env var points to the SQLite file (default: `data/rental_app_development.sqlite`). Set in `.env`.

## Testing

Tests live in `__tests__/` at the project root, mirroring the `app/` structure:

```
__tests__/
  helpers/
    test-db.ts        # creates an in-memory SQLite db with schema applied
  repositories/
    *.test.ts
```

**Pattern:** Repository functions accept an optional `dbInstance` parameter. Tests pass an in-memory db from `createTestDb()` — no module mocking required.

```ts
// in a test
const db = createTestDb();
const result = await createApplication(input, db);
```

`createTestDb()` returns `{ db, cleanup }`. It uses `generateSQLiteDrizzleJson` + `generateSQLiteMigration` from `drizzle-kit/api` to derive CREATE TABLE statements from `~/db/schema` — no duplicated SQL.

**Why temp files instead of `:memory:`:** `@libsql/client` sets `this.#db = null` after every `transaction()` call so it can lazily reconnect. For `:memory:` that creates a brand-new empty database. Temp files reopen the same file on reconnect, so committed data persists across the transaction boundary.

```ts
let testDb: TestDb;
beforeEach(async () => { testDb = await createTestDb(); });
afterEach(() => { testDb.cleanup(); }); // deletes the temp file
```
