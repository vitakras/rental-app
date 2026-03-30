import { Hono } from "hono";
import { services } from "~/container";

const applications = new Hono();

applications.get("/", async (c) => {
	const result = await services.applicationService.listSubmittedApplications();
	return c.json({ applications: result.applications });
});

applications.get("/:id", async (c) => {
	const rawId = Number(c.req.param("id"));

	if (!Number.isInteger(rawId) || rawId <= 0) {
		return c.json({ error: "Invalid application ID" }, 400);
	}

	const result =
		await services.applicationService.getApplicationWithDetails(rawId);

	if (!result.success) {
		return c.json({ error: "Application not found" }, 404);
	}

	return c.json({ application: result.application });
});

export { applications };
