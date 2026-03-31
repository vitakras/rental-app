import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { emailLoginTokensTable, sessionsTable, usersTable } from "~/db/schema";
import { emailLoginTokenRepository } from "~/repositories/email-login-token.repository";
import { sessionRepository } from "~/repositories/session.repository";
import { userRepository } from "~/repositories/user.repository";
import type { TestDb } from "./db.helper";
import { createTestDb } from "./db.helper";

describe("auth repositories", () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
	});

	afterEach(() => {
		testDb.cleanup();
	});

	it("finds a user by normalized email", async () => {
		await testDb.db.insert(usersTable).values({
			id: "user-1",
			email: "Landlord@Example.com",
			globalRole: "landlord",
		});

		const repo = userRepository(testDb.db);
		const user = await repo.findByEmail("landlord@example.com");

		expect(user?.id).toBe("user-1");
		expect(user?.email).toBe("Landlord@Example.com");
	});

	it("creates and consumes an email login token", async () => {
		const repo = emailLoginTokenRepository(testDb.db);
		const record = await repo.create({
			id: "token-1",
			email: "alex@example.com",
			tokenHash: "hash-1",
			expiresAt: "2099-01-01T00:00:00.000Z",
			createdByIp: "127.0.0.1",
		});

		expect(record.id).toBe("token-1");

		const active = await repo.findActiveByEmailAndTokenHash(
			"alex@example.com",
			"hash-1",
			"2026-01-01T00:00:00.000Z",
		);
		expect(active?.id).toBe("token-1");

		await repo.markConsumed("token-1", "2026-01-01T00:00:00.000Z");

		const inactive = await repo.findActiveByEmailAndTokenHash(
			"alex@example.com",
			"hash-1",
			"2026-01-01T00:00:00.000Z",
		);
		expect(inactive).toBeNull();

		const [stored] = await testDb.db
			.select()
			.from(emailLoginTokensTable)
			.where(eq(emailLoginTokensTable.id, "token-1"));
		expect(stored?.consumedAt).toBe("2026-01-01T00:00:00.000Z");
	});

	it("creates and fetches a session", async () => {
		await testDb.db.insert(usersTable).values({
			id: "user-1",
			email: "alex@example.com",
			globalRole: "applicant",
		});

		const repo = sessionRepository(testDb.db);
		const created = await repo.create({
			id: "session-1",
			userId: "user-1",
			expiresAt: "2099-01-01T00:00:00.000Z",
			lastAccessedAt: "2026-01-01T00:00:00.000Z",
			ipAddress: "127.0.0.1",
			userAgent: "bun-test",
		});

		expect(created.id).toBe("session-1");

		const found = await repo.findById("session-1");
		expect(found?.userId).toBe("user-1");

		const [stored] = await testDb.db
			.select()
			.from(sessionsTable)
			.where(eq(sessionsTable.id, "session-1"));
		expect(stored?.userAgent).toBe("bun-test");
	});
});
