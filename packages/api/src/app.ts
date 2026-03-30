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
	const app = new Hono();

	app.get("/", (c) => {
		return c.text("Hello Hono!");
	});

	app.route("/applications", createApplicantApplicationsRoutes(services));
	app.route("/applications", createApplicantUploadsRoutes(services));
	app.route(
		"/landlord/applications",
		createLandlordApplicationsRoutes(services),
	);
	const storage = createStorageRoutes();
	app.route("/storage", storage);
	app.route("/storage/", storage);

	return app;
}
