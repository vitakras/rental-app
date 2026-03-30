# CLAUDE.md — packages/api

## Project Structure

Layer-based structure. All new code follows this layout:

```
src/
├── index.ts          # entry point, mounts all routers
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
export function usersService(db: DbInstance) {
  const repo = usersRepository(db)
  return {
    createUser: async (input) => {
      return repo.create(input)
    }
  }
}
```

**Repositories** — database access only. Use the factory function pattern:

```ts
export function usersRepository(db: DbInstance) {
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

## Database Injection

Inject `db` via Hono context middleware, set once at startup:

```ts
// index.ts
app.use('*', async (c, next) => {
  c.set('db', db)
  await next()
})

// routes
usersRoutes.get('/', async (c) => {
  const service = usersService(c.get('db'))
  ...
})
```
