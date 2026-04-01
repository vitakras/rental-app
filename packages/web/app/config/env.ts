const env = import.meta.env;

export const BASE_API_URL =
	env.VITE_LOCAL_API_BASE_URL ?? "http://localhost:8787";
