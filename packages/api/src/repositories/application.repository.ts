import { and, desc, eq, inArray, not } from "drizzle-orm";
import { db as defaultDb } from "~/db";
import type { ResidentRole } from "~/db/schema";
import {
	applicationsTable,
	applicationAccessTable,
	applicationDocumentsTable,
	incomeSourcesTable,
	petsTable,
	residentsTable,
} from "~/db/schema";

type DbInstance = typeof defaultDb;

// ── Input types ───────────────────────────────────────────────────────────────

interface AdditionalAdultInput {
	existingId?: number;
	fullName: string;
	dateOfBirth: string;
	role: "co-applicant" | "dependent";
	email?: string;
}

interface ChildInput {
	existingId?: number;
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
	createdByUserId?: string;
}

export interface UpsertPrimaryApplicantInput {
	fullName: string;
	dateOfBirth: string;
	email: string;
	phone: string;
	desiredMoveInDate: string;
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
			const [application] = await db
				.insert(applicationsTable)
				.values({
					status: "draft",
					createdByUserId: input.createdByUserId ?? null,
				})
				.returning();

			return application;
		},

		async upsertPrimaryApplicant(
			applicationId: number,
			input: UpsertPrimaryApplicantInput,
		) {
			return db.transaction(async (tx) => {
				await tx
					.update(applicationsTable)
					.set({ desiredMoveInDate: input.desiredMoveInDate })
					.where(eq(applicationsTable.id, applicationId));

				const [existing] = await tx
					.select({ id: residentsTable.id })
					.from(residentsTable)
					.where(
						and(
							eq(residentsTable.applicationId, applicationId),
							eq(residentsTable.role, "primary"),
						),
					);

				if (existing) {
					await tx
						.update(residentsTable)
						.set({
							fullName: input.fullName,
							dateOfBirth: input.dateOfBirth,
							email: input.email,
							phone: input.phone,
						})
						.where(eq(residentsTable.id, existing.id));
				} else {
					await tx.insert(residentsTable).values({
						applicationId,
						role: "primary" as ResidentRole,
						fullName: input.fullName,
						dateOfBirth: input.dateOfBirth,
						email: input.email,
						phone: input.phone,
					});
				}
			});
		},

		async updateOccupants(id: number, input: UpdateOccupantsInput) {
			return db.transaction(async (tx) => {
				await tx
					.update(applicationsTable)
					.set({ smokes: input.smokes })
					.where(eq(applicationsTable.id, id));

				const allResidents = [
					...input.additionalAdults.map((adult) => ({
						...adult,
						role: adult.role as ResidentRole,
						email: adult.email ?? null,
					})),
					...input.children.map((child) => ({
						...child,
						role: "child" as ResidentRole,
						email: null,
					})),
				];

				for (const resident of allResidents) {
					if (resident.existingId) {
						await tx
							.update(residentsTable)
							.set({
								fullName: resident.fullName,
								dateOfBirth: resident.dateOfBirth,
								role: resident.role,
								email: resident.email,
							})
							.where(
								and(
									eq(residentsTable.id, resident.existingId),
									eq(residentsTable.applicationId, id),
								),
							);
						continue;
					}

					await tx.insert(residentsTable).values({
						applicationId: id,
						role: resident.role,
						fullName: resident.fullName,
						dateOfBirth: resident.dateOfBirth,
						email: resident.email,
						phone: null,
					});
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

		async deleteResident(applicationId: number, residentId: number) {
			return db.transaction(async (tx) => {
				await tx
					.delete(incomeSourcesTable)
					.where(eq(incomeSourcesTable.residentId, residentId));

				await tx
					.update(applicationDocumentsTable)
					.set({ residentId: null })
					.where(eq(applicationDocumentsTable.residentId, residentId));

				await tx
					.delete(applicationAccessTable)
					.where(eq(applicationAccessTable.residentId, residentId));

				await tx
					.delete(residentsTable)
					.where(
						and(
							eq(residentsTable.id, residentId),
							eq(residentsTable.applicationId, applicationId),
							not(eq(residentsTable.role, "primary")),
						),
					);
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
				.leftJoin(
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
