import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import { createLocalBlobStorage } from "../local.blob.storage";

const uploadsDir = path.resolve("data/uploads");

describe("createLocalBlobStorage", () => {
	afterEach(async () => {
		await fs.rm(path.join(uploadsDir, "documents", "app-6"), {
			force: true,
			recursive: true,
		});
	});

	it("returns a nested storage route without encoding path separators", async () => {
		const storage = createLocalBlobStorage();

		const { uploadUrl } = await storage.createUploadUrl({
			key: "documents/app-6/file id/lease packet.pdf",
			contentType: "application/pdf",
			sizeBytes: 123,
		});

		expect(uploadUrl).toBe(
			"/storage/documents/app-6/file%20id/lease%20packet.pdf",
		);
	});

	it("returns a matching download route for existing files", async () => {
		const storage = createLocalBlobStorage();
		const key = "documents/app-6/file id/lease packet.pdf";
		const filePath = path.join(uploadsDir, key);

		await fs.mkdir(path.dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, "ok");

		const { downloadUrl } = await storage.createDownloadUrl(key);

		expect(downloadUrl).toBe(
			"/storage/documents/app-6/file%20id/lease%20packet.pdf",
		);
	});
});
