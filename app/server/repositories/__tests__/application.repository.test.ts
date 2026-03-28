import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { applicationsTable, residentsTable } from "~/db/schema";
import { applicationRepository } from "../application.repository";
import { createTestDb, type TestDb } from "./db.helper";

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
