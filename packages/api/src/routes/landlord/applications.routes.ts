import { Hono } from "hono";
import { createRequireLandlordSession } from "~/auth/landlord-session";
import type { createApplicationService } from "~/services/application.service";
import type { createAuthService } from "~/services/auth.service";

type ApplicationService = ReturnType<typeof createApplicationService>;
type AuthService = ReturnType<typeof createAuthService>;

export function createLandlordApplicationsRoutes({
	authService,
	applicationService,
}: {
	authService: AuthService;
	applicationService: ApplicationService;
}) {
	return new Hono()
		.use("*", createRequireLandlordSession({ authService }))
		.get("/", async (c) => {
			const result = await applicationService.listSubmittedApplications();
			return c.json({ applications: result.applications }, 200);
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
