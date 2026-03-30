import type {
	ApplicationDocumentCategory,
	ApplicationDocumentType,
} from "api";
import { data } from "react-router";
import { createApiClient } from "~/lib/api";
import type { Route } from "./+types/api-upload-complete";

function parseAttachInput(
	formData: FormData,
): {
	fileId: string;
	residentId: number;
	category: ApplicationDocumentCategory;
	documentType: ApplicationDocumentType;
} {
	return {
		fileId: formData.get("fileId") as string,
		residentId: Number(formData.get("residentId")),
		category: formData.get("category") as ApplicationDocumentCategory,
		documentType: formData.get("documentType") as ApplicationDocumentType,
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

	const response = await api.applications[":id"].upload.complete.$post({
		param: { id: String(id) },
		json: parseAttachInput(formData),
	});

	if (response.status === 422) {
		return data({ error: "attach_failed" }, { status: 422 });
	}
	if (!response.ok) {
		return new Response(null, { status: response.status });
	}

	return data({ success: true });
}
