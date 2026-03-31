import { createApp } from "~/app";

const DEFAULT_PORT = 8787;
const DEFAULT_HOST = "127.0.0.1";

function parsePort(value: string | undefined) {
	if (!value) return DEFAULT_PORT;

	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

const port = parsePort(process.env.PORT);
const hostname = process.env.HOST?.trim() || DEFAULT_HOST;
const app = createApp();

const server = Bun.serve({
	port,
	hostname,
	fetch: app.fetch,
});

console.log(`API server listening on http://${server.hostname}:${server.port}`);
