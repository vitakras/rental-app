import { env } from "cloudflare:test";
import { createDb, type DbInstance } from "~/db";

export type TestDb = {
	db: DbInstance;
	cleanup: () => Promise<void>;
};

const tablesToClear = [
	"application_access",
	"application_documents",
	"income_sources",
	"residences",
	"pets",
	"residents",
	"files",
	"login_codes",
	"sessions",
	"applications",
	"users",
] as const;

let migrationsReady: Promise<void> | null = null;

type MigrationJournal = {
	entries: Array<{
		tag: string;
	}>;
};

const journalModule = import.meta.glob("../../db/migrations/meta/_journal.json", {
	eager: true,
	import: "default",
}) as Record<string, MigrationJournal>;

const sqlModules = import.meta.glob("../../db/migrations/*.sql", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;

async function ensureMigrations() {
	migrationsReady ??= (async () => {
		const journal = Object.values(journalModule)[0];

		if (!journal) {
			throw new Error("Could not load Drizzle migration journal for tests");
		}

		for (const entry of journal.entries) {
			const migration = Object.entries(sqlModules).find(([path]) =>
				path.endsWith(`/${entry.tag}.sql`),
			)?.[1];

			if (!migration) {
				throw new Error(`Missing migration file for ${entry.tag}`);
			}

			const statements = migration
				.split("--> statement-breakpoint")
				.map((statement) => statement.trim())
				.filter(Boolean);

			for (const statement of statements) {
				await env.DB.prepare(statement).run();
			}
		}
	})();
	await migrationsReady;
}

async function clearTestDb() {
	await env.DB.exec("PRAGMA foreign_keys = OFF");

	for (const table of tablesToClear) {
		await env.DB.prepare(`DELETE FROM ${table}`).run();
	}

	await env.DB.prepare("DELETE FROM sqlite_sequence").run();
	await env.DB.exec("PRAGMA foreign_keys = ON");
}

export async function createTestDb(): Promise<TestDb> {
	await ensureMigrations();
	await clearTestDb();

	return {
		db: createDb(env.DB) as unknown as DbInstance,
		cleanup: async () => {
			await clearTestDb();
		},
	};
}
