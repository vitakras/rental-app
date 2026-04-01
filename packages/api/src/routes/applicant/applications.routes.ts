import { Hono } from "hono";
import { createRequireApplicantSession } from "~/auth/applicant-session";
import { getAuthConfig } from "~/auth/config";
import { getSessionCookie } from "~/auth/cookies";
import { zodJsonValidator } from "~/lib/zod-validator";
import { ensureValidApplicationId, parseApplicationId } from "~/routes/shared";
import type {
	AddIncomeSourcesData,
	createApplicationService,
	UpdateOccupantsData,
	UpsertApplicantInfoData,
} from "~/services/application.service";
import {
	addIncomeSourcesSchema,
	updateOccupantsSchema,
	upsertApplicantInfoSchema,
} from "~/services/application.service";
import type { createAuthService } from "~/services/auth.service";

const authConfig = getAuthConfig();

type ApplicationService = ReturnType<typeof createApplicationService>;
type AuthService = ReturnType<typeof createAuthService>;

export function createApplicantApplicationsRoutes({
	authService,
	applicationService,
}: {
	authService: AuthService;
	applicationService: ApplicationService;
}) {
	return new Hono()
		.use("*", createRequireApplicantSession({ authService }))
		.get("/", async (c) => {
			const sessionId = getSessionCookie(c, {
				cookieName: authConfig.cookieName,
			});
			const sessionResult = await authService.getSessionUser(sessionId ?? "");
			if (!sessionResult.success) {
				return c.json({ error: "unauthorized" }, 401);
			}
			const result = await applicationService.listApplicationsByUser(
				sessionResult.user.id,
			);
			return c.json({ applications: result.applications }, 200);
		})
		.post("/", async (c) => {
			const sessionId = getSessionCookie(c, {
				cookieName: authConfig.cookieName,
			});
			const sessionResult = await authService.getSessionUser(sessionId ?? "");
			const userId = sessionResult.success ? sessionResult.user.id : undefined;

			const result = await applicationService.createApplication({ userId });

			return c.json({ applicationId: result.applicationId }, 201);
		})
		.get("/:id", ensureValidApplicationId, async (c) => {
			const id = parseApplicationId(c.req.param("id"));

			if (!id) {
				return c.json({ error: "invalid_application_id" }, 400);
			}

			const result = await applicationService.getApplicationWithDetails(id);

			if (!result.success) {
				return c.json({ error: "application_not_found" }, 404);
			}

			return c.json({ application: result.application }, 200);
		})
		.put(
			"/:id/applicant",
			ensureValidApplicationId,
			zodJsonValidator(upsertApplicantInfoSchema),
			async (c) => {
				const id = parseApplicationId(c.req.param("id"));

				if (!id) {
					return c.json({ error: "invalid_application_id" }, 400);
				}

				const body = c.req.valid("json") as UpsertApplicantInfoData;
				const result = await applicationService.upsertApplicantInfo(id, body);

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
				}

				return c.json({ success: true }, 200);
			},
		)
		.put(
			"/:id/occupants",
			ensureValidApplicationId,
			zodJsonValidator(updateOccupantsSchema),
			async (c) => {
				const id = parseApplicationId(c.req.param("id"));

				if (!id) {
					return c.json({ error: "invalid_application_id" }, 400);
				}

				const body = c.req.valid("json") as UpdateOccupantsData;
				const result = await applicationService.updateOccupants(id, body);

				if (!result.success) {
					return c.json(
						{ error: "validation_failed", issues: result.errors },
						422,
					);
				}

				return c.json({ success: true }, 200);
			},
		)
		.put(
			"/:id/income",
			ensureValidApplicationId,
			zodJsonValidator(addIncomeSourcesSchema),
			async (c) => {
				const id = parseApplicationId(c.req.param("id"));

				if (!id) {
					return c.json({ error: "invalid_application_id" }, 400);
				}

				const body = c.req.valid("json") as AddIncomeSourcesData;
				const result = await applicationService.addIncomeSources(id, body);

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

				return c.json({ success: true }, 200);
			},
		)
		.post("/:id/submit", async (c) => {
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

			return c.json({ applicationId: result.applicationId }, 200);
		});
}
