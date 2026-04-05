const LOCAL_WEB_BASE_URL = "http://localhost:5173";
const LOCAL_APPLICANT_SIGNUP_TOKEN = "11111111-1111-4111-8111-111111111111";
const LOCAL_LANDLORD_SIGNUP_TOKEN = "22222222-2222-4222-8222-222222222222";
const LOCAL_LOGIN_CODE_PEPPER = "development-login-code-pepper";

export interface AuthEnv {
	NODE_ENV?: string;
	WEB_BASE_URL?: string;
	AUTH_APPLICANT_SIGNUP_TOKEN?: string;
	AUTH_LANDLORD_SIGNUP_TOKEN?: string;
	AUTH_LOGIN_CODE_TTL_SECONDS?: string;
	AUTH_SESSION_TTL_SECONDS?: string;
	AUTH_SESSION_COOKIE_NAME?: string;
	AUTH_LOGIN_CODE_PEPPER?: string;
}

export interface AuthConfig {
	runtimeEnv: string;
	loginCodeTtlSeconds: number;
	sessionTtlSeconds: number;
	cookieName: string;
	webBaseUrl: string;
	applicantSignupToken: string;
	landlordSignupToken: string;
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

function getWebBaseUrl(env: AuthEnv, runtimeEnv: string) {
	const configuredBaseUrl = env.WEB_BASE_URL?.trim();

	if (configuredBaseUrl) {
		return normalizeBaseUrl(configuredBaseUrl);
	}

	if (runtimeEnv === "development" || runtimeEnv === "test") {
		return LOCAL_WEB_BASE_URL;
	}

	throw new Error("WEB_BASE_URL is required outside development and test");
}

function createDevelopmentAuthConfig(env: AuthEnv): AuthConfig {
	const applicantSignupToken = env.AUTH_APPLICANT_SIGNUP_TOKEN?.trim();
	const landlordSignupToken = env.AUTH_LANDLORD_SIGNUP_TOKEN?.trim();

	return {
		runtimeEnv: "development",
		loginCodeTtlSeconds: parsePositiveInt(
			env.AUTH_LOGIN_CODE_TTL_SECONDS,
			14 * 24 * 60 * 60,
		),
		sessionTtlSeconds: parsePositiveInt(
			env.AUTH_SESSION_TTL_SECONDS,
			30 * 24 * 60 * 60,
		),
		cookieName: env.AUTH_SESSION_COOKIE_NAME?.trim() || "session",
		webBaseUrl: getWebBaseUrl(env, "development"),
		applicantSignupToken: applicantSignupToken || LOCAL_APPLICANT_SIGNUP_TOKEN,
		landlordSignupToken: landlordSignupToken || LOCAL_LANDLORD_SIGNUP_TOKEN,
		loginCodePepper: env.AUTH_LOGIN_CODE_PEPPER?.trim() || LOCAL_LOGIN_CODE_PEPPER,
	};
}

function createTestAuthConfig(env: AuthEnv): AuthConfig {
	return createDevelopmentAuthConfig(env);
}

function createProductionAuthConfig(env: AuthEnv): AuthConfig {
	const applicantSignupToken = env.AUTH_APPLICANT_SIGNUP_TOKEN?.trim();
	const landlordSignupToken = env.AUTH_LANDLORD_SIGNUP_TOKEN?.trim();
	const loginCodePepper = env.AUTH_LOGIN_CODE_PEPPER?.trim();

	if (!applicantSignupToken) {
		throw new Error("AUTH_APPLICANT_SIGNUP_TOKEN is required");
	}

	if (!landlordSignupToken) {
		throw new Error("AUTH_LANDLORD_SIGNUP_TOKEN is required");
	}

	if (!loginCodePepper) {
		throw new Error("AUTH_LOGIN_CODE_PEPPER is required");
	}

	return {
		runtimeEnv: "production",
		loginCodeTtlSeconds: parsePositiveInt(
			env.AUTH_LOGIN_CODE_TTL_SECONDS,
			14 * 24 * 60 * 60,
		),
		sessionTtlSeconds: parsePositiveInt(
			env.AUTH_SESSION_TTL_SECONDS,
			30 * 24 * 60 * 60,
		),
		cookieName: env.AUTH_SESSION_COOKIE_NAME?.trim() || "session",
		webBaseUrl: getWebBaseUrl(env, "production"),
		applicantSignupToken,
		landlordSignupToken,
		loginCodePepper,
	};
}

export function createAuthConfig(env: AuthEnv = process.env as AuthEnv): AuthConfig {
	const runtimeEnv = env.NODE_ENV ?? "development";

	if (runtimeEnv === "development") {
		return createDevelopmentAuthConfig(env);
	}

	if (runtimeEnv === "test") {
		return createTestAuthConfig(env);
	}

	if (runtimeEnv === "production") {
		return createProductionAuthConfig(env);
	}

	return createDevelopmentAuthConfig(env);
}
