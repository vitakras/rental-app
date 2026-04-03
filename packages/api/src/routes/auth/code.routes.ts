import type { Context } from "hono";
import { Hono } from "hono";
import { setSessionCookie } from "~/auth/cookies";
import { createRequireSession } from "~/auth/require-session";
import { type AuthContextEnv, getAuthContext } from "~/auth/session-context";
import { zodJsonValidator } from "~/lib/zod-validator";
import {
	type createAuthService,
	type VerifyReusableLoginCodeData,
	verifyReusableLoginCodeSchema,
} from "~/services/auth.service";

type AuthService = ReturnType<typeof createAuthService>;
function getClientIp(c: Context) {
	const forwardedFor = c.req.header("x-forwarded-for");
	return forwardedFor?.split(",")[0]?.trim() || null;
}

export function createAuthCodeRoutes({
	authService,
}: {
	authService: AuthService;
}) {
	const app = new Hono<AuthContextEnv>();

	app.use("/", createRequireSession({ authService }));
	app.use("/rotate", createRequireSession({ authService }));

	return app
		.get("/", async (c) => {
			const auth = getAuthContext(c);
			const result = await authService.getReusableLoginCodeStatus(auth.user);

			return c.json({ status: result.status }, 200);
		})
		.post("/rotate", async (c) => {
			const auth = getAuthContext(c);
			const result = await authService.rotateReusableLoginCode(auth.user, {
				ipAddress: getClientIp(c),
			});

			return c.json(result, 200);
		})
		.post(
			"/verify",
			zodJsonValidator(verifyReusableLoginCodeSchema),
			async (c) => {
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

				setSessionCookie(c, result.session);

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
