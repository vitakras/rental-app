import { data } from "react-router";
import type { Route } from "./+types/api-upload-prepare";
import { services } from "~/server/container";

export async function action({ request, params }: Route.ActionArgs) {
	if (request.method !== "POST") return new Response(null, { status: 405 });

	const id = Number(params.id);
	const formData = await request.formData();
	const filename = formData.get("filename") as string;
	const contentType = formData.get("contentType") as string;
	const sizeBytes = Number(formData.get("sizeBytes"));

	const result = await services.fileService.prepareDocumentUpload({
		originalFilename: filename,
		contentType: contentType || "application/octet-stream",
		sizeBytes,
		uploadedByUserId: `app-${id}`,
	});

	if (!result.success) return data({ error: "prepare_failed" }, { status: 422 });
	return data({ fileId: result.fileId, uploadUrl: result.uploadUrl });
}
