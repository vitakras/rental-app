import type { MiddlewareHandler } from "hono";
import { getAuthConfig } from "~/auth/config";
import { getSessionCookie } from "~/auth/cookies";
import type { createAuthService } from "~/services/auth.service";

type AuthService = ReturnType<typeof createAuthService>;

const authConfig = getAuthConfig();

export function createRequireApplicantSession({
	authService,
}: {
	authService: AuthService;
}): MiddlewareHandler {
	return async (c, next) => {
		const sessionId = getSessionCookie(c, {
			cookieName: authConfig.cookieName,
		});

		if (!sessionId) {
			return c.json({ error: "unauthorized" }, 401);
		}

		const result = await authService.getSessionUser(sessionId);

		if (!result.success) {
			return c.json({ error: "unauthorized" }, 401);
		}

		if (result.user.globalRole !== "applicant") {
			return c.json({ error: "forbidden" }, 403);
		}

		await next();
	};
}
