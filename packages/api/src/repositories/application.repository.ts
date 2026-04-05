import { and, desc, eq, inArray, not } from "drizzle-orm";
import type { DbInstance } from "~/db";
import type { ResidentRole } from "~/db/schema";
import {
	applicationAccessTable,
	applicationDocumentsTable,
	applicationsTable,
	filesTable,
	incomeSourcesTable,
	petsTable,
	residencesTable,
	residentsTable,
} from "~/db/schema";
import type { UpsertResidencePayload } from "~/services/application.service";

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

export function applicationRepository(db: DbInstance) {
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
			await db
				.update(applicationsTable)
				.set({ desiredMoveInDate: input.desiredMoveInDate })
				.where(eq(applicationsTable.id, applicationId));

			const [existing] = await db
				.select({ id: residentsTable.id })
				.from(residentsTable)
				.where(
					and(
						eq(residentsTable.applicationId, applicationId),
						eq(residentsTable.role, "primary"),
					),
				);

			if (existing) {
				await db
					.update(residentsTable)
					.set({
						fullName: input.fullName,
						dateOfBirth: input.dateOfBirth,
						email: input.email,
						phone: input.phone,
					})
					.where(eq(residentsTable.id, existing.id));
				return;
			}

			await db.insert(residentsTable).values({
				applicationId,
				role: "primary" as ResidentRole,
				fullName: input.fullName,
				dateOfBirth: input.dateOfBirth,
				email: input.email,
				phone: input.phone,
			});
		},

		async updateOccupants(id: number, input: UpdateOccupantsInput) {
			await db
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
					await db
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

				await db.insert(residentsTable).values({
					applicationId: id,
					role: resident.role,
					fullName: resident.fullName,
					dateOfBirth: resident.dateOfBirth,
					email: resident.email,
					phone: null,
				});
			}

			await db.delete(petsTable).where(eq(petsTable.applicationId, id));

			if (input.pets.length > 0) {
				await db.insert(petsTable).values(
					input.pets.map((pet) => ({
						applicationId: id,
						type: pet.type,
						name: pet.name ?? null,
						breed: pet.breed ?? null,
						notes: pet.notes ?? null,
					})),
				);
			}
		},

		async upsertResidences(
			applicationId: number,
			input: UpsertResidencePayload,
		) {
			const residentIds = input.residents.map(
				(resident) => resident.residentId,
			);

			if (residentIds.length > 0) {
				await db
					.delete(residencesTable)
					.where(
						and(
							eq(residencesTable.applicationId, applicationId),
							inArray(residencesTable.residentId, residentIds),
						),
					);
			}

			const rows = input.residents.flatMap(({ residentId, residences }) =>
				residences.map((residence) => ({
					applicationId,
					residentId,
					address: residence.address,
					fromDate: residence.fromDate,
					toDate: residence.toDate ?? null,
					reasonForLeaving: residence.reasonForLeaving ?? null,
					isRental: residence.isRental,
					landlordName: residence.landlordName ?? null,
					landlordPhone: residence.landlordPhone ?? null,
					notes: residence.notes ?? null,
				})),
			);

			if (rows.length > 0) {
				await db.insert(residencesTable).values(rows);
			}
		},

		async deleteResident(applicationId: number, residentId: number) {
			await db
				.delete(incomeSourcesTable)
				.where(eq(incomeSourcesTable.residentId, residentId));

			await db
				.delete(residencesTable)
				.where(eq(residencesTable.residentId, residentId));

			await db
				.update(applicationDocumentsTable)
				.set({ residentId: null })
				.where(eq(applicationDocumentsTable.residentId, residentId));

			await db
				.delete(applicationAccessTable)
				.where(eq(applicationAccessTable.residentId, residentId));

			await db
				.delete(residentsTable)
				.where(
					and(
						eq(residentsTable.id, residentId),
						eq(residentsTable.applicationId, applicationId),
						not(eq(residentsTable.role, "primary")),
					),
				);
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

		async decide(
			id: number,
			status: "approved" | "rejected" | "info_requested",
			landlordNote?: string,
		) {
			const [updated] = await db
				.update(applicationsTable)
				.set({ status, landlordNote: landlordNote ?? null })
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

			const fetchDocuments = () =>
				db
					.select({
						id: applicationDocumentsTable.id,
						applicationId: applicationDocumentsTable.applicationId,
						residentId: applicationDocumentsTable.residentId,
						fileId: applicationDocumentsTable.fileId,
						category: applicationDocumentsTable.category,
						documentType: applicationDocumentsTable.documentType,
						status: applicationDocumentsTable.status,
						notes: applicationDocumentsTable.notes,
						createdAt: applicationDocumentsTable.createdAt,
						updatedAt: applicationDocumentsTable.updatedAt,
						originalFilename: filesTable.originalFilename,
					})
					.from(applicationDocumentsTable)
					.innerJoin(
						filesTable,
						eq(applicationDocumentsTable.fileId, filesTable.id),
					)
					.where(eq(applicationDocumentsTable.applicationId, id));

			const [incomeSources, residences, documents] =
				residentIds.length > 0
					? await Promise.all([
							db
								.select()
								.from(incomeSourcesTable)
								.where(inArray(incomeSourcesTable.residentId, residentIds)),
							db
								.select()
								.from(residencesTable)
								.where(
									and(
										eq(residencesTable.applicationId, id),
										inArray(residencesTable.residentId, residentIds),
									),
								),
							fetchDocuments(),
						])
					: [[], [], await fetchDocuments()];

			const residentsWithDetails = residents.map((r) => ({
				...r,
				incomeSources: incomeSources.filter((is) => is.residentId === r.id),
				residences: residences.filter(
					(residence) => residence.residentId === r.id,
				),
			}));

			return { ...app, residents: residentsWithDetails, pets, documents };
		},

		async findAllSubmitted() {
			return db
				.select({
					id: applicationsTable.id,
					status: applicationsTable.status,
					desiredMoveInDate: applicationsTable.desiredMoveInDate,
					createdAt: applicationsTable.createdAt,
					primaryApplicantName: residentsTable.fullName,
					landlordNote: applicationsTable.landlordNote,
				})
				.from(applicationsTable)
				.innerJoin(
					residentsTable,
					and(
						eq(residentsTable.applicationId, applicationsTable.id),
						eq(residentsTable.role, "primary"),
					),
				)
				.where(
					inArray(applicationsTable.status, [
						"submitted",
						"approved",
						"rejected",
						"info_requested",
					]),
				)
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
