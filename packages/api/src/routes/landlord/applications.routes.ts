import { Hono } from "hono";
import { createRequireLandlordSession } from "~/auth/landlord-session";
import type { AuthContextEnv } from "~/auth/session-context";
import type { createApplicationService } from "~/services/application.service";
import type { createAuthService } from "~/services/auth.service";
import type { createFileService } from "~/services/file.service";

type ApplicationService = ReturnType<typeof createApplicationService>;
type AuthService = ReturnType<typeof createAuthService>;
type FileService = ReturnType<typeof createFileService>;

export function createLandlordApplicationsRoutes({
	authService,
	applicationService,
	fileService,
}: {
	authService: AuthService;
	applicationService: ApplicationService;
	fileService: FileService;
}) {
	return new Hono<AuthContextEnv>()
		.use("*", createRequireLandlordSession({ authService }))
		.get("/", async (c) => {
			const result = await applicationService.listSubmittedApplications();
			return c.json({ applications: result.applications }, 200);
		})
		.get("/:id/files/:fileId", async (c) => {
			const rawId = Number(c.req.param("id"));

			if (!Number.isInteger(rawId) || rawId <= 0) {
				return c.json({ error: "Invalid application ID" }, 400);
			}

			const fileId = c.req.param("fileId");
			const forDownload = c.req.query("download") === "true";

			const result = await fileService.serveFileForApplication({
				applicationId: rawId,
				fileId,
			});

			if (!result.success) {
				return c.json({ error: "File not found" }, 404);
			}

			const disposition = forDownload
				? `attachment; filename="${result.originalFilename}"`
				: "inline";

			return new Response(result.body, {
				headers: {
					"Content-Type": result.contentType,
					"Content-Disposition": disposition,
				},
			});
		})
		.get("/:id", async (c) => {
			const rawId = Number(c.req.param("id"));

			if (!Number.isInteger(rawId) || rawId <= 0) {
				return c.json({ error: "Invalid application ID" }, 400);
			}

			const result = await applicationService.getApplicationWithDetails(rawId);

			if (!result.success) {
				return c.json({ error: "Application not found" }, 404);
			}

			return c.json({ application: result.application }, 200);
		});
}
