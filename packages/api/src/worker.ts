import { createApp } from "~/app";
import { createCfServices } from "~/container";
import type { CloudflareBindings } from "~/worker-env";

export default {
	fetch(request: Request, env: CloudflareBindings, ctx: ExecutionContext) {
		const services = createCfServices(env);
		const app = createApp({ services });

		return app.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<CloudflareBindings>;
