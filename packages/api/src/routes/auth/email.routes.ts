import type { Context } from "hono";
import { Hono } from "hono";
import { getAuthConfig } from "~/auth/config";
import {
	clearSessionCookie,
	getSessionCookie,
	setSessionCookie,
} from "~/auth/cookies";
import { zodJsonValidator } from "~/lib/zod-validator";
import {
	type ApplicantSignupData,
	applicantSignupSchema,
	type createAuthService,
	type RequestEmailLoginData,
	requestEmailLoginSchema,
	type VerifyEmailLoginData,
	verifyEmailLoginSchema,
} from "~/services/auth.service";

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
		.get("/session", async (c) => {
			const sessionId = getSessionCookie(c, {
				cookieName: authConfig.cookieName,
			});

			if (!sessionId) {
				return c.json({ error: "unauthorized" }, 401);
			}

			const result = await authService.getSessionUser(sessionId);

			if (!result.success) {
				return c.json({ error: result.reason }, 401);
			}

			return c.json({ user: result.user }, 200);
		})
		.post("/signup", zodJsonValidator(applicantSignupSchema), async (c) => {
			const body = c.req.valid("json") as ApplicantSignupData;
			const result = await authService.applicantSignup(body, {
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

				if (result.reason === "email_already_exists") {
					return c.json({ error: result.reason }, 409);
				}

				return c.json({ error: result.reason }, 401);
			}

			setSessionCookie(c, {
				cookieName: authConfig.cookieName,
				sessionId: result.session.id,
				expiresAt: result.session.expiresAt,
			});

			const codeResult = await authService.rotateReusableLoginCode(result.user, {
				ipAddress: getClientIp(c),
			});

			return c.json(
				{
					success: true,
					user: result.user,
					loginCode: codeResult.code,
				},
				201,
			);
		})
		.post("/request", zodJsonValidator(requestEmailLoginSchema), async (c) => {
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
		})
		.post("/signout", async (c) => {
			const sessionId = getSessionCookie(c, {
				cookieName: authConfig.cookieName,
			});

			if (sessionId) {
				await authService.signout(sessionId);
				clearSessionCookie(c, { cookieName: authConfig.cookieName });
			}

			return c.json({ success: true }, 200);
		})
		.post("/verify", zodJsonValidator(verifyEmailLoginSchema), async (c) => {
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
		});
}
