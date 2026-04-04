import { describe, expect, it, vi } from "vitest";
import { createApp } from "~/app";
import type {
	AddIncomeSourcesResult,
	ApplicationWithDetails,
	CreateApplicationResult,
	DeleteResidentResult,
	GetApplicationWithDetailsResult,
	ListSubmittedApplicationsResult,
	SubmitApplicationResult,
	UpdateOccupantsResult,
	UpsertResidenceResult,
} from "~/services/application.service";
import type {
	ApplicantSignupLink,
	ApplicantSignupResult,
	GetReusableLoginCodeStatusResult,
	GetSessionUserResult,
	RotateReusableLoginCodeResult,
	VerifyReusableLoginCodeResult,
} from "~/services/auth.service";
import type {
	DeleteDocumentResult,
	UploadDocumentResult,
} from "~/services/file.service";

const applicantSessionCookie = "session=session-1";

function makeServices() {
	return {
		authService: {
			applicantSignup: vi.fn(
				async (): Promise<ApplicantSignupResult> => ({
					success: true,
					user: {
						id: "user-1",
						email: "alex@example.com",
						globalRole: "applicant",
					},
					session: {
						id: "session-1",
						userId: "user-1",
						expiresAt: "2026-04-29T00:00:00.000Z",
						lastAccessedAt: "2026-01-01T00:00:00.000Z",
						ipAddress: "127.0.0.1",
						userAgent: "bun-test",
						createdAt: "2026-01-01T00:00:00.000Z",
						updatedAt: "2026-01-01T00:00:00.000Z",
					},
				}),
			),
			getApplicantSignupLink: vi.fn(
				(): ApplicantSignupLink => ({
					signupToken: "11111111-1111-4111-8111-111111111111",
					signupUrl:
						"http://localhost:5173/signup?token=11111111-1111-4111-8111-111111111111",
				}),
			),
			verifyReusableLoginCode: vi.fn(
				async (): Promise<VerifyReusableLoginCodeResult> => ({
					success: true,
					user: {
						id: "user-1",
						email: "alex@example.com",
						globalRole: "applicant",
					},
					session: {
						id: "session-1",
						userId: "user-1",
						expiresAt: "2026-04-29T00:00:00.000Z",
						lastAccessedAt: "2026-01-01T00:00:00.000Z",
						ipAddress: "127.0.0.1",
						userAgent: "bun-test",
						createdAt: "2026-01-01T00:00:00.000Z",
						updatedAt: "2026-01-01T00:00:00.000Z",
					},
				}),
			),
			rotateReusableLoginCode: vi.fn(
				async (): Promise<RotateReusableLoginCodeResult> => ({
					success: true,
					code: "123456",
					status: {
						expiresAt: "2026-04-29T00:00:00.000Z",
						failedAttempts: 0,
						successfulUses: 0,
						lastUsedAt: null,
					},
				}),
			),
			getReusableLoginCodeStatus: vi.fn(
				async (): Promise<GetReusableLoginCodeStatusResult> => ({
					success: true,
					status: {
						expiresAt: "2026-04-29T00:00:00.000Z",
						failedAttempts: 1,
						successfulUses: 2,
						lastUsedAt: "2026-01-02T00:00:00.000Z",
					},
				}),
			),
			signout: vi.fn(async (): Promise<void> => {}),
			getSessionUser: vi.fn(
				async (): Promise<GetSessionUserResult> => ({
					success: true,
					user: {
						id: "user-1",
						email: "alex@example.com",
						globalRole: "applicant",
					},
					session: {
						id: "session-1",
						userId: "user-1",
						expiresAt: "2026-04-29T00:00:00.000Z",
						lastAccessedAt: "2026-01-01T00:00:00.000Z",
						ipAddress: "127.0.0.1",
						userAgent: "bun-test",
						createdAt: "2026-01-01T00:00:00.000Z",
						updatedAt: "2026-01-01T00:00:00.000Z",
					},
				}),
			),
		},
		applicationService: {
			createApplication: vi.fn(
				async (): Promise<CreateApplicationResult> => ({
					success: true,
					applicationId: 12,
				}),
			),
			updateOccupants: vi.fn(
				async (): Promise<UpdateOccupantsResult> => ({ success: true }),
			),
			deleteResident: vi.fn(
				async (): Promise<DeleteResidentResult> => ({ success: true }),
			),
			addIncomeSources: vi.fn(
				async (): Promise<AddIncomeSourcesResult> => ({ success: true }),
			),
			upsertResidence: vi.fn(
				async (): Promise<UpsertResidenceResult> => ({ success: true }),
			),
			submitApplication: vi.fn(
				async (): Promise<SubmitApplicationResult> => ({
					success: true,
					applicationId: 12,
				}),
			),
			listSubmittedApplications: vi.fn(
				async (): Promise<ListSubmittedApplicationsResult> => ({
					success: true,
					applications: [],
				}),
			),
			getApplicationWithDetails: vi.fn(
				async (): Promise<GetApplicationWithDetailsResult> => ({
					success: false,
					reason: "not_found",
				}),
			),
			upsertApplicantInfo: vi.fn(async () => ({ success: true as const })),
			listApplicationsByUser: vi.fn(async () => ({
				success: true as const,
				applications: [],
			})),
		},
		fileService: {
			uploadDocument: vi.fn(
				async (): Promise<UploadDocumentResult> => ({
					success: true,
					fileId: "file-1",
					file: {
						id: "file-1",
						storageKey: "applications/12/8/file-1.pdf",
						originalFilename: "lease.pdf",
						contentType: "application/pdf",
						sizeBytes: 123,
						status: "attached",
						uploadedByUserId: "user-1",
						createdAt: "2026-01-01T00:00:00.000Z",
						uploadedAt: "2026-01-01T00:00:00.000Z",
					},
				}),
			),
			deleteDocument: vi.fn(async (): Promise<DeleteDocumentResult> => ({
				success: true,
			})),
			serveFileForApplication: vi.fn(async () => ({ success: false as const })),
		},
	};
}

function createTestApp(services = makeServices()) {
	return createApp({ services });
}

describe("API application flow routes", () => {
	it("creates an application", async () => {
		const services = makeServices();
		const app = createTestApp(services);

		const response = await app.request("/applications", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Cookie: applicantSessionCookie,
			},
			body: JSON.stringify({
				desiredMoveInDate: "2026-06-01",
				owner: {
					fullName: "Alex Johnson",
					dateOfBirth: "1990-05-15",
					email: "alex@example.com",
					phone: "555-000-0001",
				},
				additionalAdults: [],
				children: [],
				pets: [],
			}),
		});

		expect(response.status).toBe(201);
		expect((await response.json()) as { applicationId: number }).toEqual({
			applicationId: 12,
		});
		expect(services.applicationService.createApplication).toHaveBeenCalledTimes(
			1,
		);
		expect(services.applicationService.createApplication).toHaveBeenCalledWith({
			userId: "user-1",
		});
		expect(services.authService.getSessionUser).toHaveBeenCalledTimes(1);
	});

	it("rejects applicant application routes without a session", async () => {
		const services = makeServices();
		const app = createTestApp(services);

		const response = await app.request("/applications", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				desiredMoveInDate: "2026-06-01",
				owner: {
					fullName: "Alex Johnson",
					dateOfBirth: "1990-05-15",
					email: "alex@example.com",
					phone: "555-000-0001",
				},
				additionalAdults: [],
				children: [],
				pets: [],
			}),
		});

		expect(response.status).toBe(401);
		expect(
			services.applicationService.createApplication,
		).not.toHaveBeenCalled();
	});

	it("creates an applicant account and sets a session cookie", async () => {
		const services = makeServices();
		const app = createTestApp(services);

		const response = await app.request("/auth/email/signup", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-forwarded-for": "127.0.0.1",
				"user-agent": "bun-test",
			},
			body: JSON.stringify({
				email: "alex@example.com",
				signupToken: "11111111-1111-4111-8111-111111111111",
			}),
		});

		expect(response.status).toBe(201);
		expect(
			(await response.json()) as {
				success: boolean;
				loginCode: string;
				user: { id: string; email: string; globalRole: string };
			},
		).toEqual({
			loginCode: "123456",
			success: true,
			user: {
				id: "user-1",
				email: "alex@example.com",
				globalRole: "applicant",
			},
		});
		expect(services.authService.applicantSignup).toHaveBeenCalledWith(
			{
				email: "alex@example.com",
				signupToken: "11111111-1111-4111-8111-111111111111",
			},
			{ ipAddress: "127.0.0.1", userAgent: "bun-test" },
		);
		expect(response.headers.get("set-cookie")).toContain("session=session-1");
	});

	it("returns 409 when applicant signup email already exists", async () => {
		const services = makeServices();
		services.authService.applicantSignup = vi.fn(
			async (): Promise<ApplicantSignupResult> => ({
				success: false,
				reason: "email_already_exists",
			}),
		);
		const app = createTestApp(services);

		const response = await app.request("/auth/email/signup", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: "alex@example.com",
				signupToken: "11111111-1111-4111-8111-111111111111",
			}),
		});

		expect(response.status).toBe(409);
		expect((await response.json()) as { error: string }).toEqual({
			error: "email_already_exists",
		});
		expect(response.headers.get("set-cookie")).toBeNull();
	});

	it("returns 401 for an invalid applicant signup token", async () => {
		const services = makeServices();
		services.authService.applicantSignup = vi.fn(
			async (): Promise<ApplicantSignupResult> => ({
				success: false,
				reason: "invalid_signup_token",
			}),
		);
		const app = createTestApp(services);

		const response = await app.request("/auth/email/signup", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: "alex@example.com",
				signupToken: "11111111-1111-4111-8111-111111111111",
			}),
		});

		expect(response.status).toBe(401);
		expect((await response.json()) as { error: string }).toEqual({
			error: "invalid_signup_token",
		});
		expect(response.headers.get("set-cookie")).toBeNull();
	});

	it("returns the current session user when the session cookie is valid", async () => {
		const services = makeServices();
		const app = createTestApp(services);

		const response = await app.request("/auth/email/session", {
			headers: {
				Cookie: "session=session-1",
			},
		});

		expect(response.status).toBe(200);
		expect(
			(await response.json()) as {
				user: { id: string; email: string; globalRole: string };
			},
		).toEqual({
			user: {
				id: "user-1",
				email: "alex@example.com",
				globalRole: "applicant",
			},
		});
		expect(services.authService.getSessionUser).toHaveBeenCalledWith(
			"session-1",
		);
		expect(services.authService.getSessionUser).toHaveBeenCalledTimes(1);
	});

	it("returns 401 for the current session user when the session cookie is missing", async () => {
		const app = createTestApp();

		const response = await app.request("/auth/email/session");

		expect(response.status).toBe(401);
		expect((await response.json()) as { error: string }).toEqual({
			error: "unauthorized",
		});
	});

	it("returns the invalid session reason for the current session user when the session is expired", async () => {
		const services = makeServices();
		services.authService.getSessionUser = vi.fn(
			async (): Promise<GetSessionUserResult> => ({
				success: false,
				reason: "invalid_or_expired_session",
			}),
		);
		const app = createTestApp(services);

		const response = await app.request("/auth/email/session", {
			headers: {
				Cookie: applicantSessionCookie,
			},
		});

		expect(response.status).toBe(401);
		expect((await response.json()) as { error: string }).toEqual({
			error: "invalid_or_expired_session",
		});
		expect(services.authService.getSessionUser).toHaveBeenCalledTimes(1);
	});

	it("signs out an authenticated user and clears the session cookie", async () => {
		const services = makeServices();
		const app = createTestApp(services);

		const response = await app.request("/auth/email/signout", {
			method: "POST",
			headers: {
				Cookie: "session=session-1",
			},
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as { success: boolean }).toEqual({
			success: true,
		});
		expect(services.authService.signout).toHaveBeenCalledWith("session-1");
		expect(response.headers.get("set-cookie")).toContain("session=");
	});

	it("returns success when signing out without a session", async () => {
		const services = makeServices();
		const app = createTestApp(services);

		const response = await app.request("/auth/email/signout", {
			method: "POST",
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as { success: boolean }).toEqual({
			success: true,
		});
		expect(services.authService.signout).not.toHaveBeenCalled();
	});

	it("verifies a reusable login code and sets a session cookie", async () => {
		const services = makeServices();
		const app = createTestApp(services);

		const response = await app.request("/auth/code/verify", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-forwarded-for": "127.0.0.1",
				"user-agent": "bun-test",
			},
			body: JSON.stringify({
				email: "alex@example.com",
				code: "123456",
			}),
		});

		expect(response.status).toBe(200);
		expect(
			(await response.json()) as {
				success: boolean;
				user: { id: string; email: string; globalRole: string };
			},
		).toEqual({
			success: true,
			user: {
				id: "user-1",
				email: "alex@example.com",
				globalRole: "applicant",
			},
		});
		expect(services.authService.verifyReusableLoginCode).toHaveBeenCalledWith(
			{ email: "alex@example.com", code: "123456" },
			{ ipAddress: "127.0.0.1", userAgent: "bun-test" },
		);
		expect(response.headers.get("set-cookie")).toContain("session=session-1");
	});

	it("returns 401 for an invalid reusable login code", async () => {
		const services = makeServices();
		services.authService.verifyReusableLoginCode = vi.fn(
			async (): Promise<VerifyReusableLoginCodeResult> => ({
				success: false,
				reason: "invalid_or_expired_code",
			}),
		);
		const app = createTestApp(services);

		const response = await app.request("/auth/code/verify", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: "alex@example.com",
				code: "123456",
			}),
		});

		expect(response.status).toBe(401);
		expect((await response.json()) as { error: string }).toEqual({
			error: "invalid_or_expired_code",
		});
		expect(response.headers.get("set-cookie")).toBeNull();
	});

	it("returns reusable login code status for an authenticated user", async () => {
		const services = makeServices();
		const app = createTestApp(services);

		const response = await app.request("/auth/code", {
			headers: {
				Cookie: applicantSessionCookie,
			},
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as { status: unknown }).toEqual({
			status: {
				expiresAt: "2026-04-29T00:00:00.000Z",
				failedAttempts: 1,
				successfulUses: 2,
				lastUsedAt: "2026-01-02T00:00:00.000Z",
			},
		});
		expect(
			services.authService.getReusableLoginCodeStatus,
		).toHaveBeenCalledWith({
			id: "user-1",
			email: "alex@example.com",
			globalRole: "applicant",
		});
		expect(services.authService.getSessionUser).toHaveBeenCalledTimes(1);
	});

	it("rotates a reusable login code for an authenticated user", async () => {
		const services = makeServices();
		const app = createTestApp(services);

		const response = await app.request("/auth/code/rotate", {
			method: "POST",
			headers: {
				Cookie: applicantSessionCookie,
				"x-forwarded-for": "127.0.0.1",
			},
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as { code: string }).toEqual({
			success: true,
			code: "123456",
			status: {
				expiresAt: "2026-04-29T00:00:00.000Z",
				failedAttempts: 0,
				successfulUses: 0,
				lastUsedAt: null,
			},
		});
		expect(services.authService.rotateReusableLoginCode).toHaveBeenCalledWith(
			{
				id: "user-1",
				email: "alex@example.com",
				globalRole: "applicant",
			},
			{ ipAddress: "127.0.0.1" },
		);
		expect(services.authService.getSessionUser).toHaveBeenCalledTimes(1);
	});

	it("rejects reusable login code status requests without a session", async () => {
		const app = createTestApp();

		const response = await app.request("/auth/code");

		expect(response.status).toBe(401);
	});

	it("rejects reusable login code rotation without a session", async () => {
		const app = createTestApp();

		const response = await app.request("/auth/code/rotate", {
			method: "POST",
		});

		expect(response.status).toBe(401);
	});

	it("returns validation errors for invalid application creation", async () => {
		const services = makeServices();
		services.applicationService.createApplication = vi.fn(
			async (): Promise<CreateApplicationResult> => ({
				success: false,
				errors: [
					{
						code: "custom",
						message: "bad input",
						path: ["owner", "fullName"],
					},
				],
			}),
		);
		const app = createTestApp(services);

		const response = await app.request("/applications", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Cookie: applicantSessionCookie,
			},
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(422);
		expect(((await response.json()) as { error: string }).error).toBe(
			"validation_failed",
		);
	});

	it("updates occupants", async () => {
		const services = makeServices();
		const app = createTestApp(services);

		const response = await app.request("/applications/12/occupants", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Cookie: applicantSessionCookie,
			},
			body: JSON.stringify({
				smokes: false,
				additionalAdults: [],
				children: [],
				pets: [],
			}),
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as { success: boolean }).toEqual({
			success: true,
		});
		expect(services.applicationService.updateOccupants).toHaveBeenCalledWith(
			12,
			{
				smokes: false,
				additionalAdults: [],
				children: [],
				pets: [],
			},
			"user-1",
		);
	});

	it("returns 409 when updating occupants for a submitted application", async () => {
		const services = makeServices();
		services.applicationService.updateOccupants = vi.fn(
			async (): Promise<UpdateOccupantsResult> => ({
				success: false,
				reason: "not_editable",
			}),
		);
		const app = createTestApp(services);

		const response = await app.request("/applications/12/occupants", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Cookie: applicantSessionCookie,
			},
			body: JSON.stringify({
				smokes: false,
				additionalAdults: [],
				children: [],
				pets: [],
			}),
		});

		expect(response.status).toBe(409);
		expect((await response.json()) as { error: string }).toEqual({
			error: "application_not_editable",
		});
	});

	it("deletes a resident", async () => {
		const services = makeServices();
		const app = createTestApp(services);

		const response = await app.request("/applications/12/residents/77", {
			method: "DELETE",
			headers: { Cookie: applicantSessionCookie },
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as { success: boolean }).toEqual({
			success: true,
		});
		expect(services.applicationService.deleteResident).toHaveBeenCalledWith(
			12,
			77,
			"user-1",
		);
	});

	it("returns 409 when deleting a resident from a submitted application", async () => {
		const services = makeServices();
		services.applicationService.deleteResident = vi.fn(
			async (): Promise<DeleteResidentResult> => ({
				success: false,
				reason: "not_editable",
			}),
		);
		const app = createTestApp(services);

		const response = await app.request("/applications/12/residents/77", {
			method: "DELETE",
			headers: { Cookie: applicantSessionCookie },
		});

		expect(response.status).toBe(409);
		expect((await response.json()) as { error: string }).toEqual({
			error: "application_not_editable",
		});
	});

	it("returns an applicant application detail payload", async () => {
		const services = makeServices();
		const application: ApplicationWithDetails = {
			id: 12,
			status: "pending",
			desiredMoveInDate: "2026-06-01",
			smokes: false,
			notes: null,
			createdAt: "2026-01-01 00:00:00",
			updatedAt: "2026-01-01 00:00:00",
			residents: [],
			pets: [],
			documents: [],
		};
		services.applicationService.getApplicationWithDetails = vi.fn(
			async (): Promise<GetApplicationWithDetailsResult> => ({
				success: true,
				application,
			}),
		);
		const app = createTestApp(services);

		const response = await app.request("/applications/12", {
			headers: { Cookie: applicantSessionCookie },
		});

		expect(response.status).toBe(200);
		expect(
			(await response.json()) as { application: ApplicationWithDetails },
		).toEqual({ application });
		expect(
			services.applicationService.getApplicationWithDetails,
		).toHaveBeenCalledWith(12, "user-1");
	});

	it("rejects an invalid application id for applicant reads", async () => {
		const app = createTestApp();

		const response = await app.request("/applications/not-a-number", {
			headers: { Cookie: applicantSessionCookie },
		});

		expect(response.status).toBe(400);
		expect((await response.json()) as { error: string }).toEqual({
			error: "invalid_application_id",
		});
	});

	it("returns 404 for a missing applicant application", async () => {
		const app = createTestApp();

		const response = await app.request("/applications/12", {
			headers: { Cookie: applicantSessionCookie },
		});

		expect(response.status).toBe(404);
		expect((await response.json()) as { error: string }).toEqual({
			error: "application_not_found",
		});
	});

	it("rejects an invalid application id for occupants", async () => {
		const app = createTestApp();
		const response = await app.request("/applications/not-a-number/occupants", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Cookie: applicantSessionCookie,
			},
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(400);
		expect((await response.json()) as { error: string }).toEqual({
			error: "invalid_application_id",
		});
	});

	it("rejects an invalid resident id for deletes", async () => {
		const services = makeServices();
		const app = createTestApp(services);

		const response = await app.request(
			"/applications/12/residents/not-a-number",
			{
				method: "DELETE",
				headers: { Cookie: applicantSessionCookie },
			},
		);

		expect(response.status).toBe(400);
		expect((await response.json()) as { error: string }).toEqual({
			error: "invalid_id",
		});
		expect(services.applicationService.deleteResident).not.toHaveBeenCalled();
	});

	it("adds income sources", async () => {
		const services = makeServices();
		const app = createTestApp(services);

		const payload = [
			{
				residentId: 7,
				incomeSources: [
					{
						type: "employment",
						employerOrSourceName: "Acme",
						titleOrOccupation: "Manager",
						monthlyAmountCents: 450000,
						startDate: "2024-01-01",
					},
				],
			},
		];

		const response = await app.request("/applications/12/income", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Cookie: applicantSessionCookie,
			},
			body: JSON.stringify(payload),
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as { success: boolean }).toEqual({
			success: true,
		});
		expect(services.applicationService.addIncomeSources).toHaveBeenCalledWith(
			12,
			payload,
			"user-1",
		);
	});

	it("returns 409 when adding income to a submitted application", async () => {
		const services = makeServices();
		services.applicationService.addIncomeSources = vi.fn(
			async (): Promise<AddIncomeSourcesResult> => ({
				success: false,
				reason: "not_editable",
			}),
		);
		const app = createTestApp(services);

		const response = await app.request("/applications/12/income", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Cookie: applicantSessionCookie,
			},
			body: JSON.stringify([]),
		});

		expect(response.status).toBe(409);
		expect((await response.json()) as { error: string }).toEqual({
			error: "application_not_editable",
		});
	});

	it("returns 404 when the income route targets a missing application", async () => {
		const services = makeServices();
		services.applicationService.addIncomeSources = vi.fn(
			async (): Promise<AddIncomeSourcesResult> => ({
				success: false,
				reason: "not_found",
			}),
		);
		const app = createTestApp(services);

		const response = await app.request("/applications/12/income", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Cookie: applicantSessionCookie,
			},
			body: JSON.stringify([]),
		});

		expect(response.status).toBe(404);
		expect((await response.json()) as { error: string }).toEqual({
			error: "application_not_found",
		});
	});

	it("returns validation errors for malformed income payloads", async () => {
		const services = makeServices();
		services.applicationService.addIncomeSources = vi.fn(
			async (): Promise<AddIncomeSourcesResult> => ({
				success: false,
				errors: [
					{
						code: "custom",
						message: "bad input",
						path: [0, "residentId"],
					},
				],
			}),
		);
		const app = createTestApp(services);

		const response = await app.request("/applications/12/income", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Cookie: applicantSessionCookie,
			},
			body: JSON.stringify([{}]),
		});

		expect(response.status).toBe(422);
		expect(((await response.json()) as { error: string }).error).toBe(
			"validation_failed",
		);
	});

	it("updates residence history and notes", async () => {
		const services = makeServices();
		const app = createTestApp(services);

		const payload = {
			residents: [
				{
					residentId: 7,
					residences: [
						{
							address: "123 Main St",
							fromDate: "2024-01-01",
							toDate: "2025-01-01",
							reasonForLeaving: "Moving closer to work",
							isRental: true,
							landlordName: "Taylor Reed",
							landlordPhone: "555-111-2222",
						},
					],
				},
			],
			notes: "Happy to provide more context if needed.",
		};

		const response = await app.request("/applications/12/residence", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Cookie: applicantSessionCookie,
			},
			body: JSON.stringify(payload),
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as { success: boolean }).toEqual({
			success: true,
		});
		expect(services.applicationService.upsertResidence).toHaveBeenCalledWith(
			12,
			payload,
			"user-1",
		);
	});

	it("returns 409 when updating residence for a submitted application", async () => {
		const services = makeServices();
		services.applicationService.upsertResidence = vi.fn(
			async (): Promise<UpsertResidenceResult> => ({
				success: false,
				reason: "not_editable",
			}),
		);
		const app = createTestApp(services);

		const response = await app.request("/applications/12/residence", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Cookie: applicantSessionCookie,
			},
			body: JSON.stringify({ residents: [], notes: "" }),
		});

		expect(response.status).toBe(409);
		expect((await response.json()) as { error: string }).toEqual({
			error: "application_not_editable",
		});
	});

	it("submits an application", async () => {
		const services = makeServices();
		const app = createTestApp(services);

		const response = await app.request("/applications/12/submit", {
			method: "POST",
			headers: { Cookie: applicantSessionCookie },
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as { applicationId: number }).toEqual({
			applicationId: 12,
		});
		expect(services.applicationService.submitApplication).toHaveBeenCalledWith(
			12,
			"user-1",
		);
	});

	it("returns 409 when submitting a non-pending application", async () => {
		const services = makeServices();
		services.applicationService.submitApplication = vi.fn(
			async (): Promise<SubmitApplicationResult> => ({
				success: false,
				reason: "not_pending",
			}),
		);
		const app = createTestApp(services);

		const response = await app.request("/applications/12/submit", {
			method: "POST",
			headers: { Cookie: applicantSessionCookie },
		});

		expect(response.status).toBe(409);
		expect((await response.json()) as { error: string }).toEqual({
			error: "application_not_pending",
		});
	});

	it("uploads documents in one request", async () => {
		const services = makeServices();
		services.applicationService.getApplicationWithDetails = vi.fn(
			async (): Promise<GetApplicationWithDetailsResult> => ({
				success: true,
				application: {
					id: 12,
					status: "pending",
					smokes: false,
					desiredMoveInDate: "2026-06-01",
					createdAt: "2026-01-01T00:00:00.000Z",
					updatedAt: "2026-01-01T00:00:00.000Z",
					residents: [
						{
							id: 8,
							applicationId: 12,
							role: "primary",
							fullName: "Alex Johnson",
							dateOfBirth: "1990-05-15",
							email: "alex@example.com",
							phone: "555-000-0001",
							createdAt: "2026-01-01T00:00:00.000Z",
							updatedAt: "2026-01-01T00:00:00.000Z",
							incomeSources: [],
							pets: [],
							residences: [],
						},
					],
					documents: [],
				} as ApplicationWithDetails,
			}),
		);
		const app = createTestApp(services);
		const formData = new FormData();
		formData.set(
			"file",
			new File(["pdf bytes"], "lease.pdf", { type: "application/pdf" }),
		);
		formData.set("residentId", "8");
		formData.set("category", "income");
		formData.set("documentType", "paystub");

		const response = await app.request("/applications/12/documents", {
			method: "POST",
			headers: {
				Cookie: applicantSessionCookie,
			},
			body: formData,
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as { fileId: string }).toEqual({
			fileId: "file-1",
		});
		expect(
			services.applicationService.getApplicationWithDetails,
		).toHaveBeenCalledWith(12, "user-1");
		expect(services.fileService.uploadDocument).toHaveBeenCalledWith({
			applicationId: 12,
			residentId: 8,
			category: "income",
			documentType: "paystub",
			originalFilename: "lease.pdf",
			contentType: "application/pdf",
			sizeBytes: 9,
			uploadedByUserId: "user-1",
			fileData: expect.any(ArrayBuffer),
		});
	});

	it("returns 422 for oversized uploads", async () => {
		const services = makeServices();
		services.applicationService.getApplicationWithDetails = vi.fn(
			async (): Promise<GetApplicationWithDetailsResult> => ({
				success: true,
				application: {
					id: 12,
					status: "pending",
					smokes: false,
					desiredMoveInDate: "2026-06-01",
					createdAt: "2026-01-01T00:00:00.000Z",
					updatedAt: "2026-01-01T00:00:00.000Z",
					residents: [
						{
							id: 8,
							applicationId: 12,
							role: "primary",
							fullName: "Alex Johnson",
							dateOfBirth: "1990-05-15",
							email: "alex@example.com",
							phone: "555-000-0001",
							createdAt: "2026-01-01T00:00:00.000Z",
							updatedAt: "2026-01-01T00:00:00.000Z",
							incomeSources: [],
							pets: [],
							residences: [],
						},
					],
					documents: [],
				} as ApplicationWithDetails,
			}),
		);
		const app = createTestApp(services);
		const formData = new FormData();
		formData.set(
			"file",
			new File([new Uint8Array(10 * 1024 * 1024 + 1)], "too-large.pdf", {
				type: "application/pdf",
			}),
		);
		formData.set("residentId", "8");
		formData.set("category", "income");
		formData.set("documentType", "paystub");

		const response = await app.request("/applications/12/documents", {
			method: "POST",
			headers: {
				Cookie: applicantSessionCookie,
			},
			body: formData,
		});

		expect(response.status).toBe(422);
		expect((await response.json()) as { error: string }).toEqual({
			error: "file_too_large",
		});
		expect(services.fileService.uploadDocument).not.toHaveBeenCalled();
	});

	it("returns 422 when the file type is unsupported", async () => {
		const services = makeServices();
		services.applicationService.getApplicationWithDetails = vi.fn(
			async (): Promise<GetApplicationWithDetailsResult> => ({
				success: true,
				application: {
					id: 12,
					status: "pending",
					smokes: false,
					desiredMoveInDate: "2026-06-01",
					createdAt: "2026-01-01T00:00:00.000Z",
					updatedAt: "2026-01-01T00:00:00.000Z",
					residents: [
						{
							id: 8,
							applicationId: 12,
							role: "primary",
							fullName: "Alex Johnson",
							dateOfBirth: "1990-05-15",
							email: "alex@example.com",
							phone: "555-000-0001",
							createdAt: "2026-01-01T00:00:00.000Z",
							updatedAt: "2026-01-01T00:00:00.000Z",
							incomeSources: [],
							pets: [],
							residences: [],
						},
					],
					documents: [],
				} as ApplicationWithDetails,
			}),
		);
		const app = createTestApp(services);
		const formData = new FormData();
		formData.set(
			"file",
			new File(["nope"], "notes.txt", { type: "text/plain" }),
		);
		formData.set("residentId", "8");
		formData.set("category", "income");
		formData.set("documentType", "paystub");

		const response = await app.request("/applications/12/documents", {
			method: "POST",
			headers: {
				Cookie: applicantSessionCookie,
			},
			body: formData,
		});

		expect(response.status).toBe(422);
		expect((await response.json()) as { error: string }).toEqual({
			error: "unsupported_file_type",
		});
		expect(services.fileService.uploadDocument).not.toHaveBeenCalled();
	});

	it("keeps landlord application reads working", async () => {
		const services = makeServices();
		services.authService.getSessionUser = vi.fn(
			async (): Promise<GetSessionUserResult> => ({
				success: true,
				user: {
					id: "user-2",
					email: "landlord@example.com",
					globalRole: "landlord",
				},
				session: {
					id: "session-2",
					userId: "user-2",
					expiresAt: "2026-04-29T00:00:00.000Z",
					lastAccessedAt: "2026-01-01T00:00:00.000Z",
					ipAddress: "127.0.0.1",
					userAgent: "bun-test",
					createdAt: "2026-01-01T00:00:00.000Z",
					updatedAt: "2026-01-01T00:00:00.000Z",
				},
			}),
		);
		const application: ApplicationWithDetails = {
			id: 12,
			status: "submitted",
			desiredMoveInDate: "2026-06-01",
			smokes: false,
			notes: null,
			createdAt: "2026-03-29T00:00:00.000Z",
			updatedAt: "2026-03-29T00:00:00.000Z",
			residents: [],
			pets: [],
			documents: [],
		};
		services.applicationService.getApplicationWithDetails = vi.fn(
			async (): Promise<GetApplicationWithDetailsResult> => ({
				success: true,
				application,
			}),
		);
		const app = createTestApp(services);

		const response = await app.request("/landlord/applications/12", {
			headers: {
				Cookie: "session=session-2",
			},
		});

		expect(response.status).toBe(200);
		expect(
			(await response.json()) as { application: ApplicationWithDetails },
		).toEqual({ application });
	});

	it("returns the applicant signup url for landlords", async () => {
		const services = makeServices();
		services.authService.getSessionUser = vi.fn(
			async (): Promise<GetSessionUserResult> => ({
				success: true,
				user: {
					id: "user-2",
					email: "landlord@example.com",
					globalRole: "landlord",
				},
				session: {
					id: "session-2",
					userId: "user-2",
					expiresAt: "2026-04-29T00:00:00.000Z",
					lastAccessedAt: "2026-01-01T00:00:00.000Z",
					ipAddress: "127.0.0.1",
					userAgent: "bun-test",
					createdAt: "2026-01-01T00:00:00.000Z",
					updatedAt: "2026-01-01T00:00:00.000Z",
				},
			}),
		);
		const app = createTestApp(services);

		const response = await app.request("/landlord/applicant-signup-url", {
			headers: {
				Cookie: "session=session-2",
			},
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as ApplicantSignupLink).toEqual({
			signupToken: "11111111-1111-4111-8111-111111111111",
			signupUrl:
				"http://localhost:5173/signup?token=11111111-1111-4111-8111-111111111111",
		});
		expect(services.authService.getApplicantSignupLink).toHaveBeenCalledTimes(
			1,
		);
	});

	it("returns 401 for landlord routes when the session cookie is missing", async () => {
		const app = createTestApp();

		const response = await app.request("/landlord/applications");

		expect(response.status).toBe(401);
		expect((await response.json()) as { error: string }).toEqual({
			error: "unauthorized",
		});
	});

	it("returns 403 for landlord routes when the session belongs to a non-landlord", async () => {
		const app = createTestApp();

		const response = await app.request("/landlord/applications", {
			headers: {
				Cookie: "session=session-1",
			},
		});

		expect(response.status).toBe(403);
		expect((await response.json()) as { error: string }).toEqual({
			error: "forbidden",
		});
	});

	it("sets secure default headers for API responses", async () => {
		const app = createTestApp();

		const response = await app.request("/");

		expect(response.status).toBe(200);
		expect(response.headers.get("Cross-Origin-Opener-Policy")).toBe(
			"same-origin",
		);
		expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe(
			"same-origin",
		);
		expect(response.headers.get("Origin-Agent-Cluster")).toBe("?1");
		expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
		expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(response.headers.get("X-Frame-Options")).toBe("DENY");
		expect(response.headers.get("Strict-Transport-Security")).toBeNull();
		expect(response.headers.get("Permissions-Policy")).toContain("camera=()");
		expect(response.headers.get("Permissions-Policy")).toContain(
			"microphone=()",
		);
	});

	it("only allows credentialed CORS for the configured web origin", async () => {
		const app = createTestApp();

		const allowedResponse = await app.request("/", {
			headers: {
				Origin: "http://localhost:5173",
			},
		});
		const blockedResponse = await app.request("/", {
			headers: {
				Origin: "https://evil.example",
			},
		});

		expect(allowedResponse.headers.get("Access-Control-Allow-Origin")).toBe(
			"http://localhost:5173",
		);
		expect(
			allowedResponse.headers.get("Access-Control-Allow-Credentials"),
		).toBe("true");
		expect(allowedResponse.headers.get("Vary")).toContain("Origin");
		expect(
			blockedResponse.headers.get("Access-Control-Allow-Origin"),
		).toBeNull();
	});

	it("marks auth responses as non-cacheable", async () => {
		const app = createTestApp();

		const response = await app.request("/auth/email/signup", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				email: "alex@example.com",
				signupToken: "11111111-1111-4111-8111-111111111111",
			}),
		});

		expect(response.status).toBe(201);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(response.headers.get("Pragma")).toBe("no-cache");
	});
});
