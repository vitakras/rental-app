import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./src/db/config";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/db/schema.ts",
	dialect: "turso",
	casing: "snake_case",
	migrations: {
		prefix: "supabase",
	},
	dbCredentials: {
		url: databaseUrl,
	},
});
