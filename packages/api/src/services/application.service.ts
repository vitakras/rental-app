import pino from "pino";
import { z } from "zod";
import type { IncomeSourceType } from "~/db/schema";
import type { Logger } from "~/logger";

// ── Zod schema ─────────────────────────────────────────────────────────────────

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
	error: "Must be a date in YYYY-MM-DD format",
});

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

const incomeSourceSchema = z.object({
	type: z.enum(["employment", "self_employment", "other"] satisfies [
		IncomeSourceType,
		...IncomeSourceType[],
	]),
	employerOrSourceName: z.string().min(1),
	titleOrOccupation: z.string().optional(),
	monthlyAmountCents: z.int().nonnegative(),
	startDate: dateString,
	endDate: dateString.optional(),
	notes: z.string().optional(),
});

export const addIncomeSourcesSchema = z.array(
	z.object({
		residentId: z.int().positive(),
		incomeSources: z.array(incomeSourceSchema).default([]),
	}),
);

export type UpdateOccupantsData = z.input<typeof updateOccupantsSchema>;
export type CreateApplicationData = z.input<typeof createApplicationSchema>;
export type AddIncomeSourcesData = z.input<typeof addIncomeSourcesSchema>;

// ── Repository interface ───────────────────────────────────────────────────────

export type CreateApplicationPayload = z.output<typeof createApplicationSchema>;

export type UpdateOccupantsPayload = z.output<typeof updateOccupantsSchema>;
export type AddIncomeSourcesPayload = z.output<typeof addIncomeSourcesSchema>;

export type SubmittedApplicationSummary = {
	id: number;
	status: string;
	desiredMoveInDate: string;
	createdAt: string;
	primaryApplicantName: string;
};

export type IncomeSourceDetail = {
	id: number;
	residentId: number;
	type: string;
	employerOrSourceName: string;
	titleOrOccupation: string | null;
	monthlyAmountCents: number;
	startDate: string;
	endDate: string | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ResidentDetail = {
	id: number;
	applicationId: number;
	role: string;
	fullName: string;
	dateOfBirth: string;
	email: string | null;
	phone: string | null;
	createdAt: string;
	updatedAt: string;
	incomeSources: IncomeSourceDetail[];
};

export type PetDetail = {
	id: number;
	applicationId: number;
	type: string;
	name: string | null;
	breed: string | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ApplicationWithDetails = {
	id: number;
	status: string;
	desiredMoveInDate: string;
	smokes: boolean;
	createdAt: string;
	updatedAt: string;
	residents: ResidentDetail[];
	pets: PetDetail[];
};

export type ApplicantApplicationSummary = {
	id: number;
	status: string;
	desiredMoveInDate: string;
	createdAt: string;
	primaryApplicantName: string;
};

export interface ApplicationRepository {
	create(
		input: CreateApplicationPayload & { createdByUserId?: string },
	): Promise<{ id: number }>;
	findById(id: number): Promise<{ id: number; status: string } | null>;
	submit(id: number): Promise<{ id: number } | null>;
	updateOccupants(id: number, input: UpdateOccupantsPayload): Promise<void>;
	findAllSubmitted(): Promise<SubmittedApplicationSummary[]>;
	findByIdWithDetails(id: number): Promise<ApplicationWithDetails | null>;
	findAllByUserId(userId: string): Promise<ApplicantApplicationSummary[]>;
}

export interface IncomeSourceRepository {
	createMany(
		inputs: Array<
			{
				residentId: number;
			} & AddIncomeSourcesPayload[number]["incomeSources"][number]
		>,
	): Promise<void>;
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

export type AddIncomeSourcesResult =
	| { success: true }
	| { success: false; reason: "not_found" }
	| { success: false; errors: z.ZodIssue[] };

export type ListSubmittedApplicationsResult = {
	success: true;
	applications: SubmittedApplicationSummary[];
};

export type ListApplicationsByUserResult = {
	success: true;
	applications: ApplicantApplicationSummary[];
};

export type GetApplicationWithDetailsResult =
	| { success: true; application: ApplicationWithDetails }
	| { success: false; reason: "not_found" };

const noopLogger = pino({ level: "silent" });

export function createApplicationService({
	applicationRepository,
	incomeSourceRepository,
	logger = noopLogger,
}: {
	applicationRepository: ApplicationRepository;
	incomeSourceRepository?: IncomeSourceRepository;
	logger?: Logger;
}) {
	return {
		async createApplication(
			data: CreateApplicationData,
			options?: { userId?: string },
		): Promise<CreateApplicationResult> {
			const parsed = createApplicationSchema.safeParse(data);

			if (!parsed.success) {
				logger.warn(
					{ errors: parsed.error.issues },
					"Application validation failed",
				);
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

			const application = await applicationRepository.create({
				...parsed.data,
				...(options?.userId !== undefined
					? { createdByUserId: options.userId }
					: {}),
			});

			logger.info({ applicationId: application.id }, "Application created");
			return { success: true, applicationId: application.id };
		},

		async updateOccupants(
			applicationId: number,
			data: UpdateOccupantsData,
		): Promise<UpdateOccupantsResult> {
			const parsed = updateOccupantsSchema.safeParse(data);

			if (!parsed.success) {
				logger.warn(
					{ errors: parsed.error.issues },
					"Occupants update validation failed",
				);
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

		async addIncomeSources(
			applicationId: number,
			data: AddIncomeSourcesData,
		): Promise<AddIncomeSourcesResult> {
			const app = await applicationRepository.findById(applicationId);

			if (!app) {
				logger.warn(
					{ applicationId },
					"Cannot add income sources: application not found",
				);
				return { success: false, reason: "not_found" };
			}

			const parsed = addIncomeSourcesSchema.safeParse(data);

			if (!parsed.success) {
				logger.warn(
					{ applicationId, errors: parsed.error.issues },
					"Income sources validation failed",
				);
				return { success: false, errors: parsed.error.issues };
			}

			if (!incomeSourceRepository) {
				throw new Error("incomeSourceRepository is required");
			}

			const allSources = parsed.data.flatMap(({ residentId, incomeSources }) =>
				incomeSources.map((source) => ({ residentId, ...source })),
			);

			if (allSources.length === 0) {
				logger.info({ applicationId }, "No income sources to add");
				return { success: true };
			}

			logger.info(
				{ applicationId, incomeSourceCount: allSources.length },
				"Adding income sources",
			);

			await incomeSourceRepository.createMany(allSources);

			logger.info({ applicationId }, "Income sources added");
			return { success: true };
		},

		async listApplicationsByUser(
			userId: string,
		): Promise<ListApplicationsByUserResult> {
			const applications = await applicationRepository.findAllByUserId(userId);
			return { success: true, applications };
		},

		async listSubmittedApplications(): Promise<ListSubmittedApplicationsResult> {
			logger.info("Listing submitted applications");
			const applications = await applicationRepository.findAllSubmitted();
			logger.info(
				{ count: applications.length },
				"Submitted applications fetched",
			);
			return { success: true, applications };
		},

		async getApplicationWithDetails(
			applicationId: number,
		): Promise<GetApplicationWithDetailsResult> {
			logger.info({ applicationId }, "Fetching application with details");
			const application =
				await applicationRepository.findByIdWithDetails(applicationId);

			if (!application) {
				logger.warn({ applicationId }, "Application not found");
				return { success: false, reason: "not_found" };
			}

			logger.info({ applicationId }, "Application fetched");
			return { success: true, application };
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
