import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { createAuthConfig } from "~/auth/config";
import { createApplicantApplicationsRoutes } from "~/routes/applicant/applications.routes";
import { createApplicantUploadsRoutes } from "~/routes/applicant/uploads.routes";
import { createAuthCodeRoutes } from "~/routes/auth/code.routes";
import { createAuthEmailRoutes } from "~/routes/auth/email.routes";
import { createLandlordApplicationsRoutes } from "~/routes/landlord/applications.routes";
import { createLandlordSignupRoutes } from "~/routes/landlord/signup.routes";
import type { AppServices } from "./container";

export function createApp({
	services,
	storageRoutes = new Hono(),
	authConfig = createAuthConfig(),
}: {
	services: AppServices;
	storageRoutes?: Hono;
	authConfig?: ReturnType<typeof createAuthConfig>;
}) {
	const allowedCorsOrigins = new Set([new URL(authConfig.webBaseUrl).origin]);
	const routeServices = {
		...services,
		cookieName: authConfig.cookieName,
	};
	const applicantRoutes = createApplicantApplicationsRoutes(
		routeServices,
	).route("/", createApplicantUploadsRoutes(routeServices));
	const storage = storageRoutes;

	const routes = new Hono()
		.use(
			"*",
			secureHeaders({
				strictTransportSecurity:
					authConfig.runtimeEnv === "production"
						? "max-age=63072000; includeSubDomains; preload"
						: false,
				xFrameOptions: "DENY",
				permissionsPolicy: {
					accelerometer: [],
					autoplay: [],
					camera: [],
					displayCapture: [],
					fullscreen: [],
					geolocation: [],
					microphone: [],
					payment: [],
					usb: [],
				},
			}),
		)
		.use(
			"*",
			cors({
				origin: (origin) => (allowedCorsOrigins.has(origin) ? origin : null),
				allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
				allowHeaders: ["Content-Type", "Authorization"],
				credentials: true,
			}),
		)
		.use("/auth/*", async (c, next) => {
			await next();
			c.header("Cache-Control", "no-store");
			c.header("Pragma", "no-cache");
		})
		.get("/", (c) => {
			return c.json({});
		})
		.route("/auth/code", createAuthCodeRoutes({ ...services, authConfig }))
		.route("/auth/email", createAuthEmailRoutes({ ...services, authConfig }))
		.route("/applications", applicantRoutes)
		.route(
			"/landlord/applications",
			createLandlordApplicationsRoutes(routeServices),
		)
		.route("/landlord", createLandlordSignupRoutes(routeServices))
		.route("/storage", storage)
		.route("/storage/", storage);

	return routes;
}

export type AppType = ReturnType<typeof createApp>;
