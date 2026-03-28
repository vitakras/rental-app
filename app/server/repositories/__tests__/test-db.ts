import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from "drizzle-kit/api";
import { unlinkSync, existsSync } from "fs";
import * as schema from "~/db/schema";

export interface TestDb {
  db: Awaited<ReturnType<typeof buildDb>>;
  cleanup: () => void;
}

async function buildDb(url: string) {
  const client = createClient({ url });
  const db = drizzle(client, { casing: "snake_case" });

  // Derive CREATE TABLE statements from the Drizzle schema so the test
  // database always matches the source of truth without duplication.
  const [empty, current] = await Promise.all([
    generateSQLiteDrizzleJson({}),
    generateSQLiteDrizzleJson(schema, undefined, "snake_case"),
  ]);
  const statements = await generateSQLiteMigration(empty, current);

  for (const stmt of statements) {
    await client.execute(stmt);
  }

  return db;
}

// @libsql/client resets its internal connection to null after each
// transaction(), causing the next #getDb() call to open a brand-new
// Database(":memory:") — an empty database with no tables.
// A unique temp file avoids this: reconnections reopen the same file.
export async function createTestDb(): Promise<TestDb> {
  const path = `/tmp/rental_test_${Date.now()}_${Math.random().toString(36).slice(2)}.sqlite`;
  const db = await buildDb(`file:${path}`);

  return {
    db,
    cleanup: () => {
      if (existsSync(path)) unlinkSync(path);
    },
  };
}
