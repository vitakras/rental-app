# CLAUDE.md — packages/web

## Architecture

`packages/web` is the React Router 7 SSR frontend for the rental app.

- It does not own database access or business logic.
- All loaders and actions call `packages/api` over HTTP.
- The local API client lives in `app/lib/api.ts` and uses `AppType` from the `api` package for typing.

## Commands

Run from the repo root:

```bash
bun run dev
bun run build
bun run typecheck
```

## Environment

- `API_BASE_URL` configures the backend origin used by server-side loaders/actions.
- In local development and test, `web` defaults to `http://127.0.0.1:8787`.

## Upload Flow

- Browser file uploads still start at the same-origin proxy routes under `app/routes/api-upload-*.ts`.
- Those route actions call the backend API to prepare and complete uploads.
- Raw file bytes go directly to the API storage route using the upload URL returned by the backend.

## Testing

- There are currently no dedicated `web` package tests after the server/data layer moved to `api`.
- Use `bun run typecheck` for the frontend package and `bun run test` from the repo root for backend coverage.
