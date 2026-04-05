import { Hono } from "hono";
import { createRequireLandlordSession } from "~/auth/landlord-session";
import type { AuthContextEnv } from "~/auth/session-context";
import type { createAuthService } from "~/services/auth.service";

type AuthService = ReturnType<typeof createAuthService>;

export function createLandlordSignupRoutes({
	authService,
	cookieName,
}: {
	authService: AuthService;
	cookieName: string;
}) {
	return new Hono<AuthContextEnv>()
		.use("*", createRequireLandlordSession({ authService, cookieName }))
		.get("/applicant-signup-url", (c) => {
			const signupLink = authService.getApplicantSignupLink();
			return c.json(signupLink, 200);
		});
}
