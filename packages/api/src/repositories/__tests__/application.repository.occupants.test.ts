import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import {
	applicationAccessTable,
	applicationDocumentsTable,
	applicationsTable,
	filesTable,
	incomeSourcesTable,
	residentsTable,
	usersTable,
} from "~/db/schema";
import { applicationRepository } from "../application.repository";
import { createTestDb, type TestDb } from "./db.helper";

describe("applicationRepository occupant editing", () => {
	let testDb: TestDb;
	let repo: ReturnType<typeof applicationRepository>;

	beforeEach(async () => {
		testDb = await createTestDb();
		repo = applicationRepository(testDb.db);
	});

	afterEach(() => {
		testDb.cleanup();
	});

	async function seedApplication() {
		const [application] = await testDb.db
			.insert(applicationsTable)
			.values({ status: "draft", smokes: false })
			.returning();

		const [primary] = await testDb.db
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

		return { application, primary };
	}

	it("updates existing residents in place and keeps their income sources", async () => {
		const { application } = await seedApplication();

		const [adult] = await testDb.db
			.insert(residentsTable)
			.values({
				applicationId: application.id,
				role: "dependent",
				fullName: "Old Adult",
				dateOfBirth: "1988-01-01",
				email: null,
				phone: null,
			})
			.returning();

		await testDb.db.insert(incomeSourcesTable).values({
			residentId: adult.id,
			type: "employment",
			employerOrSourceName: "Acme Corp",
			titleOrOccupation: "Manager",
			monthlyAmountCents: 250000,
			startDate: "2024-01-01",
			endDate: null,
			notes: null,
		});

		await repo.updateOccupants(application.id, {
			smokes: true,
			additionalAdults: [
				{
					existingId: adult.id,
					fullName: "Updated Adult",
					dateOfBirth: "1988-01-01",
					role: "co-applicant",
					email: "updated@example.com",
				},
			],
			children: [
				{
					fullName: "New Child",
					dateOfBirth: "2018-09-01",
				},
			],
			pets: [],
		});

		const residents = await testDb.db
			.select()
			.from(residentsTable)
			.where(eq(residentsTable.applicationId, application.id));
		const incomeSources = await testDb.db
			.select()
			.from(incomeSourcesTable)
			.where(eq(incomeSourcesTable.residentId, adult.id));
		const [updatedApplication] = await testDb.db
			.select()
			.from(applicationsTable)
			.where(eq(applicationsTable.id, application.id));

		expect(updatedApplication.smokes).toBe(true);
		expect(residents).toHaveLength(3);
		expect(residents.some((resident) => resident.id === adult.id)).toBe(true);

		const updatedAdult = residents.find((resident) => resident.id === adult.id);
		expect(updatedAdult?.fullName).toBe("Updated Adult");
		expect(updatedAdult?.role).toBe("co-applicant");
		expect(updatedAdult?.email).toBe("updated@example.com");

		const newChild = residents.find((resident) => resident.role === "child");
		expect(newChild?.fullName).toBe("New Child");
		expect(incomeSources).toHaveLength(1);
		expect(incomeSources[0].residentId).toBe(adult.id);
	});

	it("deletes a resident and cascades linked records", async () => {
		const { application, primary } = await seedApplication();

		const [resident] = await testDb.db
			.insert(residentsTable)
			.values({
				applicationId: application.id,
				role: "co-applicant",
				fullName: "Jordan Smith",
				dateOfBirth: "1992-03-20",
				email: "jordan@example.com",
				phone: null,
			})
			.returning();

		const [user] = await testDb.db
			.insert(usersTable)
			.values({
				id: "user-2",
				email: "jordan@example.com",
				globalRole: "applicant",
			})
			.returning();

		const [file] = await testDb.db
			.insert(filesTable)
			.values({
				id: "file-1",
				storageKey: "documents/file-1.pdf",
				originalFilename: "paystub.pdf",
				contentType: "application/pdf",
				sizeBytes: 1234,
				status: "attached",
				uploadedByUserId: user.id,
				uploadedAt: "2026-01-01T00:00:00.000Z",
			})
			.returning();

		await testDb.db.insert(incomeSourcesTable).values({
			residentId: resident.id,
			type: "employment",
			employerOrSourceName: "Acme Corp",
			titleOrOccupation: "Engineer",
			monthlyAmountCents: 300000,
			startDate: "2024-01-01",
			endDate: null,
			notes: null,
		});

		const [document] = await testDb.db
			.insert(applicationDocumentsTable)
			.values({
				applicationId: application.id,
				residentId: resident.id,
				fileId: file.id,
				category: "income",
				documentType: "paystub",
				status: "submitted",
				notes: null,
			})
			.returning();

		await testDb.db.insert(applicationAccessTable).values({
			applicationId: application.id,
			userId: user.id,
			residentId: resident.id,
			accessRole: "co_applicant",
		});

		await repo.deleteResident(application.id, resident.id);

		const remainingResident = await testDb.db
			.select()
			.from(residentsTable)
			.where(eq(residentsTable.id, resident.id));
		const remainingIncome = await testDb.db
			.select()
			.from(incomeSourcesTable)
			.where(eq(incomeSourcesTable.residentId, resident.id));
		const [updatedDocument] = await testDb.db
			.select()
			.from(applicationDocumentsTable)
			.where(eq(applicationDocumentsTable.id, document.id));
		const remainingAccess = await testDb.db
			.select()
			.from(applicationAccessTable)
			.where(eq(applicationAccessTable.residentId, resident.id));

		expect(remainingResident).toHaveLength(0);
		expect(remainingIncome).toHaveLength(0);
		expect(updatedDocument.residentId).toBeNull();
		expect(remainingAccess).toHaveLength(0);

		await repo.deleteResident(application.id, primary.id);
		const primaryResidents = await testDb.db
			.select()
			.from(residentsTable)
			.where(eq(residentsTable.id, primary.id));
		expect(primaryResidents).toHaveLength(1);
	});
});
