import type { ApplicationDocumentCategory, ApplicationDocumentType } from "api";
import { apiClient } from "~/lib/api";

export interface UploadApplicationFileInput {
	applicationId: number;
	file: File;
	residentId: number;
	category: ApplicationDocumentCategory;
	documentType: ApplicationDocumentType;
}

async function createUploadIntent(
	applicationId: number,
	file: File,
): Promise<{ fileId: string; uploadUrl: string }> {
	const res = await apiClient.applications[":id"].upload.prepare.$post({
		param: { id: String(applicationId) },
		json: {
			filename: file.name,
			contentType: file.type || "application/octet-stream",
			sizeBytes: file.size,
		},
	});
	if (!res.ok) throw new Error("Failed to prepare upload");
	return res.json();
}

async function uploadBytes(uploadUrl: string, file: File): Promise<void> {
	const res = await fetch(uploadUrl, {
		method: "PUT",
		body: file,
		headers: { "Content-Type": file.type || "application/octet-stream" },
	});
	if (!res.ok) throw new Error("Failed to upload file");
}

async function completeUpload(
	applicationId: number,
	fileId: string,
	residentId: number,
	category: ApplicationDocumentCategory,
	documentType: ApplicationDocumentType,
): Promise<void> {
	const res = await apiClient.applications[":id"].upload.complete.$post({
		param: { id: String(applicationId) },
		json: {
			fileId,
			residentId,
			category,
			documentType,
		},
	});
	if (!res.ok) throw new Error("Failed to complete upload");
}

export async function uploadApplicationFile({
	applicationId,
	file,
	residentId,
	category,
	documentType,
}: UploadApplicationFileInput): Promise<{ fileId: string }> {
	const { fileId, uploadUrl } = await createUploadIntent(applicationId, file);
	await uploadBytes(uploadUrl, file);
	await completeUpload(
		applicationId,
		fileId,
		residentId,
		category,
		documentType,
	);
	return { fileId };
}
