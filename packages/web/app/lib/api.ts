import { hc } from "hono/client";

const LOCAL_API_BASE_URL = "http://127.0.0.1:8787";

function normalizeBaseUrl(url: string) {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

function getApiBaseUrl() {
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

export function createApiClient() {
	return hc(getApiBaseUrl()) as any;
}
