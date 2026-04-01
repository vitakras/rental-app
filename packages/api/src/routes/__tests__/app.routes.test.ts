import { afterEach, describe, expect, it, mock } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
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
} from "~/services/application.service";
import type {
	ApplicantSignupResult,
	ApplicantSignupLink,
	RequestEmailLoginResult,
	GetSessionUserResult,
	VerifyEmailLoginResult,
} from "~/services/auth.service";
import type {
	AttachDocumentResult,
	CompleteUploadResult,
	PrepareDocumentUploadResult,
} from "~/services/file.service";

const uploadsDir = path.resolve("data/uploads");
const applicantSessionCookie = "session=session-1";

function makeServices() {
	return {
		authService: {
			requestEmailLogin: mock(
				async (): Promise<RequestEmailLoginResult> => ({ success: true }),
			),
			applicantSignup: mock(
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
			getApplicantSignupLink: mock(
				(): ApplicantSignupLink => ({
					signupToken: "11111111-1111-4111-8111-111111111111",
					signupUrl:
						"http://localhost:5173/login?role=applicant&token=11111111-1111-4111-8111-111111111111",
				}),
			),
			verifyEmailLogin: mock(
				async (): Promise<VerifyEmailLoginResult> => ({
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
			getSessionUser: mock(
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
			createApplication: mock(
				async (): Promise<CreateApplicationResult> => ({
					success: true,
					applicationId: 12,
				}),
			),
			updateOccupants: mock(
				async (): Promise<UpdateOccupantsResult> => ({ success: true }),
			),
			deleteResident: mock(
				async (): Promise<DeleteResidentResult> => ({ success: true }),
			),
			addIncomeSources: mock(
				async (): Promise<AddIncomeSourcesResult> => ({ success: true }),
			),
			submitApplication: mock(
				async (): Promise<SubmitApplicationResult> => ({
					success: true,
					applicationId: 12,
				}),
			),
			listSubmittedApplications: mock(
				async (): Promise<ListSubmittedApplicationsResult> => ({
					success: true,
					applications: [],
				}),
			),
			getApplicationWithDetails: mock(
				async (): Promise<GetApplicationWithDetailsResult> => ({
					success: false,
					reason: "not_found",
				}),
			),
		},
		fileService: {
			prepareDocumentUpload: mock(
				async (): Promise<PrepareDocumentUploadResult> => ({
					success: true,
					fileId: "file-1",
					uploadUrl: "/storage/documents/app-12/file.pdf",
				}),
			),
			completeUpload: mock(
				async (): Promise<CompleteUploadResult> => ({
					success: false,
					reason: "not_found",
				}),
			),
			attachDocumentToApplication: mock(
				async (): Promise<AttachDocumentResult> => ({ success: true }),
			),
		},
	};
}

describe("API application flow routes", () => {
	afterEach(async () => {
		await fs.rm(path.join(uploadsDir, "route-tests"), {
			force: true,
			recursive: true,
		});
	});

	it("creates an application", async () => {
		const services = makeServices();
		const app = createApp({ services });

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
		expect(services.applicationService.createApplication).toHaveBeenCalledTimes(1);
	});

	it("rejects applicant application routes without a session", async () => {
		const services = makeServices();
		const app = createApp({ services });

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
		expect(services.applicationService.createApplication).not.toHaveBeenCalled();
	});

	it("returns success for a known login email request", async () => {
		const services = makeServices();
		const app = createApp({ services });

		const response = await app.request("/auth/email/request", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-forwarded-for": "127.0.0.1",
			},
			body: JSON.stringify({ email: "alex@example.com" }),
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as { success: boolean }).toEqual({
			success: true,
		});
		expect(services.authService.requestEmailLogin).toHaveBeenCalledWith(
			{ email: "alex@example.com" },
			{ ipAddress: "127.0.0.1" },
		);
	});

	it("creates an applicant account and sets a session cookie", async () => {
		const services = makeServices();
		const app = createApp({ services });

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
		services.authService.applicantSignup = mock(
			async (): Promise<ApplicantSignupResult> => ({
				success: false,
				reason: "email_already_exists",
			}),
		);
		const app = createApp({ services });

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
		services.authService.applicantSignup = mock(
			async (): Promise<ApplicantSignupResult> => ({
				success: false,
				reason: "invalid_signup_token",
			}),
		);
		const app = createApp({ services });

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

	it("returns success for an unknown login email request", async () => {
		const services = makeServices();
		services.authService.requestEmailLogin = mock(
			async (): Promise<RequestEmailLoginResult> => ({ success: true }),
		);
		const app = createApp({ services });

		const response = await app.request("/auth/email/request", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "missing@example.com" }),
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as { success: boolean }).toEqual({
			success: true,
		});
	});

	it("verifies a login token and sets a session cookie", async () => {
		const services = makeServices();
		const app = createApp({ services });

		const response = await app.request("/auth/email/verify", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-forwarded-for": "127.0.0.1",
				"user-agent": "bun-test",
			},
			body: JSON.stringify({
				email: "alex@example.com",
				token: "plain-token",
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
		expect(services.authService.verifyEmailLogin).toHaveBeenCalledWith(
			{ email: "alex@example.com", token: "plain-token" },
			{ ipAddress: "127.0.0.1", userAgent: "bun-test" },
		);
		expect(response.headers.get("set-cookie")).toContain("session=session-1");
	});

	it("returns 401 without setting a cookie for an invalid login token", async () => {
		const services = makeServices();
		services.authService.verifyEmailLogin = mock(
			async (): Promise<VerifyEmailLoginResult> => ({
				success: false,
				reason: "invalid_or_expired_token",
			}),
		);
		const app = createApp({ services });

		const response = await app.request("/auth/email/verify", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: "alex@example.com",
				token: "bad-token",
			}),
		});

		expect(response.status).toBe(401);
		expect((await response.json()) as { error: string }).toEqual({
			error: "invalid_or_expired_token",
		});
		expect(response.headers.get("set-cookie")).toBeNull();
	});

	it("returns the current session user when the session cookie is valid", async () => {
		const services = makeServices();
		const app = createApp({ services });

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
		expect(services.authService.getSessionUser).toHaveBeenCalledWith("session-1");
	});

	it("returns 401 for the current session user when the session cookie is missing", async () => {
		const app = createApp({ services: makeServices() });

		const response = await app.request("/auth/email/session");

		expect(response.status).toBe(401);
		expect((await response.json()) as { error: string }).toEqual({
			error: "unauthorized",
		});
	});

	it("returns validation errors for invalid application creation", async () => {
		const services = makeServices();
		services.applicationService.createApplication = mock(
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
		const app = createApp({ services });

		const response = await app.request("/applications", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Cookie: applicantSessionCookie,
			},
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(422);
		expect(
			((await response.json()) as { error: string }).error,
		).toBe("validation_failed");
	});

	it("updates occupants", async () => {
		const services = makeServices();
		const app = createApp({ services });

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
		expect(services.applicationService.updateOccupants).toHaveBeenCalledWith(12, {
			smokes: false,
			additionalAdults: [],
			children: [],
			pets: [],
		});
	});

	it("deletes a resident", async () => {
		const services = makeServices();
		const app = createApp({ services });

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
		);
	});

	it("returns an applicant application detail payload", async () => {
		const services = makeServices();
		const application: ApplicationWithDetails = {
			id: 12,
			status: "pending",
			desiredMoveInDate: "2026-06-01",
			smokes: false,
			createdAt: "2026-01-01 00:00:00",
			updatedAt: "2026-01-01 00:00:00",
			residents: [],
			pets: [],
		};
		services.applicationService.getApplicationWithDetails = mock(
			async (): Promise<GetApplicationWithDetailsResult> => ({
				success: true,
				application,
			}),
		);
		const app = createApp({ services });

		const response = await app.request("/applications/12", {
			headers: { Cookie: applicantSessionCookie },
		});

		expect(response.status).toBe(200);
		expect(
			(await response.json()) as { application: ApplicationWithDetails },
		).toEqual({ application });
		expect(
			services.applicationService.getApplicationWithDetails,
		).toHaveBeenCalledWith(12);
	});

	it("rejects an invalid application id for applicant reads", async () => {
		const app = createApp({ services: makeServices() });

		const response = await app.request("/applications/not-a-number", {
			headers: { Cookie: applicantSessionCookie },
		});

		expect(response.status).toBe(400);
		expect((await response.json()) as { error: string }).toEqual({
			error: "invalid_application_id",
		});
	});

	it("returns 404 for a missing applicant application", async () => {
		const app = createApp({ services: makeServices() });

		const response = await app.request("/applications/12", {
			headers: { Cookie: applicantSessionCookie },
		});

		expect(response.status).toBe(404);
		expect((await response.json()) as { error: string }).toEqual({
			error: "application_not_found",
		});
	});

	it("rejects an invalid application id for occupants", async () => {
		const app = createApp({ services: makeServices() });
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
		const app = createApp({ services });

		const response = await app.request("/applications/12/residents/not-a-number", {
			method: "DELETE",
			headers: { Cookie: applicantSessionCookie },
		});

		expect(response.status).toBe(400);
		expect((await response.json()) as { error: string }).toEqual({
			error: "invalid_id",
		});
		expect(services.applicationService.deleteResident).not.toHaveBeenCalled();
	});

	it("adds income sources", async () => {
		const services = makeServices();
		const app = createApp({ services });

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
		);
	});

	it("returns 404 when the income route targets a missing application", async () => {
		const services = makeServices();
		services.applicationService.addIncomeSources = mock(
			async (): Promise<AddIncomeSourcesResult> => ({
				success: false,
				reason: "not_found",
			}),
		);
		const app = createApp({ services });

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
		services.applicationService.addIncomeSources = mock(
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
		const app = createApp({ services });

		const response = await app.request("/applications/12/income", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Cookie: applicantSessionCookie,
			},
			body: JSON.stringify([{}]),
		});

		expect(response.status).toBe(422);
		expect(
			((await response.json()) as { error: string }).error,
		).toBe("validation_failed");
	});

	it("submits an application", async () => {
		const services = makeServices();
		const app = createApp({ services });

		const response = await app.request("/applications/12/submit", {
			method: "POST",
			headers: { Cookie: applicantSessionCookie },
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as { applicationId: number }).toEqual({
			applicationId: 12,
		});
	});

	it("returns 409 when submitting a non-pending application", async () => {
		const services = makeServices();
		services.applicationService.submitApplication = mock(
			async (): Promise<SubmitApplicationResult> => ({
				success: false,
				reason: "not_pending",
			}),
		);
		const app = createApp({ services });

		const response = await app.request("/applications/12/submit", {
			method: "POST",
			headers: { Cookie: applicantSessionCookie },
		});

		expect(response.status).toBe(409);
		expect((await response.json()) as { error: string }).toEqual({
			error: "application_not_pending",
		});
	});

	it("prepares uploads", async () => {
		const services = makeServices();
		const app = createApp({ services });

		const response = await app.request("/applications/12/upload/prepare", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Cookie: applicantSessionCookie,
			},
			body: JSON.stringify({
				filename: "lease.pdf",
				contentType: "application/pdf",
				sizeBytes: 123,
			}),
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as { fileId: string; uploadUrl: string }).toEqual(
			{
			fileId: "file-1",
			uploadUrl: "/storage/documents/app-12/file.pdf",
			},
		);
		expect(services.fileService.prepareDocumentUpload).toHaveBeenCalledWith({
			originalFilename: "lease.pdf",
			contentType: "application/pdf",
			sizeBytes: 123,
			uploadedByUserId: "app-12",
		});
	});

	it("completes uploads", async () => {
		const services = makeServices();
		const app = createApp({ services });

		const response = await app.request("/applications/12/upload/complete", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Cookie: applicantSessionCookie,
			},
			body: JSON.stringify({
				fileId: "file-1",
				residentId: 8,
				category: "income",
				documentType: "paystub",
			}),
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as { success: boolean }).toEqual({
			success: true,
		});
		expect(services.fileService.attachDocumentToApplication).toHaveBeenCalledWith({
			fileId: "file-1",
			applicationId: 12,
			residentId: 8,
			category: "income",
			documentType: "paystub",
		});
	});

	it("returns 422 when completing an upload fails", async () => {
		const services = makeServices();
		services.fileService.attachDocumentToApplication = mock(
			async (): Promise<AttachDocumentResult> => ({
				success: false,
				reason: "missing_object",
			}),
		);
		const app = createApp({ services });

		const response = await app.request("/applications/12/upload/complete", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Cookie: applicantSessionCookie,
			},
			body: JSON.stringify({
				fileId: "file-1",
				residentId: 8,
				category: "income",
				documentType: "paystub",
			}),
		});

		expect(response.status).toBe(422);
		expect(
			((await response.json()) as { error: string }).error,
		).toBe("attach_failed");
	});

	it("serves and stores files through the storage route", async () => {
		const app = createApp({ services: makeServices() });
		const route = "/storage/route-tests/documents/test.txt";

		const putResponse = await app.request(route, {
			method: "PUT",
			body: "hello world",
		});
		expect(putResponse.status).toBe(200);

		const getResponse = await app.request(route);
		expect(getResponse.status).toBe(200);
		expect(await getResponse.text()).toBe("hello world");
	});

	it("blocks path traversal in the storage route", async () => {
		const app = createApp({ services: makeServices() });

		const response = await app.request("/storage/%252E%252E/forbidden.txt", {
			method: "PUT",
			body: "nope",
		});

		expect(response.status).toBe(403);
	});

	it("returns 404 for missing storage objects", async () => {
		const app = createApp({ services: makeServices() });

		const response = await app.request("/storage/route-tests/missing.txt");

		expect(response.status).toBe(404);
	});

	it("keeps landlord application reads working", async () => {
		const services = makeServices();
		services.authService.getSessionUser = mock(
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
			createdAt: "2026-03-29T00:00:00.000Z",
			updatedAt: "2026-03-29T00:00:00.000Z",
			residents: [],
			pets: [],
		};
		services.applicationService.getApplicationWithDetails = mock(
			async (): Promise<GetApplicationWithDetailsResult> => ({
				success: true,
				application,
			}),
		);
		const app = createApp({ services });

		const response = await app.request("/landlord/applications/12", {
			headers: {
				Cookie: "session=session-2",
			},
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as { application: ApplicationWithDetails }).toEqual(
			{ application },
		);
	});

	it("returns the applicant signup url for landlords", async () => {
		const services = makeServices();
		services.authService.getSessionUser = mock(
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
		const app = createApp({ services });

		const response = await app.request("/landlord/applicant-signup-url", {
			headers: {
				Cookie: "session=session-2",
			},
		});

		expect(response.status).toBe(200);
		expect((await response.json()) as ApplicantSignupLink).toEqual({
			signupToken: "11111111-1111-4111-8111-111111111111",
			signupUrl:
				"http://localhost:5173/login?role=applicant&token=11111111-1111-4111-8111-111111111111",
		});
		expect(services.authService.getApplicantSignupLink).toHaveBeenCalledTimes(1);
	});

	it("returns 401 for landlord routes when the session cookie is missing", async () => {
		const app = createApp({ services: makeServices() });

		const response = await app.request("/landlord/applications");

		expect(response.status).toBe(401);
		expect((await response.json()) as { error: string }).toEqual({
			error: "unauthorized",
		});
	});

	it("returns 403 for landlord routes when the session belongs to a non-landlord", async () => {
		const app = createApp({ services: makeServices() });

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
});
