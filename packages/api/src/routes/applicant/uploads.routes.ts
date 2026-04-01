import { Hono } from "hono";
import { createRequireApplicantSession } from "~/auth/applicant-session";
import { zodJsonValidator } from "~/lib/zod-validator";
import { ensureValidApplicationId, parseApplicationId } from "~/routes/shared";
import type { createAuthService } from "~/services/auth.service";
import {
	attachDocumentToApplicationSchema,
	type createFileService,
	prepareDocumentUploadRequestSchema,
} from "~/services/file.service";

type FileService = ReturnType<typeof createFileService>;
type AuthService = ReturnType<typeof createAuthService>;

export function createApplicantUploadsRoutes({
	authService,
	fileService,
}: {
	authService: AuthService;
	fileService: FileService;
}) {
	return new Hono()
		.use("*", createRequireApplicantSession({ authService }))
		.post(
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
					return c.json(
						{ error: "validation_failed", issues: result.errors },
						422,
					);
				}

				return c.json(
					{ fileId: result.fileId, uploadUrl: result.uploadUrl },
					200,
				);
			},
		)
		.post(
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

				return c.json({ success: true }, 200);
			},
		);
}
