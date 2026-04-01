# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

## Commands

```bash
# Workspace
bun run dev            # Start both the web app and API in parallel

# Web
bun run build          # Build the React Router web app
bun run typecheck      # Run React Router typegen + tsc for the web package
bun run start          # Start the built web server

# API
bun run test           # Run API tests with NODE_ENV=test
bun run seed:landlord  # Seed a landlord user in the API data store

# Database
bun run db-generate    # Generate Drizzle migrations from schema changes
bun run db-migrate     # Apply migrations
bun run db-push        # Push schema directly (no migration file)

# Quality
bun run lint           # Run Biome checks
bun run lint:fix       # Run Biome checks with fixes
bun run format         # Format the repo with Biome
```

## Architecture

This is a Bun workspace with two packages:

- `packages/web` — React Router 7 frontend
- `packages/api` — Hono API, auth, repositories, storage, and database access

### Stack

- React Router 7 in `packages/web`
- Hono in `packages/api`
- SQLite via `@libsql/client` + Drizzle ORM
- TailwindCSS 4 + Vite in the web package
- TypeScript with `~/*` path aliases

### Current app shape

- `packages/web/react-router.config.ts` currently has `ssr: false`
- Route configuration lives in `packages/web/app/routes.ts`
- The database client lives in `packages/api/src/db/index.ts`
- Database config lives in `packages/api/src/db/config.ts`
- The schema lives in `packages/api/src/db/schema.ts`

### Path aliases

- In `packages/api`, `~/*` maps to `packages/api/src/*`
- In `packages/web`, `~/*` maps to both `packages/web/app/*` and `packages/api/src/*`

## Database

The schema is defined in `packages/api/src/db/schema.ts`.

Core tables include:

- `applications`
- `residents`
- `income_sources`
- `pets`
- `users`
- `sessions`
- `email_login_tokens`
- `files`
- `application_documents`
- `application_access`

### Date and timestamp storage

SQLite does not have a dedicated datetime type in this project. The schema currently stores dates and timestamps as `text`.

Use these conventions:

- Date-only values as ISO strings: `YYYY-MM-DD`
- Timestamps as UTC ISO strings when set in application code: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Keep date-only fields such as `desiredMoveInDate`, `dateOfBirth`, `startDate`, and `endDate` as strings rather than Unix epoch integers

The existing schema already follows this pattern for fields like:

- `desiredMoveInDate`
- `dateOfBirth`
- `expiresAt`
- `createdAt`
- `updatedAt`

## Data flow

- The web package renders the UI and defines route modules under `packages/web/app/routes/`
- The API package exposes route handlers under `packages/api/src/routes/`
- Database operations are implemented in repositories under `packages/api/src/repositories/`
- Validation and orchestration logic lives in `packages/api/src/services/`

## Repository pattern

Repositories use the factory-function pattern and accept a DB instance, defaulting to the production DB:

```ts
const repo = applicationRepository();

const testDb = await createTestDb();
const repoForTest = applicationRepository(testDb.db);
```

This pattern makes tests straightforward without module mocking.

## Environment / database URLs

Defined in `packages/api/src/db/config.ts`:

| `NODE_ENV`    | Default database URL                      |
|---------------|-------------------------------------------|
| `development` | `file:data/rental_app_development.sqlite` |
| `test`        | `file:data/rental_app_test.sqlite`        |
| `production`  | `DATABASE_URL` env var (required)         |

`DATABASE_URL` can override the default in any environment. The `data/` directory is created automatically for local file-based SQLite databases.

## Testing

Most backend tests are colocated in `packages/api/src/**/__tests__/`.

Useful examples:

```text
packages/api/src/repositories/
  application.repository.ts
  __tests__/
    db.helper.ts
    application.repository.test.ts
```

`createTestDb()` is defined in `packages/api/src/repositories/__tests__/db.helper.ts` and returns:

```ts
const testDb = await createTestDb();
testDb.db;
testDb.cleanup();
```

The helper derives SQLite DDL from the Drizzle schema using `drizzle-kit/api`, so the test database matches the source of truth without duplicated SQL.

### Why temp files instead of `:memory:`

`@libsql/client` may reopen a fresh connection after transactions. Using a temp-file SQLite database ensures the schema and committed data persist across reconnects during tests.
