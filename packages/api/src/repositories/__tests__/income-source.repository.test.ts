import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { incomeSourcesTable, residentsTable } from "~/db/schema";
import { applicationRepository } from "../application.repository";
import { incomeSourceRepository } from "../income-source.repository";
import { createTestDb, type TestDb } from "./db.helper";

const baseAppInput = {
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

describe("incomeSourceRepository.createMany", () => {
	let testDb: TestDb;
	let appRepo: ReturnType<typeof applicationRepository>;
	let repo: ReturnType<typeof incomeSourceRepository>;

	beforeEach(async () => {
		testDb = await createTestDb();
		appRepo = applicationRepository(testDb.db);
		repo = incomeSourceRepository(testDb.db);
	});

	afterEach(() => {
		testDb.cleanup();
	});

	async function getPrimaryResidentId(applicationId: number) {
		const [resident] = await testDb.db
			.select({ id: residentsTable.id })
			.from(residentsTable)
			.where(eq(residentsTable.applicationId, applicationId));
		return resident.id;
	}

	it("inserts income sources with correct fields", async () => {
		const app = await appRepo.create(baseAppInput);
		const residentId = await getPrimaryResidentId(app.id);

		await repo.createMany([
			{
				residentId,
				type: "employment",
				employerOrSourceName: "Acme Corp",
				titleOrOccupation: "Software Engineer",
				monthlyAmountCents: 750000,
				startDate: "2022-01-01",
			},
		]);

		const sources = await testDb.db
			.select()
			.from(incomeSourcesTable)
			.where(eq(incomeSourcesTable.residentId, residentId));

		expect(sources).toHaveLength(1);
		expect(sources[0].type).toBe("employment");
		expect(sources[0].employerOrSourceName).toBe("Acme Corp");
		expect(sources[0].titleOrOccupation).toBe("Software Engineer");
		expect(sources[0].monthlyAmountCents).toBe(750000);
		expect(sources[0].startDate).toBe("2022-01-01");
		expect(sources[0].endDate).toBeNull();
	});

	it("inserts multiple income sources for the same resident", async () => {
		const app = await appRepo.create(baseAppInput);
		const residentId = await getPrimaryResidentId(app.id);

		await repo.createMany([
			{
				residentId,
				type: "employment",
				employerOrSourceName: "Day Job Inc",
				monthlyAmountCents: 500000,
				startDate: "2020-03-01",
			},
			{
				residentId,
				type: "self_employment",
				employerOrSourceName: "Freelance LLC",
				monthlyAmountCents: 150000,
				startDate: "2019-06-15",
				endDate: "2025-12-31",
			},
		]);

		const sources = await testDb.db
			.select()
			.from(incomeSourcesTable)
			.where(eq(incomeSourcesTable.residentId, residentId));

		expect(sources).toHaveLength(2);
		expect(sources.map((s) => s.type)).toContain("employment");
		expect(sources.map((s) => s.type)).toContain("self_employment");
	});

	it("is a no-op when given an empty array", async () => {
		await appRepo.create(baseAppInput);
		await expect(repo.createMany([])).resolves.toBeUndefined();

		const sources = await testDb.db.select().from(incomeSourcesTable);
		expect(sources).toHaveLength(0);
	});
});

describe("incomeSourceRepository.findByResidentId", () => {
	let testDb: TestDb;
	let appRepo: ReturnType<typeof applicationRepository>;
	let repo: ReturnType<typeof incomeSourceRepository>;

	beforeEach(async () => {
		testDb = await createTestDb();
		appRepo = applicationRepository(testDb.db);
		repo = incomeSourceRepository(testDb.db);
	});

	afterEach(() => {
		testDb.cleanup();
	});

	async function getPrimaryResidentId(applicationId: number) {
		const [resident] = await testDb.db
			.select({ id: residentsTable.id })
			.from(residentsTable)
			.where(eq(residentsTable.applicationId, applicationId));
		return resident.id;
	}

	it("returns income sources for the given resident", async () => {
		const app = await appRepo.create(baseAppInput);
		const residentId = await getPrimaryResidentId(app.id);

		await repo.createMany([
			{
				residentId,
				type: "other",
				employerOrSourceName: "Rental property",
				monthlyAmountCents: 200000,
				startDate: "2023-01-01",
			},
		]);

		const sources = await repo.findByResidentId(residentId);

		expect(sources).toHaveLength(1);
		expect(sources[0].residentId).toBe(residentId);
		expect(sources[0].employerOrSourceName).toBe("Rental property");
	});

	it("returns an empty array when the resident has no income sources", async () => {
		const app = await appRepo.create(baseAppInput);
		const residentId = await getPrimaryResidentId(app.id);

		const sources = await repo.findByResidentId(residentId);
		expect(sources).toHaveLength(0);
	});

	it("only returns sources for the requested resident", async () => {
		const app1 = await appRepo.create(baseAppInput);
		const app2 = await appRepo.create({
			...baseAppInput,
			owner: { ...baseAppInput.owner, email: "other@example.com" },
		});

		const residentId1 = await getPrimaryResidentId(app1.id);
		const residentId2 = await getPrimaryResidentId(app2.id);

		await repo.createMany([
			{
				residentId: residentId1,
				type: "employment",
				employerOrSourceName: "Corp A",
				monthlyAmountCents: 400000,
				startDate: "2021-01-01",
			},
			{
				residentId: residentId2,
				type: "employment",
				employerOrSourceName: "Corp B",
				monthlyAmountCents: 600000,
				startDate: "2022-06-01",
			},
		]);

		const sources = await repo.findByResidentId(residentId1);
		expect(sources).toHaveLength(1);
		expect(sources[0].employerOrSourceName).toBe("Corp A");
	});
});
