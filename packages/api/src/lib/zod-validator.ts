import type { z } from "zod";
import { validator } from "hono/validator";

export function zodJsonValidator<TSchema extends z.ZodType>(schema: TSchema) {
	return validator("json", (value, c) => {
		const result = schema.safeParse(value);

		if (!result.success) {
			return c.json(
				{ error: "validation_failed", issues: result.error.issues },
				422,
			);
		}

		return result.data;
	});
}
