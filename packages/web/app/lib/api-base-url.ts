const LOCAL_API_BASE_URL = "http://127.0.0.1:8787";

function normalizeBaseUrl(url: string) {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getServerApiBaseUrl() {
	const configuredBaseUrl = process.env.API_BASE_URL?.trim();

	if (configuredBaseUrl) {
		return normalizeBaseUrl(configuredBaseUrl);
	}

	if (
		process.env.NODE_ENV === "development" ||
		process.env.NODE_ENV === "test"
	) {
		return LOCAL_API_BASE_URL;
	}

	throw new Error("API_BASE_URL is required outside development and test");
}

export function getClientApiBaseUrl() {
	const configuredBaseUrl =
		typeof window !== "undefined"
			? window.__APP_CONFIG__?.apiBaseUrl?.trim()
			: undefined;

	if (configuredBaseUrl) {
		return normalizeBaseUrl(configuredBaseUrl);
	}

	if (import.meta.env.DEV) {
		return LOCAL_API_BASE_URL;
	}

	if (typeof window !== "undefined") {
		return window.location.origin;
	}

	throw new Error("API base URL is not available on the client");
}

export function getApiBaseUrl() {
	if (typeof window === "undefined") {
		return getServerApiBaseUrl();
	}

	return getClientApiBaseUrl();
}

declare global {
	interface Window {
		__APP_CONFIG__?: {
			apiBaseUrl?: string;
		};
	}
}
