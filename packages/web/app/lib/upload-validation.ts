export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = new Set([
	"application/pdf",
	"image/jpeg",
	"image/png",
]);
export const ACCEPT_ATTRIBUTE =
	".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

export type ValidationFailureReason =
	| "file_too_large"
	| "unsupported_file_type";

export function validateFile(file: File): ValidationFailureReason | null {
	if (file.size > MAX_FILE_SIZE_BYTES) return "file_too_large";
	if (!ALLOWED_UPLOAD_TYPES.has(file.type)) return "unsupported_file_type";
	return null;
}

export function validationMessage(reason: ValidationFailureReason): string {
	if (reason === "file_too_large") return "File must be 10 MB or smaller.";
	return "Only PDF, PNG, and JPG files are allowed.";
}
