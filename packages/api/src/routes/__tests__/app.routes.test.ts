import { afterEach, describe, expect, it, mock } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import { createApp } from "~/app";
import type {
	AddIncomeSourcesResult,
	ApplicationWithDetails,
	CreateApplicationResult,
	GetApplicationWithDetailsResult,
	ListSubmittedApplicationsResult,
	SubmitApplicationResult,
	UpdateOccupantsResult,
} from "~/services/application.service";
import type {
	AttachDocumentResult,
	CompleteUploadResult,
	PrepareDocumentUploadResult,
} from "~/services/file.service";

const uploadsDir = path.resolve("data/uploads");

function makeServices() {
	return {
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
					uploadUrl: "/api/storage/documents/app-12/file.pdf",
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

		expect(response.status).toBe(201);
		expect((await response.json()) as { applicationId: number }).toEqual({
			applicationId: 12,
		});
		expect(services.applicationService.createApplication).toHaveBeenCalledTimes(1);
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
			headers: { "Content-Type": "application/json" },
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
			headers: { "Content-Type": "application/json" },
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

	it("rejects an invalid application id for occupants", async () => {
		const app = createApp({ services: makeServices() });
		const response = await app.request("/applications/not-a-number/occupants", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(400);
		expect((await response.json()) as { error: string }).toEqual({
			error: "invalid_application_id",
		});
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
			headers: { "Content-Type": "application/json" },
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
			headers: { "Content-Type": "application/json" },
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
			headers: { "Content-Type": "application/json" },
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
		});

		expect(response.status).toBe(409);
		expect((await response.json()) as { error: string }).toEqual({
			error: "application_not_pending",
		});
	});

	it("prepares uploads", async () => {
		const services = makeServices();
		const app = createApp({ services });

		const response = await app.request("/api/applications/12/upload/prepare", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
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
			uploadUrl: "/api/storage/documents/app-12/file.pdf",
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

		const response = await app.request("/api/applications/12/upload/complete", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
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

		const response = await app.request("/api/applications/12/upload/complete", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
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
		const route = "/api/storage/route-tests/documents/test.txt";

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

		const response = await app.request("/api/storage/%252E%252E/forbidden.txt", {
			method: "PUT",
			body: "nope",
		});

		expect(response.status).toBe(403);
	});

	it("returns 404 for missing storage objects", async () => {
		const app = createApp({ services: makeServices() });

		const response = await app.request("/api/storage/route-tests/missing.txt");

		expect(response.status).toBe(404);
	});

	it("keeps landlord application reads working", async () => {
		const services = makeServices();
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

		const response = await app.request("/landlord/applications/12");

		expect(response.status).toBe(200);
		expect((await response.json()) as { application: ApplicationWithDetails }).toEqual(
			{ application },
		);
	});
});
