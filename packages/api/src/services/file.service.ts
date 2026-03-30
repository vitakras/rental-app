import crypto from "node:crypto";
import pino from "pino";
import { z } from "zod";
import type { Logger } from "~/logger";
import type { BlobStorage } from "~/storage/blob.storage";
import type { ApplicationDocumentCategory, ApplicationDocumentType } from "~/db/schema";
import type { ApplicationDocumentRepository } from "../repositories/application-document.repository";
import type { FileRecord, FileRepository } from "../repositories/file.repository";

// ── Zod schemas ───────────────────────────────────────────────────────────────

const prepareDocumentUploadSchema = z.object({
	originalFilename: z.string().min(1),
	contentType: z.string().min(1),
	sizeBytes: z.number().int().positive(),
	uploadedByUserId: z.string().min(1),
});

export type PrepareDocumentUploadData = z.input<typeof prepareDocumentUploadSchema>;

// ── Result types ──────────────────────────────────────────────────────────────

export type PrepareDocumentUploadResult =
	| { success: true; fileId: string; uploadUrl: string }
	| { success: false; errors: z.ZodIssue[] };

export type CompleteUploadResult =
	| { success: true; file: FileRecord }
	| { success: false; reason: "not_found" | "invalid_status" | "missing_object" };

export interface AttachDocumentInput {
	fileId: string;
	applicationId: number;
	residentId: number;
	category: ApplicationDocumentCategory;
	documentType: ApplicationDocumentType;
}

export type AttachDocumentResult =
	| { success: true }
	| { success: false; reason: "not_found" | "invalid_status" | "missing_object" };

// ── Service ───────────────────────────────────────────────────────────────────

const noopLogger = pino({ level: "silent" });

export function createFileService({
	fileRepository,
	applicationDocumentRepository,
	blobStorage,
	logger = noopLogger,
}: {
	fileRepository: FileRepository;
	applicationDocumentRepository: ApplicationDocumentRepository;
	blobStorage: BlobStorage;
	logger?: Logger;
}) {
	return {
		async prepareDocumentUpload(
			data: PrepareDocumentUploadData,
		): Promise<PrepareDocumentUploadResult> {
			const parsed = prepareDocumentUploadSchema.safeParse(data);

			if (!parsed.success) {
				return { success: false, errors: parsed.error.issues };
			}

			const { originalFilename, contentType, sizeBytes, uploadedByUserId } = parsed.data;

			const fileId = crypto.randomUUID();
			const storageKey = `documents/${uploadedByUserId}/${fileId}/${originalFilename}`;

			const { uploadUrl } = await blobStorage.createUploadUrl({
				key: storageKey,
				contentType,
				sizeBytes,
			});

			await fileRepository.createPendingUpload({
				id: fileId,
				storageKey,
				originalFilename,
				contentType,
				sizeBytes,
				uploadedByUserId,
			});

			logger.info({ fileId, uploadedByUserId }, "Prepared document upload");
			return { success: true, fileId, uploadUrl };
		},

		async completeUpload(fileId: string): Promise<CompleteUploadResult> {
			const file = await fileRepository.findById(fileId);

			if (!file) {
				logger.warn({ fileId }, "Cannot complete upload: file not found");
				return { success: false, reason: "not_found" };
			}

			if (file.status !== "pending_upload") {
				logger.warn({ fileId, status: file.status }, "Cannot complete upload: invalid status");
				return { success: false, reason: "invalid_status" };
			}

			const objectExists = await blobStorage.objectExists(file.storageKey);
			if (!objectExists) {
				logger.warn({ fileId, storageKey: file.storageKey }, "Cannot complete upload: object missing");
				return { success: false, reason: "missing_object" };
			}

			await fileRepository.markUploaded(fileId);

			logger.info({ fileId }, "Upload completed");
			return { success: true, file: { ...file, status: "uploaded", uploadedAt: new Date().toISOString() } };
		},

		async attachDocumentToApplication(input: AttachDocumentInput): Promise<AttachDocumentResult> {
			const { fileId, applicationId, residentId, category, documentType } = input;

			const completeResult = await this.completeUpload(fileId);
			if (!completeResult.success) return completeResult;

			await applicationDocumentRepository.create({ applicationId, residentId, fileId, category, documentType });
			await fileRepository.markAttached(fileId);

			logger.info({ fileId, applicationId }, "Document attached to application");
			return { success: true };
		},
	};
}
