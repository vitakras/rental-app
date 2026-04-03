const LOCAL_WEB_BASE_URL = "http://localhost:5173";
const LOCAL_APPLICANT_SIGNUP_TOKEN = "11111111-1111-4111-8111-111111111111";
const LOCAL_LOGIN_CODE_PEPPER = "development-login-code-pepper";
const runtimeEnv = process.env.NODE_ENV ?? "development";

export interface AuthConfig {
	loginCodeTtlSeconds: number;
	sessionTtlSeconds: number;
	cookieName: string;
	webBaseUrl: string;
	applicantSignupToken: string;
	loginCodePepper: string;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
	if (!value) return fallback;

	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeBaseUrl(url: string) {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

function getWebBaseUrl() {
	const configuredBaseUrl = process.env.WEB_BASE_URL?.trim();

	if (configuredBaseUrl) {
		return normalizeBaseUrl(configuredBaseUrl);
	}

	if (runtimeEnv === "development" || runtimeEnv === "test") {
		return LOCAL_WEB_BASE_URL;
	}

	throw new Error("WEB_BASE_URL is required outside development and test");
}

function createDevelopmentAuthConfig(): AuthConfig {
	const applicantSignupToken = process.env.AUTH_APPLICANT_SIGNUP_TOKEN?.trim();

	return {
		loginCodeTtlSeconds: parsePositiveInt(
			process.env.AUTH_LOGIN_CODE_TTL_SECONDS,
			14 * 24 * 60 * 60,
		),
		sessionTtlSeconds: parsePositiveInt(
			process.env.AUTH_SESSION_TTL_SECONDS,
			30 * 24 * 60 * 60,
		),
		cookieName: process.env.AUTH_SESSION_COOKIE_NAME?.trim() || "session",
		webBaseUrl: getWebBaseUrl(),
		applicantSignupToken:
			applicantSignupToken || LOCAL_APPLICANT_SIGNUP_TOKEN,
		loginCodePepper:
			process.env.AUTH_LOGIN_CODE_PEPPER?.trim() || LOCAL_LOGIN_CODE_PEPPER,
	};
}

function createTestAuthConfig(): AuthConfig {
	return createDevelopmentAuthConfig();
}

function createProductionAuthConfig(): AuthConfig {
	const applicantSignupToken = process.env.AUTH_APPLICANT_SIGNUP_TOKEN?.trim();
	const loginCodePepper = process.env.AUTH_LOGIN_CODE_PEPPER?.trim();

	if (!applicantSignupToken) {
		throw new Error("AUTH_APPLICANT_SIGNUP_TOKEN is required");
	}

	if (!loginCodePepper) {
		throw new Error("AUTH_LOGIN_CODE_PEPPER is required");
	}

	return {
		loginCodeTtlSeconds: parsePositiveInt(
			process.env.AUTH_LOGIN_CODE_TTL_SECONDS,
			14 * 24 * 60 * 60,
		),
		sessionTtlSeconds: parsePositiveInt(
			process.env.AUTH_SESSION_TTL_SECONDS,
			30 * 24 * 60 * 60,
		),
		cookieName: process.env.AUTH_SESSION_COOKIE_NAME?.trim() || "session",
		webBaseUrl: getWebBaseUrl(),
		applicantSignupToken,
		loginCodePepper,
	};
}

function createAuthConfig(): AuthConfig {
	if (runtimeEnv === "development") {
		return createDevelopmentAuthConfig();
	}

	if (runtimeEnv === "test") {
		return createTestAuthConfig();
	}

	if (runtimeEnv === "production") {
		return createProductionAuthConfig();
	}

	return createDevelopmentAuthConfig();
}

export const authConfig = createAuthConfig();
