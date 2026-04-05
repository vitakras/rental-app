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
	existingId: z.number().int().positive().optional(),
	fullName: z.string().min(1, { error: "Full name is required" }),
	dateOfBirth: dateString,
	role: z.enum(["co-applicant", "dependent"]),
	email: z.email({ error: "Invalid email address" }).optional(),
});

const childSchema = z.object({
	existingId: z.number().int().positive().optional(),
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

export const upsertApplicantInfoSchema = z.object({
	desiredMoveInDate: dateString,
	fullName: z.string().min(1, { error: "Full name is required" }),
	dateOfBirth: dateString,
	email: z.email({ error: "Invalid email address" }),
	phone: z.string().min(1, { error: "Phone number is required" }),
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

const residenceEntrySchema = z.object({
	address: z.string().min(1),
	fromDate: dateString,
	toDate: dateString.optional(),
	reasonForLeaving: z.string().optional(),
	isRental: z.boolean(),
	landlordName: z.string().optional(),
	landlordPhone: z.string().optional(),
	notes: z.string().optional(),
});

export const addIncomeSourcesSchema = z.array(
	z.object({
		residentId: z.int().positive(),
		incomeSources: z.array(incomeSourceSchema).default([]),
	}),
);

export const upsertResidenceSchema = z.object({
	residents: z
		.array(
			z.object({
				residentId: z.int().positive(),
				residences: z.array(residenceEntrySchema).default([]),
			}),
		)
		.default([]),
});

export type UpdateOccupantsData = z.input<typeof updateOccupantsSchema>;
export type CreateApplicationData = z.input<typeof createApplicationSchema>;
export type AddIncomeSourcesData = z.input<typeof addIncomeSourcesSchema>;
export type UpsertResidenceData = z.input<typeof upsertResidenceSchema>;
export type UpsertApplicantInfoData = z.input<typeof upsertApplicantInfoSchema>;

// ── Repository interface ───────────────────────────────────────────────────────

export type CreateApplicationPayload = z.output<typeof createApplicationSchema>;
export type UpsertApplicantInfoPayload = z.output<
	typeof upsertApplicantInfoSchema
>;

export type UpdateOccupantsPayload = z.output<typeof updateOccupantsSchema>;
export type AddIncomeSourcesPayload = z.output<typeof addIncomeSourcesSchema>;
export type UpsertResidencePayload = z.output<typeof upsertResidenceSchema>;

export type SubmittedApplicationSummary = {
	id: number;
	status: string;
	desiredMoveInDate: string | null;
	createdAt: string;
	primaryApplicantName: string | null;
	landlordNote: string | null;
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

export type ResidenceDetail = {
	id: number;
	applicationId: number;
	residentId: number;
	address: string;
	fromDate: string;
	toDate: string | null;
	reasonForLeaving: string | null;
	isRental: boolean;
	landlordName: string | null;
	landlordPhone: string | null;
	notes: string | null;
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
	residences: ResidenceDetail[];
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

export type ApplicationDocumentDetail = {
	id: number;
	applicationId: number;
	residentId: number | null;
	fileId: string;
	category: string;
	documentType: string;
	status: string;
	notes: string | null;
	originalFilename: string;
	createdAt: string;
	updatedAt: string;
};

export type ApplicationWithDetails = {
	id: number;
	status: string;
	desiredMoveInDate: string | null;
	smokes: boolean;
	notes: string | null;
	landlordNote: string | null;
	createdAt: string;
	updatedAt: string;
	residents: ResidentDetail[];
	pets: PetDetail[];
	documents: ApplicationDocumentDetail[];
};

export type ApplicantApplicationSummary = {
	id: number;
	status: string;
	desiredMoveInDate: string | null;
	createdAt: string;
	primaryApplicantName: string | null;
};

export interface ApplicationRepository {
	create(input: { createdByUserId?: string }): Promise<{ id: number }>;
	upsertPrimaryApplicant(
		applicationId: number,
		input: UpsertApplicantInfoPayload,
	): Promise<void>;
	findById(id: number): Promise<{
		id: number;
		status: string;
		createdByUserId: string | null;
	} | null>;
	submit(id: number): Promise<{ id: number } | null>;
	decide(
		id: number,
		status: "approved" | "rejected" | "info_requested",
		landlordNote?: string,
	): Promise<{ id: number } | null>;
	updateOccupants(id: number, input: UpdateOccupantsPayload): Promise<void>;
	upsertResidences(
		applicationId: number,
		input: UpsertResidencePayload,
	): Promise<void>;
	deleteResident(applicationId: number, residentId: number): Promise<void>;
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
	deleteByResidentIds(residentIds: number[]): Promise<void>;
}

// ── Service ────────────────────────────────────────────────────────────────────

export type CreateApplicationResult =
	| { success: true; applicationId: number }
	| { success: false; errors: z.ZodIssue[] };

export type UpdateOccupantsResult =
	| { success: true }
	| { success: false; reason: "not_found" | "not_editable" }
	| { success: false; errors: z.ZodIssue[] };

export type SubmitApplicationResult =
	| { success: true; applicationId: number }
	| { success: false; reason: "not_found" | "not_pending" };

export type AddIncomeSourcesResult =
	| { success: true }
	| { success: false; reason: "not_found" | "not_editable" }
	| { success: false; errors: z.ZodIssue[] };

export type UpsertApplicantInfoResult =
	| { success: true }
	| { success: false; reason: "not_found" | "not_editable" }
	| { success: false; errors: z.ZodIssue[] };

export type UpsertResidenceResult =
	| { success: true }
	| { success: false; reason: "not_found" | "not_editable" }
	| { success: false; errors: z.ZodIssue[] };

export type DeleteResidentResult =
	| { success: true }
	| { success: false; reason: "not_found" | "not_editable" };

export type ListSubmittedApplicationsResult = {
	success: true;
	applications: SubmittedApplicationSummary[];
};

export type DecideApplicationResult =
	| { success: true; status: "approved" | "rejected" | "info_requested" }
	| { success: false; reason: "not_found" | "already_decided" };

export type ListApplicationsByUserResult = {
	success: true;
	applications: ApplicantApplicationSummary[];
};

export type GetApplicationWithDetailsResult =
	| { success: true; application: ApplicationWithDetails }
	| { success: false; reason: "not_found" };

const noopLogger = pino({ level: "silent" });

function isApplicationEditable(status: string) {
	return status === "draft" || status === "pending" || status === "info_requested";
}

export function createApplicationService({
	applicationRepository,
	incomeSourceRepository,
	logger = noopLogger,
}: {
	applicationRepository: ApplicationRepository;
	incomeSourceRepository?: IncomeSourceRepository;
	logger?: Logger;
}) {
	function isOwnedByUser(
		application: { createdByUserId: string | null },
		userId?: string,
	) {
		return userId === undefined || application.createdByUserId === userId;
	}

	return {
		async createApplication(options?: {
			userId?: string;
		}): Promise<CreateApplicationResult> {
			logger.info("Creating draft application");

			const application = await applicationRepository.create({
				...(options?.userId !== undefined
					? { createdByUserId: options.userId }
					: {}),
			});

			logger.info(
				{ applicationId: application.id },
				"Draft application created",
			);
			return { success: true, applicationId: application.id };
		},

		async upsertApplicantInfo(
			applicationId: number,
			data: UpsertApplicantInfoData,
			userId?: string,
		): Promise<UpsertApplicantInfoResult> {
			const app = await applicationRepository.findById(applicationId);

			if (!app || !isOwnedByUser(app, userId)) {
				logger.warn(
					{ applicationId, userId },
					"Cannot update applicant: application not found",
				);
				return { success: false, reason: "not_found" };
			}

			if (!isApplicationEditable(app.status)) {
				logger.warn(
					{ applicationId, status: app.status },
					"Cannot update applicant: application is not editable",
				);
				return { success: false, reason: "not_editable" };
			}

			const parsed = upsertApplicantInfoSchema.safeParse(data);

			if (!parsed.success) {
				logger.warn(
					{ applicationId, errors: parsed.error.issues },
					"Applicant info validation failed",
				);
				return { success: false, errors: parsed.error.issues };
			}

			await applicationRepository.upsertPrimaryApplicant(
				applicationId,
				parsed.data,
			);

			logger.info({ applicationId }, "Applicant info updated");
			return { success: true };
		},

		async updateOccupants(
			applicationId: number,
			data: UpdateOccupantsData,
			userId?: string,
		): Promise<UpdateOccupantsResult> {
			const parsed = updateOccupantsSchema.safeParse(data);

			if (!parsed.success) {
				logger.warn(
					{ errors: parsed.error.issues },
					"Occupants update validation failed",
				);
				return { success: false, errors: parsed.error.issues };
			}

			const app = await applicationRepository.findById(applicationId);

			if (!app || !isOwnedByUser(app, userId)) {
				logger.warn(
					{ applicationId, userId },
					"Cannot update occupants: application not found",
				);
				return { success: false, reason: "not_found" };
			}

			if (!isApplicationEditable(app.status)) {
				logger.warn(
					{ applicationId, status: app.status },
					"Cannot update occupants: application is not editable",
				);
				return { success: false, reason: "not_editable" };
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

		async deleteResident(
			applicationId: number,
			residentId: number,
			userId?: string,
		): Promise<DeleteResidentResult> {
			const app = await applicationRepository.findById(applicationId);

			if (!app || !isOwnedByUser(app, userId)) {
				logger.warn(
					{ applicationId, residentId, userId },
					"Cannot delete resident: application not found",
				);
				return { success: false, reason: "not_found" };
			}

			if (!isApplicationEditable(app.status)) {
				logger.warn(
					{ applicationId, residentId, status: app.status },
					"Cannot delete resident: application is not editable",
				);
				return { success: false, reason: "not_editable" };
			}

			logger.info({ applicationId, residentId }, "Deleting resident");
			await applicationRepository.deleteResident(applicationId, residentId);
			logger.info({ applicationId, residentId }, "Resident deleted");
			return { success: true };
		},

		async addIncomeSources(
			applicationId: number,
			data: AddIncomeSourcesData,
			userId?: string,
		): Promise<AddIncomeSourcesResult> {
			const app = await applicationRepository.findById(applicationId);

			if (!app || !isOwnedByUser(app, userId)) {
				logger.warn(
					{ applicationId, userId },
					"Cannot add income sources: application not found",
				);
				return { success: false, reason: "not_found" };
			}

			if (!isApplicationEditable(app.status)) {
				logger.warn(
					{ applicationId, status: app.status },
					"Cannot add income sources: application is not editable",
				);
				return { success: false, reason: "not_editable" };
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

			const residentIds = parsed.data.map((r) => r.residentId);
			await incomeSourceRepository.deleteByResidentIds(residentIds);

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

		async upsertResidence(
			applicationId: number,
			input: UpsertResidenceData,
			userId?: string,
		): Promise<UpsertResidenceResult> {
			const parsed = upsertResidenceSchema.safeParse(input);

			if (!parsed.success) {
				logger.warn(
					{ applicationId, errors: parsed.error.issues },
					"Residence validation failed",
				);
				return { success: false, errors: parsed.error.issues };
			}

			const existing = await applicationRepository.findById(applicationId);

			if (!existing || !isOwnedByUser(existing, userId)) {
				logger.warn(
					{ applicationId, userId },
					"Cannot update residence: application not found",
				);
				return { success: false, reason: "not_found" };
			}

			if (!isApplicationEditable(existing.status)) {
				logger.warn(
					{ applicationId, status: existing.status },
					"Cannot update residence: application is not editable",
				);
				return { success: false, reason: "not_editable" };
			}

			await applicationRepository.upsertResidences(applicationId, parsed.data);
			logger.info({ applicationId }, "Residence details updated");
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
			userId?: string,
		): Promise<GetApplicationWithDetailsResult> {
			logger.info({ applicationId }, "Fetching application with details");
			const existing = await applicationRepository.findById(applicationId);

			if (!existing || !isOwnedByUser(existing, userId)) {
				logger.warn({ applicationId, userId }, "Application not found");
				return { success: false, reason: "not_found" };
			}

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
			userId?: string,
		): Promise<SubmitApplicationResult> {
			const app = await applicationRepository.findById(applicationId);

			if (!app || !isOwnedByUser(app, userId)) {
				logger.warn(
					{ applicationId, userId },
					"Cannot submit application: not found",
				);
				return { success: false, reason: "not_found" };
			}

			if (
				app.status !== "pending" &&
				app.status !== "draft" &&
				app.status !== "info_requested"
			) {
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

		async decideApplication(
			applicationId: number,
			action: "approve" | "reject" | "request_info",
			note?: string,
		): Promise<DecideApplicationResult> {
			const app = await applicationRepository.findById(applicationId);

			if (!app) {
				logger.warn({ applicationId }, "Cannot decide: application not found");
				return { success: false, reason: "not_found" };
			}

			if (app.status === "approved" || app.status === "rejected") {
				logger.warn(
					{ applicationId, status: app.status },
					"Cannot decide: decision already made",
				);
				return { success: false, reason: "already_decided" };
			}

			const newStatus =
				action === "approve"
					? "approved"
					: action === "reject"
						? "rejected"
						: "info_requested";

			await applicationRepository.decide(applicationId, newStatus, note);

			logger.info(
				{ applicationId, newStatus },
				"Application decision recorded",
			);
			return { success: true, status: newStatus };
		},
	};
}
