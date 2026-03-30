import { data } from "react-router";
import type { Route } from "./+types/api-upload-complete";
import type { ApplicationDocumentCategory, ApplicationDocumentType } from "~/db/schema";
import type { AttachDocumentInput } from "~/server/services/file-service";
import { services } from "~/server/container";

function parseAttachInput(formData: FormData, applicationId: number): AttachDocumentInput {
	return {
		fileId: formData.get("fileId") as string,
		applicationId,
		residentId: Number(formData.get("residentId")),
		category: formData.get("category") as ApplicationDocumentCategory,
		documentType: formData.get("documentType") as ApplicationDocumentType,
	};
}

export async function action({ request, params }: Route.ActionArgs) {
	if (request.method !== "POST") return new Response(null, { status: 405 });

	const id = Number(params.id);
	const formData = await request.formData();

	const result = await services.fileService.attachDocumentToApplication(parseAttachInput(formData, id));

	if (!result.success) return data({ error: "attach_failed" }, { status: 422 });
	return data({ success: true });
}
