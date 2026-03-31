import { hc } from "hono/client";
import type { AppType } from "api";
import { getApiBaseUrl } from "~/lib/api-base-url";

export const apiClient = hc<AppType>(getApiBaseUrl(), {
	init: {
		credentials: "include",
	},
});
