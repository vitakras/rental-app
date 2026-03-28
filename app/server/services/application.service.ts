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

const petSchema = z.object({
	type: z.string().min(1),
	name: z.string().optional(),
	breed: z.string().optional(),
	notes: z.string().optional(),
});

export const createApplicationSchema = z.object({
	desiredMoveInDate: dateString,
	owner: ownerSchema,
	additionalAdults: z.array(additionalAdultSchema).default([]),
	children: z.array(childSchema).default([]),
	pets: z.array(petSchema).default([]),
});

export type CreateApplicationData = z.input<typeof createApplicationSchema>;

// ── Repository interface ───────────────────────────────────────────────────────

export type CreateApplicationPayload = z.output<typeof createApplicationSchema>;

export interface ApplicationRepository {
	create(input: CreateApplicationPayload): Promise<{ id: number }>;
	findById(id: number): Promise<{ id: number; status: string } | null>;
	submit(id: number): Promise<{ id: number } | null>;
}

// ── Service ────────────────────────────────────────────────────────────────────

export type CreateApplicationResult =
	| { success: true; applicationId: number }
	| { success: false; errors: z.ZodIssue[] };

export type SubmitApplicationResult =
	| { success: true; applicationId: number }
	| { success: false; reason: "not_found" | "not_pending" };

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

		async submitApplication(
			applicationId: number,
		): Promise<SubmitApplicationResult> {
			const app = await applicationRepository.findById(applicationId);

			if (!app) {
				return { success: false, reason: "not_found" };
			}

			if (app.status !== "pending") {
				return { success: false, reason: "not_pending" };
			}

			await applicationRepository.submit(applicationId);

			return { success: true, applicationId };
		},
	};
}
