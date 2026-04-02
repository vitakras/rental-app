import { Hono } from "hono";

export function createR2StorageRoutes(bucket: R2Bucket) {
	return new Hono()
		.get("/:key{.+}", async (c) => {
			const key = decodeURIComponent(c.req.param("key"));
			const object = await bucket.get(key);

			if (!object) {
				return c.notFound();
			}

			const headers = new Headers();
			object.writeHttpMetadata(headers);

			if (!headers.has("etag") && object.httpEtag) {
				headers.set("etag", object.httpEtag);
			}

			return new Response(object.body, { headers });
		})
		.put("/:key{.+}", async (c) => {
			const key = decodeURIComponent(c.req.param("key"));

			await bucket.put(key, await c.req.arrayBuffer(), {
				httpMetadata: {
					contentType:
						c.req.header("content-type") ?? "application/octet-stream",
				},
			});

			return new Response(null, { status: 200 });
		});
}
