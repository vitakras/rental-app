import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loginCodesTable, sessionsTable, usersTable } from "~/db/schema";
import { loginCodeRepository } from "~/repositories/login-code.repository";
import { sessionRepository } from "~/repositories/session.repository";
import { userRepository } from "~/repositories/user.repository";
import type { TestDb } from "./db.helper";
import { createTestDb } from "./db.helper";

describe("auth repositories", () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = await createTestDb();
	});

	afterEach(async () => {
		await testDb?.cleanup();
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

	it("creates a user", async () => {
		const repo = userRepository(testDb.db);
		const user = await repo.create({
			id: "user-2",
			email: "applicant@example.com",
			globalRole: "applicant",
		});

		expect(user.id).toBe("user-2");

		const found = await repo.findByEmail("applicant@example.com");
		expect(found?.id).toBe("user-2");
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

	it("creates, rotates, and updates a reusable login code", async () => {
		await testDb.db.insert(usersTable).values({
			id: "user-1",
			email: "alex@example.com",
			globalRole: "applicant",
		});

		const repo = loginCodeRepository(testDb.db);
		const record = await repo.create({
			id: "code-1",
			userId: "user-1",
			codeHash: "hash-1",
			expiresAt: "2099-01-01T00:00:00.000Z",
			createdByIp: "127.0.0.1",
		});

		expect(record.id).toBe("code-1");

		const active = await repo.findActiveByUserId(
			"user-1",
			"2026-01-01T00:00:00.000Z",
		);
		expect(active?.id).toBe("code-1");

		await repo.recordSuccessfulUse("code-1", "2026-01-02T00:00:00.000Z");
		await repo.recordFailedAttempt(
			"code-1",
			2,
			"2026-01-03T00:00:00.000Z",
			null,
		);
		await repo.invalidateActiveByUserId("user-1", "2026-01-04T00:00:00.000Z");

		const inactive = await repo.findActiveByUserId(
			"user-1",
			"2026-01-05T00:00:00.000Z",
		);
		expect(inactive).toBeNull();

		const [stored] = await testDb.db
			.select()
			.from(loginCodesTable)
			.where(eq(loginCodesTable.id, "code-1"));
		expect(stored?.failedAttempts).toBe(2);
		expect(stored?.successfulUses).toBe(1);
		expect(stored?.lastUsedAt).toBe("2026-01-02T00:00:00.000Z");
		expect(stored?.invalidatedAt).toBe("2026-01-04T00:00:00.000Z");
	});
});
