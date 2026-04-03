import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { incomeSourcesTable, residentsTable } from "~/db/schema";
import { applicationRepository } from "../application.repository";
import { incomeSourceRepository } from "../income-source.repository";
import { createTestDb, type TestDb } from "./db.helper";

const primaryApplicantInput = {
	desiredMoveInDate: "2026-06-01",
	fullName: "Alex Johnson",
	dateOfBirth: "1990-05-15",
	email: "alex@example.com",
	phone: "555-000-0001",
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

	afterEach(async () => {
		await testDb?.cleanup();
	});

	async function createApplicationWithPrimaryResident() {
		const app = await appRepo.create({});
		await appRepo.upsertPrimaryApplicant(app.id, primaryApplicantInput);

		const [resident] = await testDb.db
			.select({ id: residentsTable.id })
			.from(residentsTable)
			.where(eq(residentsTable.applicationId, app.id));

		return { app, residentId: resident.id };
	}

	it("inserts income sources with correct fields", async () => {
		const { residentId } = await createApplicationWithPrimaryResident();

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
		const { residentId } = await createApplicationWithPrimaryResident();

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
		await createApplicationWithPrimaryResident();
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

	afterEach(async () => {
		await testDb?.cleanup();
	});

	async function createApplicationWithPrimaryResident() {
		const app = await appRepo.create({});
		await appRepo.upsertPrimaryApplicant(app.id, primaryApplicantInput);

		const [resident] = await testDb.db
			.select({ id: residentsTable.id })
			.from(residentsTable)
			.where(eq(residentsTable.applicationId, app.id));

		return { app, residentId: resident.id };
	}

	it("returns income sources for the given resident", async () => {
		const { residentId } = await createApplicationWithPrimaryResident();

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
		const { residentId } = await createApplicationWithPrimaryResident();

		const sources = await repo.findByResidentId(residentId);
		expect(sources).toHaveLength(0);
	});

	it("only returns sources for the requested resident", async () => {
		const { residentId: residentId1 } =
			await createApplicationWithPrimaryResident();
		const secondApp = await appRepo.create({});
		await appRepo.upsertPrimaryApplicant(secondApp.id, {
			...primaryApplicantInput,
			email: "other@example.com",
		});
		const [secondResident] = await testDb.db
			.select({ id: residentsTable.id })
			.from(residentsTable)
			.where(eq(residentsTable.applicationId, secondApp.id));
		const residentId2 = secondResident.id;

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
