import { afterEach, describe, expect, it } from "bun:test";
import {
	getClientApiBaseUrl,
	getServerApiBaseUrl,
} from "~/lib/api-base-url";

const originalWindow = globalThis.window;
const originalNodeEnv = process.env.NODE_ENV;
const originalApiBaseUrl = process.env.API_BASE_URL;

describe("api base url", () => {
	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv;
		if (originalApiBaseUrl === undefined) {
			delete process.env.API_BASE_URL;
		} else {
			process.env.API_BASE_URL = originalApiBaseUrl;
		}

		if (originalWindow === undefined) {
			delete (globalThis as { window?: Window }).window;
		} else {
			(globalThis as { window?: Window }).window = originalWindow;
		}
	});

	it("uses the same localhost dev default as the api package", () => {
		process.env.NODE_ENV = "development";
		delete process.env.API_BASE_URL;

		expect(getServerApiBaseUrl()).toBe("http://localhost:8787");
	});

	it("prefers the injected client api base url", () => {
		(globalThis as { window?: Window }).window = {
			__APP_CONFIG__: {
				apiBaseUrl: "https://api.example.com/",
			},
		} as Window;

		expect(getClientApiBaseUrl()).toBe("https://api.example.com");
	});
});
