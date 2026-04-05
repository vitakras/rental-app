import { describe, expect, it, vi } from "vitest";
import type {
	ApplicationRepository,
	IncomeSourceRepository,
} from "../application.service";
import { createApplicationService } from "../application.service";

const baseInput = {
	desiredMoveInDate: "2026-06-01",
	owner: {
		fullName: "Alex Johnson",
		dateOfBirth: "1990-05-15",
		email: "alex@example.com",
		phone: "555-000-0001",
	},
	additionalAdults: [],
	children: [],
};

function makeRepo(
	overrides?: Partial<ApplicationRepository>,
): ApplicationRepository {
	return {
		create: vi.fn(async () => ({ id: 1 })),
		upsertPrimaryApplicant: vi.fn(async () => {}),
		findById: vi.fn(async () => ({
			id: 1,
			status: "pending",
			createdByUserId: "user-1",
		})),
		submit: vi.fn(async () => ({ id: 1 })),
		updateOccupants: vi.fn(async () => {}),
		upsertResidences: vi.fn(async () => {}),
		deleteResident: vi.fn(async () => {}),
		findAllSubmitted: vi.fn(async () => []),
		findByIdWithDetails: vi.fn(async () => null),
		findAllByUserId: vi.fn(async () => []),
		...overrides,
	};
}

function makeIncomeSourceRepo(
	overrides?: Partial<IncomeSourceRepository>,
): IncomeSourceRepository {
	return {
		createMany: vi.fn(async () => {}),
		deleteByResidentIds: vi.fn(async () => {}),
		...overrides,
	};
}

const applicantInfoInput = {
	desiredMoveInDate: baseInput.desiredMoveInDate,
	fullName: baseInput.owner.fullName,
	dateOfBirth: baseInput.owner.dateOfBirth,
	email: baseInput.owner.email,
	phone: baseInput.owner.phone,
};

describe("createApplicationService", () => {
	describe("success path", () => {
		it("calls repo.create with an empty payload and returns applicationId", async () => {
			const repo = makeRepo();
			const result = await createApplicationService({
				applicationRepository: repo,
			}).createApplication();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.applicationId).toBe(1);
			}
			expect(repo.create).toHaveBeenCalledTimes(1);
			expect(repo.create).toHaveBeenCalledWith({});
		});

		it("passes createdByUserId when a user id is provided", async () => {
			const repo = makeRepo();
			const result = await createApplicationService({
				applicationRepository: repo,
			}).createApplication({ userId: "user-123" });

			expect(result.success).toBe(true);
			expect(repo.create).toHaveBeenCalledWith({
				createdByUserId: "user-123",
			});
		});
	});

	describe("repository errors", () => {
		it("propagates errors thrown by repo.create", async () => {
			const repo = makeRepo({
				create: vi.fn(async () => {
					throw new Error("DB error");
				}),
			});

			await expect(
				createApplicationService({
					applicationRepository: repo,
				}).createApplication(),
			).rejects.toThrow("DB error");
		});
	});
});

describe("upsertApplicantInfo", () => {
	it("returns not_found when the application does not exist", async () => {
		const repo = makeRepo({
			findById: vi.fn(async () => null),
		});

		const result = await createApplicationService({
			applicationRepository: repo,
		}).upsertApplicantInfo(12, applicantInfoInput);

		expect(result.success).toBe(false);
		if (!result.success && "reason" in result) {
			expect(result.reason).toBe("not_found");
		}
		expect(repo.upsertPrimaryApplicant).not.toHaveBeenCalled();
	});

	it("returns validation errors for an invalid desiredMoveInDate", async () => {
		const repo = makeRepo();
		const result = await createApplicationService({
			applicationRepository: repo,
		}).upsertApplicantInfo(1, {
			...applicantInfoInput,
			desiredMoveInDate: "06/01/2026",
		});

		expect(result.success).toBe(false);
		if (!result.success && "errors" in result) {
			expect(
				result.errors.some((e) => e.path.includes("desiredMoveInDate")),
			).toBe(true);
		}
		expect(repo.upsertPrimaryApplicant).not.toHaveBeenCalled();
	});

	it("returns validation errors for an invalid applicant email", async () => {
		const repo = makeRepo();
		const result = await createApplicationService({
			applicationRepository: repo,
		}).upsertApplicantInfo(1, {
			...applicantInfoInput,
			email: "not-an-email",
		});

		expect(result.success).toBe(false);
		if (!result.success && "errors" in result) {
			expect(result.errors.some((e) => e.path.includes("email"))).toBe(true);
		}
		expect(repo.upsertPrimaryApplicant).not.toHaveBeenCalled();
	});

	it("returns validation errors for an empty full name", async () => {
		const repo = makeRepo();
		const result = await createApplicationService({
			applicationRepository: repo,
		}).upsertApplicantInfo(1, {
			...applicantInfoInput,
			fullName: "",
		});

		expect(result.success).toBe(false);
		if (!result.success && "errors" in result) {
			expect(result.errors.some((e) => e.path.includes("fullName"))).toBe(true);
		}
		expect(repo.upsertPrimaryApplicant).not.toHaveBeenCalled();
	});

	it("calls repo.upsertPrimaryApplicant with validated data", async () => {
		const repo = makeRepo();
		const payload = applicantInfoInput;

		const result = await createApplicationService({
			applicationRepository: repo,
		}).upsertApplicantInfo(1, payload);

		expect(result.success).toBe(true);
		expect(repo.upsertPrimaryApplicant).toHaveBeenCalledWith(1, payload);
	});

	it("returns not_editable when the application has already been submitted", async () => {
		const repo = makeRepo({
			findById: vi.fn(async () => ({
				id: 1,
				status: "submitted",
				createdByUserId: "user-1",
			})),
		});

		const result = await createApplicationService({
			applicationRepository: repo,
		}).upsertApplicantInfo(1, applicantInfoInput);

		expect(result).toEqual({ success: false, reason: "not_editable" });
		expect(repo.upsertPrimaryApplicant).not.toHaveBeenCalled();
	});

	it("returns not_found when the application belongs to another user", async () => {
		const repo = makeRepo({
			findById: vi.fn(async () => ({
				id: 1,
				status: "pending",
				createdByUserId: "user-2",
			})),
		});

		const result = await createApplicationService({
			applicationRepository: repo,
		}).upsertApplicantInfo(1, applicantInfoInput, "user-1");

		expect(result).toEqual({ success: false, reason: "not_found" });
		expect(repo.upsertPrimaryApplicant).not.toHaveBeenCalled();
	});
});

describe("submitApplication", () => {
	it("returns success with applicationId when repo submits successfully", async () => {
		const repo = makeRepo();
		const result = await createApplicationService({
			applicationRepository: repo,
		}).submitApplication(1);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.applicationId).toBe(1);
		}
		expect(repo.submit).toHaveBeenCalledTimes(1);
		expect(repo.submit).toHaveBeenCalledWith(1);
	});

	it("returns not_found when the application does not exist", async () => {
		const repo = makeRepo({
			findById: vi.fn(async () => null),
		});
		const result = await createApplicationService({
			applicationRepository: repo,
		}).submitApplication(99);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.reason).toBe("not_found");
		}
		expect(repo.submit).not.toHaveBeenCalled();
	});

	it("returns not_pending when the application is not in pending state", async () => {
		const repo = makeRepo({
			findById: vi.fn(async () => ({
				id: 1,
				status: "submitted",
				createdByUserId: "user-1",
			})),
		});
		const result = await createApplicationService({
			applicationRepository: repo,
		}).submitApplication(1);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.reason).toBe("not_pending");
		}
		expect(repo.submit).not.toHaveBeenCalled();
	});

	it("returns not_found when submitting another user's application", async () => {
		const repo = makeRepo({
			findById: vi.fn(async () => ({
				id: 1,
				status: "pending",
				createdByUserId: "user-2",
			})),
		});
		const result = await createApplicationService({
			applicationRepository: repo,
		}).submitApplication(1, "user-1");

		expect(result).toEqual({ success: false, reason: "not_found" });
		expect(repo.submit).not.toHaveBeenCalled();
	});

	it("propagates errors thrown by repo.submit", async () => {
		const repo = makeRepo({
			submit: vi.fn(async () => {
				throw new Error("DB error");
			}),
		});

		await expect(
			createApplicationService({
				applicationRepository: repo,
			}).submitApplication(1),
		).rejects.toThrow("DB error");
	});
});

describe("getApplicationWithDetails", () => {
	it("returns not_found when the application belongs to another user", async () => {
		const repo = makeRepo({
			findById: vi.fn(async () => ({
				id: 12,
				status: "pending",
				createdByUserId: "user-2",
			})),
		});

		const result = await createApplicationService({
			applicationRepository: repo,
		}).getApplicationWithDetails(12, "user-1");

		expect(result).toEqual({ success: false, reason: "not_found" });
		expect(repo.findByIdWithDetails).not.toHaveBeenCalled();
	});
});

describe("updateOccupants", () => {
	const baseOccupants = {
		smokes: false,
		additionalAdults: [],
		children: [],
		pets: [],
	};

	it("calls repo.updateOccupants with validated data", async () => {
		const repo = makeRepo();
		const occupants = {
			...baseOccupants,
			additionalAdults: [
				{
					existingId: 7,
					fullName: "Jane Smith",
					dateOfBirth: "1992-03-20",
					role: "co-applicant" as const,
					email: "jane@example.com",
				},
			],
			children: [
				{
					existingId: 11,
					fullName: "Sam Smith",
					dateOfBirth: "2019-06-15",
				},
			],
		};
		const result = await createApplicationService({
			applicationRepository: repo,
		}).updateOccupants(1, occupants);

		expect(result.success).toBe(true);
		expect(repo.updateOccupants).toHaveBeenCalledWith(1, occupants);
	});

	it("returns success false for invalid adult role", async () => {
		const repo = makeRepo();
		const result = await createApplicationService({
			applicationRepository: repo,
		}).updateOccupants(1, {
			...baseOccupants,
			additionalAdults: [
				{
					fullName: "Jane",
					dateOfBirth: "1990-01-01",
					role: "owner" as "co-applicant",
				},
			],
		});

		expect(result.success).toBe(false);
		if (!result.success && "errors" in result) {
			expect(result.errors.some((e) => e.path.includes("role"))).toBe(true);
		}
	});

	it("returns success false when smokes is missing", async () => {
		const repo = makeRepo();
		const result = await createApplicationService({
			applicationRepository: repo,
		}).updateOccupants(1, {
			...baseOccupants,
			smokes: undefined as unknown as boolean,
		});

		expect(result.success).toBe(false);
		if (!result.success && "errors" in result) {
			expect(result.errors.some((e) => e.path.includes("smokes"))).toBe(true);
		}
	});

	it("does not call repo.updateOccupants on validation failure", async () => {
		const repo = makeRepo();
		await createApplicationService({
			applicationRepository: repo,
		}).updateOccupants(1, {
			...baseOccupants,
			smokes: "yes" as unknown as boolean,
		});

		expect(repo.updateOccupants).not.toHaveBeenCalled();
	});

	it("propagates errors thrown by repo.updateOccupants", async () => {
		const repo = makeRepo({
			updateOccupants: vi.fn(async () => {
				throw new Error("DB error");
			}),
		});

		await expect(
			createApplicationService({ applicationRepository: repo }).updateOccupants(
				1,
				baseOccupants,
			),
		).rejects.toThrow("DB error");
	});

	it("returns not_editable when the application has already been submitted", async () => {
		const repo = makeRepo({
			findById: vi.fn(async () => ({
				id: 1,
				status: "submitted",
				createdByUserId: "user-1",
			})),
		});

		const result = await createApplicationService({
			applicationRepository: repo,
		}).updateOccupants(1, baseOccupants);

		expect(result).toEqual({ success: false, reason: "not_editable" });
		expect(repo.updateOccupants).not.toHaveBeenCalled();
	});
});

describe("deleteResident", () => {
	it("calls repo.deleteResident and returns success", async () => {
		const repo = makeRepo();
		const result = await createApplicationService({
			applicationRepository: repo,
		}).deleteResident(12, 44);

		expect(result).toEqual({ success: true });
		expect(repo.deleteResident).toHaveBeenCalledWith(12, 44);
	});

	it("returns not_editable when the application has already been submitted", async () => {
		const repo = makeRepo({
			findById: vi.fn(async () => ({
				id: 12,
				status: "submitted",
				createdByUserId: "user-1",
			})),
		});

		const result = await createApplicationService({
			applicationRepository: repo,
		}).deleteResident(12, 44);

		expect(result).toEqual({ success: false, reason: "not_editable" });
		expect(repo.deleteResident).not.toHaveBeenCalled();
	});

	it("propagates errors thrown by repo.deleteResident", async () => {
		const repo = makeRepo({
			deleteResident: vi.fn(async () => {
				throw new Error("DB error");
			}),
		});

		await expect(
			createApplicationService({
				applicationRepository: repo,
			}).deleteResident(12, 44),
		).rejects.toThrow("DB error");
	});
});

describe("addIncomeSources", () => {
	const baseIncome = [
		{
			residentId: 2,
			incomeSources: [
				{
					type: "employment" as const,
					employerOrSourceName: "Acme Corp",
					titleOrOccupation: "Engineer",
					monthlyAmountCents: 500000,
					startDate: "2024-01-01",
				},
			],
		},
	];

	it("persists flattened income sources for an existing application", async () => {
		const repo = makeRepo();
		const incomeSourceRepository = makeIncomeSourceRepo();

		const result = await createApplicationService({
			applicationRepository: repo,
			incomeSourceRepository,
		}).addIncomeSources(1, baseIncome);

		expect(result.success).toBe(true);
		expect(repo.findById).toHaveBeenCalledWith(1);
		expect(incomeSourceRepository.createMany).toHaveBeenCalledWith([
			{
				residentId: 2,
				type: "employment",
				employerOrSourceName: "Acme Corp",
				titleOrOccupation: "Engineer",
				monthlyAmountCents: 500000,
				startDate: "2024-01-01",
			},
		]);
	});

	it("returns success without writing when the payload is empty", async () => {
		const incomeSourceRepository = makeIncomeSourceRepo();

		const result = await createApplicationService({
			applicationRepository: makeRepo(),
			incomeSourceRepository,
		}).addIncomeSources(1, []);

		expect(result.success).toBe(true);
		expect(incomeSourceRepository.createMany).not.toHaveBeenCalled();
	});

	it("returns validation errors for malformed income payloads", async () => {
		const incomeSourceRepository = makeIncomeSourceRepo();

		const result = await createApplicationService({
			applicationRepository: makeRepo(),
			incomeSourceRepository,
		}).addIncomeSources(1, [
			{
				residentId: 2,
				incomeSources: [
					{
						type: "employment",
						employerOrSourceName: "",
						monthlyAmountCents: -1,
						startDate: "01-01-2024",
					},
				],
			},
		]);

		expect(result.success).toBe(false);
		if (!result.success && "errors" in result) {
			expect(result.errors.length).toBeGreaterThan(0);
		}
		expect(incomeSourceRepository.createMany).not.toHaveBeenCalled();
	});

	it("returns not_found for a missing application", async () => {
		const result = await createApplicationService({
			applicationRepository: makeRepo({
				findById: vi.fn(async () => null),
			}),
			incomeSourceRepository: makeIncomeSourceRepo(),
		}).addIncomeSources(999, baseIncome);

		expect(result).toEqual({ success: false, reason: "not_found" });
	});

	it("returns not_editable when the application has already been submitted", async () => {
		const result = await createApplicationService({
			applicationRepository: makeRepo({
				findById: vi.fn(async () => ({
					id: 1,
					status: "submitted",
					createdByUserId: "user-1",
				})),
			}),
			incomeSourceRepository: makeIncomeSourceRepo(),
		}).addIncomeSources(1, baseIncome);

		expect(result).toEqual({ success: false, reason: "not_editable" });
	});
});

describe("upsertResidence", () => {
	const baseResidence = {
		residents: [
			{
				residentId: 2,
				residences: [
					{
						address: "123 Main St",
						fromDate: "2024-01-01",
						toDate: "2025-01-01",
						reasonForLeaving: "Closer to work",
						isRental: true,
						landlordName: "Jordan Smith",
						landlordPhone: "555-123-4567",
					},
				],
			},
		],
		notes: "Optional application note",
	};

	it("persists residence details for an existing application", async () => {
		const repo = makeRepo();

		const result = await createApplicationService({
			applicationRepository: repo,
		}).upsertResidence(1, baseResidence);

		expect(result).toEqual({ success: true });
		expect(repo.findById).toHaveBeenCalledWith(1);
		expect(repo.upsertResidences).toHaveBeenCalledWith(1, {
			residents: baseResidence.residents,
		});
	});

	it("returns validation errors for malformed residence payloads", async () => {
		const repo = makeRepo();

		const result = await createApplicationService({
			applicationRepository: repo,
		}).upsertResidence(1, {
			residents: [
				{
					residentId: 2,
					residences: [
						{
							address: "",
							fromDate: "01-01-2024",
							isRental: true,
						},
					],
				},
			],
		});

		expect(result.success).toBe(false);
		if (!result.success && "errors" in result) {
			expect(result.errors.length).toBeGreaterThan(0);
		}
		expect(repo.upsertResidences).not.toHaveBeenCalled();
	});

	it("returns not_found when the application does not exist", async () => {
		const repo = makeRepo({
			findById: vi.fn(async () => null),
		});

		const result = await createApplicationService({
			applicationRepository: repo,
		}).upsertResidence(999, baseResidence);

		expect(result).toEqual({ success: false, reason: "not_found" });
		expect(repo.upsertResidences).not.toHaveBeenCalled();
	});

	it("returns not_editable when the application has already been submitted", async () => {
		const repo = makeRepo({
			findById: vi.fn(async () => ({
				id: 1,
				status: "submitted",
				createdByUserId: "user-1",
			})),
		});

		const result = await createApplicationService({
			applicationRepository: repo,
		}).upsertResidence(1, baseResidence);

		expect(result).toEqual({ success: false, reason: "not_editable" });
		expect(repo.upsertResidences).not.toHaveBeenCalled();
	});
});
