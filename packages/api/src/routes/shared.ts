import type { MiddlewareHandler } from "hono";

export function parseApplicationId(rawId: string) {
	const id = Number(rawId);
	return Number.isInteger(id) && id > 0 ? id : null;
}

export const ensureValidApplicationId: MiddlewareHandler = async (c, next) => {
	const rawId = c.req.param("id");

	if (!rawId || !parseApplicationId(rawId)) {
		return c.json({ error: "invalid_application_id" }, 400);
	}

	await next();
};
