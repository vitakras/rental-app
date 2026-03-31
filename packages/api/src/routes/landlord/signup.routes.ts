import { Hono } from "hono";
import { createRequireLandlordSession } from "~/auth/landlord-session";
import type { createAuthService } from "~/services/auth.service";

type AuthService = ReturnType<typeof createAuthService>;

export function createLandlordSignupRoutes({
	authService,
}: {
	authService: AuthService;
}) {
	return new Hono()
		.use("*", createRequireLandlordSession({ authService }))
		.get("/applicant-signup-url", (c) => {
			const signupLink = authService.getApplicantSignupLink();
			return c.json(signupLink, 200);
		});
}
