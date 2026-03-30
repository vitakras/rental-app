import { data } from "react-router";
import type { Route } from "./+types/api-upload-complete";
import type { ApplicationDocumentCategory, ApplicationDocumentType } from "~/db/schema";
import { repositories, services } from "~/server/container";

export async function action({ request, params }: Route.ActionArgs) {
	if (request.method !== "POST") return new Response(null, { status: 405 });

	const id = Number(params.id);
	const formData = await request.formData();
	const fileId = formData.get("fileId") as string;
	const residentId = Number(formData.get("residentId"));
	const category = formData.get("category") as ApplicationDocumentCategory;
	const documentType = formData.get("documentType") as ApplicationDocumentType;

	const completeResult = await services.fileService.completeUpload(fileId);
	if (!completeResult.success) return data({ error: "complete_failed" }, { status: 422 });

	await repositories.applicationDocumentRepository.create({
		applicationId: id,
		residentId,
		fileId,
		category,
		documentType,
	});
	await repositories.fileRepository.markAttached(fileId);

	return data({ success: true });
}
