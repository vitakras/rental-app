import { data } from "react-router";
import type { Route } from "./+types/api-upload-prepare";
import type { PrepareDocumentUploadData } from "~/server/services/file-service";
import { services } from "~/server/container";

function parsePrepareInput(formData: FormData, applicationId: number): PrepareDocumentUploadData {
	return {
		originalFilename: formData.get("filename") as string,
		contentType: (formData.get("contentType") as string) || "application/octet-stream",
		sizeBytes: Number(formData.get("sizeBytes")),
		uploadedByUserId: `app-${applicationId}`,
	};
}

export async function action({ request, params }: Route.ActionArgs) {
	if (request.method !== "POST") return new Response(null, { status: 405 });

	const id = Number(params.id);
	const formData = await request.formData();

	const result = await services.fileService.prepareDocumentUpload(parsePrepareInput(formData, id));

	if (!result.success) return data({ error: "prepare_failed" }, { status: 422 });
	return data({ fileId: result.fileId, uploadUrl: result.uploadUrl });
}
