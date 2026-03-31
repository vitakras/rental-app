import { Hono } from "hono";
import type { Context } from "hono";
import { zodJsonValidator } from "~/lib/zod-validator";
import {
	requestEmailLoginSchema,
	type RequestEmailLoginData,
	type VerifyEmailLoginData,
	verifyEmailLoginSchema,
	type createAuthService,
} from "~/services/auth.service";
import { setSessionCookie } from "~/auth/cookies";
import { getAuthConfig } from "~/auth/config";

type AuthService = ReturnType<typeof createAuthService>;
const authConfig = getAuthConfig();

function getClientIp(c: Context) {
	const forwardedFor = c.req.header("x-forwarded-for");
	return forwardedFor?.split(",")[0]?.trim() || null;
}

export function createAuthEmailRoutes({
	authService,
}: {
	authService: AuthService;
}) {
	return new Hono()
		.post(
			"/request",
			zodJsonValidator(requestEmailLoginSchema),
			async (c) => {
				const body = c.req.valid("json") as RequestEmailLoginData;
				const result = await authService.requestEmailLogin(body, {
					ipAddress: getClientIp(c),
				});

				if (!result.success) {
					return c.json(
						{ error: "validation_failed", issues: result.errors },
						422,
					);
				}

				return c.json({ success: true }, 200);
			},
		)
		.post(
			"/verify",
			zodJsonValidator(verifyEmailLoginSchema),
			async (c) => {
				const body = c.req.valid("json") as VerifyEmailLoginData;
				const result = await authService.verifyEmailLogin(body, {
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
			},
		);
}
