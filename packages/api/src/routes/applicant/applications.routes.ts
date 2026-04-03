import { Hono, type Context } from "hono";
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
	UpsertResidenceData,
} from "~/services/application.service";
import {
	addIncomeSourcesSchema,
	updateOccupantsSchema,
	upsertApplicantInfoSchema,
	upsertResidenceSchema,
} from "~/services/application.service";
import type { createAuthService } from "~/services/auth.service";

const authConfig = getAuthConfig();

type ApplicationService = ReturnType<typeof createApplicationService>;
type AuthService = ReturnType<typeof createAuthService>;

async function getAuthenticatedApplicantUserId(c: Context, authService: AuthService) {
	const sessionId = getSessionCookie(c, {
		cookieName: authConfig.cookieName,
	});
	const sessionResult = await authService.getSessionUser(sessionId ?? "");
	if (!sessionResult.success) {
		return {
			success: false as const,
			response: c.json({ error: "unauthorized" }, 401),
		};
	}

	return { success: true as const, userId: sessionResult.user.id };
}

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
			const authResult = await getAuthenticatedApplicantUserId(c, authService);
			if (!authResult.success) {
				return authResult.response;
			}
			const result = await applicationService.listApplicationsByUser(
				authResult.userId,
			);
			return c.json({ applications: result.applications }, 200);
		})
		.post("/", async (c) => {
			const authResult = await getAuthenticatedApplicantUserId(c, authService);
			if (!authResult.success) {
				return authResult.response;
			}

			const result = await applicationService.createApplication({
				userId: authResult.userId,
			});
			if (!result.success) {
				return c.json(
					{ error: "validation_failed", issues: result.errors },
					422,
				);
			}

			return c.json({ applicationId: result.applicationId }, 201);
		})
		.get("/:id", ensureValidApplicationId, async (c) => {
			const id = parseApplicationId(c.req.param("id"));

			if (!id) {
				return c.json({ error: "invalid_application_id" }, 400);
			}

			const authResult = await getAuthenticatedApplicantUserId(c, authService);
			if (!authResult.success) {
				return authResult.response;
			}

			const result = await applicationService.getApplicationWithDetails(
				id,
				authResult.userId,
			);

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
				const authResult = await getAuthenticatedApplicantUserId(c, authService);
				if (!authResult.success) {
					return authResult.response;
				}

				const result = await applicationService.upsertApplicantInfo(
					id,
					body,
					authResult.userId,
				);

				if (!result.success) {
					if ("reason" in result && result.reason === "not_found") {
						return c.json({ error: "application_not_found" }, 404);
					}

					if ("reason" in result && result.reason === "not_editable") {
						return c.json({ error: "application_not_editable" }, 409);
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
				const authResult = await getAuthenticatedApplicantUserId(c, authService);
				if (!authResult.success) {
					return authResult.response;
				}

				const result = await applicationService.updateOccupants(
					id,
					body,
					authResult.userId,
				);

				if (!result.success) {
					if ("reason" in result && result.reason === "not_found") {
						return c.json({ error: "application_not_found" }, 404);
					}

					if ("reason" in result && result.reason === "not_editable") {
						return c.json({ error: "application_not_editable" }, 409);
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
			"/:id/income",
			ensureValidApplicationId,
			zodJsonValidator(addIncomeSourcesSchema),
			async (c) => {
				const id = parseApplicationId(c.req.param("id"));

				if (!id) {
					return c.json({ error: "invalid_application_id" }, 400);
				}

				const body = c.req.valid("json") as AddIncomeSourcesData;
				const authResult = await getAuthenticatedApplicantUserId(c, authService);
				if (!authResult.success) {
					return authResult.response;
				}

				const result = await applicationService.addIncomeSources(
					id,
					body,
					authResult.userId,
				);

				if (!result.success) {
					if ("reason" in result && result.reason === "not_found") {
						return c.json({ error: "application_not_found" }, 404);
					}

					if ("reason" in result && result.reason === "not_editable") {
						return c.json({ error: "application_not_editable" }, 409);
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
		.put(
			"/:id/residence",
			ensureValidApplicationId,
			zodJsonValidator(upsertResidenceSchema),
			async (c) => {
				const id = parseApplicationId(c.req.param("id"));

				if (!id) {
					return c.json({ error: "invalid_application_id" }, 400);
				}

				const body = c.req.valid("json") as UpsertResidenceData;
				const authResult = await getAuthenticatedApplicantUserId(c, authService);
				if (!authResult.success) {
					return authResult.response;
				}

				const result = await applicationService.upsertResidence(
					id,
					body,
					authResult.userId,
				);

				if (!result.success) {
					if ("reason" in result && result.reason === "not_found") {
						return c.json({ error: "application_not_found" }, 404);
					}

					if ("reason" in result && result.reason === "not_editable") {
						return c.json({ error: "application_not_editable" }, 409);
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
		.delete(
			"/:id/residents/:residentId",
			ensureValidApplicationId,
			async (c) => {
				const id = parseApplicationId(c.req.param("id"));
				const residentId = Number(c.req.param("residentId"));

				if (!id || !Number.isInteger(residentId) || residentId <= 0) {
					return c.json({ error: "invalid_id" }, 400);
				}

				const authResult = await getAuthenticatedApplicantUserId(c, authService);
				if (!authResult.success) {
					return authResult.response;
				}

				const result = await applicationService.deleteResident(
					id,
					residentId,
					authResult.userId,
				);

				if (!result.success) {
					if (result.reason === "not_found") {
						return c.json({ error: "application_not_found" }, 404);
					}

					return c.json({ error: "application_not_editable" }, 409);
				}

				return c.json({ success: true }, 200);
			},
		)
		.post("/:id/submit", async (c) => {
			const id = parseApplicationId(c.req.param("id"));

			if (!id) {
				return c.json({ error: "invalid_application_id" }, 400);
			}

			const authResult = await getAuthenticatedApplicantUserId(c, authService);
			if (!authResult.success) {
				return authResult.response;
			}

			const result = await applicationService.submitApplication(
				id,
				authResult.userId,
			);

			if (!result.success) {
				if (result.reason === "not_found") {
					return c.json({ error: "application_not_found" }, 404);
				}

				return c.json({ error: "application_not_pending" }, 409);
			}

			return c.json({ applicationId: result.applicationId }, 200);
		});
}
