import type { MiddlewareHandler } from "hono";
import { createRequireSession } from "~/auth/require-session";
import type { AuthContextEnv } from "~/auth/session-context";
import type { createAuthService } from "~/services/auth.service";

type AuthService = ReturnType<typeof createAuthService>;

export function createRequireLandlordSession({
	authService,
	cookieName,
}: {
	authService: AuthService;
	cookieName: string;
}): MiddlewareHandler<AuthContextEnv> {
	return createRequireSession({ authService, cookieName, role: "landlord" });
}
