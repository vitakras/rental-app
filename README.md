# Rental App

This workspace is split into two packages:

- `packages/api` owns the database, repositories, services, upload storage, and HTTP API.
- `packages/web` is the React Router SSR frontend and talks to `api` over HTTP for all loaders and actions.

## Commands

```bash
bun run dev        # start web and api in parallel
bun run build      # build the web package
bun run typecheck  # typecheck the web package
bun run test       # run the api test suite

bun run db-generate
bun run db-migrate
bun run db-push    # database commands target packages/api
```

## Environment

- `packages/web` reads `VITE_LOCAL_API_BASE_URL` for the backend origin.
- `packages/api` uses its own `API_BASE_URL` when generating local upload URLs.
- `DATABASE_URL` configures the API database and overrides the environment-specific SQLite defaults.
