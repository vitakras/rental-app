import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { SessionRecord } from "~/repositories/session.repository";

export function getSessionCookie(
	c: Context,
	{ cookieName }: { cookieName: string },
) {
	return getCookie(c, cookieName) ?? null;
}

export function setSessionCookie(
	c: Context,
	session: SessionRecord,
	{
		cookieName,
		runtimeEnv,
	}: {
		cookieName: string;
		runtimeEnv?: string;
	},
) {
	const expiresAtDate = new Date(session.expiresAt);
	const isSecure = runtimeEnv !== "development" && runtimeEnv !== "test";
	const maxAge = Math.max(
		0,
		Math.floor((expiresAtDate.getTime() - Date.now()) / 1000),
	);

	setCookie(c, cookieName, session.id, {
		httpOnly: true,
		path: "/",
		// The production web app calls the API from a different origin, so the
		// session cookie must be explicitly marked for cross-site requests.
		sameSite: isSecure ? "None" : "Lax",
		secure: isSecure,
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
