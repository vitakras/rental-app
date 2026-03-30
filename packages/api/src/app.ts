import { Hono } from "hono";
import { services as defaultServices } from "~/container";
import { createApplicantApplicationsRoutes } from "~/routes/applicant/applications.routes";
import { createApplicantUploadsRoutes } from "~/routes/applicant/uploads.routes";
import { createLandlordApplicationsRoutes } from "~/routes/landlord/applications.routes";
import { createStorageRoutes } from "~/routes/storage.routes";

export function createApp({
	services = defaultServices,
}: {
	services?: typeof defaultServices;
} = {}) {
	const storage = createStorageRoutes();

	return new Hono()
		.get("/", (c) => {
			return c.text("Hello Hono!");
		})
		.route("/applications", createApplicantApplicationsRoutes(services))
		.route("/applications", createApplicantUploadsRoutes(services))
		.route(
			"/landlord/applications",
			createLandlordApplicationsRoutes(services),
		)
		.route("/storage", storage)
		.route("/storage/", storage);
}

export type AppType = ReturnType<typeof createApp>;
