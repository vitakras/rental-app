import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const dbPath = process.env.DB_FILE_NAME ?? "data/rental_app_development.sqlite";

const client = createClient({
  // @libsql/client requires the file: prefix for local SQLite files.
  // Turso/D1 migration: replace with { url, authToken } from environment.
  url: `file:${dbPath}`,
});

export const db = drizzle(client, { casing: "snake_case" });
