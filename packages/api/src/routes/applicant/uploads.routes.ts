import { Hono } from "hono";
import { zodJsonValidator } from "~/lib/zod-validator";
import {
	ensureValidApplicationId,
	parseApplicationId,
} from "~/routes/shared";
import {
	attachDocumentToApplicationSchema,
	prepareDocumentUploadRequestSchema,
	type createFileService,
} from "~/services/file.service";

type FileService = ReturnType<typeof createFileService>;

export function createApplicantUploadsRoutes({
	fileService,
}: {
	fileService: FileService;
}) {
	const uploads = new Hono();

	uploads.post(
		"/:id/upload/prepare",
		ensureValidApplicationId,
		zodJsonValidator(prepareDocumentUploadRequestSchema),
		async (c) => {
		const id = parseApplicationId(c.req.param("id"));

		if (!id) {
			return c.json({ error: "invalid_application_id" }, 400);
		}

		const body = c.req.valid("json");

		const result = await fileService.prepareDocumentUpload({
			originalFilename: body.filename,
			contentType: body.contentType ?? "application/octet-stream",
			sizeBytes: body.sizeBytes,
			uploadedByUserId: `app-${id}`,
		});

		if (!result.success) {
			return c.json({ error: "validation_failed", issues: result.errors }, 422);
		}

		return c.json({ fileId: result.fileId, uploadUrl: result.uploadUrl });
		},
	);

	uploads.post(
		"/:id/upload/complete",
		ensureValidApplicationId,
		zodJsonValidator(attachDocumentToApplicationSchema),
		async (c) => {
		const id = parseApplicationId(c.req.param("id"));

		if (!id) {
			return c.json({ error: "invalid_application_id" }, 400);
		}

		const body = c.req.valid("json") as Parameters<
			FileService["attachDocumentToApplication"]
		>[0];

		const result = await fileService.attachDocumentToApplication({
			fileId: body.fileId,
			applicationId: id,
			residentId: body.residentId,
			category: body.category,
			documentType: body.documentType,
		});

		if (!result.success) {
			return c.json({ error: "attach_failed", reason: result.reason }, 422);
		}

		return c.json({ success: true });
		},
	);

	return uploads;
}
