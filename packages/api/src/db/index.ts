import { drizzle } from "drizzle-orm/d1";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

export function createDb(d1: D1Database) {
	return drizzle(d1, { casing: "snake_case" });
}

// BaseSQLiteDatabase is compatible with both the D1 and LibSQL drizzle drivers,
// allowing repositories to be tested with LibSQL while running on D1 in production.
// biome-ignore lint/suspicious/noExplicitAny: required for cross-driver compatibility
export type DbInstance = BaseSQLiteDatabase<"async", any>;
