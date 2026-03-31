const LOCAL_WEB_BASE_URL = "http://127.0.0.1:5173";
const runtimeEnv = process.env.NODE_ENV ?? "development";

function parsePositiveInt(value: string | undefined, fallback: number) {
	if (!value) return fallback;

	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeBaseUrl(url: string) {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getWebBaseUrl() {
	const configuredBaseUrl = process.env.WEB_BASE_URL?.trim();

	if (configuredBaseUrl) {
		return normalizeBaseUrl(configuredBaseUrl);
	}

	if (runtimeEnv === "development" || runtimeEnv === "test") {
		return LOCAL_WEB_BASE_URL;
	}

	throw new Error("WEB_BASE_URL is required outside development and test");
}

export function getAuthConfig() {
	return {
		loginTokenTtlSeconds: parsePositiveInt(
			process.env.AUTH_LOGIN_TOKEN_TTL_SECONDS,
			15 * 60,
		),
		sessionTtlSeconds: parsePositiveInt(
			process.env.AUTH_SESSION_TTL_SECONDS,
			30 * 24 * 60 * 60,
		),
		cookieName: process.env.AUTH_SESSION_COOKIE_NAME?.trim() || "session",
		webBaseUrl: getWebBaseUrl(),
	};
}

export type AuthConfig = ReturnType<typeof getAuthConfig>;
