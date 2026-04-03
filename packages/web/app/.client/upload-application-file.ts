import type { ApplicationDocumentCategory, ApplicationDocumentType } from "api";
import { BASE_API_URL } from "~/config/env";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set([
	"application/pdf",
	"image/jpeg",
	"image/png",
]);

export class UploadValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UploadValidationError";
	}
}

export interface UploadApplicationFileInput {
	applicationId: number;
	file: File;
	residentId: number;
	category: ApplicationDocumentCategory;
	documentType: ApplicationDocumentType;
}

function validateFile(file: File) {
	if (file.size > MAX_FILE_SIZE_BYTES) {
		throw new UploadValidationError("File must be 10 MB or smaller.");
	}

	if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
		throw new UploadValidationError("Only PDF, PNG, and JPG files are allowed.");
	}
}

export async function uploadApplicationFile({
	applicationId,
	file,
	residentId,
	category,
	documentType,
}: UploadApplicationFileInput): Promise<{ fileId: string }> {
	validateFile(file);

	const formData = new FormData();
	formData.set("file", file);
	formData.set("residentId", String(residentId));
	formData.set("category", category);
	formData.set("documentType", documentType);

	const res = await fetch(`${BASE_API_URL}/applications/${applicationId}/documents`, {
		method: "POST",
		body: formData,
		credentials: "include",
	});
	if (!res.ok) {
		const payload = (await res.json().catch(() => null)) as
			| { error?: string }
			| null;

		if (payload?.error === "file_too_large") {
			throw new UploadValidationError("File must be 10 MB or smaller.");
		}

		if (payload?.error === "unsupported_file_type") {
			throw new UploadValidationError(
				"Only PDF, PNG, and JPG files are allowed.",
			);
		}

		throw new Error("Failed to upload file");
	}

	const { fileId } = (await res.json()) as { fileId: string };
	return { fileId };
}
