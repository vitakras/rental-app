import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { applicationsTable, petsTable, residentsTable } from "~/db/schema";
import { applicationRepository } from "../application-repository";
import { createTestDb, type TestDb } from "./db-helper";

describe("applicationRepository.create", () => {
	let testDb: TestDb;
	let repo: ReturnType<typeof applicationRepository>;

	beforeEach(async () => {
		testDb = await createTestDb();
		repo = applicationRepository(testDb.db);
	});

	afterEach(() => {
		testDb.cleanup();
	});

	const baseInput = {
		desiredMoveInDate: "2026-06-01",
		owner: {
			fullName: "Alex Johnson",
			dateOfBirth: "1990-05-15",
			email: "alex@example.com",
			phone: "555-000-0001",
		},
		additionalAdults: [],
		children: [],
		pets: [],
	};

	it("creates the application row with correct fields", async () => {
		const application = await repo.create(baseInput);

		expect(application.id).toBeNumber();
		expect(application.status).toBe("pending");
		expect(application.desiredMoveInDate).toBe("2026-06-01");
		expect(application.smokes).toBe(false);
	});

	it("creates the primary resident linked to the application", async () => {
		const application = await repo.create(baseInput);

		const residents = await testDb.db
			.select()
			.from(residentsTable)
			.where(eq(residentsTable.applicationId, application.id));

		expect(residents).toHaveLength(1);

		const primary = residents[0];
		expect(primary.role).toBe("primary");
		expect(primary.fullName).toBe("Alex Johnson");
		expect(primary.dateOfBirth).toBe("1990-05-15");
		expect(primary.email).toBe("alex@example.com");
		expect(primary.phone).toBe("555-000-0001");
	});

	it("creates co-applicant residents with email", async () => {
		const application = await repo.create({
			...baseInput,
			additionalAdults: [
				{
					fullName: "Jane Smith",
					dateOfBirth: "1992-03-20",
					role: "co-applicant",
					email: "jane@example.com",
				},
			],
		});

		const residents = await testDb.db
			.select()
			.from(residentsTable)
			.where(eq(residentsTable.applicationId, application.id));

		expect(residents).toHaveLength(2);

		const coApplicant = residents.find((r) => r.role === "co-applicant");
		expect(coApplicant).toBeDefined();
		expect(coApplicant?.fullName).toBe("Jane Smith");
		expect(coApplicant?.email).toBe("jane@example.com");
		expect(coApplicant?.phone).toBeNull();
	});

	it("creates dependent residents without email", async () => {
		const application = await repo.create({
			...baseInput,
			additionalAdults: [
				{
					fullName: "Bob Johnson",
					dateOfBirth: "1988-07-11",
					role: "dependent",
				},
			],
		});

		const residents = await testDb.db
			.select()
			.from(residentsTable)
			.where(eq(residentsTable.applicationId, application.id));

		const dependent = residents.find((r) => r.role === "dependent");
		expect(dependent).toBeDefined();
		expect(dependent?.fullName).toBe("Bob Johnson");
		expect(dependent?.email).toBeNull();
	});

	it("creates child residents", async () => {
		const application = await repo.create({
			...baseInput,
			children: [
				{ fullName: "Sam Johnson", dateOfBirth: "2018-09-01" },
				{ fullName: "Lily Johnson", dateOfBirth: "2020-02-14" },
			],
		});

		const residents = await testDb.db
			.select()
			.from(residentsTable)
			.where(eq(residentsTable.applicationId, application.id));

		const children = residents.filter((r) => r.role === "child");
		expect(children).toHaveLength(2);
		expect(children.map((c) => c.fullName)).toContain("Sam Johnson");
		expect(children.map((c) => c.fullName)).toContain("Lily Johnson");
		children.forEach((c) => {
			expect(c.email).toBeNull();
			expect(c.phone).toBeNull();
		});
	});

	it("creates all resident types together", async () => {
		const application = await repo.create({
			...baseInput,
			additionalAdults: [
				{
					fullName: "Jane Smith",
					dateOfBirth: "1992-03-20",
					role: "co-applicant",
					email: "jane@example.com",
				},
				{ fullName: "Bob Jones", dateOfBirth: "1985-11-30", role: "dependent" },
			],
			children: [{ fullName: "Sam Johnson", dateOfBirth: "2019-06-15" }],
		});

		const residents = await testDb.db
			.select()
			.from(residentsTable)
			.where(eq(residentsTable.applicationId, application.id));

		expect(residents).toHaveLength(4);
		expect(residents.filter((r) => r.role === "primary")).toHaveLength(1);
		expect(residents.filter((r) => r.role === "co-applicant")).toHaveLength(1);
		expect(residents.filter((r) => r.role === "dependent")).toHaveLength(1);
		expect(residents.filter((r) => r.role === "child")).toHaveLength(1);
	});

	it("rolls back the application insert if residents insert fails", async () => {
		const badInput = {
			...baseInput,
			owner: { ...baseInput.owner, fullName: null as unknown as string },
		};

		await expect(repo.create(badInput)).rejects.toThrow();

		const applications = await testDb.db.select().from(applicationsTable);
		expect(applications).toHaveLength(0);
	});
});

describe("applicationRepository.findById", () => {
	let testDb: TestDb;
	let repo: ReturnType<typeof applicationRepository>;

	beforeEach(async () => {
		testDb = await createTestDb();
		repo = applicationRepository(testDb.db);
	});

	afterEach(() => {
		testDb.cleanup();
	});

	const baseInput = {
		desiredMoveInDate: "2026-06-01",
		owner: {
			fullName: "Alex Johnson",
			dateOfBirth: "1990-05-15",
			email: "alex@example.com",
			phone: "555-000-0001",
		},
		additionalAdults: [],
		children: [],
		pets: [],
	};

	it("returns the application when found", async () => {
		const created = await repo.create(baseInput);
		const app = await repo.findById(created.id);

		expect(app).not.toBeNull();
		expect(app?.id).toBe(created.id);
		expect(app?.status).toBe("pending");
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

	afterEach(() => {
		testDb.cleanup();
	});

	const baseInput = {
		desiredMoveInDate: "2026-06-01",
		owner: {
			fullName: "Alex Johnson",
			dateOfBirth: "1990-05-15",
			email: "alex@example.com",
			phone: "555-000-0001",
		},
		additionalAdults: [],
		children: [],
		pets: [],
	};

	it("updates status to submitted and returns the application", async () => {
		const created = await repo.create(baseInput);
		const updated = await repo.submit(created.id);

		expect(updated).not.toBeNull();
		expect(updated?.id).toBe(created.id);
		expect(updated?.status).toBe("submitted");
	});

	it("persists the submitted status in the database", async () => {
		const created = await repo.create(baseInput);
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

	const baseInput = {
		desiredMoveInDate: "2026-06-01",
		owner: {
			fullName: "Alex Johnson",
			dateOfBirth: "1990-05-15",
			email: "alex@example.com",
			phone: "555-000-0001",
		},
		additionalAdults: [],
		children: [],
		pets: [],
	};

	beforeEach(async () => {
		testDb = await createTestDb();
		repo = applicationRepository(testDb.db);
	});

	afterEach(() => {
		testDb.cleanup();
	});

	it("updates smokes on the application", async () => {
		const created = await repo.create(baseInput);
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
		const created = await repo.create(baseInput);
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
		const created = await repo.create(baseInput);
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

	it("replaces non-primary residents on repeated calls", async () => {
		const created = await repo.create({
			...baseInput,
			additionalAdults: [
				{
					fullName: "Old Adult",
					dateOfBirth: "1985-01-01",
					role: "dependent",
				},
			],
		});

		await repo.updateOccupants(created.id, {
			smokes: false,
			additionalAdults: [
				{
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
	});

	it("inserts and replaces pets", async () => {
		const created = await repo.create({
			...baseInput,
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

	it("removes all occupants and pets when called with empty arrays", async () => {
		const created = await repo.create({
			...baseInput,
			additionalAdults: [
				{
					fullName: "Jane Smith",
					dateOfBirth: "1992-03-20",
					role: "co-applicant",
					email: "jane@example.com",
				},
			],
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

		expect(residents).toHaveLength(1); // only primary
		expect(pets).toHaveLength(0);
	});
});
