import { eq } from "drizzle-orm";
import type { DbInstance } from "~/db";
import type {
	ApplicationDocumentCategory,
	ApplicationDocumentStatus,
	ApplicationDocumentType,
} from "~/db/schema";
import { applicationDocumentsTable } from "~/db/schema";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApplicationDocumentRecord {
	id: number;
	applicationId: number;
	residentId: number | null;
	fileId: string;
	category: ApplicationDocumentCategory;
	documentType: ApplicationDocumentType;
	status: ApplicationDocumentStatus;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CreateApplicationDocumentInput {
	applicationId: number;
	residentId?: number;
	fileId: string;
	category: ApplicationDocumentCategory;
	documentType: ApplicationDocumentType;
}

// ── Interface ─────────────────────────────────────────────────────────────────

export interface ApplicationDocumentRepository {
	create(
		input: CreateApplicationDocumentInput,
	): Promise<ApplicationDocumentRecord>;
	findById(id: number): Promise<ApplicationDocumentRecord | null>;
	findByFileId(fileId: string): Promise<ApplicationDocumentRecord | null>;
	findByApplicationId(
		applicationId: number,
	): Promise<ApplicationDocumentRecord[]>;
	updateStatus(
		id: number,
		status: ApplicationDocumentStatus,
		notes?: string,
	): Promise<void>;
	deleteById(id: number): Promise<void>;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function applicationDocumentRepository(
	db: DbInstance,
): ApplicationDocumentRepository {
	return {
		async create(input) {
			const [doc] = await db
				.insert(applicationDocumentsTable)
				.values({
					applicationId: input.applicationId,
					residentId: input.residentId ?? null,
					fileId: input.fileId,
					category: input.category,
					documentType: input.documentType,
				})
				.returning();

			return doc;
		},

		async findById(id) {
			const [doc] = await db
				.select()
				.from(applicationDocumentsTable)
				.where(eq(applicationDocumentsTable.id, id));

			return doc ?? null;
		},

		async findByApplicationId(applicationId) {
			return db
				.select()
				.from(applicationDocumentsTable)
				.where(eq(applicationDocumentsTable.applicationId, applicationId));
		},

		async findByFileId(fileId) {
			const [doc] = await db
				.select()
				.from(applicationDocumentsTable)
				.where(eq(applicationDocumentsTable.fileId, fileId));

			return doc ?? null;
		},

		async deleteById(id) {
			await db
				.delete(applicationDocumentsTable)
				.where(eq(applicationDocumentsTable.id, id));
		},

		async updateStatus(id, status, notes) {
			await db
				.update(applicationDocumentsTable)
				.set({
					status,
					notes: notes ?? null,
					updatedAt: new Date().toISOString(),
				})
				.where(eq(applicationDocumentsTable.id, id));
		},
	};
}
