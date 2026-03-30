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

- `API_BASE_URL` configures how `web` reaches `api`.
- In local development and test, both packages default to `http://127.0.0.1:8787` when `API_BASE_URL` is unset.
- `DATABASE_URL` configures the API database and overrides the environment-specific SQLite defaults.
