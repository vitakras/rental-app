# CLAUDE.md — packages/api

## Project Structure

Layer-based structure. All new code follows this layout:

```
src/
├── worker.ts         # Cloudflare Worker entry point
├── app.ts            # Hono app setup
├── container.ts      # wires repositories and services together
├── worker-env.ts     # Cloudflare bindings types (D1, R2)
├── db/
│   ├── index.ts      # createDb(d1) factory, DbInstance type
│   └── schema.ts     # Drizzle schema
├── routes/           # Hono routers, one file per domain
├── services/         # business logic, one file per domain
└── repositories/     # database access, one file per domain
```

## File Naming

Use `<name>.<type>.ts` convention:

- `users.routes.ts`
- `users.service.ts`
- `users.repository.ts`

## Layers

**Routes** — mount handlers, parse input, call services. No business logic.

**Services** — business logic. Call repositories and other services. Use the factory function pattern:

```ts
export function createUsersService({ userRepository }: { userRepository: UserRepository }) {
  return {
    createUser: async (input) => {
      return userRepository.create(input)
    }
  }
}
```

**Repositories** — database access only. Use the factory function pattern:

```ts
export function userRepository(db: DbInstance) {
  return {
    findById: (id: string) => ...,
    create: (input: CreateUserInput) => ...,
  }
}
```

## Dependency Rules

- Routes → Services → Repositories
- Never skip layers (routes should not call repositories directly)
- Services and repositories do not import from routes

## Service Container

Services are instantiated once per request in `container.ts` via `createCfServices(env)`, which receives Cloudflare bindings (`D1Database`, `R2Bucket`) and wires all repositories and services:

```ts
// container.ts
export function createCfServices(env: CloudflareBindings): AppServices {
  const db = createDb(env.DB)
  const userRepo = userRepository(db)
  // ...
  return { authService, applicationService, fileService }
}
```

Routes access services through Hono context middleware set in `app.ts`.

## Cloudflare Bindings

Defined in `worker-env.ts`:

```ts
export interface CloudflareBindings {
  DB: D1Database;      // Cloudflare D1 SQLite database
  STORAGE: R2Bucket;   // Cloudflare R2 object storage
}
```
