import { and, desc, eq } from "drizzle-orm";
import { db as defaultDb } from "~/db";
import type { ResidentRole } from "~/db/schema";
import { applicationsTable, petsTable, residentsTable } from "~/db/schema";

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
				db.select().from(residentsTable).where(eq(residentsTable.applicationId, id)),
				db.select().from(petsTable).where(eq(petsTable.applicationId, id)),
			]);

			return { ...app, residents, pets };
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
	};
}
