import { Hono } from "hono";
import type { createFileService } from "~/services/file.service";

function parseApplicationId(rawId: string) {
	const id = Number(rawId);
	return Number.isInteger(id) && id > 0 ? id : null;
}

type FileService = ReturnType<typeof createFileService>;

export function createUploadRoutes({ fileService }: { fileService: FileService }) {
	const uploads = new Hono();

	uploads.post("/applications/:id/upload/prepare", async (c) => {
		const id = parseApplicationId(c.req.param("id"));

		if (!id) {
			return c.json({ error: "invalid_application_id" }, 400);
		}

		let body: {
			filename: string;
			contentType?: string;
			sizeBytes: number;
		};
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "invalid_json" }, 400);
		}

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
	});

	uploads.post("/applications/:id/upload/complete", async (c) => {
		const id = parseApplicationId(c.req.param("id"));

		if (!id) {
			return c.json({ error: "invalid_application_id" }, 400);
		}

		let body: {
			fileId: string;
			residentId: number;
			category: Parameters<FileService["attachDocumentToApplication"]>[0]["category"];
			documentType: Parameters<FileService["attachDocumentToApplication"]>[0]["documentType"];
		};
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "invalid_json" }, 400);
		}

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
	});

	return uploads;
}
