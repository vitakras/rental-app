import { and, desc, eq, inArray, not } from "drizzle-orm";
import { db as defaultDb } from "~/db";
import type { ResidentRole } from "~/db/schema";
import {
	applicationsTable,
	incomeSourcesTable,
	petsTable,
	residentsTable,
} from "~/db/schema";

type DbInstance = typeof defaultDb;

// ── Input types ───────────────────────────────────────────────────────────────

interface OwnerInput {
	fullName: string;
	dateOfBirth: string;
	email: string;
	phone: string;
}

interface AdditionalAdultInput {
	fullName: string;
	dateOfBirth: string;
	role: "co-applicant" | "dependent";
	email?: string;
}

interface ChildInput {
	fullName: string;
	dateOfBirth: string;
}

interface PetInput {
	type: string;
	name?: string;
	breed?: string;
	notes?: string;
}

export interface CreateApplicationInput {
	desiredMoveInDate: string;
	owner: OwnerInput;
	additionalAdults: AdditionalAdultInput[];
	children: ChildInput[];
	pets: PetInput[];
	createdByUserId?: string;
}

interface UpdateOccupantsInput {
	smokes: boolean;
	additionalAdults: AdditionalAdultInput[];
	children: ChildInput[];
	pets: PetInput[];
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function applicationRepository(db: DbInstance = defaultDb) {
	return {
		async create(input: CreateApplicationInput) {
			return db.transaction(async (tx) => {
				const [application] = await tx
					.insert(applicationsTable)
					.values({
						status: "pending",
						desiredMoveInDate: input.desiredMoveInDate,
						smokes: false,
						createdByUserId: input.createdByUserId ?? null,
					})
					.returning();

				await tx.insert(residentsTable).values([
					{
						applicationId: application.id,
						role: "primary" as ResidentRole,
						fullName: input.owner.fullName,
						dateOfBirth: input.owner.dateOfBirth,
						email: input.owner.email,
						phone: input.owner.phone,
					},
					...input.additionalAdults.map((adult) => ({
						applicationId: application.id,
						role: adult.role as ResidentRole,
						fullName: adult.fullName,
						dateOfBirth: adult.dateOfBirth,
						email: adult.email ?? null,
						phone: null,
					})),
					...input.children.map((child) => ({
						applicationId: application.id,
						role: "child" as ResidentRole,
						fullName: child.fullName,
						dateOfBirth: child.dateOfBirth,
						email: null,
						phone: null,
					})),
				]);

				if (input.pets.length > 0) {
					await tx.insert(petsTable).values(
						input.pets.map((pet) => ({
							applicationId: application.id,
							type: pet.type,
							name: pet.name ?? null,
							breed: pet.breed ?? null,
							notes: pet.notes ?? null,
						})),
					);
				}

				return application;
			});
		},

		async updateOccupants(id: number, input: UpdateOccupantsInput) {
			return db.transaction(async (tx) => {
				await tx
					.update(applicationsTable)
					.set({ smokes: input.smokes })
					.where(eq(applicationsTable.id, id));

				await tx
					.delete(residentsTable)
					.where(
						and(
							eq(residentsTable.applicationId, id),
							not(eq(residentsTable.role, "primary")),
						),
					);

				const newResidents = [
					...input.additionalAdults.map((adult) => ({
						applicationId: id,
						role: adult.role as ResidentRole,
						fullName: adult.fullName,
						dateOfBirth: adult.dateOfBirth,
						email: adult.email ?? null,
						phone: null,
					})),
					...input.children.map((child) => ({
						applicationId: id,
						role: "child" as ResidentRole,
						fullName: child.fullName,
						dateOfBirth: child.dateOfBirth,
						email: null,
						phone: null,
					})),
				];

				if (newResidents.length > 0) {
					await tx.insert(residentsTable).values(newResidents);
				}

				await tx.delete(petsTable).where(eq(petsTable.applicationId, id));

				if (input.pets.length > 0) {
					await tx.insert(petsTable).values(
						input.pets.map((pet) => ({
							applicationId: id,
							type: pet.type,
							name: pet.name ?? null,
							breed: pet.breed ?? null,
							notes: pet.notes ?? null,
						})),
					);
				}
			});
		},

		async findById(id: number) {
			const [app] = await db
				.select()
				.from(applicationsTable)
				.where(eq(applicationsTable.id, id));

			return app ?? null;
		},

		async submit(id: number) {
			const [updated] = await db
				.update(applicationsTable)
				.set({ status: "submitted" })
				.where(eq(applicationsTable.id, id))
				.returning();

			return updated ?? null;
		},

		async findByIdWithDetails(id: number) {
			const [app] = await db
				.select()
				.from(applicationsTable)
				.where(eq(applicationsTable.id, id));

			if (!app) return null;

			const [residents, pets] = await Promise.all([
				db
					.select()
					.from(residentsTable)
					.where(eq(residentsTable.applicationId, id)),
				db.select().from(petsTable).where(eq(petsTable.applicationId, id)),
			]);

			const residentIds = residents.map((r) => r.id);
			const incomeSources =
				residentIds.length > 0
					? await db
							.select()
							.from(incomeSourcesTable)
							.where(inArray(incomeSourcesTable.residentId, residentIds))
					: [];

			const residentsWithIncome = residents.map((r) => ({
				...r,
				incomeSources: incomeSources.filter((is) => is.residentId === r.id),
			}));

			return { ...app, residents: residentsWithIncome, pets };
		},

		async findAllSubmitted() {
			return db
				.select({
					id: applicationsTable.id,
					status: applicationsTable.status,
					desiredMoveInDate: applicationsTable.desiredMoveInDate,
					createdAt: applicationsTable.createdAt,
					primaryApplicantName: residentsTable.fullName,
				})
				.from(applicationsTable)
				.innerJoin(
					residentsTable,
					and(
						eq(residentsTable.applicationId, applicationsTable.id),
						eq(residentsTable.role, "primary"),
					),
				)
				.where(eq(applicationsTable.status, "submitted"))
				.orderBy(desc(applicationsTable.createdAt));
		},

		async findAllByUserId(userId: string) {
			return db
				.select({
					id: applicationsTable.id,
					status: applicationsTable.status,
					desiredMoveInDate: applicationsTable.desiredMoveInDate,
					createdAt: applicationsTable.createdAt,
					primaryApplicantName: residentsTable.fullName,
				})
				.from(applicationsTable)
				.innerJoin(
					residentsTable,
					and(
						eq(residentsTable.applicationId, applicationsTable.id),
						eq(residentsTable.role, "primary"),
					),
				)
				.where(eq(applicationsTable.createdByUserId, userId))
				.orderBy(desc(applicationsTable.createdAt));
		},
	};
}
