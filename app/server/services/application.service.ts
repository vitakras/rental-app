import { z } from "zod";

// ── Zod schema ─────────────────────────────────────────────────────────────────

const dateString = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Must be a date in YYYY-MM-DD format" });

const ownerSchema = z.object({
	fullName: z.string().min(1, { error: "Full name is required" }),
	dateOfBirth: dateString,
	email: z.email({ error: "Invalid email address" }),
	phone: z.string().min(1, { error: "Phone number is required" }),
});

const additionalAdultSchema = z.object({
	fullName: z.string().min(1, { error: "Full name is required" }),
	dateOfBirth: dateString,
	role: z.enum(["co-applicant", "dependent"]),
	email: z.email({ error: "Invalid email address" }).optional(),
});

const childSchema = z.object({
	fullName: z.string().min(1, { error: "Full name is required" }),
	dateOfBirth: dateString,
});

export const createApplicationSchema = z.object({
	desiredMoveInDate: dateString,
	owner: ownerSchema,
	additionalAdults: z.array(additionalAdultSchema).default([]),
	children: z.array(childSchema).default([]),
});

export type CreateApplicationData = z.input<typeof createApplicationSchema>;
type CreateApplicationPayload = z.output<typeof createApplicationSchema>;

// ── Repository interface ───────────────────────────────────────────────────────

export interface ApplicationRepository {
	create(input: CreateApplicationPayload): Promise<{ id: number }>;
}

// ── Service ────────────────────────────────────────────────────────────────────

export type CreateApplicationResult =
	| { success: true; applicationId: number }
	| { success: false; errors: z.ZodIssue[] };

export function createApplicationService({
	applicationRepository,
}: {
	applicationRepository: ApplicationRepository;
}) {
	return {
		async createApplication(
			data: CreateApplicationData,
		): Promise<CreateApplicationResult> {
			const parsed = createApplicationSchema.safeParse(data);

			if (!parsed.success) {
				return { success: false, errors: parsed.error.issues };
			}

			const application = await applicationRepository.create(parsed.data);

			return { success: true, applicationId: application.id };
		},
	};
}
