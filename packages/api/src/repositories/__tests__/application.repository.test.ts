import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	applicationsTable,
	petsTable,
	residentsTable,
	usersTable,
} from "~/db/schema";
import { applicationRepository } from "../application.repository";
import { createTestDb, type TestDb } from "./db.helper";

describe("applicationRepository.create", () => {
	let testDb: TestDb;
	let repo: ReturnType<typeof applicationRepository>;

	beforeEach(async () => {
		testDb = await createTestDb();
		repo = applicationRepository(testDb.db);
	});

	afterEach(async () => {
		await testDb?.cleanup();
	});

	it("creates the application row with correct fields", async () => {
		const application = await repo.create({});

		expect(typeof application.id).toBe("number");
		expect(application.status).toBe("draft");
		expect(application.desiredMoveInDate).toBeNull();
		expect(application.smokes).toBe(false);
	});

	it("creates a draft application without residents", async () => {
		const application = await repo.create({});

		const residents = await testDb.db
			.select()
			.from(residentsTable)
			.where(eq(residentsTable.applicationId, application.id));

		expect(residents).toHaveLength(0);
	});

	it("stores the creator when provided", async () => {
		await testDb.db.insert(usersTable).values({
			id: "user-123",
			email: "user-123@example.com",
			globalRole: "applicant",
		});

		const application = await repo.create({
			createdByUserId: "user-123",
		});

		expect(application.createdByUserId).toBe("user-123");
	});

	it("persists the application row", async () => {
		const application = await repo.create({});
		const applications = await testDb.db.select().from(applicationsTable);

		expect(applications).toHaveLength(1);
		expect(applications[0].id).toBe(application.id);
		expect(applications[0].status).toBe("draft");
	});
});

describe("applicationRepository.findById", () => {
	let testDb: TestDb;
	let repo: ReturnType<typeof applicationRepository>;

	beforeEach(async () => {
		testDb = await createTestDb();
		repo = applicationRepository(testDb.db);
	});

	afterEach(async () => {
		await testDb?.cleanup();
	});

	it("returns the application when found", async () => {
		const created = await repo.create({});
		const app = await repo.findById(created.id);

		expect(app).not.toBeNull();
		expect(app?.id).toBe(created.id);
		expect(app?.status).toBe("draft");
	});

	it("returns null for a non-existent id", async () => {
		const app = await repo.findById(99999);
		expect(app).toBeNull();
	});
});

describe("applicationRepository.submit", () => {
	let testDb: TestDb;
	let repo: ReturnType<typeof applicationRepository>;

	beforeEach(async () => {
		testDb = await createTestDb();
		repo = applicationRepository(testDb.db);
	});

	afterEach(async () => {
		await testDb?.cleanup();
	});

	it("updates status to submitted and returns the application", async () => {
		const created = await repo.create({});
		const updated = await repo.submit(created.id);

		expect(updated).not.toBeNull();
		expect(updated?.id).toBe(created.id);
		expect(updated?.status).toBe("submitted");
	});

	it("persists the submitted status in the database", async () => {
		const created = await repo.create({});
		await repo.submit(created.id);

		const [app] = await testDb.db
			.select()
			.from(applicationsTable)
			.where(eq(applicationsTable.id, created.id));

		expect(app.status).toBe("submitted");
	});

	it("returns null for a non-existent application id", async () => {
		const result = await repo.submit(99999);
		expect(result).toBeNull();
	});
});

describe("applicationRepository.updateOccupants", () => {
	let testDb: TestDb;
	let repo: ReturnType<typeof applicationRepository>;

	const primaryApplicantInput = {
		desiredMoveInDate: "2026-06-01",
		fullName: "Alex Johnson",
		dateOfBirth: "1990-05-15",
		email: "alex@example.com",
		phone: "555-000-0001",
	};

	beforeEach(async () => {
		testDb = await createTestDb();
		repo = applicationRepository(testDb.db);
	});

	afterEach(async () => {
		await testDb?.cleanup();
	});

	async function createApplicationWithPrimary() {
		const created = await repo.create({});
		await repo.upsertPrimaryApplicant(created.id, primaryApplicantInput);
		return created;
	}

	it("updates smokes on the application", async () => {
		const created = await createApplicationWithPrimary();
		await repo.updateOccupants(created.id, {
			smokes: true,
			additionalAdults: [],
			children: [],
			pets: [],
		});

		const [app] = await testDb.db
			.select()
			.from(applicationsTable)
			.where(eq(applicationsTable.id, created.id));

		expect(app.smokes).toBe(true);
	});

	it("inserts additional adults and children", async () => {
		const created = await createApplicationWithPrimary();
		await repo.updateOccupants(created.id, {
			smokes: false,
			additionalAdults: [
				{
					fullName: "Jane Smith",
					dateOfBirth: "1992-03-20",
					role: "co-applicant",
					email: "jane@example.com",
				},
			],
			children: [{ fullName: "Sam Johnson", dateOfBirth: "2019-06-15" }],
			pets: [],
		});

		const residents = await testDb.db
			.select()
			.from(residentsTable)
			.where(eq(residentsTable.applicationId, created.id));

		expect(residents).toHaveLength(3);
		expect(residents.filter((r) => r.role === "primary")).toHaveLength(1);
		expect(residents.filter((r) => r.role === "co-applicant")).toHaveLength(1);
		expect(residents.filter((r) => r.role === "child")).toHaveLength(1);
	});

	it("does not touch the primary resident", async () => {
		const created = await createApplicationWithPrimary();
		await repo.updateOccupants(created.id, {
			smokes: false,
			additionalAdults: [],
			children: [],
			pets: [],
		});

		const residents = await testDb.db
			.select()
			.from(residentsTable)
			.where(eq(residentsTable.applicationId, created.id));

		expect(residents).toHaveLength(1);
		expect(residents[0].role).toBe("primary");
		expect(residents[0].fullName).toBe("Alex Johnson");
	});

	it("updates existing non-primary residents when existingId is provided", async () => {
		const created = await createApplicationWithPrimary();

		await repo.updateOccupants(created.id, {
			smokes: false,
			additionalAdults: [
				{
					fullName: "Old Adult",
					dateOfBirth: "1985-01-01",
					role: "dependent",
				},
			],
			children: [],
			pets: [],
		});

		const residentsAfterFirstUpdate = await testDb.db
			.select()
			.from(residentsTable)
			.where(eq(residentsTable.applicationId, created.id));
		const existingResident = residentsAfterFirstUpdate.find(
			(r) => r.role === "dependent",
		);

		expect(existingResident).toBeDefined();

		await repo.updateOccupants(created.id, {
			smokes: false,
			additionalAdults: [
				{
					existingId: existingResident!.id,
					fullName: "New Adult",
					dateOfBirth: "1990-06-15",
					role: "co-applicant",
					email: "new@example.com",
				},
			],
			children: [],
			pets: [],
		});

		const residents = await testDb.db
			.select()
			.from(residentsTable)
			.where(eq(residentsTable.applicationId, created.id));

		expect(residents).toHaveLength(2);
		const names = residents.map((r) => r.fullName);
		expect(names).toContain("New Adult");
		expect(names).not.toContain("Old Adult");
		expect(residents.find((r) => r.id === existingResident!.id)?.role).toBe(
			"co-applicant",
		);
	});

	it("inserts and replaces pets", async () => {
		const created = await createApplicationWithPrimary();

		await repo.updateOccupants(created.id, {
			smokes: false,
			additionalAdults: [],
			children: [],
			pets: [{ type: "Dog", name: "Rex" }],
		});

		await repo.updateOccupants(created.id, {
			smokes: false,
			additionalAdults: [],
			children: [],
			pets: [{ type: "Cat", name: "Whiskers" }, { type: "Bird" }],
		});

		const pets = await testDb.db
			.select()
			.from(petsTable)
			.where(eq(petsTable.applicationId, created.id));

		expect(pets).toHaveLength(2);
		const petNames = pets.map((p) => p.name);
		expect(petNames).toContain("Whiskers");
		expect(petNames).not.toContain("Rex");
	});

	it("removes pets but leaves existing residents untouched when called with empty arrays", async () => {
		const created = await createApplicationWithPrimary();

		await repo.updateOccupants(created.id, {
			smokes: false,
			additionalAdults: [
				{
					fullName: "Jane Smith",
					dateOfBirth: "1992-03-20",
					role: "co-applicant",
					email: "jane@example.com",
				},
			],
			children: [],
			pets: [{ type: "Dog", name: "Rex" }],
		});

		await repo.updateOccupants(created.id, {
			smokes: false,
			additionalAdults: [],
			children: [],
			pets: [],
		});

		const residents = await testDb.db
			.select()
			.from(residentsTable)
			.where(eq(residentsTable.applicationId, created.id));

		const pets = await testDb.db
			.select()
			.from(petsTable)
			.where(eq(petsTable.applicationId, created.id));

		expect(residents).toHaveLength(2);
		expect(
			residents.filter((resident) => resident.role === "primary"),
		).toHaveLength(1);
		expect(
			residents.filter((resident) => resident.role === "co-applicant"),
		).toHaveLength(1);
		expect(pets).toHaveLength(0);
	});
});
