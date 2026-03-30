import { Hono } from "hono";
import type {
	AddIncomeSourcesData,
	CreateApplicationData,
	UpdateOccupantsData,
	createApplicationService,
} from "~/services/application.service";

function parseApplicationId(rawId: string) {
	const id = Number(rawId);
	return Number.isInteger(id) && id > 0 ? id : null;
}

type ApplicationService = ReturnType<typeof createApplicationService>;

export function createApplicantApplicationsRoutes({
	applicationService,
}: {
	applicationService: ApplicationService;
}) {
	const applications = new Hono();

	applications.post("/", async (c) => {
		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "invalid_json" }, 400);
		}
		const result = await applicationService.createApplication(
			body as CreateApplicationData,
		);

		if (!result.success) {
			return c.json(
				{ error: "validation_failed", issues: result.errors },
				422,
			);
		}

		return c.json({ applicationId: result.applicationId }, 201);
	});

	applications.put("/:id/occupants", async (c) => {
		const id = parseApplicationId(c.req.param("id"));

		if (!id) {
			return c.json({ error: "invalid_application_id" }, 400);
		}

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "invalid_json" }, 400);
		}
		const result = await applicationService.updateOccupants(
			id,
			body as UpdateOccupantsData,
		);

		if (!result.success) {
			return c.json(
				{ error: "validation_failed", issues: result.errors },
				422,
			);
		}

		return c.json({ success: true });
	});

	applications.put("/:id/income", async (c) => {
		const id = parseApplicationId(c.req.param("id"));

		if (!id) {
			return c.json({ error: "invalid_application_id" }, 400);
		}

		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "invalid_json" }, 400);
		}
		const result = await applicationService.addIncomeSources(
			id,
			body as AddIncomeSourcesData,
		);

		if (!result.success) {
			if ("reason" in result && result.reason === "not_found") {
				return c.json({ error: "application_not_found" }, 404);
			}

			if ("errors" in result) {
				return c.json(
					{ error: "validation_failed", issues: result.errors },
					422,
				);
			}

			return c.json({ error: "validation_failed", issues: [] }, 422);
		}

		return c.json({ success: true });
	});

	applications.post("/:id/submit", async (c) => {
		const id = parseApplicationId(c.req.param("id"));

		if (!id) {
			return c.json({ error: "invalid_application_id" }, 400);
		}

		const result = await applicationService.submitApplication(id);

		if (!result.success) {
			if (result.reason === "not_found") {
				return c.json({ error: "application_not_found" }, 404);
			}

			return c.json({ error: "application_not_pending" }, 409);
		}

		return c.json({ applicationId: result.applicationId });
	});

	return applications;
}
