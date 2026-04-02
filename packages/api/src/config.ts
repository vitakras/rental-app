const LOCAL_API_BASE_URLS = {
	development: "http://localhost:8788",
	test: "http://localhost:8787",
} as const;

function normalizeBaseUrl(url: string) {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getApiBaseUrl() {
	const configuredBaseUrl = process.env.API_BASE_URL?.trim();

	if (configuredBaseUrl) {
		return normalizeBaseUrl(configuredBaseUrl);
	}

	if (
		process.env.NODE_ENV === "development" ||
		process.env.NODE_ENV === "test"
	) {
		return LOCAL_API_BASE_URLS[process.env.NODE_ENV];
	}

	throw new Error("API_BASE_URL is required outside development and test");
}
