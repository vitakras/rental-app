import { describe, expect, it, mock } from "bun:test";
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
		create: mock(async () => ({ id: 1 })),
		findById: mock(async () => ({ id: 1, status: "pending" })),
		submit: mock(async () => ({ id: 1 })),
		updateOccupants: mock(async () => {}),
		findAllSubmitted: mock(async () => []),
		findByIdWithDetails: mock(async () => null),
		findAllByUserId: mock(async () => []),
		...overrides,
	};
}

function makeIncomeSourceRepo(
	overrides?: Partial<IncomeSourceRepository>,
): IncomeSourceRepository {
	return {
		createMany: mock(async () => {}),
		...overrides,
	};
}

describe("createApplicationService", () => {
	describe("validation", () => {
		it("rejects a missing desiredMoveInDate", async () => {
			const repo = makeRepo();
			const result = await createApplicationService({
				applicationRepository: repo,
			}).createApplication({
				...baseInput,
				desiredMoveInDate: "",
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(
					result.errors.some((e) => e.path.includes("desiredMoveInDate")),
				).toBe(true);
			}
		});

		it("rejects an invalid date format", async () => {
			const repo = makeRepo();
			const result = await createApplicationService({
				applicationRepository: repo,
			}).createApplication({
				...baseInput,
				desiredMoveInDate: "06/01/2026",
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(
					result.errors.some((e) => e.path.includes("desiredMoveInDate")),
				).toBe(true);
			}
		});

		it("rejects a missing owner fullName", async () => {
			const repo = makeRepo();
			const result = await createApplicationService({
				applicationRepository: repo,
			}).createApplication({
				...baseInput,
				owner: { ...baseInput.owner, fullName: "" },
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(
					result.errors.some((e) =>
						e.path.join(".").includes("owner.fullName"),
					),
				).toBe(true);
			}
		});

		it("rejects an invalid owner email", async () => {
			const repo = makeRepo();
			const result = await createApplicationService({
				applicationRepository: repo,
			}).createApplication({
				...baseInput,
				owner: { ...baseInput.owner, email: "not-an-email" },
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(
					result.errors.some((e) => e.path.join(".").includes("owner.email")),
				).toBe(true);
			}
		});

		it("rejects an invalid role for additional adult", async () => {
			const repo = makeRepo();
			const result = await createApplicationService({
				applicationRepository: repo,
			}).createApplication({
				...baseInput,
				additionalAdults: [
					{
						fullName: "Jane Smith",
						dateOfBirth: "1992-03-20",
						role: "primary" as "co-applicant",
					},
				],
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(
					result.errors.some((e) => e.path.some((p) => p === "role")),
				).toBe(true);
			}
		});

		it("rejects an invalid email for additional adult", async () => {
			const repo = makeRepo();
			const result = await createApplicationService({
				applicationRepository: repo,
			}).createApplication({
				...baseInput,
				additionalAdults: [
					{
						fullName: "Jane Smith",
						dateOfBirth: "1992-03-20",
						role: "co-applicant",
						email: "bad-email",
					},
				],
			});

			expect(result.success).toBe(false);
		});

		it("rejects a missing child fullName", async () => {
			const repo = makeRepo();
			const result = await createApplicationService({
				applicationRepository: repo,
			}).createApplication({
				...baseInput,
				children: [{ fullName: "", dateOfBirth: "2020-01-01" }],
			});

			expect(result.success).toBe(false);
		});
	});

	describe("success path", () => {
		it("calls repo.create with validated data and returns applicationId", async () => {
			const repo = makeRepo();
			const result = await createApplicationService({
				applicationRepository: repo,
			}).createApplication(baseInput);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.applicationId).toBe(1);
			}
			expect(repo.create).toHaveBeenCalledTimes(1);
			expect(repo.create).toHaveBeenCalledWith({
				desiredMoveInDate: "2026-06-01",
				owner: baseInput.owner,
				additionalAdults: [],
				children: [],
				pets: [],
			});
		});

		it("does not call repo.create when validation fails", async () => {
			const repo = makeRepo();
			await createApplicationService({
				applicationRepository: repo,
			}).createApplication({
				...baseInput,
				desiredMoveInDate: "",
			});

			expect(repo.create).not.toHaveBeenCalled();
		});

		it("passes optional adult email through when provided", async () => {
			const repo = makeRepo();
			const result = await createApplicationService({
				applicationRepository: repo,
			}).createApplication({
				...baseInput,
				additionalAdults: [
					{
						fullName: "Jane Smith",
						dateOfBirth: "1992-03-20",
						role: "co-applicant",
						email: "jane@example.com",
					},
				],
			});

			expect(result.success).toBe(true);
			expect(
				(repo.create as ReturnType<typeof mock>).mock.calls[0][0]
					.additionalAdults[0].email,
			).toBe("jane@example.com");
		});

		it("omits optional adult email when not provided", async () => {
			const repo = makeRepo();
			await createApplicationService({
				applicationRepository: repo,
			}).createApplication({
				...baseInput,
				additionalAdults: [
					{
						fullName: "Bob Jones",
						dateOfBirth: "1988-07-11",
						role: "dependent",
					},
				],
			});

			const callArg = (repo.create as ReturnType<typeof mock>).mock.calls[0][0];
			expect(callArg.additionalAdults[0].email).toBeUndefined();
		});
	});

	describe("repository errors", () => {
		it("propagates errors thrown by repo.create", async () => {
			const repo = makeRepo({
				create: mock(async () => {
					throw new Error("DB error");
				}),
			});

			await expect(
				createApplicationService({
					applicationRepository: repo,
				}).createApplication(baseInput),
			).rejects.toThrow("DB error");
		});
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
			findById: mock(async () => null),
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
			findById: mock(async () => ({ id: 1, status: "submitted" })),
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

	it("propagates errors thrown by repo.submit", async () => {
		const repo = makeRepo({
			submit: mock(async () => {
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

describe("updateOccupants", () => {
	const baseOccupants = {
		smokes: false,
		additionalAdults: [],
		children: [],
		pets: [],
	};

	it("calls repo.updateOccupants with validated data", async () => {
		const repo = makeRepo();
		const result = await createApplicationService({
			applicationRepository: repo,
		}).updateOccupants(1, baseOccupants);

		expect(result.success).toBe(true);
		expect(repo.updateOccupants).toHaveBeenCalledWith(1, baseOccupants);
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
		if (!result.success) {
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
		if (!result.success) {
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
			updateOccupants: mock(async () => {
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
				findById: mock(async () => null),
			}),
			incomeSourceRepository: makeIncomeSourceRepo(),
		}).addIncomeSources(999, baseIncome);

		expect(result).toEqual({ success: false, reason: "not_found" });
	});
});
