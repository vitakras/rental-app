import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	applicationDocumentsTable,
	applicationsTable,
	filesTable,
	residentsTable,
} from "~/db/schema";
import { applicationRepository } from "../application.repository";
import { createTestDb, type TestDb } from "./db.helper";

describe("applicationRepository.findByIdWithDetails", () => {
	let testDb: TestDb;
	let repo: ReturnType<typeof applicationRepository>;

	beforeEach(async () => {
		testDb = await createTestDb();
		repo = applicationRepository(testDb.db);
	});

	afterEach(async () => {
		await testDb?.cleanup();
	});

	it("includes uploaded application documents in the details payload", async () => {
		const [application] = await testDb.db
			.insert(applicationsTable)
			.values({
				status: "pending",
				smokes: false,
				desiredMoveInDate: "2026-06-01",
			})
			.returning();

		const [resident] = await testDb.db
			.insert(residentsTable)
			.values({
				applicationId: application.id,
				role: "primary",
				fullName: "Alex Johnson",
				dateOfBirth: "1990-05-15",
				email: "alex@example.com",
				phone: "555-000-0001",
			})
			.returning();

		const [file] = await testDb.db
			.insert(filesTable)
			.values({
				id: "file-1",
				storageKey: "documents/file-1.pdf",
				originalFilename: "id.pdf",
				contentType: "application/pdf",
				sizeBytes: 1024,
				status: "attached",
				uploadedByUserId: "app-1",
				uploadedAt: "2026-01-01T00:00:00.000Z",
			})
			.returning();

		await testDb.db.insert(applicationDocumentsTable).values({
			applicationId: application.id,
			residentId: resident.id,
			fileId: file.id,
			category: "identity",
			documentType: "government_id",
			status: "submitted",
			notes: null,
		});

		const details = await repo.findByIdWithDetails(application.id);

		expect(details).not.toBeNull();
		expect(details?.documents).toHaveLength(1);
		expect(details?.documents[0]).toMatchObject({
			applicationId: application.id,
			residentId: resident.id,
			fileId: file.id,
			category: "identity",
			documentType: "government_id",
			status: "submitted",
		});
	});
});
