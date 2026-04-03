import { eq } from "drizzle-orm";
import type { DbInstance } from "~/db";
import type { FileStatus } from "~/db/schema";
import { filesTable } from "~/db/schema";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FileRecord {
	id: string;
	storageKey: string;
	originalFilename: string;
	contentType: string;
	sizeBytes: number;
	status: FileStatus;
	uploadedByUserId: string;
	createdAt: string;
	uploadedAt: string | null;
}

export interface CreatePendingUploadInput {
	id: string;
	storageKey: string;
	originalFilename: string;
	contentType: string;
	sizeBytes: number;
	uploadedByUserId: string;
}

// ── Interface ─────────────────────────────────────────────────────────────────

export interface FileRepository {
	createPendingUpload(input: CreatePendingUploadInput): Promise<FileRecord>;
	markUploaded(fileId: string): Promise<void>;
	markAttached(fileId: string): Promise<void>;
	findById(fileId: string): Promise<FileRecord | null>;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function fileRepository(db: DbInstance): FileRepository {
	return {
		async createPendingUpload(input) {
			const [file] = await db
				.insert(filesTable)
				.values({
					id: input.id,
					storageKey: input.storageKey,
					originalFilename: input.originalFilename,
					contentType: input.contentType,
					sizeBytes: input.sizeBytes,
					status: "pending_upload",
					uploadedByUserId: input.uploadedByUserId,
				})
				.returning();

			return file;
		},

		async markUploaded(fileId) {
			await db
				.update(filesTable)
				.set({ status: "uploaded", uploadedAt: new Date().toISOString() })
				.where(eq(filesTable.id, fileId));
		},

		async markAttached(fileId) {
			await db
				.update(filesTable)
				.set({ status: "attached" })
				.where(eq(filesTable.id, fileId));
		},

		async findById(fileId) {
			const [file] = await db
				.select()
				.from(filesTable)
				.where(eq(filesTable.id, fileId));

			return file ?? null;
		},
	};
}
