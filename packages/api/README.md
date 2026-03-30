# API Package

This package owns the backend for the rental app:

- Hono routes
- Drizzle schema and database access
- application and file services
- local upload storage for development

## Commands

```bash
bun run dev
bun run test
bun run db-generate
bun run db-migrate
bun run db-push
```

## Notes

- `API_BASE_URL` is used when generating local upload URLs.
- `DATABASE_URL` overrides the default SQLite database for the current environment.
- `AppType` is exported for typed clients in other workspace packages.
