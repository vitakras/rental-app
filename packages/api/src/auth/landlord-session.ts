import type { MiddlewareHandler } from "hono";
import { createRequireSession } from "~/auth/require-session";
import type { AuthContextEnv } from "~/auth/session-context";
import type { createAuthService } from "~/services/auth.service";

type AuthService = ReturnType<typeof createAuthService>;

export function createRequireLandlordSession({
	authService,
}: {
	authService: AuthService;
}): MiddlewareHandler<AuthContextEnv> {
	return createRequireSession({ authService, role: "landlord" });
}
