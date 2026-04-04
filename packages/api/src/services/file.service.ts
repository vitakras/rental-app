import crypto from "node:crypto";
import pino from "pino";
import { z } from "zod";
import type {
	ApplicationDocumentCategory,
	ApplicationDocumentType,
} from "~/db/schema";
import type { Logger } from "~/logger";
import type { BlobStorage } from "~/storage/blob.storage";
import type { ApplicationDocumentRepository } from "../repositories/application-document.repository";
import type {
	FileRecord,
	FileRepository,
} from "../repositories/file.repository";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_MIME_TYPES = [
	"application/pdf",
	"image/jpeg",
	"image/png",
] as const;
type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

const uploadMimeTypeToExtension: Record<AllowedUploadMimeType, string> = {
	"application/pdf": "pdf",
	"image/jpeg": "jpg",
	"image/png": "png",
};

const applicationDocumentCategories = [
	"identity",
	"income",
	"residence",
	"reference",
	"other",
] as const satisfies [
	ApplicationDocumentCategory,
	...ApplicationDocumentCategory[],
];

const applicationDocumentTypes = [
	"government_id",
	"paystub",
	"employment_letter",
	"bank_statement",
	"reference_letter",
	"other",
] as const satisfies [ApplicationDocumentType, ...ApplicationDocumentType[]];

export const uploadDocumentRequestSchema = z.object({
	residentId: z.number().int().positive(),
	category: z.enum(applicationDocumentCategories),
	documentType: z.enum(applicationDocumentTypes),
});

const uploadDocumentSchema = uploadDocumentRequestSchema.extend({
	applicationId: z.number().int().positive(),
	originalFilename: z.string().min(1),
	contentType: z.enum(ALLOWED_UPLOAD_MIME_TYPES),
	sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
	uploadedByUserId: z.string().min(1),
	fileData: z.instanceof(ArrayBuffer),
});

export type UploadDocumentData = z.input<typeof uploadDocumentSchema>;

// ── Result types ──────────────────────────────────────────────────────────────

export type DeleteDocumentResult =
	| { success: true }
	| { success: false; reason: "not_found" };

export type UploadDocumentResult =
	| { success: true; fileId: string; file: FileRecord }
	| { success: false; errors: z.ZodIssue[] };

export type UploadDocumentFailureResult =
	| { success: false; errors: z.ZodIssue[] }
	| { success: false; reason: "storage_write_failed" };

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
		async deleteDocument({
			applicationId,
			fileId,
		}: {
			applicationId: number;
			fileId: string;
		}): Promise<DeleteDocumentResult> {
			const doc =
				await applicationDocumentRepository.findByFileId(fileId);

			if (!doc || doc.applicationId !== applicationId) {
				return { success: false, reason: "not_found" };
			}

			const file = await fileRepository.findById(fileId);

			if (file) {
				try {
					await blobStorage.deleteObject(file.storageKey);
				} catch (error) {
					logger.error(
						{ err: error, fileId, storageKey: file.storageKey },
						"Failed to delete document from storage",
					);
				}
			}

			await applicationDocumentRepository.deleteById(doc.id);
			await fileRepository.deleteById(fileId);

			logger.info({ fileId, applicationId }, "Document deleted");
			return { success: true };
		},

		async uploadDocument(
			data: UploadDocumentData,
		): Promise<UploadDocumentResult | UploadDocumentFailureResult> {
			const parsed = uploadDocumentSchema.safeParse(data);

			if (!parsed.success) {
				return { success: false, errors: parsed.error.issues };
			}

			const {
				applicationId,
				residentId,
				category,
				documentType,
				originalFilename,
				contentType,
				sizeBytes,
				uploadedByUserId,
				fileData,
			} = parsed.data;

			const fileId = crypto.randomUUID();
			const fileExtension = uploadMimeTypeToExtension[contentType];
			const storageKey = `applications/${applicationId}/${residentId}/${fileId}.${fileExtension}`;
			const uploadedAt = new Date().toISOString();

			try {
				await blobStorage.putObject({
					key: storageKey,
					contentType,
					body: fileData,
				});
			} catch (error) {
				logger.error(
					{ err: error, applicationId, residentId, fileId, storageKey },
					"Failed to store uploaded document",
				);
				return { success: false, reason: "storage_write_failed" };
			}

			let fileCreated = false;

			try {
				const file = await fileRepository.create({
					id: fileId,
					storageKey,
					originalFilename,
					contentType,
					sizeBytes,
					status: "attached",
					uploadedByUserId,
					uploadedAt,
				});
				fileCreated = true;

				await applicationDocumentRepository.create({
					applicationId,
					residentId,
					fileId,
					category,
					documentType,
				});

				logger.info({ fileId, applicationId, residentId }, "Document uploaded");
				return { success: true, fileId, file };
			} catch (error) {
				logger.error(
					{ err: error, applicationId, residentId, fileId, storageKey },
					"Failed to persist uploaded document metadata",
				);
				if (fileCreated) {
					await fileRepository.deleteById(fileId);
				}
				await blobStorage.deleteObject(storageKey);
				throw error;
			}
		},
	};
}
