import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { getAuthConfig } from "~/auth/config";
import { createApplicantApplicationsRoutes } from "~/routes/applicant/applications.routes";
import { createApplicantUploadsRoutes } from "~/routes/applicant/uploads.routes";
import { createAuthCodeRoutes } from "~/routes/auth/code.routes";
import { createAuthEmailRoutes } from "~/routes/auth/email.routes";
import { createLandlordApplicationsRoutes } from "~/routes/landlord/applications.routes";
import { createLandlordSignupRoutes } from "~/routes/landlord/signup.routes";
import type { AppServices } from "~/runtime-services";

const allowedCorsOrigins = new Set([
	new URL(getAuthConfig().webBaseUrl).origin,
]);

function resolveCorsOrigin(origin: string) {
	return allowedCorsOrigins.has(origin) ? origin : null;
}

export function createApp({
	services,
	storageRoutes = new Hono(),
}: {
	services: AppServices;
	storageRoutes?: Hono;
}) {
	const applicantRoutes = createApplicantApplicationsRoutes(services).route(
		"/",
		createApplicantUploadsRoutes(services),
	);
	const storage = storageRoutes;

	const routes = new Hono()
		.use(
			"*",
			secureHeaders({
				strictTransportSecurity:
					(process.env.NODE_ENV as string | undefined) === "production"
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
				origin: resolveCorsOrigin,
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
			return c.text("Hello Hono!");
		})
		.route("/auth/code", createAuthCodeRoutes(services))
		.route("/auth/email", createAuthEmailRoutes(services))
		.route("/applications", applicantRoutes)
		.route("/landlord/applications", createLandlordApplicationsRoutes(services))
		.route("/landlord", createLandlordSignupRoutes(services))
		.route("/storage", storage)
		.route("/storage/", storage);

	return routes;
}

export type AppType = ReturnType<typeof createApp>;
