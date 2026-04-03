import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { authConfig } from "./config";

export function getSessionCookie(c: Context) {
	return getCookie(c, authConfig.cookieName) ?? null;
}

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
			process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test",
		maxAge,
		expires: expiresAtDate,
	});
}

export function clearSessionCookie(
	c: Context,
	{ cookieName }: { cookieName: string },
) {
	deleteCookie(c, cookieName, { path: "/" });
}
