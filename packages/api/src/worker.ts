import { createApp } from "~/app";
import { createAuthConfig } from "~/auth/config";
import { createCfServices } from "~/container";
import type { CloudflareBindings } from "~/worker-env";

export default {
	fetch(request: Request, env: CloudflareBindings, ctx: ExecutionContext) {
		const authConfig = createAuthConfig(env);
		const services = createCfServices(env);
		const app = createApp({ services, authConfig });

		return app.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<CloudflareBindings>;
