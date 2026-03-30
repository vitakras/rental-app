import fs from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";

const UPLOADS_DIR = path.resolve("data/uploads");

function safeResolvePath(key: string): string | null {
	const resolved = path.resolve(path.join(UPLOADS_DIR, key));
	const base = path.resolve(UPLOADS_DIR);
	if (resolved !== base && !resolved.startsWith(base + path.sep)) return null;
	return resolved;
}

export function createStorageRoutes() {
	return new Hono()
		.get("/:key{.+}", async (c) => {
			const filePath = safeResolvePath(decodeURIComponent(c.req.param("key")));

			if (!filePath) {
				return new Response(null, { status: 403 });
			}

			try {
				const buffer = await fs.readFile(filePath);
				return new Response(buffer, {
					headers: { "Content-Type": "application/octet-stream" },
				});
			} catch {
				return new Response(null, { status: 404 });
			}
		})
		.put("/:key{.+}", async (c) => {
			const filePath = safeResolvePath(decodeURIComponent(c.req.param("key")));

			if (!filePath) {
				return new Response(null, { status: 403 });
			}

			await fs.mkdir(path.dirname(filePath), { recursive: true });
			const buffer = await c.req.arrayBuffer();
			await fs.writeFile(filePath, Buffer.from(buffer));

			return new Response(null, { status: 200 });
		});
}
