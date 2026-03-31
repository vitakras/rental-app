import { Hono } from "hono";
import { cors } from "hono/cors";
import { services as defaultServices } from "~/container";
import { createApplicantApplicationsRoutes } from "~/routes/applicant/applications.routes";
import { createApplicantUploadsRoutes } from "~/routes/applicant/uploads.routes";
import { createAuthEmailRoutes } from "~/routes/auth/email.routes";
import { createLandlordApplicationsRoutes } from "~/routes/landlord/applications.routes";
import { createStorageRoutes } from "~/routes/storage.routes";

export function createApp({
	services = defaultServices,
}: {
	services?: typeof defaultServices;
} = {}) {
	const applicantRoutes = createApplicantApplicationsRoutes(services).route(
		"/",
		createApplicantUploadsRoutes(services),
	);
	const storage = createStorageRoutes();

	const routes = new Hono()
		.use(
			cors({
				origin: (origin) => origin,
				allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
				allowHeaders: ["Content-Type", "Authorization"],
				credentials: true,
			}),
		)
		.get("/", (c) => {
			return c.text("Hello Hono!");
		})
		.route("/auth/email", createAuthEmailRoutes(services))
		.route("/applications", applicantRoutes)
		.route(
			"/landlord/applications",
			createLandlordApplicationsRoutes(services),
		)
		.route("/storage", storage)
		.route("/storage/", storage);

	return routes;
}

export type AppType = ReturnType<typeof createApp>;
