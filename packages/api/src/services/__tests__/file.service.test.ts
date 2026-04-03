import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { ApplicationDocumentRepository } from "~/repositories/application-document.repository";
import type { FileRepository } from "~/repositories/file.repository";
import type { BlobStorage } from "~/storage/blob.storage";
import {
	createFileService,
	MAX_FILE_SIZE_BYTES,
} from "../file.service";

function makeFileRepository(
	overrides?: Partial<FileRepository>,
): FileRepository {
	return {
		create: vi.fn(async (input) => ({
			id: input.id,
			storageKey: input.storageKey,
			originalFilename: input.originalFilename,
			contentType: input.contentType,
			sizeBytes: input.sizeBytes,
			status: input.status,
			uploadedByUserId: input.uploadedByUserId,
			createdAt: "2026-01-01T00:00:00.000Z",
			uploadedAt: input.uploadedAt ?? null,
		})),
		markUploaded: vi.fn(async () => {}),
		markAttached: vi.fn(async () => {}),
		findById: vi.fn(async () => null),
		deleteById: vi.fn(async () => {}),
		...overrides,
	};
}

function makeApplicationDocumentRepository(
	overrides?: Partial<ApplicationDocumentRepository>,
): ApplicationDocumentRepository {
	return {
		create: vi.fn(async () => ({
			id: 1,
			applicationId: 12,
			residentId: 8,
			fileId: "file-1",
			category: "income",
			documentType: "paystub",
			status: "submitted",
			notes: null,
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		})),
		findById: vi.fn(async () => null),
		findByApplicationId: vi.fn(async () => []),
		updateStatus: vi.fn(async () => {}),
		...overrides,
	};
}

function makeBlobStorage(overrides?: Partial<BlobStorage>): BlobStorage {
	return {
		putObject: vi.fn(async () => {}),
		createDownloadUrl: vi.fn(async () => ({ downloadUrl: "/storage/file.pdf" })),
		objectExists: vi.fn(async () => true),
		deleteObject: vi.fn(async () => {}),
		...overrides,
	};
}

describe("createFileService.uploadDocument", () => {
	it("stores PDFs with the application/resident storage key format", async () => {
		vi.spyOn(crypto, "randomUUID").mockReturnValueOnce("uuid-123");
		const fileRepository = makeFileRepository();
		const applicationDocumentRepository = makeApplicationDocumentRepository();
		const blobStorage = makeBlobStorage();

		const result = await createFileService({
			fileRepository,
			applicationDocumentRepository,
			blobStorage,
		}).uploadDocument({
			applicationId: 12,
			residentId: 8,
			category: "income",
			documentType: "paystub",
			originalFilename: "lease.pdf",
			contentType: "application/pdf",
			sizeBytes: 123,
			uploadedByUserId: "user-1",
			fileData: new ArrayBuffer(123),
		});

		expect(result.success).toBe(true);
		expect(blobStorage.putObject).toHaveBeenCalledWith({
			key: "applications/12/8/uuid-123.pdf",
			contentType: "application/pdf",
			body: expect.any(ArrayBuffer),
		});
		expect(fileRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "uuid-123",
				storageKey: "applications/12/8/uuid-123.pdf",
				status: "attached",
				uploadedByUserId: "user-1",
			}),
		);
		expect(applicationDocumentRepository.create).toHaveBeenCalledWith({
			applicationId: 12,
			residentId: 8,
			fileId: "uuid-123",
			category: "income",
			documentType: "paystub",
		});
	});

	it("normalizes JPEG uploads to the .jpg extension", async () => {
		vi.spyOn(crypto, "randomUUID").mockReturnValueOnce("uuid-jpeg");
		const fileRepository = makeFileRepository();
		const applicationDocumentRepository = makeApplicationDocumentRepository();
		const blobStorage = makeBlobStorage();

		const result = await createFileService({
			fileRepository,
			applicationDocumentRepository,
			blobStorage,
		}).uploadDocument({
			applicationId: 12,
			residentId: 8,
			category: "identity",
			documentType: "government_id",
			originalFilename: "id.jpeg",
			contentType: "image/jpeg",
			sizeBytes: 456,
			uploadedByUserId: "user-1",
			fileData: new ArrayBuffer(456),
		});

		expect(result.success).toBe(true);
		expect(blobStorage.putObject).toHaveBeenCalledWith(
			expect.objectContaining({
				key: "applications/12/8/uuid-jpeg.jpg",
			}),
		);
	});

	it("rejects unsupported file types", async () => {
		const fileRepository = makeFileRepository();
		const applicationDocumentRepository = makeApplicationDocumentRepository();
		const blobStorage = makeBlobStorage();

		const result = await createFileService({
			fileRepository,
			applicationDocumentRepository,
			blobStorage,
		}).uploadDocument({
			applicationId: 12,
			residentId: 8,
			category: "income",
			documentType: "paystub",
			originalFilename: "notes.txt",
			contentType: "text/plain" as "application/pdf",
			sizeBytes: 20,
			uploadedByUserId: "user-1",
			fileData: new ArrayBuffer(20),
		});

		expect(result.success).toBe(false);
		if (!result.success && "errors" in result) {
			expect(result.errors.some((issue) => issue.path[0] === "contentType")).toBe(
				true,
			);
		}
		expect(blobStorage.putObject).not.toHaveBeenCalled();
		expect(fileRepository.create).not.toHaveBeenCalled();
	});

	it("rejects files larger than 10 MB", async () => {
		const fileRepository = makeFileRepository();
		const applicationDocumentRepository = makeApplicationDocumentRepository();
		const blobStorage = makeBlobStorage();

		const result = await createFileService({
			fileRepository,
			applicationDocumentRepository,
			blobStorage,
		}).uploadDocument({
			applicationId: 12,
			residentId: 8,
			category: "income",
			documentType: "paystub",
			originalFilename: "large.pdf",
			contentType: "application/pdf",
			sizeBytes: MAX_FILE_SIZE_BYTES + 1,
			uploadedByUserId: "user-1",
			fileData: new ArrayBuffer(1),
		});

		expect(result.success).toBe(false);
		if (!result.success && "errors" in result) {
			expect(result.errors.some((issue) => issue.path[0] === "sizeBytes")).toBe(
				true,
			);
		}
		expect(blobStorage.putObject).not.toHaveBeenCalled();
	});

	it("returns storage_write_failed when storage upload fails", async () => {
		const fileRepository = makeFileRepository();
		const applicationDocumentRepository = makeApplicationDocumentRepository();
		const blobStorage = makeBlobStorage({
			putObject: vi.fn(async () => {
				throw new Error("r2 down");
			}),
		});

		const result = await createFileService({
			fileRepository,
			applicationDocumentRepository,
			blobStorage,
		}).uploadDocument({
			applicationId: 12,
			residentId: 8,
			category: "income",
			documentType: "paystub",
			originalFilename: "lease.pdf",
			contentType: "application/pdf",
			sizeBytes: 123,
			uploadedByUserId: "user-1",
			fileData: new ArrayBuffer(123),
		});

		expect(result).toEqual({ success: false, reason: "storage_write_failed" });
		expect(fileRepository.create).not.toHaveBeenCalled();
		expect(applicationDocumentRepository.create).not.toHaveBeenCalled();
	});
});
