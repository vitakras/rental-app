import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

type Env = "development" | "test" | "production";

const env = (process.env.NODE_ENV ?? "development") as Env;

const defaults: Record<Exclude<Env, "production">, string> = {
	development: "file:data/rental_app_development.sqlite",
	test: "file:data/rental_app_test.sqlite",
};

function resolveDatabaseUrl(): string {
	if (env === "production") {
		const url = process.env.DATABASE_URL;
		if (!url) throw new Error("DATABASE_URL must be set in production");
		return url;
	}
	// DATABASE_URL overrides the default for the current environment
	return process.env.DATABASE_URL ?? defaults[env];
}

export const databaseUrl = resolveDatabaseUrl();
export const currentEnv = env;

// Ensure the data directory exists for local file databases.
// SQLite can create the file but not its parent directory.
if (databaseUrl.startsWith("file:")) {
	const filePath = databaseUrl.replace(/^file:/, "").split("?")[0];
	const dir = dirname(filePath);
	if (dir && dir !== ".") mkdirSync(dir, { recursive: true });
}
