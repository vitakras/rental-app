import { Hono } from "hono";
import { services as defaultServices } from "~/container";
import type { createApplicationService } from "~/services/application.service";

type ApplicationService = ReturnType<typeof createApplicationService>;

export function createLandlordApplicationsRoutes({
	applicationService,
}: {
	applicationService: ApplicationService;
}) {
	const applications = new Hono();

	applications.get("/", async (c) => {
		const result = await applicationService.listSubmittedApplications();
		return c.json({ applications: result.applications });
	});

	applications.get("/:id", async (c) => {
		const rawId = Number(c.req.param("id"));

		if (!Number.isInteger(rawId) || rawId <= 0) {
			return c.json({ error: "Invalid application ID" }, 400);
		}

		const result = await applicationService.getApplicationWithDetails(rawId);

		if (!result.success) {
			return c.json({ error: "Application not found" }, 404);
		}

		return c.json({ application: result.application });
	});

	return applications;
}

const applications = createLandlordApplicationsRoutes({
	applicationService: defaultServices.applicationService,
});

export { applications };
