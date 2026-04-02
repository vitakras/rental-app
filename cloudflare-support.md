  ---
  Cloudflare Local Dev Setup (Workers + D1 + R2)

  Context

  Add a wrangler dev path to the API so it runs on the CF Workers runtime locally with D1 (SQLite) and R2 (file storage). The existing bun run dev workflow is unchanged. No Cloudflare account resources needed —
  wrangler simulates D1 and R2 locally.

  ---
  Architecture: Dual Entry Points

  - src/server.ts — existing Bun entry (unchanged)
  - src/worker.ts — new CF Workers entry, builds services per-request from D1/R2 bindings

  Both call createApp({ services }). The critical constraint: app.ts must not import ~/container at module level — otherwise worker.ts transitively pulls in ~/db/config.ts at init time.

  Enable nodejs_compat in wrangler so process.env works in Workers (populated from wrangler [vars]). All existing auth config/cookie logic works without modification.

  ---
  packages/api Changes

  Modified files

  src/app.ts — remove module-level container import (line 5); make services required; add optional storageRoutes param:

  // Remove:
  import { services as defaultServices } from "~/container";

  // Change signature:
  export function createApp({
    services,
    storageRoutes = createStorageRoutes(),
  }: {
    services: typeof defaultServices;
    storageRoutes?: Hono;
  }) { ... }

  src/index.ts — pass services explicitly:

  import { createApp } from "~/app";
  import { services } from "~/container";
  const app = createApp({ services });
  export default app;

  wrangler.jsonc — configure for local CF dev:

  {
    "$schema": "node_modules/wrangler/config-schema.json",
    "name": "api",
    "main": "src/worker.ts",
    "compatibility_date": "2026-03-30",
    "compatibility_flags": ["nodejs_compat"],
    "vars": {
      "NODE_ENV": "development",
      "API_BASE_URL": "http://localhost:8788",
      "WEB_BASE_URL": "http://localhost:5173"
    },
    "d1_databases": [
      { "binding": "DB", "database_name": "rental-app-dev", "database_id": "local" }
    ],
    "r2_buckets": [
      { "binding": "STORAGE", "bucket_name": "rental-app-storage-dev" }
    ]
  }

  New files

  src/worker-env.ts — CF bindings interface (bootstrapped; cf-typegen regenerates):

  export interface CloudflareBindings {
    DB: D1Database;
    STORAGE: R2Bucket;
  }

  src/cf-logger.ts — pino with browser transport (no Node.js streams):

  import pino from "pino";

  export const logger = pino({
    level: "info",
    browser: { asObject: true },
  });
  export default logger;

  src/storage/r2.blob.storage.ts — R2 implementation, proxied through Worker (no public bucket needed):

  export function createR2BlobStorage(bucket: R2Bucket, apiBaseUrl: string): BlobStorage {
    return {
      createUploadUrl: async ({ key }) => ({
        uploadUrl: `${apiBaseUrl}/storage/${encodeKey(key)}`,
      }),
      createDownloadUrl: async (key) => ({
        downloadUrl: `${apiBaseUrl}/storage/${encodeKey(key)}`,
      }),
      objectExists: async (key) => (await bucket.head(key)) !== null,
      deleteObject: async (key) => { await bucket.delete(key); },
    };
  }

  src/routes/r2-storage.routes.ts — R2-backed GET/PUT routes (existing storage.routes.ts uses node:fs):

  export function createR2StorageRoutes(bucket: R2Bucket) {
    return new Hono()
      .get("/:key{.+}", async (c) => {
        const obj = await bucket.get(decodeURIComponent(c.req.param("key")));
        if (!obj) return c.notFound();
        const headers = new Headers();
        obj.writeHttpMetadata(headers);
        return new Response(obj.body, { headers });
      })
      .put("/:key{.+}", async (c) => {
        const key = decodeURIComponent(c.req.param("key"));
        await bucket.put(key, await c.req.arrayBuffer(), {
          httpMetadata: { contentType: c.req.header("content-type") ?? "application/octet-stream" },
        });
        return new Response(null, { status: 200 });
      });
  }

  src/cf-container.ts — per-request service factory using drizzle-orm/d1 + R2:

  export function createCfServices(env: CloudflareBindings) {
    const db = drizzle(env.DB, { casing: "snake_case" });
    const blobStorage = createR2BlobStorage(env.STORAGE, getApiBaseUrl());
    const authConfig = getAuthConfig();
    // ... same repos/services as container.ts, but using cf-logger
  }

  src/worker.ts — CF entry point:

  import { createApp } from "~/app";
  import { createCfServices } from "~/cf-container";
  import { createR2StorageRoutes } from "~/routes/r2-storage.routes";
  import type { CloudflareBindings } from "~/worker-env";

  export default {
    fetch(request: Request, env: CloudflareBindings, ctx: ExecutionContext) {
      const services = createCfServices(env);
      return createApp({ services, storageRoutes: createR2StorageRoutes(env.STORAGE) })
        .fetch(request, env, ctx);
    },
  } satisfies ExportedHandler<CloudflareBindings>;

  drizzle.cf.config.ts — sqlite dialect for D1 (reuses same drizzle/ output directory):

  export default defineConfig({
    out: "./drizzle",
    schema: "./src/db/schema.ts",
    dialect: "sqlite",
    casing: "snake_case",
  });

  .dev.vars (gitignored) — wrangler dev env vars:

  NODE_ENV=development
  API_BASE_URL=http://localhost:8788
  WEB_BASE_URL=http://localhost:5173
  AUTH_SESSION_COOKIE_NAME=session
  AUTH_APPLICANT_SIGNUP_TOKEN=11111111-1111-4111-8111-111111111111
  AUTH_LOGIN_CODE_PEPPER=development-login-code-pepper

  package.json — add devDep + scripts:
  - @cloudflare/workers-types devDependency
  - "db-generate:cf": "drizzle-kit generate --config=drizzle.cf.config.ts"
  - "db-migrate:cf:local": "wrangler d1 migrations apply rental-app-dev --local"

  ---
  packages/web Changes

  None. Use VITE_LOCAL_API_BASE_URL=http://localhost:8788 bun run dev to test against wrangler dev.

  ---
  Run Sequence

  cd packages/api

  # Install CF types
  bun add -d @cloudflare/workers-types

  # Generate migrations
  bun run db-generate

  # Apply to local D1 simulation
  bun run db-migrate:cf:local

  # Start wrangler dev on port 8788
  npx wrangler dev --port 8788

  Alongside existing Bun dev (port 8787):
  # Terminal 1
  bun run dev

  # Terminal 2
  cd packages/api && npx wrangler dev --port 8788

  # Terminal 3 (web pointed at wrangler)
  cd packages/web && VITE_LOCAL_API_BASE_URL=http://localhost:8788 bun run dev

  ---
  No changes to

  Any repository file, route handler, service (other than the new CF variants), auth config, cookies, or web app code