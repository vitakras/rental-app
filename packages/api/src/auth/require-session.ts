import type { Context, MiddlewareHandler } from "hono";
import { getAuthConfig } from "~/auth/config";
import { getSessionCookie } from "~/auth/cookies";
import { type AuthContextEnv, setAuthContext } from "~/auth/session-context";
import type { UserGlobalRole } from "~/db/schema";
import type { createAuthService } from "~/services/auth.service";

type AuthService = ReturnType<typeof createAuthService>;

const authConfig = getAuthConfig();

function unauthorized(c: Context<AuthContextEnv>) {
	return c.json({ error: "unauthorized" }, 401);
}

export function createRequireSession({
	authService,
	invalidSessionError = "unauthorized",
	role,
}: {
	authService: AuthService;
	invalidSessionError?: string;
	role?: UserGlobalRole;
}): MiddlewareHandler<AuthContextEnv> {
	return async (c, next) => {
		const sessionId = getSessionCookie(c, {
			cookieName: authConfig.cookieName,
		});

		if (!sessionId) {
			return unauthorized(c);
		}

		const result = await authService.getSessionUser(sessionId);

		if (!result.success) {
			return c.json({ error: invalidSessionError }, 401);
		}

		if (role && result.user.globalRole !== role) {
			return c.json({ error: "forbidden" }, 403);
		}

		setAuthContext(c, {
			sessionId,
			user: result.user,
			session: result.session,
		});

		await next();
	};
}
