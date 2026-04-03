import { Hono } from "hono";
import type { ZodIssue } from "zod";
import { createRequireApplicantSession } from "~/auth/applicant-session";
import { type AuthContextEnv, getAuthContext } from "~/auth/session-context";
import { ensureValidApplicationId, parseApplicationId } from "~/routes/shared";
import type { createApplicationService } from "~/services/application.service";
import type { createAuthService } from "~/services/auth.service";
import {
	ALLOWED_UPLOAD_MIME_TYPES,
	type createFileService,
	MAX_FILE_SIZE_BYTES,
	uploadDocumentRequestSchema,
} from "~/services/file.service";

type FileService = ReturnType<typeof createFileService>;
type AuthService = ReturnType<typeof createAuthService>;
type ApplicationService = ReturnType<typeof createApplicationService>;

function isAllowedUploadMimeType(
	contentType: string,
): contentType is (typeof ALLOWED_UPLOAD_MIME_TYPES)[number] {
	return ALLOWED_UPLOAD_MIME_TYPES.includes(
		contentType as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number],
	);
}

export function createApplicantUploadsRoutes({
	authService,
	applicationService,
	fileService,
}: {
	authService: AuthService;
	applicationService: ApplicationService;
	fileService: FileService;
}) {
	return new Hono<AuthContextEnv>()
		.use("*", createRequireApplicantSession({ authService }))
		.post("/:id/documents", ensureValidApplicationId, async (c) => {
			const applicationId = parseApplicationId(c.req.param("id"));

			if (!applicationId) {
				return c.json({ error: "invalid_application_id" }, 400);
			}

			const auth = getAuthContext(c);

			const formData = await c.req.formData();
			const file = formData.get("file");

			const parsedPayload = uploadDocumentRequestSchema.safeParse({
				residentId: Number(formData.get("residentId")),
				category: formData.get("category"),
				documentType: formData.get("documentType"),
			});

			if (!(file instanceof File) || !parsedPayload.success) {
				return c.json(
					{
						error: "invalid_upload_payload",
						issues: parsedPayload.success ? [] : parsedPayload.error.issues,
					},
					422,
				);
			}

			if (file.size > MAX_FILE_SIZE_BYTES) {
				return c.json({ error: "file_too_large" }, 422);
			}

			if (!isAllowedUploadMimeType(file.type)) {
				return c.json({ error: "unsupported_file_type" }, 422);
			}

			const applicationResult =
				await applicationService.getApplicationWithDetails(
					applicationId,
					auth.user.id,
				);
			if (!applicationResult.success) {
				return c.json({ error: "application_not_found" }, 404);
			}

			const residentExists = applicationResult.application.residents.some(
				(resident) => resident.id === parsedPayload.data.residentId,
			);
			if (!residentExists) {
				return c.json({ error: "invalid_upload_payload" }, 422);
			}

			const result = await fileService.uploadDocument({
				applicationId,
				residentId: parsedPayload.data.residentId,
				category: parsedPayload.data.category,
				documentType: parsedPayload.data.documentType,
				originalFilename: file.name,
				contentType: file.type,
				sizeBytes: file.size,
				uploadedByUserId: auth.user.id,
				fileData: await file.arrayBuffer(),
			});

			if (!result.success) {
				if ("errors" in result) {
					const issues = result.errors satisfies ZodIssue[];
					const unsupportedType = issues.some(
						(issue: ZodIssue) => issue.path[0] === "contentType",
					);
					if (unsupportedType) {
						return c.json({ error: "unsupported_file_type" }, 422);
					}

					return c.json({ error: "invalid_upload_payload", issues }, 422);
				}

				return c.json({ error: "storage_write_failed" }, 422);
			}

			return c.json({ fileId: result.fileId }, 200);
		});
}
