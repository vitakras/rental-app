# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is a Bun workspace monorepo.

```
rental-app/
├── package.json          # workspace root
├── tsconfig.base.json    # shared TS compiler options
├── biome.json            # shared linter/formatter (runs from root)
└── packages/
    ├── web/              # React Router 7 SSR app — see packages/web/CLAUDE.md
    └── api/              # Hono API — see packages/api/CLAUDE.md
```

## Shared Commands

Run from the repo root:

```bash
# Linting & formatting (runs Biome across all packages)
bun run lint
bun run lint:fix
bun run format
```

See each package's `CLAUDE.md` for package-specific commands.

## File Naming

Use `<name>.<type>.ts` convention across all packages:

- `users.routes.ts`
- `users.service.ts`
- `users.repository.ts`
