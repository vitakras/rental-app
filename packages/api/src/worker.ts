import { createApp } from "~/app";
import { createCfServices } from "~/cf-container";
import { createR2StorageRoutes } from "~/routes/r2-storage.routes";
import type { CloudflareBindings } from "~/worker-env";

export default {
	fetch(request: Request, env: CloudflareBindings, ctx: ExecutionContext) {
		const services = createCfServices(env);
		const app = createApp({
			services,
			storageRoutes: createR2StorageRoutes(env.STORAGE),
		});

		return app.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<CloudflareBindings>;
