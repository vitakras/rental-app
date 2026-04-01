import type { Context } from "hono";
import { Hono } from "hono";
import { getAuthConfig } from "~/auth/config";
import { getSessionCookie, setSessionCookie } from "~/auth/cookies";
import { zodJsonValidator } from "~/lib/zod-validator";
import {
	type VerifyReusableLoginCodeData,
	type createAuthService,
	verifyReusableLoginCodeSchema,
} from "~/services/auth.service";

type AuthService = ReturnType<typeof createAuthService>;
const authConfig = getAuthConfig();

function getClientIp(c: Context) {
	const forwardedFor = c.req.header("x-forwarded-for");
	return forwardedFor?.split(",")[0]?.trim() || null;
}

export function createAuthCodeRoutes({
	authService,
}: {
	authService: AuthService;
}) {
	return new Hono()
		.get("/", async (c) => {
			const sessionId = getSessionCookie(c, {
				cookieName: authConfig.cookieName,
			});

			if (!sessionId) {
				return c.json({ error: "unauthorized" }, 401);
			}

			const sessionResult = await authService.getSessionUser(sessionId);

			if (!sessionResult.success) {
				return c.json({ error: "unauthorized" }, 401);
			}

			const result = await authService.getReusableLoginCodeStatus(
				sessionResult.user,
			);

			return c.json({ status: result.status }, 200);
		})
		.post("/rotate", async (c) => {
			const sessionId = getSessionCookie(c, {
				cookieName: authConfig.cookieName,
			});

			if (!sessionId) {
				return c.json({ error: "unauthorized" }, 401);
			}

			const sessionResult = await authService.getSessionUser(sessionId);

			if (!sessionResult.success) {
				return c.json({ error: "unauthorized" }, 401);
			}

			const result = await authService.rotateReusableLoginCode(
				sessionResult.user,
				{ ipAddress: getClientIp(c) },
			);

			return c.json(result, 200);
		})
		.post("/verify", zodJsonValidator(verifyReusableLoginCodeSchema), async (c) => {
			const body = c.req.valid("json") as VerifyReusableLoginCodeData;
			const result = await authService.verifyReusableLoginCode(body, {
				ipAddress: getClientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
			});

			if (!result.success) {
				if ("errors" in result) {
					return c.json(
						{ error: "validation_failed", issues: result.errors },
						422,
					);
				}

				return c.json({ error: result.reason }, 401);
			}

			setSessionCookie(c, {
				cookieName: authConfig.cookieName,
				sessionId: result.session.id,
				expiresAt: result.session.expiresAt,
			});

			return c.json(
				{
					success: true,
					user: result.user,
				},
				200,
			);
		});
}
