import { z } from "zod";
import type { CreateApplicationInput } from "~/server/repositories/application.repository";

// ── Repository interface ───────────────────────────────────────────────────────

export interface ApplicationRepository {
	create(input: CreateApplicationInput): Promise<{ id: number }>;
}

// ── Zod schema ─────────────────────────────────────────────────────────────────

const dateString = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date in YYYY-MM-DD format");

const ownerSchema = z.object({
	fullName: z.string().min(1, "Full name is required"),
	dateOfBirth: dateString,
	email: z.string().email("Invalid email address"),
	phone: z.string().min(1, "Phone number is required"),
});

const additionalAdultSchema = z.object({
	fullName: z.string().min(1, "Full name is required"),
	dateOfBirth: dateString,
	role: z.enum(["co-applicant", "dependent"]),
	email: z.string().email("Invalid email address").optional(),
});

const childSchema = z.object({
	fullName: z.string().min(1, "Full name is required"),
	dateOfBirth: dateString,
});

export const createApplicationSchema = z.object({
	desiredMoveInDate: dateString,
	owner: ownerSchema,
	additionalAdults: z.array(additionalAdultSchema).default([]),
	children: z.array(childSchema).default([]),
});

export type CreateApplicationData = z.input<typeof createApplicationSchema>;

// ── Use case ───────────────────────────────────────────────────────────────────

export type CreateApplicationResult =
	| { success: true; applicationId: number }
	| { success: false; errors: z.ZodIssue[] };

export async function createApplication(
	repo: ApplicationRepository,
	data: CreateApplicationData,
): Promise<CreateApplicationResult> {
	const parsed = createApplicationSchema.safeParse(data);

	if (!parsed.success) {
		return { success: false, errors: parsed.error.issues };
	}

	const application = await repo.create(parsed.data);

	return { success: true, applicationId: application.id };
}
