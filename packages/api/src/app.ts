import { Hono } from "hono";
import { services as defaultServices } from "~/container";
import { createApplicationFlowRoutes } from "~/routes/application-flow.routes";
import { createLandlordApplicationsRoutes } from "~/routes/applications.routes";
import { createStorageRoutes } from "~/routes/storage.routes";
import { createUploadRoutes } from "~/routes/uploads.routes";

export function createApp({
	services = defaultServices,
}: {
	services?: typeof defaultServices;
} = {}) {
	const app = new Hono();

	app.get("/", (c) => {
		return c.text("Hello Hono!");
	});

	app.route("/applications", createApplicationFlowRoutes(services));
	app.route(
		"/landlord/applications",
		createLandlordApplicationsRoutes(services),
	);
	app.route("/api", createUploadRoutes(services));
	const storage = createStorageRoutes();
	app.route("/api/storage", storage);
	app.route("/api/storage/", storage);

	return app;
}
