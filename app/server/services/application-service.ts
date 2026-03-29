import pino from "pino";
import { z } from "zod";
import type { Logger } from "~/server/logger";

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

export const updateOccupantsSchema = z.object({
	smokes: z.boolean(),
	additionalAdults: z.array(additionalAdultSchema).default([]),
	children: z.array(childSchema).default([]),
	pets: z.array(petSchema).default([]),
});

export type UpdateOccupantsData = z.input<typeof updateOccupantsSchema>;

export type CreateApplicationData = z.input<typeof createApplicationSchema>;

// ── Repository interface ───────────────────────────────────────────────────────

export type CreateApplicationPayload = z.output<typeof createApplicationSchema>;

export type UpdateOccupantsPayload = z.output<typeof updateOccupantsSchema>;

export interface ApplicationRepository {
	create(input: CreateApplicationPayload): Promise<{ id: number }>;
	findById(id: number): Promise<{ id: number; status: string } | null>;
	submit(id: number): Promise<{ id: number } | null>;
	updateOccupants(id: number, input: UpdateOccupantsPayload): Promise<void>;
}

// ── Service ────────────────────────────────────────────────────────────────────

export type CreateApplicationResult =
	| { success: true; applicationId: number }
	| { success: false; errors: z.ZodIssue[] };

export type UpdateOccupantsResult =
	| { success: true }
	| { success: false; errors: z.ZodIssue[] };

export type SubmitApplicationResult =
	| { success: true; applicationId: number }
	| { success: false; reason: "not_found" | "not_pending" };

const noopLogger = pino({ level: "silent" });

export function createApplicationService({
	applicationRepository,
	logger = noopLogger,
}: {
	applicationRepository: ApplicationRepository;
	logger?: Logger;
}) {
	return {
		async createApplication(
			data: CreateApplicationData,
		): Promise<CreateApplicationResult> {
			const parsed = createApplicationSchema.safeParse(data);

			if (!parsed.success) {
				logger.warn({ errors: parsed.error.issues }, "Application validation failed");
				return { success: false, errors: parsed.error.issues };
			}

			const { additionalAdults, children, pets } = parsed.data;
			logger.info(
				{
					desiredMoveInDate: parsed.data.desiredMoveInDate,
					additionalAdultCount: additionalAdults.length,
					childCount: children.length,
					petCount: pets.length,
				},
				"Creating application",
			);

			const application = await applicationRepository.create(parsed.data);

			logger.info({ applicationId: application.id }, "Application created");
			return { success: true, applicationId: application.id };
		},

		async updateOccupants(
			applicationId: number,
			data: UpdateOccupantsData,
		): Promise<UpdateOccupantsResult> {
			const parsed = updateOccupantsSchema.safeParse(data);

			if (!parsed.success) {
				logger.warn({ errors: parsed.error.issues }, "Occupants update validation failed");
				return { success: false, errors: parsed.error.issues };
			}

			const { additionalAdults, children, pets, smokes } = parsed.data;
			logger.info(
				{
					applicationId,
					additionalAdultCount: additionalAdults.length,
					childCount: children.length,
					petCount: pets.length,
					smokes,
				},
				"Updating occupants",
			);

			await applicationRepository.updateOccupants(applicationId, parsed.data);

			logger.info({ applicationId }, "Occupants updated");
			return { success: true };
		},

		async submitApplication(
			applicationId: number,
		): Promise<SubmitApplicationResult> {
			const app = await applicationRepository.findById(applicationId);

			if (!app) {
				logger.warn({ applicationId }, "Cannot submit application: not found");
				return { success: false, reason: "not_found" };
			}

			if (app.status !== "pending") {
				logger.warn(
					{ applicationId, status: app.status },
					"Cannot submit application: not pending",
				);
				return { success: false, reason: "not_pending" };
			}

			await applicationRepository.submit(applicationId);

			logger.info({ applicationId }, "Application submitted");
			return { success: true, applicationId };
		},
	};
}
