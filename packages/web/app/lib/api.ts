import { hc } from "hono/client";
import type { AppType } from "api";
import { BASE_API_URL } from "~/config/env";

export const apiClient = hc<AppType>(BASE_API_URL, {
	init: {
		credentials: "include",
	},
});
