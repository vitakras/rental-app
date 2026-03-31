import type { Context } from "hono";
import { setCookie } from "hono/cookie";

export function setSessionCookie(
	c: Context,
	{
		cookieName,
		sessionId,
		expiresAt,
	}: {
		cookieName: string;
		sessionId: string;
		expiresAt: string;
	},
) {
	const expiresAtDate = new Date(expiresAt);
	const maxAge = Math.max(
		0,
		Math.floor((expiresAtDate.getTime() - Date.now()) / 1000),
	);

	setCookie(c, cookieName, sessionId, {
		httpOnly: true,
		path: "/",
		sameSite: "Lax",
		secure:
			process.env.NODE_ENV !== "development" &&
			process.env.NODE_ENV !== "test",
		maxAge,
		expires: expiresAtDate,
	});
}
