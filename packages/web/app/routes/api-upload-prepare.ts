import { data } from "react-router";
import { createApiClient } from "~/lib/api";
import type { Route } from "./+types/api-upload-prepare";

function parsePrepareInput(
	formData: FormData,
	applicationId: number,
): { filename: string; contentType: string; sizeBytes: number } {
	return {
		filename: formData.get("filename") as string,
		contentType:
			(formData.get("contentType") as string) || "application/octet-stream",
		sizeBytes: Number(formData.get("sizeBytes")),
	};
}

export async function action({ request, params }: Route.ActionArgs) {
	if (request.method !== "POST") return new Response(null, { status: 405 });

	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) {
		return data({ error: "invalid_application_id" }, { status: 400 });
	}
	const formData = await request.formData();
	const api = createApiClient();

	const response = await api.applications[":id"].upload.prepare.$post({
		param: { id: String(id) },
		json: parsePrepareInput(formData, id),
	});

	if (response.status === 422) {
		return data({ error: "prepare_failed" }, { status: 422 });
	}
	if (!response.ok) {
		return new Response(null, { status: response.status });
	}

	const result = (await response.json()) as {
		fileId: string;
		uploadUrl: string;
	};
	return data({ fileId: result.fileId, uploadUrl: result.uploadUrl });
}
