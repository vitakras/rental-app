import type {
	ApplicationDocumentCategory,
	ApplicationDocumentType,
} from "~/db/schema";

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
	const formData = new FormData();
	formData.set("filename", file.name);
	formData.set("contentType", file.type || "application/octet-stream");
	formData.set("sizeBytes", String(file.size));

	const res = await fetch(`/api/applications/${applicationId}/upload/prepare`, {
		method: "POST",
		body: formData,
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
	const formData = new FormData();
	formData.set("fileId", fileId);
	formData.set("residentId", String(residentId));
	formData.set("category", category);
	formData.set("documentType", documentType);

	const res = await fetch(
		`/api/applications/${applicationId}/upload/complete`,
		{
			method: "POST",
			body: formData,
		},
	);
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
